import { NextRequest, NextResponse } from "next/server";
import { getSession, loadSessionState, updateSessionState, saveResponse, endSession, saveInitialTrace } from "@/lib/screening/persistence";
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
 * Phase 1 & 2: Accept Likert score from the patient, apply Kalman update,
 * check termination, then ask the LLM to select + frame the next item.
 *
 * Body: { score: number, pendingItemId: string, conversationHistory: Message[] }
 * Returns: { score, nextQuestion, selectedItemId, terminated, terminationReason, stage, itemsAdministered, estimatedTotal, usedFallback }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { score: rawScore, pendingItemId, conversationHistory = [] } = body;

    if (rawScore === undefined || rawScore === null || typeof rawScore !== "number") {
      return NextResponse.json({ error: "score is required (number)" }, { status: 400 });
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

    let state = reconstructState(session);

    // Use persisted initial trace, or compute and persist on first call
    let initialTrace = session.initialTrace;
    if (initialTrace === null || initialTrace === undefined) {
      initialTrace = trace(
        (session.spectrumPriorCovariance as number[][]),
      );
      await saveInitialTrace(sessionId, initialTrace);
    }

    // ── Apply the Likert score directly ──
    const pendingItem = referenceData.items.find((i) => i.id === pendingItemId);
    const score = pendingItem
      ? Math.max(pendingItem.responseMin, Math.min(pendingItem.responseMax, Math.round(rawScore)))
      : Math.round(rawScore);

    if (pendingItem) {
      const normalized = normalizeResponse(score, pendingItem.responseMin, pendingItem.responseMax, pendingItem.normativeMean, pendingItem.normativeSD, pendingItem.normativeResponseDist, pendingItem.isReverseCoded);

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

    // ── Check termination / stage transition ──
    let terminated = false;
    let terminationReason: string | null = null;

    if (state.stage === "BROAD_SCREENING") {
      const termCheck = checkStageOneTermination(state, initialTrace, referenceData, SCREENING_CONFIG);
      if (termCheck.shouldTerminate) {
        state = transitionToStageTwo(state, referenceData, SCREENING_CONFIG);
      }
    } else if (state.stage === "TARGETED") {
      const termCheck = checkStageTwoTermination(state, referenceData, SCREENING_CONFIG);
      if (termCheck.shouldTerminate) {
        terminated = true;
        terminationReason = termCheck.reason;
        state.stage = "COMPLETE";
        await endSession(sessionId, mapTerminationReason(termCheck.reason));
      }
    }

    // ── LLM selects + frames the next item ──
    let nextQuestion: string | null = null;
    let selectedItemId: string | null = null;
    let selectedItem: { itemId: string; text: string; responseMin: number; responseMax: number; responseLabels: Record<string, string> } | null = null;
    let usedFallback = false;

    if (!terminated) {
      const nextRanked = rankItems(state, referenceData, SCREENING_CONFIG);

      if (nextRanked.length === 0) {
        terminated = true;
        terminationReason = "no_items_remaining";
        state.stage = "COMPLETE";
        await endSession(sessionId, "NO_INFO_GAIN");
      } else {
        const validItemIds = new Set(nextRanked.map((r) => r.itemId));

        // Ask LLM to pick + frame the next item
        try {
          const llmResult = await callScreeningLLM({
            systemPrompt: SCREENING_SYSTEM_PROMPT,
            messages: conversationHistory.map((m: Message) => ({ role: m.role, content: m.content })),
            tools: SCREENING_TOOLS,
            maxToolCalls: SCREENING_CONFIG.maxLlmToolCalls,
            context: {
              screeningState: state,
              rankedItems: nextRanked,
              conversationHistory: conversationHistory.map((m: Message) => ({ role: m.role, content: m.content })),
              referenceData,
            },
          });

          const selectCall = llmResult.toolCalls.find((c) => c.tool === "select_item");
          if (selectCall && selectCall.tool === "select_item" && validItemIds.has(selectCall.itemId)) {
            selectedItemId = selectCall.itemId;
            nextQuestion = llmResult.message;
          }
        } catch (err) {
          console.error("[LLM ERROR]", err);
        }

        // Fallback: algo top pick
        if (!selectedItemId) {
          usedFallback = true;
          selectedItemId = nextRanked[0].itemId;
          nextQuestion = nextRanked[0].item.text;
        }

        // Build item metadata from reference data
        const itemRef = referenceData.items.find((i) => i.id === selectedItemId);
        if (itemRef) {
          selectedItem = {
            itemId: itemRef.id,
            text: nextQuestion || itemRef.text,
            responseMin: itemRef.responseMin,
            responseMax: itemRef.responseMax,
            responseLabels: itemRef.responseLabels,
          };
          if (usedFallback) {
            selectedItem.text += "\n\n*_Item selected by algorithm._*";
          }
        }
      }
    }

    await updateSessionState(sessionId, state);

    return NextResponse.json({
      score,
      nextQuestion,
      selectedItemId,
      selectedItem,
      terminated,
      terminationReason,
      stage: state.stage,
      itemsAdministered: state.itemsAdministered.length,
      estimatedTotal: estimateTotal(state),
      usedFallback,
    });
  } catch (error) {
    console.error("Failed to process response:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to process response: ${message}` },
      { status: 500 },
    );
  }
}

/** Reconstruct ScreeningState from an already-fetched session (avoids second DB query). */
function reconstructState(session: Awaited<ReturnType<typeof getSession>>) {
  const itemsAdministered = session.responses.map((r) => ({
    itemId: r.itemId,
    response: r.responseRaw,
    stage: r.stage as "INTAKE" | "BROAD_SCREENING" | "TARGETED" | "COMPLETE",
  }));

  const conditionDimensionOrder =
    session.conditionDimensionOrder.length > 0 ? session.conditionDimensionOrder : null;

  const flaggedSpectra = session.flaggedSpectra ?? [];
  const flaggedConditions = conditionDimensionOrder ? [...conditionDimensionOrder] : [];

  return {
    stage: session.stage as "INTAKE" | "BROAD_SCREENING" | "TARGETED" | "COMPLETE",
    spectrumMean: session.spectrumPosteriorMean,
    spectrumCovariance: (session.spectrumPosteriorCovariance ?? session.spectrumPriorCovariance) as number[][],
    conditionMean: session.conditionPosteriorMean.length > 0 ? session.conditionPosteriorMean : null,
    conditionVariances: session.conditionPosteriorVariances.length > 0 ? session.conditionPosteriorVariances : null,
    conditionDimensionOrder,
    itemsAdministered,
    autoScoredItems: [] as { itemId: string; response: number; source: "free_text" | "implied" }[],
    flaggedSpectra,
    flaggedConditions,
  };
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
