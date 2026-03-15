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

  parts.push(`\n## Current screening state`);
  parts.push(`Stage: ${context.screeningState.stage}`);
  parts.push(
    `Items administered: ${context.screeningState.itemsAdministered.length}`,
  );
  parts.push(
    `Auto-scored items: ${context.screeningState.autoScoredItems.length}`,
  );

  if (context.screeningState.flaggedSpectra.length > 0) {
    parts.push(
      `Flagged spectra: ${context.screeningState.flaggedSpectra.join(", ")}`,
    );
  }

  // Include ranked items so the LLM knows what to pick from
  if (context.rankedItems && context.rankedItems.length > 0) {
    parts.push(`\n## Available items to ask (ranked by information gain)`);
    for (const ri of context.rankedItems) {
      parts.push(
        `- itemId: "${ri.itemId}" | text: "${ri.item.text}" | response range: ${ri.item.responseMin}-${ri.item.responseMax} | labels: ${JSON.stringify(ri.item.responseLabels)} | expected variance reduction: ${ri.expectedVarianceReduction.toFixed(4)}`,
      );
    }
  }

  // Include available items for intake auto-scoring
  if (
    context.screeningState.stage === "INTAKE" &&
    context.referenceData.items.length > 0
  ) {
    parts.push(
      `\n## Available screening items (use these IDs for flag_implied_scores)`,
    );
    for (const item of context.referenceData.items) {
      const loadings = context.referenceData.itemLoadings
        .filter((l) => l.itemId === item.id)
        .map((l) => {
          const dim =
            context.referenceData.spectra.find((s) => s.id === l.dimensionId) ??
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

  // Already administered/scored items
  const adminIds = context.screeningState.itemsAdministered.map((i) => i.itemId);
  const autoIds = context.screeningState.autoScoredItems.map((i) => i.itemId);
  const allScoredIds = Array.from(new Set(adminIds.concat(autoIds)));
  if (allScoredIds.length > 0) {
    parts.push(
      `\n## Already scored items (DO NOT re-score these): ${allScoredIds.join(", ")}`,
    );
  }

  return parts.join("\n");
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
      case "score_item":
        result.push({
          tool: "score_item",
          itemId: args.itemId,
          score: args.score,
          reasoning: args.reasoning,
        });
        break;
      case "select_item":
        result.push({
          tool: "select_item",
          itemId: args.itemId,
          reasoning: args.reasoning,
        });
        break;
      case "ask_clarification":
        result.push({ tool: "ask_clarification", question: args.question });
        break;
      case "frame_question":
        result.push({ tool: "frame_question", text: args.text });
        break;
      case "interpret_response":
        result.push({
          tool: "interpret_response",
          itemId: args.itemId,
          score: args.score,
          confidence: args.confidence,
        });
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

  // Extract message text — if the LLM only made tool calls, build message from frame_question
  let message = msg.content ?? "";
  if (!message) {
    const framed = toolCalls.find((tc) => tc.tool === "frame_question");
    if (framed && "text" in framed) {
      message = framed.text;
    } else {
      message =
        "Thank you for sharing. Let me ask you a few specific questions to understand better.";
    }
  }

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
