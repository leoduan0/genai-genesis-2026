import OpenAI from "openai";
import type {
  ScreeningLLMOptions,
  ReportLLMOptions,
  LLMResponse,
  ReportResponse,
  ToolCall,
} from "./types";
import { placeholderReportLLM } from "./report";
import { SCREENING_TOOLS } from "./screening";

// ─── OpenAI Client ──────────────────────────────────────────────────────────

const OPENAI_API_KEY =
  "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";

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const MODEL = "gpt-5.4";

// ─── Convert our tool definitions to OpenAI format ──────────────────────────

function toOpenAITools(
  tools: ScreeningLLMOptions["tools"],
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

// ─── Build context block for system prompt ──────────────────────────────────

function buildContextBlock(options: ScreeningLLMOptions): string {
  const { context } = options;
  const parts: string[] = [];

  const st = context.screeningState;

  parts.push(`\n## Current screening state`);
  parts.push(`Stage: ${st.stage}`);
  parts.push(`Items administered: ${st.itemsAdministered.length}`);
  parts.push(`Auto-scored items: ${st.autoScoredItems.length}`);

  if (st.flaggedSpectra.length > 0) {
    parts.push(`Flagged spectra: ${st.flaggedSpectra.join(", ")}`);
  }

  // ── Intake context (what the patient originally said) ──
  if (context.conversationHistory.length > 0) {
    const intakeMsg = context.conversationHistory.find(
      (m) => m.role === "user",
    );
    if (intakeMsg) {
      parts.push(`\n## Patient's initial concern`);
      parts.push(intakeMsg.content);
    }
  }

  // ── Previously administered items with responses ──
  if (st.itemsAdministered.length > 0) {
    parts.push(`\n## Previously asked items (most recent last)`);
    const recent = st.itemsAdministered.slice(-10); // last 10 to avoid bloat
    for (const admin of recent) {
      const item = context.referenceData.items.find(
        (i) => i.id === admin.itemId,
      );
      if (item) {
        const label =
          item.responseLabels[String(admin.response)] ?? String(admin.response);
        parts.push(
          `- "${item.text}" → ${admin.response} (${label}) [${admin.stage}]`,
        );
      }
    }
  }

  // ── Current spectrum estimates ──
  if (st.spectrumMean.length > 0) {
    parts.push(`\n## Current spectrum estimates (z-scores)`);
    for (let i = 0; i < context.referenceData.spectra.length; i++) {
      const spec = context.referenceData.spectra[i];
      if (i < st.spectrumMean.length) {
        const mean = st.spectrumMean[i];
        const variance = st.spectrumCovariance[i]?.[i] ?? 1;
        const label =
          mean > 1.5
            ? "very high"
            : mean > 0.8
              ? "high"
              : mean > 0.3
                ? "moderate"
                : "low";
        parts.push(
          `- ${spec.name} (${spec.shortCode}): μ=${mean.toFixed(2)}, σ²=${variance.toFixed(2)} → ${label}`,
        );
      }
    }
  }

  // ── Current condition probabilities (stage 2 only) ──
  if (st.conditionMean && st.conditionVariances && st.conditionDimensionOrder) {
    parts.push(`\n## Current condition probabilities`);
    for (let i = 0; i < st.conditionDimensionOrder.length; i++) {
      const condId = st.conditionDimensionOrder[i];
      const cond = context.referenceData.conditions.find(
        (c) => c.id === condId,
      );
      if (cond && i < st.conditionMean.length) {
        const mean = st.conditionMean[i];
        const variance = st.conditionVariances[i];
        const threshold = context.referenceData.thresholds.find(
          (t) => t.dimensionId === condId,
        );
        const tau = threshold ? threshold.thresholdLiability : 1.5;
        // P = 1 - Phi((tau - mu) / sqrt(var))
        const z = (tau - mean) / Math.sqrt(variance);
        const prob = 1 - approxPhi(z);
        parts.push(
          `- ${cond.name} (${cond.shortCode}): P=${(prob * 100).toFixed(0)}%, μ=${mean.toFixed(2)}, σ²=${variance.toFixed(2)}`,
        );
      }
    }
  }

  // ── Ranked items (the algorithm's recommendation) ──
  if (context.rankedItems && context.rankedItems.length > 0) {
    parts.push(
      `\n## Algorithm-ranked items (by expected variance reduction)`,
    );
    parts.push(
      `You MUST call select_item with one of these itemIds. Use your holistic judgment to pick the best one, considering conversational flow, the patient's concerns, and the algorithm's ranking.`,
    );
    for (const ri of context.rankedItems) {
      parts.push(
        `- itemId: "${ri.itemId}" | text: "${ri.item.text}" | range: ${ri.item.responseMin}-${ri.item.responseMax} | labels: ${JSON.stringify(ri.item.responseLabels)} | expected variance reduction: ${ri.expectedVarianceReduction.toFixed(4)}`,
      );
    }
  }

  // ── Available items for intake auto-scoring ──
  if (st.stage === "INTAKE" && context.referenceData.items.length > 0) {
    parts.push(
      `\n## Available screening items (use these IDs for flag_implied_scores)`,
    );
    for (const item of context.referenceData.items) {
      const loadings = context.referenceData.itemLoadings
        .filter((l) => l.itemId === item.id)
        .map((l) => {
          const dim =
            context.referenceData.spectra.find(
              (s) => s.id === l.dimensionId,
            ) ??
            context.referenceData.conditions.find(
              (c) => c.id === l.dimensionId,
            );
          return dim ? `${dim.shortCode}(${l.loading.toFixed(2)})` : null;
        })
        .filter(Boolean);
      parts.push(
        `- itemId: "${item.id}" | "${item.text}" | range: ${item.responseMin}-${item.responseMax} | labels: ${JSON.stringify(item.responseLabels)} | loads on: ${loadings.join(", ")}`,
      );
    }
  }

  // ── Already scored (do not re-ask) ──
  const adminIds = st.itemsAdministered.map((i) => i.itemId);
  const autoIds = st.autoScoredItems.map((i) => i.itemId);
  const allScoredIds = Array.from(new Set(adminIds.concat(autoIds)));
  if (allScoredIds.length > 0) {
    parts.push(
      `\n## Already scored items (DO NOT re-score these): ${allScoredIds.join(", ")}`,
    );
  }

  return parts.join("\n");
}

/** Fast Φ(x) approximation for context block probability display. */
function approxPhi(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327; // 1/sqrt(2π)
  const p =
    d *
    Math.exp((-x * x) / 2) *
    (t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))));
  return x >= 0 ? 1 - p : p;
}

