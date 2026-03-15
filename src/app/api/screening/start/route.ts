import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/screening/persistence";
import type { PopulationType } from "@/generated/prisma/enums";

const VALID_POPULATION_TYPES: PopulationType[] = [
  "GENERAL",
  "CLINICAL",
  "COLLEGE",
  "PRIMARY_CARE",
];

/**
 * POST /api/screening/start
 *
 * Create a new screening session. Loads reference data, initializes priors,
 * and persists the session to DB.
 *
 * Body: { patientId: string, populationType?: PopulationType }
 * Returns: { sessionId, stage, spectrumCount, conditionCount }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, populationType = "GENERAL" } = body;

    if (!patientId || typeof patientId !== "string") {
      return NextResponse.json(
        { error: "patientId is required" },
        { status: 400 },
      );
    }

    if (!VALID_POPULATION_TYPES.includes(populationType)) {
      return NextResponse.json(
        { error: `Invalid populationType. Must be one of: ${VALID_POPULATION_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    const { sessionId, state, referenceData } = await createSession(
      patientId,
      populationType,
    );

    return NextResponse.json({
      sessionId,
      stage: state.stage,
      spectrumCount: referenceData.spectra.length,
      conditionCount: referenceData.conditions.length,
    });
  } catch (error) {
    console.error("Failed to start screening session:", error);
    return NextResponse.json(
      { error: "Failed to start screening session" },
      { status: 500 },
    );
  }
}
