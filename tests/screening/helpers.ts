/**
 * Test helpers: minimal mock ReferenceData and state factories.
 *
 * Uses a 3-spectrum, 4-condition, 6-item toy model for tractable hand-calculations.
 *
 * Spectra: S1 (Distress), S2 (Fear), S3 (Externalizing)
 * Conditions: C1 (MDD, under S1), C2 (GAD, under S2), C3 (PTSD, under S1), C4 (SUD, under S3)
 * Items:
 *   I1 (broad, loads 0.7 on S1, 0.3 on S2)  — Tier 1
 *   I2 (broad, loads 0.6 on S2)              — Tier 1
 *   I3 (broad, loads 0.5 on S1, 0.4 on S3)  — Tier 1
 *   I4 (targeted, loads 0.8 on C1)           — Tier 2
 *   I5 (targeted, loads 0.7 on C2)           — Tier 2
 *   I6 (targeted, loads 0.6 on C4)           — Tier 2
 */

import type {
  ReferenceData,
  ScreeningState,
  SpectrumRef,
  ConditionRef,
  ItemRef,
  ItemLoadingRef,
  ConditionSpectrumLoadingRef,
  BaseRateRef,
  ThresholdRef,
  ItemOverlapRef,
} from "@/lib/screening/types";

// ─── Spectra ──────────────────────────────────────────────────────────────────

export const SPECTRA: SpectrumRef[] = [
  { id: "S1", name: "Distress", shortCode: "DIS", sortOrder: 1 },
  { id: "S2", name: "Fear", shortCode: "FEA", sortOrder: 2 },
  { id: "S3", name: "Externalizing", shortCode: "EXT", sortOrder: 3 },
];

// ─── Conditions ──────────────────────────────────────────────────────────────

export const CONDITIONS: ConditionRef[] = [
  { id: "C1", name: "MDD", shortCode: "MDD", parentId: "S1", sortOrder: 1 },
  { id: "C2", name: "GAD", shortCode: "GAD", parentId: "S2", sortOrder: 2 },
  { id: "C3", name: "PTSD", shortCode: "PTSD", parentId: "S1", sortOrder: 3 },
  { id: "C4", name: "SUD", shortCode: "SUD", parentId: "S3", sortOrder: 4 },
];

// ─── Condition-Spectrum Loadings (L matrix) ──────────────────────────────────

export const CONDITION_SPECTRUM_LOADINGS: ConditionSpectrumLoadingRef[] = [
  { conditionId: "C1", spectrumId: "S1", loading: 0.85, isPrimary: true },
  { conditionId: "C2", spectrumId: "S2", loading: 0.80, isPrimary: true },
  { conditionId: "C3", spectrumId: "S1", loading: 0.70, isPrimary: true },
  { conditionId: "C4", spectrumId: "S3", loading: 0.75, isPrimary: true },
];

// ─── Base Rates ──────────────────────────────────────────────────────────────

export const BASE_RATES: BaseRateRef[] = [
  { dimensionId: "C1", populationType: "GENERAL" as any, prevalence: 0.07, liabilityMean: -1.48 },
  { dimensionId: "C2", populationType: "GENERAL" as any, prevalence: 0.03, liabilityMean: -1.88 },
  { dimensionId: "C3", populationType: "GENERAL" as any, prevalence: 0.04, liabilityMean: -1.75 },
  { dimensionId: "C4", populationType: "GENERAL" as any, prevalence: 0.08, liabilityMean: -1.41 },
];

// ─── Items ──────────────────────────────────────────────────────────────────

function makeItem(id: string, tier: "BROAD_SCREENING" | "TARGETED", noise = 0.3): ItemRef {
  return {
    id,
    instrumentId: `INST-${id}`,
    itemNumber: 1,
    text: `Item ${id}`,
    responseMin: 0,
    responseMax: 3,
    responseLabels: { "0": "Not at all", "1": "Several days", "2": "More than half", "3": "Nearly every day" },
    isReverseCoded: false,
    noiseVariance: noise,
    noiseInflationFactor: 1.5,
    tags: [],
    tier,
  };
}

export const ITEMS: ItemRef[] = [
  makeItem("I1", "BROAD_SCREENING"),
  makeItem("I2", "BROAD_SCREENING"),
  makeItem("I3", "BROAD_SCREENING"),
  makeItem("I4", "TARGETED"),
  makeItem("I5", "TARGETED"),
  makeItem("I6", "TARGETED"),
];

// ─── Item Loadings ──────────────────────────────────────────────────────────

export const ITEM_LOADINGS: ItemLoadingRef[] = [
  // Tier 1 → spectra
  { itemId: "I1", dimensionId: "S1", loading: 0.7, isPrimary: true },
  { itemId: "I1", dimensionId: "S2", loading: 0.3, isPrimary: false },
  { itemId: "I2", dimensionId: "S2", loading: 0.6, isPrimary: true },
  { itemId: "I3", dimensionId: "S1", loading: 0.5, isPrimary: true },
  { itemId: "I3", dimensionId: "S3", loading: 0.4, isPrimary: false },
  // Tier 2 → conditions
  { itemId: "I4", dimensionId: "C1", loading: 0.8, isPrimary: true },
  { itemId: "I5", dimensionId: "C2", loading: 0.7, isPrimary: true },
  { itemId: "I6", dimensionId: "C4", loading: 0.6, isPrimary: true },
];

