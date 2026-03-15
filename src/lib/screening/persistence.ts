import { prisma } from "@/lib/prisma";
import type { PopulationType, ScreeningStage as PrismaScreeningStage, TerminationReason } from "@/generated/prisma/enums";
import type { ScreeningState, KalmanUpdateResult, ConditionResult, ReferenceData } from "./types";
import { initState } from "./state";
import { loadFullReferenceData } from "./loadData";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Map our string literal stage to the Prisma enum value. */
function toPrismaStage(stage: ScreeningState["stage"]): PrismaScreeningStage {
  return stage as PrismaScreeningStage;
}

/** Extract the diagonal of a covariance matrix. */
function covarianceDiag(cov: number[][]): number[] {
  return cov.map((row, i) => row[i]);
}

// ─── Create Session ─────────────────────────────────────────────────────────

/**
 * Create a new screening session.
 * Loads reference data, initializes the prior state, and persists to DB.
 * Returns the session ID, initial state, and reference data for use in-memory.
 */
export async function createSession(
  patientId: string,
  populationType: PopulationType,
): Promise<{
  sessionId: string;
  state: ScreeningState;
  referenceData: ReferenceData;
  correlations: Map<string, number>;
}> {
  const { referenceData, correlations } = await loadFullReferenceData(populationType);
  const state = initState(referenceData, correlations);

  const session = await prisma.screeningSession.create({
    data: {
      patientId,
      populationType,
      stage: toPrismaStage(state.stage),
      spectrumPriorMean: state.spectrumMean,
      spectrumPriorCovariance: state.spectrumCovariance,
      spectrumPosteriorMean: state.spectrumMean,
      spectrumPosteriorCovariance: state.spectrumCovariance,
      conditionPriorMean: [],
      conditionPosteriorMean: [],
      conditionPosteriorVariances: [],
      conditionDimensionOrder: [],
      flaggedSpectra: [],
      itemsAdministered: 0,
    },
  });

  return { sessionId: session.id, state, referenceData, correlations };
}

// ─── Save Response ──────────────────────────────────────────────────────────

/**
 * Save a single item response and its Kalman update metadata.
 * Called after each item is scored (including auto-scored items).
 */
export async function saveResponse(
  sessionId: string,
  itemId: string,
  responseRaw: number,
  responseNormalized: number,
  administrationOrder: number,
  stage: ScreeningState["stage"],
  kalmanResult: KalmanUpdateResult,
): Promise<void> {
  const posteriorDiag = kalmanResult.state.conditionVariances
    ? kalmanResult.state.conditionVariances
    : covarianceDiag(kalmanResult.state.spectrumCovariance);

  const posteriorMean = kalmanResult.state.conditionMean
    ? kalmanResult.state.conditionMean
    : kalmanResult.state.spectrumMean;

  await prisma.sessionResponse.create({
    data: {
      sessionId,
      itemId,
      responseRaw,
      responseNormalized,
      administrationOrder,
      stage: toPrismaStage(stage),
      kalmanGain: kalmanResult.kalmanGain,
      posteriorMeanAfter: posteriorMean,
      posteriorDiagAfter: posteriorDiag,
      runtimeNoiseVariance: kalmanResult.innovationVariance,
      infoGain: kalmanResult.infoGain,
    },
  });
}

// ─── Update Session State ───────────────────────────────────────────────────

/**
 * Persist the current screening state to the session row.
 * Called after each response (or batch of auto-scored responses).
 */
export async function updateSessionState(
  sessionId: string,
  state: ScreeningState,
): Promise<void> {
  await prisma.screeningSession.update({
    where: { id: sessionId },
    data: {
      stage: toPrismaStage(state.stage),
      spectrumPosteriorMean: state.spectrumMean,
      spectrumPosteriorCovariance: state.spectrumCovariance,
      conditionPosteriorMean: state.conditionMean ?? [],
      conditionPosteriorVariances: state.conditionVariances ?? [],
      conditionDimensionOrder: state.conditionDimensionOrder ?? [],
      flaggedSpectra: state.flaggedSpectra,
      itemsAdministered: state.itemsAdministered.length,
      ...(state.stage === "TARGETED" && {
        stageTransitionAt: new Date(),
        conditionPriorMean: state.conditionMean ?? [],
      }),
    },
  });
}

