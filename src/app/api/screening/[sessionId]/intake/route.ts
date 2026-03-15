import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSessionState, saveResponse } from "@/lib/screening/persistence";
import { loadFullReferenceData } from "@/lib/screening/loadData";
import { batchUpdate, normalizeResponse, rankItems, trace } from "@/lib/screening";
import { SCREENING_CONFIG } from "@/lib/screening/config";
import { callScreeningLLM } from "@/lib/screening/llm";
import { SCREENING_SYSTEM_PROMPT, SCREENING_TOOLS } from "@/lib/screening/llm";
import { loadSessionState } from "@/lib/screening/persistence";
import type { PopulationType } from "@/generated/prisma/enums";

type RouteParams = { params: Promise<{ sessionId: string }> };

/**
 * POST /api/screening/[sessionId]/intake
 *
 * Phase 0: Accept free-text from the patient, run LLM analysis to auto-score
 * items, apply Kalman updates for any auto-scored items, transition to
 * BROAD_SCREENING, and return the first question.
 *
 * Body: { text: string }
 * Returns: { autoScoredCount, firstQuestion, stage, itemsAdministered }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 },
      );
    }

    const session = await getSession(sessionId);

    if (session.stage !== "INTAKE") {
      return NextResponse.json(
        { error: `Session is in stage ${session.stage}, expected INTAKE` },
        { status: 400 },
      );
    }

    const { referenceData } = await loadFullReferenceData(
      session.populationType as PopulationType,
    );
    let state = await loadSessionState(sessionId);

    // Call LLM to analyze free text and potentially auto-score items
    const llmResult = await callScreeningLLM({
      systemPrompt: SCREENING_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: text },
      ],
      tools: SCREENING_TOOLS,
      maxToolCalls: SCREENING_CONFIG.maxLlmToolCalls,
      context: {
        screeningState: state,
        conversationHistory: [{ role: "user", content: text }],
        referenceData,
      },
    });

    // Extract any implied scores from the LLM's tool calls
    const impliedScores: { itemId: string; normalizedResponse: number }[] = [];
    for (const call of llmResult.toolCalls) {
      if (call.tool === "flag_implied_scores") {
        for (const s of call.scores) {
          const item = referenceData.items.find((i) => i.id === s.itemId);
          if (item) {
            impliedScores.push({
              itemId: s.itemId,
              normalizedResponse: normalizeResponse(s.score, item.responseMin, item.responseMax, item.normativeMean, item.normativeSD, item.normativeResponseDist, item.isReverseCoded),
            });
          }
        }
      }
    }

    // Batch update state with auto-scored items
    if (impliedScores.length > 0) {
      const batchResult = batchUpdate(state, impliedScores, referenceData);
      state = batchResult.state;

      // Save each auto-scored response
      for (let i = 0; i < impliedScores.length; i++) {
        const s = impliedScores[i];
        const item = referenceData.items.find((it) => it.id === s.itemId);
        await saveResponse(
          sessionId,
          s.itemId,
          item ? Math.round(s.normalizedResponse * (item.responseMax - item.responseMin) + item.responseMin) : 0,
          s.normalizedResponse,
          i + 1,
          "INTAKE",
          batchResult.results[i],
        );
      }

      // Track auto-scored items in state
      for (const s of impliedScores) {
        state.autoScoredItems.push({
          itemId: s.itemId,
          response: s.normalizedResponse,
          source: "free_text",
        });
      }
    }

    // Transition to BROAD_SCREENING
    state.stage = "BROAD_SCREENING";

    // Rank items for the first question
    const ranked = rankItems(state, referenceData, SCREENING_CONFIG);

    // Get the first question via LLM
    const firstQuestionResult = await callScreeningLLM({
      systemPrompt: SCREENING_SYSTEM_PROMPT,
      messages: [],
      tools: SCREENING_TOOLS,
      maxToolCalls: SCREENING_CONFIG.maxLlmToolCalls,
      context: {
        screeningState: state,
        rankedItems: ranked,
        conversationHistory: [{ role: "user", content: text }],
        referenceData,
      },
    });

    // Extract which item was selected
    const selectedItemCall = firstQuestionResult.toolCalls.find(
      (c) => c.tool === "select_item",
    );

    await updateSessionState(sessionId, state);

    return NextResponse.json({
      autoScoredCount: impliedScores.length,
      firstQuestion: firstQuestionResult.message,
      selectedItemId: selectedItemCall && "itemId" in selectedItemCall ? selectedItemCall.itemId : null,
      stage: state.stage,
      itemsAdministered: state.itemsAdministered.length,
    });
  } catch (error) {
    console.error("Failed to process intake:", error);
    return NextResponse.json(
      { error: "Failed to process intake" },
      { status: 500 },
    );
  }
}