// ─── Thresholds ──────────────────────────────────────────────────────────────

export const THRESHOLDS: ThresholdRef[] = [
  { dimensionId: "C1", thresholdLiability: 1.28, sensitivity: 0.89, specificity: 0.87 },
  { dimensionId: "C2", thresholdLiability: 1.41, sensitivity: 0.89, specificity: 0.82 },
  { dimensionId: "C3", thresholdLiability: 1.34, sensitivity: 0.94, specificity: 0.86 },
  { dimensionId: "C4", thresholdLiability: 1.20, sensitivity: 0.85, specificity: 0.80 },
];

// ─── Item Overlaps ──────────────────────────────────────────────────────────

export const ITEM_OVERLAPS: ItemOverlapRef[] = [
  { itemAId: "I1", itemBId: "I3", overlapStrength: "MODERATE" as any, noiseInflationMultiplier: 2.0 },
];

// ─── ReferenceData builder ──────────────────────────────────────────────────

export function buildMockReferenceData(): ReferenceData {
  const spectrumIndex = new Map(SPECTRA.map((s, i) => [s.id, i]));
  const conditionIndex = new Map(CONDITIONS.map((c, i) => [c.id, i]));

  const itemLoadingsByItem = new Map<string, ItemLoadingRef[]>();
  for (const l of ITEM_LOADINGS) {
    const arr = itemLoadingsByItem.get(l.itemId) ?? [];
    arr.push(l);
    itemLoadingsByItem.set(l.itemId, arr);
  }

  const itemOverlapsByItem = new Map<string, ItemOverlapRef[]>();
  for (const o of ITEM_OVERLAPS) {
    const arrA = itemOverlapsByItem.get(o.itemAId) ?? [];
    arrA.push(o);
    itemOverlapsByItem.set(o.itemAId, arrA);
    const arrB = itemOverlapsByItem.get(o.itemBId) ?? [];
    arrB.push(o);
    itemOverlapsByItem.set(o.itemBId, arrB);
  }

  const thresholdByCondition = new Map(THRESHOLDS.map((t) => [t.dimensionId, t]));

  const conditionsBySpectrum = new Map<string, ConditionRef[]>();
  for (const c of CONDITIONS) {
    const arr = conditionsBySpectrum.get(c.parentId) ?? [];
    arr.push(c);
    conditionsBySpectrum.set(c.parentId, arr);
  }

  return {
    spectra: SPECTRA,
    conditions: CONDITIONS,
    conditionSpectrumLoadings: CONDITION_SPECTRUM_LOADINGS,
    baseRates: BASE_RATES,
    items: ITEMS,
    itemLoadings: ITEM_LOADINGS,
    itemOverlaps: ITEM_OVERLAPS,
    thresholds: THRESHOLDS,
    spectrumIndex,
    conditionIndex,
    itemLoadingsByItem,
    itemOverlapsByItem,
    thresholdByCondition,
    conditionsBySpectrum,
  };
}

// ─── Initial covariance (3×3 with correlations) ─────────────────────────────

/** 3×3 correlation matrix for S1, S2, S3 */
export const INITIAL_COVARIANCE: number[][] = [
  [1.0, 0.5, 0.2],  // S1 ↔ S2 = 0.5, S1 ↔ S3 = 0.2
  [0.5, 1.0, 0.1],  // S2 ↔ S3 = 0.1
  [0.2, 0.1, 1.0],
];

// ─── State factories ────────────────────────────────────────────────────────

export function makeInitialState(): ScreeningState {
  return {
    stage: "BROAD_SCREENING",
    spectrumMean: [0, 0, 0],
    spectrumCovariance: INITIAL_COVARIANCE.map((row) => [...row]),
    conditionMean: null,
    conditionVariances: null,
    conditionDimensionOrder: null,
    itemsAdministered: [],
    autoScoredItems: [],
    flaggedSpectra: [],
    flaggedConditions: [],
  };
}

/** State after stage 2 transition, for condition-level tests */
export function makeStage2State(): ScreeningState {
  return {
    stage: "TARGETED",
    spectrumMean: [1.0, 0.8, -0.2],
    spectrumCovariance: [
      [0.4, 0.15, 0.05],
      [0.15, 0.5, 0.03],
      [0.05, 0.03, 0.9],
    ],
    conditionMean: [-0.5, -1.0, -0.8, -1.5],
    conditionVariances: [0.7, 0.8, 0.75, 0.9],
    conditionDimensionOrder: ["C1", "C2", "C3", "C4"],
    itemsAdministered: [
      { itemId: "I1", response: 2, stage: "BROAD_SCREENING" },
      { itemId: "I2", response: 1, stage: "BROAD_SCREENING" },
    ],
    autoScoredItems: [],
    flaggedSpectra: ["S1", "S2", "S3"],
    flaggedConditions: ["C1", "C2", "C3", "C4"],
  };
}
