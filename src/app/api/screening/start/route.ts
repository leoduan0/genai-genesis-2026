import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/screening/persistence";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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
 * Create a new screening session. Resolves patient from auth,
 * loads reference data, initializes priors, and persists to DB.
 *
 * Body: { populationType?: PopulationType }
 * Returns: { sessionId, stage, spectrumCount, conditionCount }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patient = await prisma.patient.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { populationType = "GENERAL" } = body;

    if (!VALID_POPULATION_TYPES.includes(populationType)) {
      return NextResponse.json(
        { error: `Invalid populationType. Must be one of: ${VALID_POPULATION_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    const { sessionId, state, referenceData } = await createSession(
      patient.id,
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
