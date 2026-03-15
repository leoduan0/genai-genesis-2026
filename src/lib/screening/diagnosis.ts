import type { ScreeningConfig } from "./config";
import type {
  ReferenceData,
  ScreeningState,
  ConditionClassification,
  ConditionResult,
  DiagnosticProfile,
  TerminationCheck,
  RankedItem,
  SpectrumResult,
  SpectrumMagnitude,
} from "./types";
import { rankItems } from "./selection";

// ─── Normal CDF ───────────────────────────────────────────────────────────────

/**
 * Standard normal CDF approximation (Abramowitz & Stegun 26.2.17).
 * Max error: 7.5×10⁻⁸.
 */
export function normalCdf(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;

  // Abramowitz & Stegun 7.1.26 — approximates erf(x), max error 1.5×10⁻⁷
  // Φ(z) = (1 + erf(z/√2)) / 2
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const u = absX / Math.SQRT2; // erf argument: z/√2
  const t = 1.0 / (1.0 + p * u);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-u * u);

  return 0.5 * (1.0 + sign * y);
}

// ─── Probability & Classification ─────────────────────────────────────────────

/**
 * Compute the probability that a condition exceeds its clinical threshold.
 * P(liability > τ) = 1 − Φ((τ − μ) / √σ²)
 */
export function computeProbability(
  mean: number,
  variance: number,
  threshold: number,
): number {
  const std = Math.sqrt(Math.max(variance, 1e-10));
  const z = (threshold - mean) / std;
  return 1 - normalCdf(z);
}

/**
 * Classify a condition based on its probability and uncertainty.
 * All thresholds come from config.classification.
 */
export function classifyCondition(
  probability: number,
  uncertainty: number,
  config: ScreeningConfig,
): ConditionClassification {
  const c = config.classification;

  if (probability > c.likelyProbability && uncertainty < c.likelyMaxUncertainty) {
    return "likely";
  }
  if (probability < c.ruledOutProbability && uncertainty < c.ruledOutMaxUncertainty) {
    return "ruled_out";
  }
  if (probability > c.flaggedProbability && uncertainty < c.flaggedMaxUncertainty) {
    return "flagged";
  }
  return "uncertain";
}

// ─── Stage 2 Termination ──────────────────────────────────────────────────────

/**
 * Check whether stage 2 (targeted screening) should end.
 *
 * Three criteria (any one triggers):
 * 1. All flagged conditions are resolved (likely, ruled_out, or no info left).
 * 2. Best item reduces max(Σⱼⱼ) by less than stageTwoMinVarianceReduction
 *    of the current maximum variance.
 * 3. Stage 2 item count >= maxStageTwoItems.
 * 4. Total items >= maxTotalItems.
 */
export function checkStageTwoTermination(
  state: ScreeningState,
  refData: ReferenceData,
  config: ScreeningConfig,
): TerminationCheck {
  if (!state.conditionMean || !state.conditionVariances || !state.conditionDimensionOrder) {
    return { shouldTerminate: false, reason: "" };
  }

  const stageTwoItems = state.itemsAdministered.filter(
    (a) => a.stage === "TARGETED",
  ).length;
  const totalItems = state.itemsAdministered.length;

  // Criterion 4: total item cap
  if (totalItems >= config.maxTotalItems) {
    return { shouldTerminate: true, reason: "max_total_items" };
  }

  // Criterion 3: stage 2 item cap
  if (stageTwoItems >= config.maxStageTwoItems) {
    return { shouldTerminate: true, reason: "max_stage_two_items" };
  }

  // Criterion 1: all conditions resolved
  let allResolved = true;
  for (let i = 0; i < state.conditionDimensionOrder.length; i++) {
    const condId = state.conditionDimensionOrder[i];
    const threshold = refData.thresholdByCondition.get(condId);
    if (!threshold) continue;

    const prob = computeProbability(
      state.conditionMean[i],
      state.conditionVariances[i],
      threshold.thresholdLiability,
    );
    const unc = Math.sqrt(state.conditionVariances[i]);
    const classification = classifyCondition(prob, unc, config);

    if (classification === "flagged" || classification === "uncertain") {
      allResolved = false;
      break;
    }
  }

  if (allResolved) {
    return { shouldTerminate: true, reason: "all_conditions_resolved" };
  }

  // Criterion 2: best item's expected probability change too small
  const ranked = rankItems(state, refData, config);

  if (ranked.length > 0) {
    const bestScore = ranked[0].expectedVarianceReduction;
    if (bestScore < config.stageTwoMinExpectedProbChange) {
      return { shouldTerminate: true, reason: "marginal_info_gain" };
    }
  } else {
    return { shouldTerminate: true, reason: "no_items_remaining" };
  }

  return { shouldTerminate: false, reason: "" };
}

