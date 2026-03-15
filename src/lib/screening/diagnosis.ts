import type { ScreeningConfig } from "./config";
import type {
  ReferenceData,
  ScreeningState,
  ConditionClassification,
  ConditionResult,
  DiagnosticProfile,
  TerminationCheck,
  RankedItem,
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
  if (probability > c.flaggedProbability) {
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

  // Criterion 2: marginal info gain too small
  const maxVar = Math.max(...state.conditionVariances);
  const ranked = rankItems(state, refData, config);

  if (ranked.length > 0) {
    const bestReduction = ranked[0].expectedVarianceReduction;
    if (bestReduction < config.stageTwoMinVarianceReduction * maxVar) {
      return { shouldTerminate: true, reason: "marginal_info_gain" };
    }
  } else {
    return { shouldTerminate: true, reason: "no_items_remaining" };
  }

  return { shouldTerminate: false, reason: "" };
}

// ─── Diagnostic Profile ───────────────────────────────────────────────────────

/**
 * Generate the full diagnostic profile from the current state.
 * Computes probabilities and classifications for all conditions under
 * flagged spectra, and identifies spectra that were not assessed.
 */
export function generateDiagnosticProfile(
  state: ScreeningState,
  refData: ReferenceData,
  config: ScreeningConfig,
): DiagnosticProfile {
  const flagged: ConditionResult[] = [];
  const unflagged: ConditionResult[] = [];
  const assessedSpectra = new Set(state.flaggedSpectra);

  if (state.conditionMean && state.conditionVariances && state.conditionDimensionOrder) {
    // Stage 2 was reached — use condition-level posteriors
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

      if (classification === "likely" || classification === "flagged") {
        flagged.push(result);
      } else {
        unflagged.push(result);
      }
    }
  } else {
    // Screening ended before stage 2 — derive condition estimates from spectra
    for (const condition of refData.conditions) {
      const specIdx = refData.spectrumIndex.get(condition.parentId);
      if (specIdx === undefined) continue;

      const loadingRef = refData.conditionSpectrumLoadings.find(
        (l) => l.conditionId === condition.id && l.isPrimary,
      );
      const lambda = loadingRef?.loading ?? 0;

      const baseRate = refData.baseRates.find((br) => br.dimensionId === condition.id);
      const baseMean = baseRate?.liabilityMean ?? 0;

      const mu = baseMean + lambda * state.spectrumMean[specIdx];
      const variance =
        lambda * lambda * state.spectrumCovariance[specIdx][specIdx] + (1 - lambda * lambda);

      const threshold = refData.thresholdByCondition.get(condition.id);
      if (!threshold) continue;

      const prob = computeProbability(mu, variance, threshold.thresholdLiability);
      const unc = Math.sqrt(variance);
      const classification = classifyCondition(prob, unc, config);

      const result: ConditionResult = {
        conditionId: condition.id,
        name: condition.name,
        shortCode: condition.shortCode,
        probability: prob,
        uncertainty: unc,
        classification,
        spectrumId: condition.parentId,
        wasAssessed: false,
      };

      if (classification === "likely" || classification === "flagged") {
        flagged.push(result);
      } else {
        unflagged.push(result);
      }
    }
  }

  // Sort flagged by probability descending
  flagged.sort((a, b) => b.probability - a.probability);
  unflagged.sort((a, b) => b.probability - a.probability);

  // Identify not-assessed spectra
  const notAssessed = refData.spectra
    .filter((s) => !assessedSpectra.has(s.id))
    .map((s) => ({ spectrumId: s.id, name: s.name, shortCode: s.shortCode }));

  return {
    flagged,
    unflagged,
    notAssessed,
    totalItemsAdministered: state.itemsAdministered.length,
    totalAutoScored: state.autoScoredItems.length,
  };
}
