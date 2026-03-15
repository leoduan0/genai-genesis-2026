import type { ScreeningConfig } from "./config";
import type { ReferenceData, ScreeningState, RankedItem } from "./types";
import { matvec } from "./update";
import { computeProbability } from "./diagnosis";

// ─── Runtime Noise ────────────────────────────────────────────────────────────

/**
 * Compute runtime noise variance for an item, accounting for overlap
 * with already-administered items.
 *
 * Base σ² comes from Item.noiseVariance. If any overlapping items have
 * already been administered, inflate by the maximum noiseInflationMultiplier
 * among those overlaps.
 */
export function computeRuntimeNoise(
  itemId: string,
  administeredItemIds: string[] | Set<string>,
  refData: ReferenceData,
): number {
  const item = refData.items.find((it) => it.id === itemId);
  if (!item) return 1.0;

  let baseNoise = item.noiseVariance;
  const overlaps = refData.itemOverlapsByItem.get(itemId) ?? [];

  const administeredSet = administeredItemIds instanceof Set
    ? administeredItemIds
    : new Set(administeredItemIds);
  let maxMultiplier = 1.0;

  for (const overlap of overlaps) {
    const otherId = overlap.itemAId === itemId ? overlap.itemBId : overlap.itemAId;
    if (administeredSet.has(otherId)) {
      maxMultiplier = Math.max(maxMultiplier, overlap.noiseInflationMultiplier);
    }
  }

  return baseNoise * maxMultiplier;
}

// ─── Expected Absolute Probability Change (Stage 2: Condition-Level) ─────────

/**
 * Compute expected absolute probability change for an item at the condition level.
 *
 * For each condition the item loads on, simulate the Kalman update at ±1σ of the
 * predictive distribution and compute |P_new - P_current|. Average the two
 * scenarios. Sum across all conditions.
 *
 * This naturally prioritizes items that can move conditions near the diagnostic
 * threshold, and ignores items targeting conditions far in either tail (already
 * resolved or irrelevant).
 */
function expectedProbChangeCondition(
  itemId: string,
  conditionDimensionOrder: string[],
  conditionMeans: number[],
  conditionVariances: number[],
  noiseVar: number,
  refData: ReferenceData,
): number {
  let total = 0;
  const loadings = refData.itemLoadingsByItem.get(itemId) ?? [];

  for (let i = 0; i < conditionDimensionOrder.length; i++) {
    const condId = conditionDimensionOrder[i];
    const loadingRef = loadings.find((l) => l.dimensionId === condId);
    if (!loadingRef) continue;

    const h = loadingRef.loading;
    const mu = conditionMeans[i];
    const condVar = conditionVariances[i];
    const S = h * h * condVar + noiseVar;
    if (S <= 0) continue;

    const K = (h * condVar) / S;
    const sqrtS = Math.sqrt(S);
    const varNew = (1 - K * h) * condVar;

    const threshold = refData.thresholdByCondition.get(condId);
    if (!threshold) continue;
    const tau = threshold.thresholdLiability;

    const P_curr = computeProbability(mu, condVar, tau);

    // +1σ response scenario
    const mu_high = mu + K * sqrtS;
    const P_high = computeProbability(mu_high, varNew, tau);

    // -1σ response scenario
    const mu_low = mu - K * sqrtS;
    const P_low = computeProbability(mu_low, varNew, tau);

    total += (Math.abs(P_high - P_curr) + Math.abs(P_low - P_curr)) / 2;
  }

  return total;
}

// ─── Expected Trace Reduction (Stage 1: Spectrum-Level) ──────────────────────