// ─── Parse tool calls from OpenAI response ──────────────────────────────────

function parseToolCalls(
  openaiToolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
): ToolCall[] {
  const result: ToolCall[] = [];
  for (const tc of openaiToolCalls) {
    if (tc.type !== "function") continue;
    const fnCall = tc as OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall;
    const args = JSON.parse(fnCall.function.arguments);
    const name = fnCall.function.name;

    switch (name) {
      case "select_item":
        result.push({
          tool: "select_item",
          itemId: args.itemId,
          reasoning: args.reasoning,
        });
        break;
      case "frame_question":
        result.push({ tool: "frame_question", text: args.text });
        break;
      case "flag_implied_scores":
        result.push({ tool: "flag_implied_scores", scores: args.scores });
        break;
    }
  }
  return result;
}

// ─── Screening LLM ─────────────────────────────────────────────────────────

/**
 * General screening LLM — handles intake analysis, item selection,
 * response interpretation, implied scoring, follow-up questions.
 *
 * Uses OpenAI gpt-5.4 with function calling.
 */
export async function callScreeningLLM(
  options: ScreeningLLMOptions,
): Promise<LLMResponse> {
  const contextBlock = buildContextBlock(options);
  const fullSystemPrompt = options.systemPrompt + "\n" + contextBlock;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: fullSystemPrompt },
    ...options.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  const tools = toOpenAITools(options.tools);

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages,
    tools,
    max_completion_tokens: 1500,
  });

  const choice = completion.choices[0];
  const msg = choice.message;

  const toolCalls: ToolCall[] = msg.tool_calls
    ? parseToolCalls(msg.tool_calls)
    : [];

  // Extract message: prefer frame_question tool call > LLM content > empty
  const framed = toolCalls.find((tc) => tc.tool === "frame_question");
  let message = framed && "text" in framed ? framed.text : (msg.content ?? "");

  return { message, toolCalls };
}

// ─── Report LLM ─────────────────────────────────────────────────────────────

/**
 * Report LLM — generates natural language report from diagnostic profile.
 *
 * Still uses placeholder for now (report is template-based and works well).
 */
export async function callReportLLM(
  options: ReportLLMOptions,
): Promise<ReportResponse> {
  return placeholderReportLLM(options);
}
