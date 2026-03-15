import { NextRequest, NextResponse } from "next/server";
import { getSession, loadSessionState, updateSessionState, saveResponse, endSession } from "@/lib/screening/persistence";
import { loadFullReferenceData } from "@/lib/screening/loadData";
import {
  kalmanUpdate,
  normalizeResponse,
  rankItems,
  trace,
  checkStageOneTermination,
  transitionToStageTwo,
  SCREENING_CONFIG,
} from "@/lib/screening";
import { checkStageTwoTermination } from "@/lib/screening/diagnosis";
import { callScreeningLLM } from "@/lib/screening/llm";
import { SCREENING_SYSTEM_PROMPT, SCREENING_TOOLS } from "@/lib/screening/llm";
import type { Message } from "@/lib/screening/llm";
import type { PopulationType } from "@/generated/prisma/enums";

type RouteParams = { params: Promise<{ sessionId: string }> };

/**
 * POST /api/screening/[sessionId]/respond
 *
 * Phase 1 & 2: Accept patient response, run LLM interpretation,
 * apply Kalman updates, check termination, return next question.
 *
 * Body: { text: string, pendingItemId: string, conversationHistory: Message[] }
 * Returns: { score, impliedScores[], nextQuestion, selectedItemId, terminated, terminationReason, stage, itemsAdministered, estimatedTotal }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { text, pendingItemId, conversationHistory = [] } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    if (!pendingItemId || typeof pendingItemId !== "string") {
      return NextResponse.json({ error: "pendingItemId is required" }, { status: 400 });
    }

    const session = await getSession(sessionId);
    if (session.stage !== "BROAD_SCREENING" && session.stage !== "TARGETED") {
      return NextResponse.json(
        { error: `Session is in stage ${session.stage}, expected BROAD_SCREENING or TARGETED` },
        { status: 400 },
      );
    }

    const { referenceData } = await loadFullReferenceData(
      session.populationType as PopulationType,
    );
    let state = await loadSessionState(sessionId);
    const initialTrace = trace(state.spectrumCovariance);

    // Rank current items for context
    const ranked = rankItems(state, referenceData, SCREENING_CONFIG);

    // Call LLM with patient response
    const messages: Message[] = [
      ...conversationHistory.map((m: Message) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: text },
    ];

    const llmResult = await callScreeningLLM({
      systemPrompt: SCREENING_SYSTEM_PROMPT,
      messages,
      tools: SCREENING_TOOLS,
      maxToolCalls: SCREENING_CONFIG.maxLlmToolCalls,
      context: {
        screeningState: state,
        rankedItems: ranked,
        conversationHistory: messages,
        referenceData,
      },
    });

    // Process tool calls: score the pending item
    let score: number | null = null;
    let confidence = 1.0;
    const impliedScores: { itemId: string; score: number; reasoning: string }[] = [];

    for (const call of llmResult.toolCalls) {
      if (call.tool === "interpret_response") {
        score = call.score;
        confidence = call.confidence;
      } else if (call.tool === "score_item") {
        score = call.score;
      } else if (call.tool === "flag_implied_scores") {
        impliedScores.push(...call.scores);
      }
    }

    // If LLM returned a clarification instead of a score, pass it through
    const clarificationCall = llmResult.toolCalls.find((c) => c.tool === "ask_clarification");
    if (clarificationCall && clarificationCall.tool === "ask_clarification") {
      return NextResponse.json({
        clarification: clarificationCall.question,
        score: null,
        impliedScores: [],
        nextQuestion: null,
        selectedItemId: null,
        terminated: false,
        terminationReason: null,
        stage: state.stage,
        itemsAdministered: state.itemsAdministered.length,
        estimatedTotal: estimateTotal(state),
      });
    }

    // Validate and apply score for the pending item
    const pendingItem = referenceData.items.find((i) => i.id === pendingItemId);
    if (score !== null && pendingItem) {
      // Clamp score to valid range
      score = Math.max(pendingItem.responseMin, Math.min(pendingItem.responseMax, Math.round(score)));
      const normalized = normalizeResponse(score, pendingItem.responseMin, pendingItem.responseMax);

      const result = kalmanUpdate(state, pendingItemId, normalized, referenceData);
      state = result.state;
      state.itemsAdministered.push({
        itemId: pendingItemId,
        response: score,
        stage: state.stage,
      });

      await saveResponse(
        sessionId,
        pendingItemId,
        score,
        normalized,
        state.itemsAdministered.length,
        state.stage,
        result,
      );
    }

    // Apply implied scores
    for (const implied of impliedScores) {
      const item = referenceData.items.find((i) => i.id === implied.itemId);
      if (!item) continue;
      // Skip if already administered
      if (state.itemsAdministered.some((a) => a.itemId === implied.itemId)) continue;
      if (state.autoScoredItems.some((a) => a.itemId === implied.itemId)) continue;

      const clampedScore = Math.max(item.responseMin, Math.min(item.responseMax, Math.round(implied.score)));
      const normalized = normalizeResponse(clampedScore, item.responseMin, item.responseMax);

      const result = kalmanUpdate(state, implied.itemId, normalized, referenceData);
      state = result.state;
      state.autoScoredItems.push({
        itemId: implied.itemId,
        response: clampedScore,
        source: "implied",
      });

      await saveResponse(
        sessionId,
        implied.itemId,
        clampedScore,
        normalized,
        state.itemsAdministered.length + state.autoScoredItems.length,
        state.stage,
        result,
      );
    }

    // Check termination / stage transition
    let terminated = false;
    let terminationReason: string | null = null;

    if (state.stage === "BROAD_SCREENING") {
      const termCheck = checkStageOneTermination(state, initialTrace, referenceData, SCREENING_CONFIG);
      if (termCheck.shouldTerminate) {
        // Transition to stage 2
        state = transitionToStageTwo(state, referenceData, SCREENING_CONFIG);
      }
    }

    if (state.stage === "TARGETED") {
      const termCheck = checkStageTwoTermination(state, referenceData, SCREENING_CONFIG);
      if (termCheck.shouldTerminate) {
        terminated = true;
        terminationReason = termCheck.reason;
        state.stage = "COMPLETE";
        await endSession(sessionId, mapTerminationReason(termCheck.reason));
      }
    }

    // Rank next items and get next question (if not terminated)
    let nextQuestion: string | null = null;
    let selectedItemId: string | null = null;

    if (!terminated) {
      const nextRanked = rankItems(state, referenceData, SCREENING_CONFIG);

      if (nextRanked.length === 0) {
        terminated = true;
        terminationReason = "no_items_remaining";
        state.stage = "COMPLETE";
        await endSession(sessionId, "NO_INFO_GAIN");
      } else {
        const nextResult = await callScreeningLLM({
          systemPrompt: SCREENING_SYSTEM_PROMPT,
          messages,
          tools: SCREENING_TOOLS,
          maxToolCalls: SCREENING_CONFIG.maxLlmToolCalls,
          context: {
            screeningState: state,
            rankedItems: nextRanked,
            conversationHistory: messages,
            referenceData,
          },
        });

        nextQuestion = nextResult.message;
        const selectCall = nextResult.toolCalls.find((c) => c.tool === "select_item");
        if (selectCall && selectCall.tool === "select_item") {
          selectedItemId = selectCall.itemId;
        }
      }
    }

    await updateSessionState(sessionId, state);

    return NextResponse.json({
      score,
      impliedScores: impliedScores.map((s) => ({
        itemId: s.itemId,
        score: s.score,
        reasoning: s.reasoning,
      })),
      nextQuestion,
      selectedItemId,
      terminated,
      terminationReason,
      stage: state.stage,
      itemsAdministered: state.itemsAdministered.length,
      estimatedTotal: estimateTotal(state),
    });
  } catch (error) {
    console.error("Failed to process response:", error);
    return NextResponse.json(
      { error: "Failed to process response" },
      { status: 500 },
    );
  }
}

function estimateTotal(state: import("@/lib/screening").ScreeningState): number {
  const base = SCREENING_CONFIG.maxStageOneItems;
  if (state.stage === "TARGETED") {
    return state.itemsAdministered.length + Math.min(10, SCREENING_CONFIG.maxStageTwoItems);
  }
  return Math.min(base + 10, SCREENING_CONFIG.maxTotalItems);
}

function mapTerminationReason(reason: string): "CONFIDENCE_MET" | "NO_INFO_GAIN" | "MAX_ITEMS" | "USER_STOPPED" {
  switch (reason) {
    case "all_conditions_resolved": return "CONFIDENCE_MET";
    case "marginal_info_gain": return "NO_INFO_GAIN";
    case "no_items_remaining": return "NO_INFO_GAIN";
    case "max_stage_two_items":
    case "max_total_items": return "MAX_ITEMS";
    default: return "NO_INFO_GAIN";
  }
}
