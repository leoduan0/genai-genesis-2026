import { NextRequest, NextResponse } from "next/server";
import { getSession, endSession } from "@/lib/screening/persistence";

type RouteParams = { params: Promise<{ sessionId: string }> };

/**
 * GET /api/screening/[sessionId]
 *
 * Get current session state including responses and diagnoses.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const session = await getSession(sessionId);

    return NextResponse.json({
      id: session.id,
      patientId: session.patientId,
      populationType: session.populationType,
      stage: session.stage,
      itemsAdministered: session.itemsAdministered,
      terminated: session.terminated,
      terminationReason: session.terminationReason,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      spectrumPosteriorMean: session.spectrumPosteriorMean,
      conditionPosteriorMean: session.conditionPosteriorMean,
      conditionPosteriorVariances: session.conditionPosteriorVariances,
      conditionDimensionOrder: session.conditionDimensionOrder,
      responses: session.responses,
      diagnoses: session.diagnoses,
    });
  } catch (error) {
    console.error("Failed to get session:", error);
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 },
    );
  }
}

/**
 * POST /api/screening/[sessionId]
 *
 * End the session manually (e.g., patient stops early).
 * Body: { reason?: "USER_STOPPED" }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const reason = body.reason ?? "USER_STOPPED";

    await endSession(sessionId, reason);

    return NextResponse.json({ success: true, stage: "COMPLETE" });
  } catch (error) {
    console.error("Failed to end session:", error);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 },
    );
  }
}
