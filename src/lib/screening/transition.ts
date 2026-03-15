import type { ScreeningConfig } from "./config";
import type { ReferenceData, ScreeningState, TerminationCheck } from "./types";
import { trace } from "./update";
import { rankItems } from "./selection";

// ─── Eigenvalue Computation ───────────────────────────────────────────────────

/**
 * Compute eigenvalues of a symmetric matrix using the Jacobi method.
 * Returns eigenvalues sorted ascending.
 *
 * For our 8×8 spectrum covariance this is fast and numerically stable.
 */
export function eigenvalues(matrix: number[][]): number[] {
  const n = matrix.length;
  // Work on a copy
  const A = matrix.map((row) => [...row]);
  const maxIter = 100 * n * n;

  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(A[i][j]) > maxVal) {
          maxVal = Math.abs(A[i][j]);
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < 1e-12) break;

    // Compute Jacobi rotation
    const theta =
      Math.abs(A[p][p] - A[q][q]) < 1e-15
        ? Math.PI / 4
        : 0.5 * Math.atan2(2 * A[p][q], A[p][p] - A[q][q]);

    const c = Math.cos(theta);
    const s = Math.sin(theta);

    // Apply rotation: A' = GᵀAG
    const rowP = [...A[p]];
    const rowQ = [...A[q]];

    for (let i = 0; i < n; i++) {
      A[p][i] = c * rowP[i] + s * rowQ[i];
      A[q][i] = -s * rowP[i] + c * rowQ[i];
    }

    const colP = A.map((row) => row[p]);
    const colQ = A.map((row) => row[q]);

    for (let i = 0; i < n; i++) {
      A[i][p] = c * colP[i] + s * colQ[i];
      A[i][q] = -s * colP[i] + c * colQ[i];
    }

    // Fix numerical asymmetry
    A[p][q] = 0;
    A[q][p] = 0;
  }

  // Eigenvalues are on the diagonal
  const eigs = A.map((row, i) => row[i]);
  eigs.sort((a, b) => a - b);
  return eigs;
}

// ─── Stage 1 Termination ──────────────────────────────────────────────────────

/**
 * Check whether stage 1 (broad screening) should end.
 *
 * Three criteria (any one triggers):
 * 1. Eigenvalue ratio of Σ_spectrum exceeds threshold — the covariance is
 *    highly anisotropic, meaning we've resolved some spectra well but not others.
 *    Further broad items won't help the poorly-resolved ones.
 * 2. Best item's expected variance reduction < fraction of initial trace — marginal
 *    returns have diminished below the threshold.
 * 3. Items administered >= maxStageOneItems.
 */
export function checkStageOneTermination(
  state: ScreeningState,
  initialTrace: number,
  refData: ReferenceData,
  config: ScreeningConfig,
): TerminationCheck {
  const stageOneItems = state.itemsAdministered.filter(
    (a) => a.stage === "BROAD_SCREENING",
  ).length;

  // Criterion 3: item cap
  if (stageOneItems >= config.maxStageOneItems) {
    return { shouldTerminate: true, reason: "max_stage_one_items" };
  }

  // Criterion 1: eigenvalue ratio
  const eigs = eigenvalues(state.spectrumCovariance);
  const minEig = eigs[0];
  const maxEig = eigs[eigs.length - 1];

  if (minEig > 1e-10) {
    const ratio = maxEig / minEig;
    if (ratio > config.eigenvalueRatioThreshold) {
      return { shouldTerminate: true, reason: "eigenvalue_ratio" };
    }
  }

  // Criterion 2: marginal info gain too small
  const ranked = rankItems(state, refData, config);
  if (ranked.length > 0) {
    const bestReduction = ranked[0].expectedVarianceReduction;
    if (bestReduction < config.minVarianceReductionFraction * initialTrace) {
      return { shouldTerminate: true, reason: "marginal_info_gain" };
    }
  } else {
    // No items left to administer
    return { shouldTerminate: true, reason: "no_items_remaining" };
  }

  return { shouldTerminate: false, reason: "" };
}

// ─── Stage 1 → Stage 2 Transition ────────────────────────────────────────────

/**
 * Transition from broad screening (spectrum-level) to targeted screening
 * (condition-level).
 *
 * 1. Flag spectra where μⱼ > spectrumFlagMeanPercentile OR
 *    √Σⱼⱼ > spectrumFlagUncertaintyRatio × prior √Σⱼⱼ (= 1.0).
 *
 * 2. For each condition under flagged spectra:
 *    - μ_condition = liabilityMean (from BaseRate) + L_loading × μ_spectrum_posterior
 *    - Σ_condition = λ² × Σ_spectrum_posterior + (1 − λ²)
 *    Where λ is the condition's primary loading on its parent spectrum.
 *
 * 3. Set conditionDimensionOrder to the IDs of conditions under flagged spectra.
 */
export function transitionToStageTwo(
  state: ScreeningState,
  refData: ReferenceData,
  config: ScreeningConfig,
): ScreeningState {
  // 1. Flag spectra
  const flaggedSpectra: string[] = [];

  for (let i = 0; i < refData.spectra.length; i++) {
    const spectrum = refData.spectra[i];
    const mean = state.spectrumMean[i];
    const posteriorStd = Math.sqrt(state.spectrumCovariance[i][i]);
    const priorStd = 1.0; // Unit prior variance

    const meanExceeds = mean > config.spectrumFlagMeanPercentile;
    const stillUncertain = posteriorStd > config.spectrumFlagUncertaintyRatio * priorStd;

    if (meanExceeds || stillUncertain) {
      flaggedSpectra.push(spectrum.id);
    }
  }

  // 2. Identify conditions under flagged spectra
  const flaggedSpectrumSet = new Set(flaggedSpectra);
  const targetConditions = refData.conditions.filter((c) =>
    flaggedSpectrumSet.has(c.parentId),
  );

  // 3. Compute condition priors
  const conditionDimensionOrder = targetConditions.map((c) => c.id);
  const conditionMean: number[] = [];
  const conditionVariances: number[] = [];
  const flaggedConditions: string[] = [];

  for (const condition of targetConditions) {
    // Find primary spectrum loading
    const loadingRef = refData.conditionSpectrumLoadings.find(
      (l) => l.conditionId === condition.id && l.isPrimary,
    );
    const lambda = loadingRef?.loading ?? 0;

    // Find the parent spectrum's posterior
    const spectrumIdx = refData.spectrumIndex.get(condition.parentId);
    if (spectrumIdx === undefined) {
      conditionMean.push(0);
      conditionVariances.push(1);
      continue;
    }

    const spectrumPosteriorMean = state.spectrumMean[spectrumIdx];
    const spectrumPosteriorVar = state.spectrumCovariance[spectrumIdx][spectrumIdx];

    // Base rate (liability mean for this condition in the relevant population)
    const baseRate = refData.baseRates.find((br) => br.dimensionId === condition.id);
    const baseLiabilityMean = baseRate?.liabilityMean ?? 0;

    // μ_condition = baseLiabilityMean + λ × μ_spectrum_posterior
    const mu = baseLiabilityMean + lambda * spectrumPosteriorMean;

    // Σ_condition = λ² × Σ_spectrum_posterior + (1 − λ²)
    const variance = lambda * lambda * spectrumPosteriorVar + (1 - lambda * lambda);

    conditionMean.push(mu);
    conditionVariances.push(variance);
    flaggedConditions.push(condition.id);
  }

  return {
    ...state,
    stage: "TARGETED",
    conditionMean,
    conditionVariances,
    conditionDimensionOrder,
    flaggedSpectra,
    flaggedConditions,
  };
}
