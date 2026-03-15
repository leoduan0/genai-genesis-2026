export const SCREENING_CONFIG = {
  // Stage 1 termination
  eigenvalueRatioThreshold: 15,
  // Minimum expected trace reduction (sum of diagonal variance removed) for a
  // stage 1 item to be worth administering. With 8 spectra and initial trace ~8,
  // a threshold of 0.01 means <0.1% of total uncertainty would be removed.
  minStageOneTraceReduction: 0.005,
  maxStageOneItems: 15,

  // Spectrum flagging for stage 2
  spectrumFlagMeanZ: 0.40, // z-score threshold (~66th percentile of N(0,1))

  // Condition classification
  // NOTE: uncertainty = sqrt(posterior variance). With 8-10 targeted items,
  // typical posterior variances are 0.4-0.7 → uncertainty 0.63-0.84.
  // Gates must accommodate these achievable levels.
  classification: {
    likelyProbability: 0.52,
    likelyMaxUncertainty: 0.85,
    ruledOutProbability: 0.10,
    ruledOutMaxUncertainty: 0.90,
    flaggedProbability: 0.25,
    flaggedMaxUncertainty: 0.85,
  },

  // Stage 2 termination
  // Minimum expected absolute probability change for a stage 2 item.
  stageTwoMinExpectedProbChange: 0.02,
  maxStageTwoItems: 45,
  maxTotalItems: 60,

  // Item selection
  topKItems: 8,

  // LLM limits
  maxClarificationsPerItem: 3,
  maxLlmToolCalls: 10,
} as const;

export type ScreeningConfig = typeof SCREENING_CONFIG;
