import type { ReferenceData, ScreeningState, KalmanUpdateResult } from "./types";
import { computeRuntimeNoise } from "./selection";

// ─── Linear Algebra Helpers ───────────────────────────────────────────────────

/** Matrix-vector multiply: Σ × h → result vector */
export function matvec(matrix: number[][], vec: number[]): number[] {
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
export function dot(a: number[], b: number[]): number {
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
 * Standard normal CDF approximation (Abramowitz & Stegun 26.2.17, |error| < 7.5e-8).
 */
function normalCDF(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1.0 / (1.0 + p * Math.abs(x));
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1.0 + sign * y);
}

/**
 * Inverse standard normal CDF (rational approximation, Beasley-Springer-Moro).
 */
function normalInvCDF(p: number): number {
  if (p <= 0) return -4.0;  // clamp
  if (p >= 1) return 4.0;   // clamp
  if (p === 0.5) return 0;

  // Rational approximation (Peter Acklam)
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

/**
 * Normalize a raw Likert response to the latent scale using probit normal scores.
 *
 * The observation model is y = hᵀz + ε, where z ~ N(0,1) at the population mean.
 *
 * **Probit transform (preferred):** Given the normative response distribution
 * [P(0), P(1), ..., P(K)], compute cumulative proportions and map each response
 * category to the midpoint of the corresponding standard normal quantile interval:
 *   normalScore(k) = Φ⁻¹((F(k-1) + F(k)) / 2)
 *
 * This correctly handles skewed distributions. E.g., suicidality items where 96%
 * of people answer 0: response 0 → ≈ -0.05, response 3 → ≈ 2.97. Compare to
 * naive midpoint centering which would map response 3 → 0.5 (absurdly low) or
 * mean/SD z-scoring which would map it to ~9 SD (absurdly high).
 *
 * **Fallback:** center on scale midpoint and scale to unit range. This is wrong
 * for skewed items but preserves backwards compatibility when no norms are available.
 */
export function normalizeResponse(
  response: number,
  responseMin: number,
  responseMax: number,
  normativeMean?: number,
  normativeSD?: number,
  normativeResponseDist?: number[],
  isReverseCoded?: boolean,
): number {
  // Reverse-coded items: flip response so that higher raw = higher pathology.
  // E.g., WHO-5 "I feel cheerful" on 0-5: response 5 (healthy) → flipped to 0 (pathological).
  // This must happen before probit lookup because the normativeResponseDist is stored
  // in raw response order (P(0), P(1), ..., P(max)), and flipping makes the probit
  // transform assign extreme scores to clinically meaningful responses.
  if (isReverseCoded) {
    response = responseMax + responseMin - response;
  }

  // Preferred: probit normal scores from response distribution
  if (normativeResponseDist && normativeResponseDist.length > 0) {
    const idx = Math.round(response) - responseMin;
    const clampedIdx = Math.max(0, Math.min(normativeResponseDist.length - 1, idx));

    // Build cumulative distribution
    let cumBefore = 0;
    for (let i = 0; i < clampedIdx; i++) {
      cumBefore += normativeResponseDist[i];
    }
    const cumAfter = cumBefore + normativeResponseDist[clampedIdx];

    // Midpoint of the quantile interval, clamped to avoid ±∞
    const midCum = Math.max(0.001, Math.min(0.999, (cumBefore + cumAfter) / 2));
    return normalInvCDF(midCum);
  }

  // Legacy fallback: center on scale midpoint, map to [-0.5, +0.5]
  if (responseMax === responseMin) return 0;
  const midpoint = (responseMin + responseMax) / 2;
  return (response - midpoint) / (responseMax - responseMin);
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
