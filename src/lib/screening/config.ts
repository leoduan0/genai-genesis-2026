export const SCREENING_CONFIG = {
  // Stage 1 termination
  eigenvalueRatioThreshold: 5,
  minVarianceReductionFraction: 0.05,
  maxStageOneItems: 20,

  // Spectrum flagging for stage 2
  spectrumFlagMeanPercentile: 0.52,
  spectrumFlagUncertaintyRatio: 0.6,

  // Condition classification
  classification: {
    likelyProbability: 0.60,
    likelyMaxUncertainty: 0.4,
    ruledOutProbability: 0.10,
    ruledOutMaxUncertainty: 0.4,
    flaggedProbability: 0.25,
  },

  // Stage 2 termination
  stageTwoMinVarianceReduction: 0.02,
  maxStageTwoItems: 15,
  maxTotalItems: 35,

  // Item selection
  topKItems: 8,

  // LLM limits
  maxClarificationsPerItem: 3,
  maxLlmToolCalls: 10,
} as const;

export type ScreeningConfig = typeof SCREENING_CONFIG;