// ─── Spectrum Magnitude ──────────────────────────────────────────────────────

/**
 * Map a spectrum posterior mean (liability scale, z-score) to a human label.
 */
export function spectrumMagnitude(mean: number): SpectrumMagnitude {
  if (mean > 0.75) return "very_high";
  if (mean > 0.25) return "high";
  if (mean > -0.25) return "moderate";
  return "low";
}

// ─── Diagnostic Profile ───────────────────────────────────────────────────────

/**
 * Compute a condition result from spectrum-derived estimates (else-branch).
 * For spectrum-derived estimates the uncertainty gate is relaxed: conditions
 * with probability above the flagged threshold are classified "flagged" even
 * when the uncertainty is high, because the uncertainty is structural (the
 * condition was never directly assessed) rather than due to lack of data.
 */
function classifyConditionSpectrumDerived(
  probability: number,
  uncertainty: number,
  config: ScreeningConfig,
): ConditionClassification {
  const c = config.classification;

  // "Likely" still requires low uncertainty — spectrum-derived estimates
  // don't have enough precision for strong conclusions
  if (probability > c.likelyProbability && uncertainty < c.likelyMaxUncertainty) {
    return "likely";
  }
  // Ruling out is safe with high uncertainty if probability is very low
  if (probability < c.ruledOutProbability) {
    return "ruled_out";
  }
  // Relax uncertainty gate: flag if probability warrants it, even with
  // high structural uncertainty from the spectrum→condition projection
  if (probability > c.flaggedProbability) {
    return "flagged";
  }
  return "uncertain";
}

/**
 * Generate the full diagnostic profile from the current state.
 * Computes probabilities and classifications for all conditions,
 * builds spectrum-level summaries, and identifies what wasn't assessed.
 */
