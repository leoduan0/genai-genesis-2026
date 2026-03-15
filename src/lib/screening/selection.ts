import type { ScreeningConfig } from "./config";
import type { ReferenceData, ScreeningState, RankedItem } from "./types";
import { trace } from "./update";

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
  administeredItemIds: string[],
  refData: ReferenceData,
): number {
  const item = refData.items.find((it) => it.id === itemId);
  if (!item) return 1.0;

  let baseNoise = item.noiseVariance;
  const overlaps = refData.itemOverlapsByItem.get(itemId) ?? [];

  const administeredSet = new Set(administeredItemIds);
  let maxMultiplier = 1.0;

  for (const overlap of overlaps) {
    const otherId = overlap.itemAId === itemId ? overlap.itemBId : overlap.itemAId;
    if (administeredSet.has(otherId)) {
      maxMultiplier = Math.max(maxMultiplier, overlap.noiseInflationMultiplier);
    }
  }

  return baseNoise * maxMultiplier;
}

// ─── Item Ranking (Stage 1: Spectrum-Level) ───────────────────────────────────

/**
 * Compute expected variance reduction for an item at the spectrum level.
 *
 * For a loading vector h and current covariance Σ:
 *   Expected reduction = tr(Σ) − tr(Σ_new)
 *   where Σ_new = Σ − (Σh)(hᵀΣ) / (hᵀΣh + σ²)
 *
 * Since tr(Σ − Σ_new) = tr(K · hᵀ · Σ) = (Σh)ᵀ(Σh) / S = ||Σh||² / S,
 * we can compute this without forming Σ_new.
 */
function expectedVarianceReductionSpectrum(
  h: number[],
  sigma: number[][],
  noiseVar: number,
): number {
  const n = sigma.length;

  // Σh
  const sigmaH = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sigmaH[i] += sigma[i][j] * h[j];
    }
  }

  // S = hᵀΣh + σ²
  let S = noiseVar;
  for (let i = 0; i < n; i++) {
    S += h[i] * sigmaH[i];
  }

  if (S <= 0) return 0;

  // ||Σh||² / S
  let normSq = 0;
  for (let i = 0; i < n; i++) {
    normSq += sigmaH[i] * sigmaH[i];
  }

  return normSq / S;
}

/**
 * Compute expected variance reduction for an item at the condition level (stage 2).
 *
 * Since conditions are independent (diagonal), this is the sum of
 * per-condition reductions: h²σ⁴ / (h²σ² + σ²_noise) for each condition.
 */
function expectedVarianceReductionCondition(
  itemId: string,
  conditionDimensionOrder: string[],
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
    const condVar = conditionVariances[i];
    const S = h * h * condVar + noiseVar;

    if (S <= 0) continue;

    // Reduction = h² · condVar² / S
    total += (h * h * condVar * condVar) / S;
  }

  return total;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Rank candidate items by expected variance reduction.
 * Returns the top K items sorted by expected information gain.
 *
 * - Filters out already-administered and auto-scored items.
 * - In stage 2, only considers items from instruments targeting flagged conditions.
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
    // Stage 2: only items from TARGETED instruments that load onto flagged conditions
    const flaggedConditionSet = new Set(state.flaggedConditions);
    candidates = candidates.filter((item) => {
      if (item.tier !== "TARGETED") return false;
      const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
      return loadings.some((l) => flaggedConditionSet.has(l.dimensionId));
    });
  } else {
    // Stage 1: prefer BROAD_SCREENING items, but allow all
    candidates = candidates.filter((item) => item.tier === "BROAD_SCREENING");
  }

  // Score each candidate
  const scored: RankedItem[] = [];

  for (const item of candidates) {
    const administeredIds = state.itemsAdministered.map((a) => a.itemId);
    const noiseVar = computeRuntimeNoise(item.id, administeredIds, refData);
    let evr: number;

    if (state.stage === "TARGETED" && state.conditionVariances && state.conditionDimensionOrder) {
      evr = expectedVarianceReductionCondition(
        item.id,
        state.conditionDimensionOrder,
        state.conditionVariances,
        noiseVar,
        refData,
      );
    } else {
      // Build loading vector onto spectra
      const h = new Array(refData.spectra.length).fill(0);
      const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
      for (const l of loadings) {
        const idx = refData.spectrumIndex.get(l.dimensionId);
        if (idx !== undefined) {
          h[idx] = l.loading;
        }
      }
      evr = expectedVarianceReductionSpectrum(h, state.spectrumCovariance, noiseVar);
    }

    scored.push({
      itemId: item.id,
      expectedVarianceReduction: evr,
      item,
    });
  }

  // Sort descending by expected variance reduction
  scored.sort((a, b) => b.expectedVarianceReduction - a.expectedVarianceReduction);

  return scored.slice(0, config.topKItems);
}