// ─── Initial Trace ──────────────────────────────────────────────────────────

/**
 * Persist the initial trace (tr(Σ₀)) on the session.
 * Called once on the first respond call; subsequent calls are no-ops.
 */
export async function saveInitialTrace(
  sessionId: string,
  initialTrace: number,
): Promise<void> {
  await prisma.screeningSession.update({
    where: { id: sessionId },
    data: { initialTrace },
  });
}

// ─── End Session ────────────────────────────────────────────────────────────

/**
 * Mark a session as terminated.
 */
export async function endSession(
  sessionId: string,
  reason: TerminationReason,
): Promise<void> {
  await prisma.screeningSession.update({
    where: { id: sessionId },
    data: {
      stage: "COMPLETE",
      terminated: true,
      terminationReason: reason,
      completedAt: new Date(),
    },
  });
}

// ─── Save Diagnoses ─────────────────────────────────────────────────────────

/**
 * Save the final diagnostic results for a completed session.
 * Creates one SessionDiagnosis row per assessed condition.
 */
export async function saveDiagnoses(
  sessionId: string,
  results: ConditionResult[],
  referenceData: ReferenceData,
): Promise<void> {
  const data = results.map((r) => {
    const threshold = referenceData.thresholdByCondition.get(r.conditionId);
    return {
      sessionId,
      dimensionId: r.conditionId,
      liability: r.probability > 0.5 ? r.uncertainty + 1 : r.uncertainty, // posterior mean proxy
      uncertainty: r.uncertainty,
      threshold: threshold?.thresholdLiability ?? 0,
      probability: r.probability,
      flagged: r.classification === "likely" || r.classification === "flagged",
    };
  });

  await prisma.sessionDiagnosis.createMany({ data, skipDuplicates: true });
}

// ─── Get Session ────────────────────────────────────────────────────────────

/**
 * Load a full session with all responses and diagnoses.
 */
export async function getSession(sessionId: string) {
  return prisma.screeningSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      responses: { orderBy: { administrationOrder: "asc" } },
      diagnoses: true,
    },
  });
}

/**
 * Reconstruct a ScreeningState from a persisted session.
 * Used when resuming a session.
 *
 * flaggedConditions = conditionDimensionOrder (all conditions enter stage 2).
 * flaggedSpectra is persisted directly (elevated spectra, used for reporting only).
 */
export async function loadSessionState(sessionId: string): Promise<ScreeningState> {
  const session = await getSession(sessionId);

  const itemsAdministered = session.responses.map((r) => ({
    itemId: r.itemId,
    response: r.responseRaw,
    stage: r.stage as ScreeningState["stage"],
  }));

  const conditionDimensionOrder =
    session.conditionDimensionOrder.length > 0 ? session.conditionDimensionOrder : null;

  // Use persisted flaggedSpectra directly
  const flaggedSpectra = session.flaggedSpectra ?? [];
  const flaggedConditions = conditionDimensionOrder ? [...conditionDimensionOrder] : [];

  return {
    stage: session.stage as ScreeningState["stage"],
    spectrumMean: session.spectrumPosteriorMean,
    spectrumCovariance: (session.spectrumPosteriorCovariance ?? session.spectrumPriorCovariance) as number[][],
    conditionMean: session.conditionPosteriorMean.length > 0 ? session.conditionPosteriorMean : null,
    conditionVariances: session.conditionPosteriorVariances.length > 0 ? session.conditionPosteriorVariances : null,
    conditionDimensionOrder,
    itemsAdministered,
    autoScoredItems: [], // Auto-scored items are tracked in responses; not separately reconstructed
    flaggedSpectra,
    flaggedConditions,
  };
}

// ─── List Sessions ──────────────────────────────────────────────────────────

/**
 * List all screening sessions for a patient, ordered by most recent first.
 */
export async function listPatientSessions(patientId: string) {
  return prisma.screeningSession.findMany({
    where: { patientId },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      populationType: true,
      stage: true,
      itemsAdministered: true,
      terminated: true,
      terminationReason: true,
      startedAt: true,
      completedAt: true,
      _count: { select: { diagnoses: { where: { flagged: true } } } },
    },
  });
}
