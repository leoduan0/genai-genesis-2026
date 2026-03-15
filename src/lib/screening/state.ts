import type { ReferenceData, ScreeningState } from "./types";

/**
 * Build the initial prior covariance matrix Σ₀ from DimensionCorrelation data.
 * Returns an N×N matrix where N = number of spectra in referenceData.
 * Diagonal entries are 1.0 (unit prior variance on the liability scale).
 */
export function buildPriorCovariance(refData: ReferenceData): number[][] {
  const n = refData.spectra.length;
  const sigma = Array.from({ length: n }, () => new Array(n).fill(0));

  // Diagonal = 1.0 (standard normal prior)
  for (let i = 0; i < n; i++) {
    sigma[i][i] = 1.0;
  }

  // Off-diagonal from correlation data
  for (const spec of refData.spectra) {
    // Look through all correlations — they may appear as (A,B) or (B,A)
  }

  // We need the raw correlations. They're stored in the DB as DimensionCorrelation rows,
  // but ReferenceData doesn't carry them directly — the covariance IS the correlation
  // matrix since we start with unit variances. We reconstruct from itemLoadings if needed,
  // but typically this is loaded pre-built. For now, we look through the spectra pairs.
  // The caller (data.ts loadFullReferenceData) will provide correlations via a helper.
  return sigma;
}

/**
 * Build Σ₀ from an explicit correlation map.
 * correlations: Map<`${spectrumIdA}:${spectrumIdB}`, correlation>
 */
export function buildPriorCovarianceFromCorrelations(
  refData: ReferenceData,
  correlations: Map<string, number>,
): number[][] {
  const n = refData.spectra.length;
  const sigma = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    sigma[i][i] = 1.0;
  }

  for (const [key, corr] of correlations) {
    const [idA, idB] = key.split(":");
    const i = refData.spectrumIndex.get(idA);
    const j = refData.spectrumIndex.get(idB);
    if (i !== undefined && j !== undefined) {
      sigma[i][j] = corr;
      sigma[j][i] = corr;
    }
  }

  return sigma;
}

/**
 * Create the initial screening state.
 * μ₀ = zeros (standard normal prior), Σ₀ = correlation matrix from DB.
 */
export function initState(
  refData: ReferenceData,
  correlations: Map<string, number>,
): ScreeningState {
  const n = refData.spectra.length;
  const covariance = buildPriorCovarianceFromCorrelations(refData, correlations);

  return {
    stage: "INTAKE",
    spectrumMean: new Array(n).fill(0),
    spectrumCovariance: covariance,
    conditionMean: null,
    conditionVariances: null,
    conditionDimensionOrder: null,
    itemsAdministered: [],
    autoScoredItems: [],
    flaggedSpectra: [],
    flaggedConditions: [],
  };
}
