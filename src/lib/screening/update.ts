import type { ReferenceData, ScreeningState, KalmanUpdateResult } from "./types";
import { computeRuntimeNoise } from "./selection";

// ─── Linear Algebra Helpers ───────────────────────────────────────────────────

/** Matrix-vector multiply: Σ × h → result vector */
function matvec(matrix: number[][], vec: number[]): number[] {
  const n = matrix.length;
  const result = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < vec.length; j++) {
      result[i] += matrix[i][j] * vec[j];
    }
  }
  return result;
}

/** Dot product: aᵀb */
function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/** Trace of a square matrix */
export function trace(matrix: number[][]): number {
  let sum = 0;
  for (let i = 0; i < matrix.length; i++) {
    sum += matrix[i][i];
  }
  return sum;
}

// ─── Spectrum-Level Kalman Update (Stage 1) ───────────────────────────────────

/**
 * Get the loading vector h for an item across all spectra.
 * Returns a vector of length numSpectra where h[i] = loading on spectrum i (0 if none).
 */
function getSpectrumLoadingVector(
  itemId: string,
  refData: ReferenceData,
): number[] {
  const n = refData.spectra.length;
  const h = new Array(n).fill(0);
  const loadings = refData.itemLoadingsByItem.get(itemId) ?? [];

  for (const loading of loadings) {
    // Only use loadings onto spectra (not conditions) for stage 1
    const idx = refData.spectrumIndex.get(loading.dimensionId);
    if (idx !== undefined) {
      h[idx] = loading.loading;
    }
  }

  return h;
}

/**
 * Normalize a raw response to the [0, 1] scale based on item min/max.
 */
export function normalizeResponse(response: number, responseMin: number, responseMax: number): number {
  if (responseMax === responseMin) return 0.5;
  return (response - responseMin) / (responseMax - responseMin);
}

/**
 * Kalman update on the spectrum-level state (Stage 1: BROAD_SCREENING).
 *
 * Given a scored item:
 *   h = loading vector
 *   ŷ = hᵀμ (predicted response)
 *   δ = y − ŷ (innovation)
 *   S = hᵀΣh + σ² (innovation variance)
 *   K = Σh / S (Kalman gain)
 *   μ_new = μ + Kδ
 *   Σ_new = Σ − K(hᵀΣ) = (I − Khᵀ)Σ
 */
export function kalmanUpdateSpectrum(
  state: ScreeningState,
  itemId: string,
  normalizedResponse: number,
  refData: ReferenceData,
): KalmanUpdateResult {
  const n = state.spectrumMean.length;
  const mu = [...state.spectrumMean];
  const sigma = state.spectrumCovariance.map((row) => [...row]);

  const h = getSpectrumLoadingVector(itemId, refData);
  const noiseVar = computeRuntimeNoise(
    itemId,
    state.itemsAdministered.map((a) => a.itemId),
    refData,
  );

  // Predicted response and innovation
  const yHat = dot(h, mu);
  const delta = normalizedResponse - yHat;

  // Innovation variance: S = hᵀΣh + σ²
  const sigmaH = matvec(sigma, h); // Σh
  const S = dot(h, sigmaH) + noiseVar;

  if (S <= 0) {
    // Degenerate case — no update possible
    return {
      state: { ...state },
      kalmanGain: new Array(n).fill(0),
      innovationVariance: S,
      infoGain: 0,
    };
  }

  // Kalman gain: K = Σh / S
  const K = sigmaH.map((v) => v / S);

  // Trace before update
  const traceBefore = trace(sigma);

  // Mean update: μ_new = μ + Kδ
  const muNew = mu.map((m, i) => m + K[i] * delta);

  // Covariance update: Σ_new = Σ − K(hᵀΣ)
  // hᵀΣ = (Σh)ᵀ = sigmaH (since Σ is symmetric)
  const sigmaNew = sigma.map((row, i) =>
    row.map((val, j) => val - K[i] * sigmaH[j]),
  );

  const traceAfter = trace(sigmaNew);

  const newState: ScreeningState = {
    ...state,
    spectrumMean: muNew,
    spectrumCovariance: sigmaNew,
  };

  return {
    state: newState,
    kalmanGain: K,
    innovationVariance: S,
    infoGain: traceBefore - traceAfter,
  };
}

