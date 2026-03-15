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

    // Single DB fetch — reuse for both session metadata and state reconstruction
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

    // Reconstruct state from the already-fetched session (avoid second DB query)
    let state = reconstructState(session);

    // Use persisted initial trace, or compute and persist on first call
    let initialTrace = session.initialTrace;
    if (initialTrace === null || initialTrace === undefined) {
      initialTrace = trace(
        (session.spectrumPriorCovariance as number[][]),
      );
      await saveInitialTrace(sessionId, initialTrace);
    }

    // Build messages for LLM
    const messages: Message[] = [
      ...conversationHistory.map((m: Message) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: text },
    ];

    // Parse score from patient response (inline — skip first LLM call for placeholder)
    let score: number | null = null;
    const scoreMatch = text.match(/\d+/);
    if (scoreMatch) {
      score = parseInt(scoreMatch[0], 10);
    }

    const impliedScores: { itemId: string; score: number; reasoning: string }[] = [];

    // Validate and apply score for the pending item
    const pendingItem = referenceData.items.find((i) => i.id === pendingItemId);
    if (score !== null && pendingItem) {
      score = Math.max(pendingItem.responseMin, Math.min(pendingItem.responseMax, Math.round(score)));
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

    // Check termination / stage transition
    let terminated = false;
    let terminationReason: string | null = null;

    if (state.stage === "BROAD_SCREENING") {
      const termCheck = checkStageOneTermination(state, initialTrace, referenceData, SCREENING_CONFIG);
      if (termCheck.shouldTerminate) {
        state = transitionToStageTwo(state, referenceData, SCREENING_CONFIG);
      }
    } else if (state.stage === "TARGETED") {
      const termCheck = checkStageTwoTermination(state, referenceData, SCREENING_CONFIG);
      console.log("[STAGE2 TERM]", {
        shouldTerminate: termCheck.shouldTerminate,
        reason: termCheck.reason,
        stageTwoItems: state.itemsAdministered.filter(a => a.stage === "TARGETED").length,
        conditionCount: state.conditionDimensionOrder?.length,
        flaggedConditions: state.flaggedConditions?.length,
        maxVar: state.conditionVariances ? Math.max(...state.conditionVariances) : null,
      });
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

      if (state.stage === "TARGETED" || state.stage === "BROAD_SCREENING") {
        console.log("[RANK]", {
          stage: state.stage,
          candidates: nextRanked.length,
          top3: nextRanked.slice(0, 3).map(r => ({
            id: r.itemId.slice(0, 8),
            evr: r.expectedVarianceReduction.toFixed(6),
            tier: r.item.tier,
            loadings: (referenceData.itemLoadingsByItem.get(r.itemId) ?? []).map(l => ({
              dim: l.dimensionId.slice(0, 8),
              isCondition: referenceData.conditionIndex.has(l.dimensionId),
              loading: l.loading,
            })),
          })),
        });
      }
      if (nextRanked.length === 0) {
        console.log("[STAGE2 NO ITEMS]", {
          stage: state.stage,
          flaggedConditions: state.flaggedConditions,
          totalCandidates: referenceData.items.length,
          administered: state.itemsAdministered.length,
        });
        terminated = true;
        terminationReason = "no_items_remaining";
        state.stage = "COMPLETE";
        await endSession(sessionId, "NO_INFO_GAIN");
      } else {
        // Use single LLM call — it both selects the item and frames the question
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