/**
 * Compute expected trace reduction for a spectrum-level item.
 *
 * tr(Σ) − tr(Σ_new) = Σᵢ (Σh)ᵢ² / (hᵀΣh + σ²)
 *
 * This is the standard Bayesian optimal design criterion for broad screening:
 * it maximizes total uncertainty reduction across all spectra. Items with high
 * cross-loadings on multiple spectra score highest, naturally prioritizing
 * broad items like PHQ-9 (Distress + Somatoform + Detachment) over narrow
 * items like AUDIT-C (Disinhibited Externalizing only).
 *
 * Unlike probability change (which operates in the flat tail of the CDF when
 * all conditions have low base rates), trace reduction differentiates well
 * between items from the very first question.
 */
function expectedTraceReduction(
  h: number[],
  sigma: number[][],
  noiseVar: number,
): number {
  const n = sigma.length;

  const sigmaH = matvec(sigma, h);
  let S = noiseVar;
  for (let i = 0; i < n; i++) {
    S += h[i] * sigmaH[i];
  }
  if (S <= 0) return 0;

  // tr(Σ) − tr(Σ_new) = Σᵢ (Σh)ᵢ² / S
  let traceReduction = 0;
  for (let i = 0; i < n; i++) {
    traceReduction += sigmaH[i] * sigmaH[i];
  }
  return traceReduction / S;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Rank candidate items by expected information gain.
 * Returns the top K items sorted descending.
 *
 * - Filters out already-administered and auto-scored items.
 * - Stage 1 (BROAD_SCREENING): ranks by trace reduction (tr(Σ) − tr(Σ_new)).
 *   This maximizes total spectrum uncertainty reduction and naturally prioritizes
 *   items with high cross-loadings on multiple spectra.
 * - Stage 2 (TARGETED): ranks by expected absolute probability change across
 *   flagged conditions. This prioritizes items that can move condition
 *   probabilities near diagnostic thresholds.
 */
export function rankItems(
  state: ScreeningState,
  refData: ReferenceData,
  config: ScreeningConfig,
): RankedItem[] {
  const excludedIds = new Set([
    ...state.itemsAdministered.map((a) => a.itemId),
    ...state.autoScoredItems.map((a) => a.itemId),
  ]);

  // Determine candidate items
  let candidates = refData.items.filter((item) => !excludedIds.has(item.id));

  if (state.stage === "TARGETED") {
    // Stage 2: any item that loads onto a condition in the stage 2 dimension
    // order (all conditions). Item selection scoring naturally prioritizes
    // conditions near the diagnostic threshold.
    const conditionSet = new Set(state.conditionDimensionOrder ?? []);
    candidates = candidates.filter((item) => {
      const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
      return loadings.some((l) => conditionSet.has(l.dimensionId));
    });
  } else {
    // Stage 1: only BROAD_SCREENING items (they have spectrum-level loadings)
    candidates = candidates.filter((item) => item.tier === "BROAD_SCREENING");
  }

  // Score each candidate
  const scored: RankedItem[] = [];
  const administeredIds = state.itemsAdministered.map((a) => a.itemId);

  for (const item of candidates) {
    const noiseVar = computeRuntimeNoise(item.id, administeredIds, refData);
    let score: number;

    if (state.stage === "TARGETED" && state.conditionMean && state.conditionVariances && state.conditionDimensionOrder) {
      // Stage 2: expected probability change across flagged conditions
      score = expectedProbChangeCondition(
        item.id,
        state.conditionDimensionOrder,
        state.conditionMean,
        state.conditionVariances,
        noiseVar,
        refData,
      );
    } else {
      // Stage 1: trace reduction (total spectrum uncertainty removed)
      const h = new Array(refData.spectra.length).fill(0);
      const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
      for (const l of loadings) {
        const idx = refData.spectrumIndex.get(l.dimensionId);
        if (idx !== undefined) {
          h[idx] = l.loading;
        }
      }
      score = expectedTraceReduction(
        h,
        state.spectrumCovariance,
        noiseVar,
      );
    }

    scored.push({
      itemId: item.id,
      expectedVarianceReduction: score,
      item,
    });
  }

  // Sort descending
  scored.sort((a, b) => b.expectedVarianceReduction - a.expectedVarianceReduction);

  return scored.slice(0, config.topKItems);
}
