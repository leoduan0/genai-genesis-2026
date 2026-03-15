import { NextRequest, NextResponse } from "next/server";
import { getSession, loadSessionState } from "@/lib/screening/persistence";
import { loadFullReferenceData } from "@/lib/screening/loadData";
import { generateDiagnosticProfile, SCREENING_CONFIG } from "@/lib/screening";
import { callScreeningLLM } from "@/lib/screening/llm";
import { SCREENING_SYSTEM_PROMPT, SCREENING_TOOLS } from "@/lib/screening/llm";
import type { Message } from "@/lib/screening/llm";
import type { PopulationType } from "@/generated/prisma/enums";

type RouteParams = { params: Promise<{ sessionId: string }> };

/**
 * POST /api/screening/[sessionId]/followup
 *
 * Phase 4: Patient asks a question about their report.
 * Passes the question to the screening LLM with report context.
 *
 * Body: { question: string, conversationHistory?: Message[] }
 * Returns: { answer: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { question, conversationHistory = [] } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const session = await getSession(sessionId);
    const { referenceData } = await loadFullReferenceData(
      session.populationType as PopulationType,
    );
    const state = await loadSessionState(sessionId);

    // Generate the diagnostic profile for context
    const profile = generateDiagnosticProfile(state, referenceData, SCREENING_CONFIG);

    // Build context message with the report summary
    const reportContext = buildReportContextMessage(profile);

    const messages: Message[] = [
      { role: "system", content: reportContext },
      ...conversationHistory.map((m: Message) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: question },
    ];

    const result = await callScreeningLLM({
      systemPrompt: SCREENING_SYSTEM_PROMPT,
      messages,
      tools: SCREENING_TOOLS,
      maxToolCalls: SCREENING_CONFIG.maxLlmToolCalls,
      context: {
        screeningState: state,
        conversationHistory: messages,
        referenceData,
      },
    });

    return NextResponse.json({
      answer: result.message,
    });
  } catch (error) {
    console.error("Failed to process followup:", error);
    return NextResponse.json(
      { error: "Failed to process followup" },
      { status: 500 },
    );
  }
}

function buildReportContextMessage(
  profile: import("@/lib/screening").DiagnosticProfile,
): string {
  const flaggedList = profile.flagged
    .map((c) => `- ${c.name}: ${c.classification} (P=${(c.probability * 100).toFixed(0)}% ± ${(c.uncertainty * 100).toFixed(0)}%)`)
    .join("\n");

  const unflaggedList = profile.unflagged
    .map((c) => `- ${c.name}: ${c.classification} (P=${(c.probability * 100).toFixed(0)}%)`)
    .join("\n");

  return `The patient is asking about their screening report. Here are the results:

Flagged conditions:
${flaggedList || "(none)"}

Other conditions screened:
${unflaggedList || "(none)"}

Not assessed: ${profile.notAssessed.map((s) => s.name).join(", ") || "(all areas assessed)"}

Answer the patient's question using this context. Remember: never say "you have" or "you don't have" — always use "your responses suggest" or "it may be worth discussing."`;
}