// ─── Condition-Level Kalman Update (Stage 2) ──────────────────────────────────

/**
 * Get the loading of an item onto a specific condition.
 */
function getConditionLoading(
  itemId: string,
  conditionId: string,
  refData: ReferenceData,
): number {
  const loadings = refData.itemLoadingsByItem.get(itemId) ?? [];
  const match = loadings.find((l) => l.dimensionId === conditionId);
  return match?.loading ?? 0;
}

/**
 * Scalar Kalman update on a single condition (Stage 2: TARGETED).
 *
 * In stage 2, conditions are independent (diagonal covariance).
 * Each item–condition pair is a 1D Kalman update:
 *   ŷ = h · μ
 *   δ = y − ŷ
 *   S = h² · σ²_condition + σ²_noise
 *   K = h · σ²_condition / S
 *   μ_new = μ + K · δ
 *   σ²_new = (1 − K · h) · σ²_condition
 */
export function kalmanUpdateCondition(
  state: ScreeningState,
  itemId: string,
  normalizedResponse: number,
  refData: ReferenceData,
): KalmanUpdateResult {
  if (!state.conditionMean || !state.conditionVariances || !state.conditionDimensionOrder) {
    throw new Error("Cannot run condition-level update before stage 2 transition");
  }

  const condMean = [...state.conditionMean];
  const condVar = [...state.conditionVariances];
  const noiseVar = computeRuntimeNoise(
    itemId,
    state.itemsAdministered.map((a) => a.itemId),
    refData,
  );

  let totalInfoGain = 0;
  const gains: number[] = new Array(condMean.length).fill(0);

  for (let i = 0; i < state.conditionDimensionOrder.length; i++) {
    const condId = state.conditionDimensionOrder[i];
    const h = getConditionLoading(itemId, condId, refData);

    if (h === 0) continue;

    const yHat = h * condMean[i];
    const delta = normalizedResponse - yHat;
    const S = h * h * condVar[i] + noiseVar;

    if (S <= 0) continue;

    const K = (h * condVar[i]) / S;
    const varBefore = condVar[i];

    condMean[i] += K * delta;
    condVar[i] = (1 - K * h) * condVar[i];

    gains[i] = K;
    totalInfoGain += varBefore - condVar[i];
  }

  const newState: ScreeningState = {
    ...state,
    conditionMean: condMean,
    conditionVariances: condVar,
  };

  return {
    state: newState,
    kalmanGain: gains,
    innovationVariance: noiseVar,
    infoGain: totalInfoGain,
  };
}

// ─── Unified Update ───────────────────────────────────────────────────────────

/**
 * Run a Kalman update appropriate for the current stage.
 */
export function kalmanUpdate(
  state: ScreeningState,
  itemId: string,
  normalizedResponse: number,
  refData: ReferenceData,
): KalmanUpdateResult {
  if (state.stage === "BROAD_SCREENING" || state.stage === "INTAKE") {
    return kalmanUpdateSpectrum(state, itemId, normalizedResponse, refData);
  } else if (state.stage === "TARGETED") {
    return kalmanUpdateCondition(state, itemId, normalizedResponse, refData);
  } else {
    throw new Error(`Cannot update in stage: ${state.stage}`);
  }
}

/**
 * Apply multiple item updates sequentially (for batch auto-scoring).
 */
export function batchUpdate(
  state: ScreeningState,
  items: { itemId: string; normalizedResponse: number }[],
  refData: ReferenceData,
): { state: ScreeningState; results: KalmanUpdateResult[] } {
  let current = state;
  const results: KalmanUpdateResult[] = [];

  for (const { itemId, normalizedResponse } of items) {
    const result = kalmanUpdate(current, itemId, normalizedResponse, refData);
    current = result.state;
    results.push(result);
  }

  return { state: current, results };
}
