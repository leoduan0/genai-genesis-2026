import { NextRequest, NextResponse } from "next/server";
import { getSession, loadSessionState, saveDiagnoses } from "@/lib/screening/persistence";
import { loadFullReferenceData } from "@/lib/screening/loadData";
import { generateDiagnosticProfile, SCREENING_CONFIG } from "@/lib/screening";
import { callReportLLM } from "@/lib/screening/llm";
import { REPORT_SYSTEM_PROMPT } from "@/lib/screening/llm";
import type { PopulationType } from "@/generated/prisma/enums";

type RouteParams = { params: Promise<{ sessionId: string }> };

/**
 * GET /api/screening/[sessionId]/report
 *
 * Phase 3: Generate diagnostic profile and natural language report.
 * The session must be COMPLETE (or the caller accepts partial results).
 *
 * Returns: { diagnosticProfile, report }
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const session = await getSession(sessionId);

    const { referenceData } = await loadFullReferenceData(
      session.populationType as PopulationType,
    );
    const state = await loadSessionState(sessionId);

    // Generate structured diagnostic profile from math engine
    const diagnosticProfile = generateDiagnosticProfile(
      state,
      referenceData,
      SCREENING_CONFIG,
    );

    // Generate natural language report via LLM
    const report = await callReportLLM({
      systemPrompt: REPORT_SYSTEM_PROMPT,
      diagnosticProfile,
      conversationHistory: [],
      referenceData,
    });

    // Persist diagnoses if session is complete and not yet saved
    // Wrapped in try-catch to handle race conditions (e.g., React StrictMode double-fetch)
    if (session.stage === "COMPLETE" && session.diagnoses.length === 0) {
      try {
        const allResults = [...diagnosticProfile.flagged, ...diagnosticProfile.unflagged];
        await saveDiagnoses(sessionId, allResults, referenceData);
      } catch (e) {
        // Ignore duplicate key errors — diagnoses were already saved by a concurrent request
        console.warn("saveDiagnoses failed (likely concurrent request):", e);
      }
    }

    return NextResponse.json({
      diagnosticProfile,
      report,
      sessionMeta: {
        stage: session.stage,
        itemsAdministered: session.itemsAdministered,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      },
    });
  } catch (error) {
    console.error("Failed to generate report:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate report: ${message}` },
      { status: 500 },
    );
  }
}