export function generateDiagnosticProfile(
  state: ScreeningState,
  refData: ReferenceData,
  config: ScreeningConfig,
): DiagnosticProfile {
  const flagged: ConditionResult[] = [];
  const unflagged: ConditionResult[] = [];
  const assessedSpectra = new Set(state.flaggedSpectra);

  // Build a map of conditionId → ConditionResult for spectrum grouping
  const conditionResultMap = new Map<string, ConditionResult>();

  if (state.conditionMean && state.conditionVariances && state.conditionDimensionOrder) {
    // Stage 2 was reached — use condition-level posteriors for assessed conditions
    for (let i = 0; i < state.conditionDimensionOrder.length; i++) {
      const condId = state.conditionDimensionOrder[i];
      const condition = refData.conditions.find((c) => c.id === condId);
      if (!condition) continue;

      const threshold = refData.thresholdByCondition.get(condId);
      if (!threshold) continue;

      const prob = computeProbability(
        state.conditionMean[i],
        state.conditionVariances[i],
        threshold.thresholdLiability,
      );
      const unc = Math.sqrt(state.conditionVariances[i]);
      const classification = classifyCondition(prob, unc, config);

      const result: ConditionResult = {
        conditionId: condId,
        name: condition.name,
        shortCode: condition.shortCode,
        probability: prob,
        uncertainty: unc,
        classification,
        spectrumId: condition.parentId,
        wasAssessed: true,
      };

      conditionResultMap.set(condId, result);
      if (classification === "likely" || classification === "flagged") {
        flagged.push(result);
      } else {
        unflagged.push(result);
      }
    }

    // Also derive estimates for conditions NOT in conditionDimensionOrder
    // (conditions under unflagged spectra that weren't directly assessed)
    const assessedCondIds = new Set(state.conditionDimensionOrder);
    for (const condition of refData.conditions) {
      if (assessedCondIds.has(condition.id)) continue;
      const result = deriveConditionFromSpectrum(condition, state, refData, config);
      if (!result) continue;
      conditionResultMap.set(condition.id, result);
      unflagged.push(result);
    }
  } else {
    // Screening ended before stage 2 — derive all condition estimates from spectra
    for (const condition of refData.conditions) {
      const result = deriveConditionFromSpectrum(condition, state, refData, config);
      if (!result) continue;
      conditionResultMap.set(condition.id, result);
      if (result.classification === "likely" || result.classification === "flagged") {
        flagged.push(result);
      } else {
        unflagged.push(result);
      }
    }
  }

  // Sort flagged by probability descending
  flagged.sort((a, b) => b.probability - a.probability);
  unflagged.sort((a, b) => b.probability - a.probability);

  // Build spectrum-level results
  const spectrumResults: SpectrumResult[] = refData.spectra.map((spectrum, i) => {
    const posteriorMean = state.spectrumMean[i];
    const posteriorVariance = state.spectrumCovariance[i][i];
    const wasAssessed = state.itemsAdministered.length > 0; // stage 1 explores all spectra

    // Gather condition results under this spectrum
    const specConditions = refData.conditions
      .filter((c) => c.parentId === spectrum.id)
      .map((c) => conditionResultMap.get(c.id))
      .filter((r): r is ConditionResult => r !== undefined);

    return {
      spectrumId: spectrum.id,
      name: spectrum.name,
      shortCode: spectrum.shortCode,
      posteriorMean,
      posteriorVariance,
      magnitude: spectrumMagnitude(posteriorMean),
      wasAssessed,
      conditions: specConditions,
    };
  });

  // Not-assessed spectra: only those that had zero items loading on them
  // (in practice, stage 1 explores all spectra, so this is usually empty)
  const notAssessed = refData.spectra
    .filter((s) => !assessedSpectra.has(s.id) && state.itemsAdministered.length === 0)
    .map((s) => ({ spectrumId: s.id, name: s.name, shortCode: s.shortCode }));

  return {
    flagged,
    unflagged,
    spectrumResults,
    notAssessed,
    totalItemsAdministered: state.itemsAdministered.length,
    totalAutoScored: state.autoScoredItems.length,
  };
}

/** Derive a condition estimate from its parent spectrum posterior. */
function deriveConditionFromSpectrum(
  condition: { id: string; name: string; shortCode: string; parentId: string },
  state: ScreeningState,
  refData: ReferenceData,
  config: ScreeningConfig,
): ConditionResult | null {
  const specIdx = refData.spectrumIndex.get(condition.parentId);
  if (specIdx === undefined) return null;

  const loadingRef = refData.conditionSpectrumLoadings.find(
    (l) => l.conditionId === condition.id && l.isPrimary,
  );
  const lambda = loadingRef?.loading ?? 0;

  const baseRate = refData.baseRates.find((br) => br.dimensionId === condition.id);
  const baseMean = baseRate?.liabilityMean ?? 0;

  const threshold = refData.thresholdByCondition.get(condition.id);
  if (!threshold) return null;

  // Calibrate: μ₀ = τ + Φ⁻¹(prevalence) so that P(z > τ | prior) = prevalence
  const calibratedPriorMean = baseMean + threshold.thresholdLiability;
  const mu = calibratedPriorMean + lambda * state.spectrumMean[specIdx];
  const variance =
    lambda * lambda * state.spectrumCovariance[specIdx][specIdx] + (1 - lambda * lambda);

  const prob = computeProbability(mu, variance, threshold.thresholdLiability);
  const unc = Math.sqrt(variance);
  const classification = classifyConditionSpectrumDerived(prob, unc, config);

  return {
    conditionId: condition.id,
    name: condition.name,
    shortCode: condition.shortCode,
    probability: prob,
    uncertainty: unc,
    classification,
    spectrumId: condition.parentId,
    wasAssessed: false,
  };
}
