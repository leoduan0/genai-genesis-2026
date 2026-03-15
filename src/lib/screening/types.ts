import type { PopulationType, InstrumentTier, ContentTag, OverlapStrength } from "@/generated/prisma/enums";

// ─── Reference Data (loaded from DB, cached per session) ──────────────────────

export interface SpectrumRef {
  id: string;
  name: string;
  shortCode: string;
  sortOrder: number;
}

export interface ConditionRef {
  id: string;
  name: string;
  shortCode: string;
  parentId: string;
  sortOrder: number;
}

export interface ConditionSpectrumLoadingRef {
  conditionId: string;
  spectrumId: string;
  loading: number;
  isPrimary: boolean;
}

export interface BaseRateRef {
  dimensionId: string;
  populationType: PopulationType;
  prevalence: number;
  liabilityMean: number;
}

export interface ItemRef {
  id: string;
  instrumentId: string;
  itemNumber: number;
  text: string;
  responseMin: number;
  responseMax: number;
  responseLabels: Record<string, string>;
  isReverseCoded: boolean;
  noiseVariance: number;
  noiseInflationFactor: number;
  tags: ContentTag[];
  tier: InstrumentTier;
  normativeMean?: number;  // Population mean response (for z-scoring)
  normativeSD?: number;    // Population SD of response (for z-scoring)
  normativeResponseDist?: number[];  // [P(min), P(min+1), ..., P(max)] for probit normalization
}

export interface ItemLoadingRef {
  itemId: string;
  dimensionId: string;
  loading: number;
  isPrimary: boolean;
}

export interface ItemOverlapRef {
  itemAId: string;
  itemBId: string;
  overlapStrength: OverlapStrength;
  noiseInflationMultiplier: number;
}

export interface ThresholdRef {
  dimensionId: string;
  thresholdLiability: number;
  sensitivity: number;
  specificity: number;
}

export interface ReferenceData {
  spectra: SpectrumRef[];
  conditions: ConditionRef[];
  conditionSpectrumLoadings: ConditionSpectrumLoadingRef[];
  baseRates: BaseRateRef[];
  items: ItemRef[];
  itemLoadings: ItemLoadingRef[];
  itemOverlaps: ItemOverlapRef[];
  thresholds: ThresholdRef[];

  // Derived indices for fast lookup
  spectrumIndex: Map<string, number>;         // spectrumId → index in spectra[]
  conditionIndex: Map<string, number>;         // conditionId → index in conditions[]
  itemLoadingsByItem: Map<string, ItemLoadingRef[]>;
  itemOverlapsByItem: Map<string, ItemOverlapRef[]>;
  thresholdByCondition: Map<string, ThresholdRef>;
  conditionsBySpectrum: Map<string, ConditionRef[]>;
}

// ─── Screening State ──────────────────────────────────────────────────────────

export type ScreeningStage = "INTAKE" | "BROAD_SCREENING" | "TARGETED" | "COMPLETE";

export interface AdministeredItem {
  itemId: string;
  response: number;
  stage: ScreeningStage;
}

export interface AutoScoredItem {
  itemId: string;
  response: number;
  source: "free_text" | "implied";
}

export interface ScreeningState {
  stage: ScreeningStage;

  // Stage 1: spectrum-level (full covariance)
  spectrumMean: number[];
  spectrumCovariance: number[][];

  // Stage 2: condition-level (diagonal — independent after projection)
  conditionMean: number[] | null;
  conditionVariances: number[] | null;
  conditionDimensionOrder: string[] | null;

  // Tracking
  itemsAdministered: AdministeredItem[];
  autoScoredItems: AutoScoredItem[];
  flaggedSpectra: string[];
  flaggedConditions: string[];
}

// ─── Update Metadata ──────────────────────────────────────────────────────────

export interface KalmanUpdateResult {
  state: ScreeningState;
  kalmanGain: number[];
  innovationVariance: number;
  infoGain: number;
}

// ─── Item Ranking ─────────────────────────────────────────────────────────────

export interface RankedItem {
  itemId: string;
  expectedVarianceReduction: number;
  item: ItemRef;
}

// ─── Diagnosis ────────────────────────────────────────────────────────────────

export type ConditionClassification = "likely" | "ruled_out" | "flagged" | "uncertain";

export interface ConditionResult {
  conditionId: string;
  name: string;
  shortCode: string;
  probability: number;
  uncertainty: number;
  classification: ConditionClassification;
  spectrumId: string;
  wasAssessed: boolean;
}

export type SpectrumMagnitude = "low" | "moderate" | "high" | "very_high";

export interface SpectrumResult {
  spectrumId: string;
  name: string;
  shortCode: string;
  posteriorMean: number;
  posteriorVariance: number;
  magnitude: SpectrumMagnitude;
  wasAssessed: boolean;
  conditions: ConditionResult[];
}

export interface DiagnosticProfile {
  flagged: ConditionResult[];
  unflagged: ConditionResult[];
  spectrumResults: SpectrumResult[];
  notAssessed: { spectrumId: string; name: string; shortCode: string }[];
  totalItemsAdministered: number;
  totalAutoScored: number;
}

export interface TerminationCheck {
  shouldTerminate: boolean;
  reason: string;
}
