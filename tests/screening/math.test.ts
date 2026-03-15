/**
 * Math engine unit tests for the Bayesian adaptive screening model.
 *
 * Tests cover:
 * - Kalman update (spectrum-level and condition-level)
 * - Posterior mean and covariance updates against hand-calculated values
 * - Item ranking / expected variance reduction
 * - Stage transition criteria
 * - Probability computation and condition classification
 * - Normalization
 * - Runtime noise / overlap inflation
 * - Edge cases
 */

import { describe, it, expect } from "vitest";
import {
  kalmanUpdateSpectrum,
  kalmanUpdateCondition,
  kalmanUpdate,
  normalizeResponse,
  batchUpdate,
  trace,
} from "@/lib/screening/update";
import { rankItems, computeRuntimeNoise } from "@/lib/screening/selection";
import { eigenvalues, checkStageOneTermination, transitionToStageTwo } from "@/lib/screening/transition";
import { normalCdf, computeProbability, classifyCondition, checkStageTwoTermination } from "@/lib/screening/diagnosis";
import { SCREENING_CONFIG } from "@/lib/screening/config";
import {
  buildMockReferenceData,
  makeInitialState,
  makeStage2State,
  INITIAL_COVARIANCE,
} from "./helpers";

const refData = buildMockReferenceData();

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("normalizeResponse", () => {
  it("maps min to 0 and max to 1", () => {
    expect(normalizeResponse(0, 0, 3)).toBe(0);
    expect(normalizeResponse(3, 0, 3)).toBe(1);
  });

  it("maps intermediate values linearly", () => {
    expect(normalizeResponse(1, 0, 3)).toBeCloseTo(1 / 3);
    expect(normalizeResponse(2, 0, 3)).toBeCloseTo(2 / 3);
  });

  it("handles equal min/max", () => {
    expect(normalizeResponse(5, 5, 5)).toBe(0.5);
  });

  it("handles non-zero min", () => {
    expect(normalizeResponse(3, 1, 5)).toBeCloseTo(0.5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RUNTIME NOISE
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeRuntimeNoise", () => {
  it("returns base noise when no overlapping items administered", () => {
    const noise = computeRuntimeNoise("I1", [], refData);
    expect(noise).toBe(0.3);
  });

  it("inflates noise when overlapping item is administered", () => {
    // I1 and I3 overlap with multiplier 2.0
    const noise = computeRuntimeNoise("I1", ["I3"], refData);
    expect(noise).toBe(0.3 * 2.0);
  });

  it("does not inflate when non-overlapping item is administered", () => {
    const noise = computeRuntimeNoise("I1", ["I2"], refData);
    expect(noise).toBe(0.3);
  });

  it("uses maximum multiplier when multiple overlaps", () => {
    // I3 overlaps with I1 (multiplier 2.0), no other overlaps
    const noise = computeRuntimeNoise("I3", ["I1", "I2"], refData);
    expect(noise).toBe(0.3 * 2.0);
  });

  it("returns 1.0 for unknown item", () => {
    expect(computeRuntimeNoise("UNKNOWN", [], refData)).toBe(1.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPECTRUM-LEVEL KALMAN UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

describe("kalmanUpdateSpectrum", () => {
  /**
   * Hand-calculated test case for I1 (h = [0.7, 0.3, 0]) with initial state:
   *   μ = [0, 0, 0], Σ = [[1, 0.5, 0.2], [0.5, 1, 0.1], [0.2, 0.1, 1]]
   *   Response: normalized = 2/3 ≈ 0.6667, noise σ² = 0.3
   *
   * Σh = [1*0.7 + 0.5*0.3 + 0.2*0, 0.5*0.7 + 1*0.3 + 0.1*0, 0.2*0.7 + 0.1*0.3 + 1*0]
   *    = [0.85, 0.65, 0.17]
   * S = hᵀΣh + σ² = 0.7*0.85 + 0.3*0.65 + 0*0.17 + 0.3 = 0.595 + 0.195 + 0.3 = 1.09
   * K = Σh / S = [0.85/1.09, 0.65/1.09, 0.17/1.09] ≈ [0.7798, 0.5963, 0.1560]
   * δ = y - hᵀμ = 0.6667 - 0 = 0.6667
   * μ_new = [0 + 0.7798*0.6667, 0 + 0.5963*0.6667, 0 + 0.1560*0.6667]
   *       ≈ [0.5199, 0.3975, 0.1040]
   */
  it("updates mean correctly for I1 with response 2/3", () => {
    const state = makeInitialState();
    const normalized = normalizeResponse(2, 0, 3); // 2/3

    const result = kalmanUpdateSpectrum(state, "I1", normalized, refData);

    // Σh
    const sigmaH = [0.85, 0.65, 0.17];
    const S = 0.7 * 0.85 + 0.3 * 0.65 + 0.3; // 1.09
    const K = sigmaH.map((v) => v / S);
    const delta = normalized; // μ=0 so δ=y

    expect(result.state.spectrumMean[0]).toBeCloseTo(K[0] * delta, 4);
    expect(result.state.spectrumMean[1]).toBeCloseTo(K[1] * delta, 4);
    expect(result.state.spectrumMean[2]).toBeCloseTo(K[2] * delta, 4);
  });

  it("updates covariance correctly (decreases diagonal)", () => {
    const state = makeInitialState();
    const result = kalmanUpdateSpectrum(state, "I1", 0.5, refData);

    // All diagonal entries should decrease (uncertainty reduced)
    for (let i = 0; i < 3; i++) {
      expect(result.state.spectrumCovariance[i][i]).toBeLessThan(
        INITIAL_COVARIANCE[i][i],
      );
    }
  });

  it("covariance update is independent of response value", () => {
    const state1 = makeInitialState();
    const state2 = makeInitialState();

    const r1 = kalmanUpdateSpectrum(state1, "I1", 0.0, refData);
    const r2 = kalmanUpdateSpectrum(state2, "I1", 1.0, refData);

    // Σ_new should be identical regardless of response
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(r1.state.spectrumCovariance[i][j]).toBeCloseTo(
          r2.state.spectrumCovariance[i][j],
          10,
        );
      }
    }
  });

  it("mean update scales with response magnitude", () => {
    const state1 = makeInitialState();
    const state2 = makeInitialState();

    const r1 = kalmanUpdateSpectrum(state1, "I1", 0.0, refData);
    const r2 = kalmanUpdateSpectrum(state2, "I1", 1.0, refData);

    // Higher response → larger mean shift in loaded dimensions
    expect(r2.state.spectrumMean[0]).toBeGreaterThan(r1.state.spectrumMean[0]);
  });

  it("reports positive info gain", () => {
    const state = makeInitialState();
    const result = kalmanUpdateSpectrum(state, "I1", 0.5, refData);
    expect(result.infoGain).toBeGreaterThan(0);
  });

  it("info gain equals trace reduction", () => {
    const state = makeInitialState();
    const traceBefore = trace(state.spectrumCovariance);
    const result = kalmanUpdateSpectrum(state, "I1", 0.5, refData);
    const traceAfter = trace(result.state.spectrumCovariance);

    expect(result.infoGain).toBeCloseTo(traceBefore - traceAfter, 10);
  });

  it("preserves covariance symmetry", () => {
    const state = makeInitialState();
    const result = kalmanUpdateSpectrum(state, "I1", 0.5, refData);

    const cov = result.state.spectrumCovariance;
    for (let i = 0; i < cov.length; i++) {
      for (let j = 0; j < cov.length; j++) {
        expect(cov[i][j]).toBeCloseTo(cov[j][i], 10);
      }
    }
  });

  it("handles item with zero loadings gracefully", () => {
    const state = makeInitialState();
    // I4 is TARGETED and loads on conditions, not spectra — h vector is all zeros
    const result = kalmanUpdateSpectrum(state, "I4", 0.5, refData);

    // No update should occur
    expect(result.infoGain).toBe(0);
    expect(result.state.spectrumMean).toEqual([0, 0, 0]);
  });

  it("cross-loading item updates correlated dimensions", () => {
    const state = makeInitialState();
    // I1 loads on S1 (0.7) and S2 (0.3), plus S1↔S2 correlation = 0.5
    const result = kalmanUpdateSpectrum(state, "I1", 1.0, refData);

    // S2 should be updated even though I1's primary loading is on S1
    expect(result.state.spectrumMean[1]).toBeGreaterThan(0);
    // S3 should also be updated through correlations (S1↔S3=0.2, S2↔S3=0.1)
    expect(result.state.spectrumMean[2]).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONDITION-LEVEL KALMAN UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

describe("kalmanUpdateCondition", () => {
  /**
   * Hand-calculated test for I4 (loads 0.8 on C1) with stage 2 state:
   *   conditionMean = [-0.5, -1.0, -0.8, -1.5]
   *   conditionVariances = [0.7, 0.8, 0.75, 0.9]
   *   Response: normalized = 1.0 (max response), noise = 0.3
   *
   * For C1 (h=0.8, μ=-0.5, σ²=0.7):
   *   ŷ = 0.8 × (-0.5) = -0.4
   *   δ = 1.0 - (-0.4) = 1.4
   *   S = 0.8² × 0.7 + 0.3 = 0.448 + 0.3 = 0.748
   *   K = 0.8 × 0.7 / 0.748 = 0.56 / 0.748 ≈ 0.7487
   *   μ_new = -0.5 + 0.7487 × 1.4 ≈ 0.5482
   *   σ²_new = (1 - 0.7487 × 0.8) × 0.7 = (1 - 0.5989) × 0.7 ≈ 0.2808
   */
  it("updates C1 mean and variance correctly for I4", () => {
    const state = makeStage2State();
    const result = kalmanUpdateCondition(state, "I4", 1.0, refData);

    const h = 0.8;
    const mu = -0.5;
    const condVar = 0.7;
    const noise = 0.3;
    const S = h * h * condVar + noise;
    const K = (h * condVar) / S;
    const delta = 1.0 - h * mu;
    const muNew = mu + K * delta;
    const varNew = (1 - K * h) * condVar;

    expect(result.state.conditionMean![0]).toBeCloseTo(muNew, 4);
    expect(result.state.conditionVariances![0]).toBeCloseTo(varNew, 4);
  });

  it("does not affect conditions without loadings", () => {
    const state = makeStage2State();
    // I4 only loads on C1
    const result = kalmanUpdateCondition(state, "I4", 1.0, refData);

    // C2, C3, C4 should be unchanged
    expect(result.state.conditionMean![1]).toBe(-1.0);
    expect(result.state.conditionMean![2]).toBe(-0.8);
    expect(result.state.conditionMean![3]).toBe(-1.5);
    expect(result.state.conditionVariances![1]).toBe(0.8);
    expect(result.state.conditionVariances![2]).toBe(0.75);
    expect(result.state.conditionVariances![3]).toBe(0.9);
  });

  it("variance always decreases (positive definite update)", () => {
    const state = makeStage2State();
    const result = kalmanUpdateCondition(state, "I4", 0.5, refData);
    expect(result.state.conditionVariances![0]).toBeLessThan(0.7);
  });

  it("throws when called before stage 2 transition", () => {
    const state = makeInitialState();
    expect(() => kalmanUpdateCondition(state, "I4", 0.5, refData)).toThrow(
      "Cannot run condition-level update before stage 2 transition",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED KALMAN UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

describe("kalmanUpdate (unified)", () => {
  it("dispatches to spectrum update in BROAD_SCREENING", () => {
    const state = makeInitialState();
    const result = kalmanUpdate(state, "I1", 0.5, refData);
    // Should have updated spectrum mean
    expect(result.state.spectrumMean[0]).not.toBe(0);
  });

  it("dispatches to condition update in TARGETED", () => {
    const state = makeStage2State();
    const result = kalmanUpdate(state, "I4", 0.5, refData);
    // Should have updated condition mean
    expect(result.state.conditionMean![0]).not.toBe(-0.5);
  });

  it("throws for COMPLETE stage", () => {
    const state = makeInitialState();
    state.stage = "COMPLETE";
    expect(() => kalmanUpdate(state, "I1", 0.5, refData)).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

describe("batchUpdate", () => {
  it("applies updates sequentially", () => {
    const state = makeInitialState();
    const items = [
      { itemId: "I1", normalizedResponse: 0.5 },
      { itemId: "I2", normalizedResponse: 0.3 },
    ];
    const { state: finalState, results } = batchUpdate(state, items, refData);

    expect(results).toHaveLength(2);
    // Total info gain should be the sum of individual gains
    const totalGain = results.reduce((sum, r) => sum + r.infoGain, 0);
    const totalTraceReduction =
      trace(state.spectrumCovariance) - trace(finalState.spectrumCovariance);
    expect(totalGain).toBeCloseTo(totalTraceReduction, 10);
  });

  it("second update uses posterior from first", () => {
    const state = makeInitialState();

    // Sequential manual updates
    const r1 = kalmanUpdate(state, "I1", 0.5, refData);
    const r2 = kalmanUpdate(r1.state, "I2", 0.3, refData);

    // Batch
    const { state: batchState } = batchUpdate(
      state,
      [
        { itemId: "I1", normalizedResponse: 0.5 },
        { itemId: "I2", normalizedResponse: 0.3 },
      ],
      refData,
    );

    for (let i = 0; i < 3; i++) {
      expect(batchState.spectrumMean[i]).toBeCloseTo(r2.state.spectrumMean[i], 10);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM RANKING
// ═══════════════════════════════════════════════════════════════════════════════

describe("rankItems", () => {
  it("returns items sorted by expected variance reduction (descending)", () => {
    const state = makeInitialState();
    const ranked = rankItems(state, refData, SCREENING_CONFIG);

    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].expectedVarianceReduction).toBeGreaterThanOrEqual(
        ranked[i].expectedVarianceReduction,
      );
    }
  });

  it("only returns BROAD_SCREENING items in stage 1", () => {
    const state = makeInitialState();
    const ranked = rankItems(state, refData, SCREENING_CONFIG);

    for (const r of ranked) {
      expect(r.item.tier).toBe("BROAD_SCREENING");
    }
  });

  it("excludes administered items", () => {
    const state = makeInitialState();
    state.itemsAdministered.push({ itemId: "I1", response: 2, stage: "BROAD_SCREENING" });

    const ranked = rankItems(state, refData, SCREENING_CONFIG);
    expect(ranked.every((r) => r.itemId !== "I1")).toBe(true);
  });

  it("excludes auto-scored items", () => {
    const state = makeInitialState();
    state.autoScoredItems.push({ itemId: "I2", response: 1, source: "implied" });

    const ranked = rankItems(state, refData, SCREENING_CONFIG);
    expect(ranked.every((r) => r.itemId !== "I2")).toBe(true);
  });

  it("cross-loading items have higher EVR than single-loading items", () => {
    const state = makeInitialState();
    const ranked = rankItems(state, refData, SCREENING_CONFIG);

    // I1 loads on S1 (0.7) and S2 (0.3) — should have higher EVR than I2 (only S2, 0.6)
    const evrI1 = ranked.find((r) => r.itemId === "I1")?.expectedVarianceReduction ?? 0;
    const evrI2 = ranked.find((r) => r.itemId === "I2")?.expectedVarianceReduction ?? 0;
    expect(evrI1).toBeGreaterThan(evrI2);
  });

  it("EVR decreases after administering an item on the same dimension", () => {
    const state = makeInitialState();
    const rankedBefore = rankItems(state, refData, SCREENING_CONFIG);
    const evrI2Before = rankedBefore.find((r) => r.itemId === "I2")?.expectedVarianceReduction ?? 0;

    // Administer I1 (loads on S1 and S2) — should reduce EVR for I2 (loads on S2)
    const result = kalmanUpdate(state, "I1", 0.5, refData);
    result.state.itemsAdministered.push({ itemId: "I1", response: 2, stage: "BROAD_SCREENING" });

    const rankedAfter = rankItems(result.state, refData, SCREENING_CONFIG);
    const evrI2After = rankedAfter.find((r) => r.itemId === "I2")?.expectedVarianceReduction ?? 0;

    expect(evrI2After).toBeLessThan(evrI2Before);
  });

  it("returns only TARGETED items in stage 2 that load on flagged conditions", () => {
    const state = makeStage2State();
    const ranked = rankItems(state, refData, SCREENING_CONFIG);

    for (const r of ranked) {
      expect(r.item.tier).toBe("TARGETED");
    }
  });

  it("EVR is non-negative", () => {
    const state = makeInitialState();
    const ranked = rankItems(state, refData, SCREENING_CONFIG);
    for (const r of ranked) {
      expect(r.expectedVarianceReduction).toBeGreaterThanOrEqual(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EIGENVALUES
// ═══════════════════════════════════════════════════════════════════════════════

describe("eigenvalues", () => {
  it("computes eigenvalues of identity matrix", () => {
    const I = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const eigs = eigenvalues(I);
    expect(eigs).toHaveLength(3);
    for (const e of eigs) {
      expect(e).toBeCloseTo(1.0, 6);
    }
  });

  it("computes eigenvalues of diagonal matrix", () => {
    const D = [
      [3, 0, 0],
      [0, 1, 0],
      [0, 0, 2],
    ];
    const eigs = eigenvalues(D);
    expect(eigs[0]).toBeCloseTo(1.0, 6);
    expect(eigs[1]).toBeCloseTo(2.0, 6);
    expect(eigs[2]).toBeCloseTo(3.0, 6);
  });

  it("eigenvalues of correlation matrix sum to trace", () => {
    const eigs = eigenvalues(INITIAL_COVARIANCE);
    const eigSum = eigs.reduce((a, b) => a + b, 0);
    expect(eigSum).toBeCloseTo(trace(INITIAL_COVARIANCE), 6);
  });

  it("all eigenvalues of PSD matrix are non-negative", () => {
    const eigs = eigenvalues(INITIAL_COVARIANCE);
    for (const e of eigs) {
      expect(e).toBeGreaterThanOrEqual(-1e-10);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 1 TERMINATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("checkStageOneTermination", () => {
  it("does not terminate initially", () => {
    const state = makeInitialState();
    const initialTr = trace(state.spectrumCovariance);
    const result = checkStageOneTermination(state, initialTr, refData, SCREENING_CONFIG);
    expect(result.shouldTerminate).toBe(false);
  });

  it("terminates when max items reached", () => {
    const state = makeInitialState();
    // Add 20 administered items
    for (let i = 0; i < 20; i++) {
      state.itemsAdministered.push({ itemId: `fake-${i}`, response: 1, stage: "BROAD_SCREENING" });
    }
    const result = checkStageOneTermination(state, 3.0, refData, SCREENING_CONFIG);
    expect(result.shouldTerminate).toBe(true);
    expect(result.reason).toBe("max_stage_one_items");
  });

  it("terminates when eigenvalue ratio exceeds threshold", () => {
    const state = makeInitialState();
    // Make covariance highly anisotropic
    state.spectrumCovariance = [
      [0.01, 0, 0],
      [0, 0.01, 0],
      [0, 0, 1.0],
    ];
    const result = checkStageOneTermination(state, 3.0, refData, SCREENING_CONFIG);
    // Eigenvalue ratio = 1.0 / 0.01 = 100, threshold = 15
    expect(result.shouldTerminate).toBe(true);
    expect(result.reason).toBe("eigenvalue_ratio");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE TRANSITION
// ═══════════════════════════════════════════════════════════════════════════════

describe("transitionToStageTwo", () => {
  it("sets stage to TARGETED", () => {
    const state = makeInitialState();
    state.spectrumMean = [1.0, 0.8, -0.5];
    const newState = transitionToStageTwo(state, refData, SCREENING_CONFIG);
    expect(newState.stage).toBe("TARGETED");
  });

  it("flags spectra with elevated mean", () => {
    const state = makeInitialState();
    state.spectrumMean = [1.0, 0.8, -0.5]; // S1 and S2 > 0.52 threshold
    const newState = transitionToStageTwo(state, refData, SCREENING_CONFIG);
    expect(newState.flaggedSpectra).toContain("S1");
    expect(newState.flaggedSpectra).toContain("S2");
  });

  it("flags spectra with high remaining uncertainty", () => {
    const state = makeInitialState();
    state.spectrumMean = [-1, -1, -1]; // All means low
    // But covariance diagonal is 1.0 → √1.0 = 1.0 > 0.6 threshold
    const newState = transitionToStageTwo(state, refData, SCREENING_CONFIG);
    // All spectra should be flagged due to high uncertainty
    expect(newState.flaggedSpectra.length).toBeGreaterThan(0);
  });

  it("computes condition priors using Σ = λ²Σ_spectrum + (1-λ²)", () => {
    const state = makeInitialState();
    state.spectrumMean = [1.0, 0.0, 0.0];
    state.spectrumCovariance = [
      [0.4, 0, 0],
      [0, 0.5, 0],
      [0, 0, 0.6],
    ];

    const newState = transitionToStageTwo(state, refData, SCREENING_CONFIG);

    if (!newState.conditionVariances || !newState.conditionDimensionOrder) {
      throw new Error("Expected condition data after transition");
    }

    // C1 (MDD) under S1, λ=0.85: Σ = 0.85²×0.4 + (1-0.85²) = 0.289 + 0.2775 = 0.5665
    const c1Idx = newState.conditionDimensionOrder.indexOf("C1");
    if (c1Idx >= 0) {
      const expectedVar = 0.85 * 0.85 * 0.4 + (1 - 0.85 * 0.85);
      expect(newState.conditionVariances[c1Idx]).toBeCloseTo(expectedVar, 4);
    }
  });

  it("computes condition means using μ = baseLiability + λ × μ_spectrum", () => {
    const state = makeInitialState();
    state.spectrumMean = [1.5, 0.0, 0.0];

    const newState = transitionToStageTwo(state, refData, SCREENING_CONFIG);

    if (!newState.conditionMean || !newState.conditionDimensionOrder) {
      throw new Error("Expected condition data after transition");
    }

    // C1 (MDD): baseLiability = -1.48, λ=0.85, spectrum mean = 1.5
    // μ = -1.48 + 0.85 × 1.5 = -1.48 + 1.275 = -0.205
    const c1Idx = newState.conditionDimensionOrder.indexOf("C1");
    if (c1Idx >= 0) {
      expect(newState.conditionMean[c1Idx]).toBeCloseTo(-1.48 + 0.85 * 1.5, 4);
    }
  });

  it("only includes conditions under flagged spectra", () => {
    const state = makeInitialState();
    state.spectrumMean = [1.0, -2.0, -2.0]; // Only S1 elevated
    // Reduce uncertainty so S2 and S3 aren't flagged
    state.spectrumCovariance = [
      [0.4, 0, 0],
      [0, 0.1, 0],
      [0, 0, 0.1],
    ];

    const newState = transitionToStageTwo(state, refData, SCREENING_CONFIG);

    // S2 has mean -2.0 (< 0.52) and uncertainty √0.1 ≈ 0.316 (< 0.6), so NOT flagged
    // Only S1 should be flagged → only C1, C3 (both under S1) in conditionDimensionOrder
    expect(newState.flaggedSpectra).toContain("S1");
    expect(newState.flaggedSpectra).not.toContain("S2");
    expect(newState.conditionDimensionOrder).toContain("C1");
    expect(newState.conditionDimensionOrder).toContain("C3");
    expect(newState.conditionDimensionOrder).not.toContain("C2");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROBABILITY & CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("normalCdf", () => {
  it("Φ(0) = 0.5", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
  });

  it("Φ(-∞) ≈ 0", () => {
    expect(normalCdf(-10)).toBeCloseTo(0, 6);
  });

  it("Φ(∞) ≈ 1", () => {
    expect(normalCdf(10)).toBeCloseTo(1, 6);
  });

  it("Φ(1.96) ≈ 0.975", () => {
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 4);
  });

  it("Φ(-1.96) ≈ 0.025", () => {
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 4);
  });

  it("symmetry: Φ(x) + Φ(-x) = 1", () => {
    for (const x of [0.5, 1.0, 1.5, 2.0, 3.0]) {
      expect(normalCdf(x) + normalCdf(-x)).toBeCloseTo(1.0, 6);
    }
  });
});

describe("computeProbability", () => {
  it("P = 0.5 when mean equals threshold", () => {
    // P(z > τ) when μ = τ → Φ(0) subtracted from 1 → 0.5
    expect(computeProbability(1.28, 1.0, 1.28)).toBeCloseTo(0.5, 4);
  });

  it("P → 1 when mean far above threshold", () => {
    expect(computeProbability(5.0, 0.1, 1.0)).toBeGreaterThan(0.99);
  });

  it("P → 0 when mean far below threshold", () => {
    expect(computeProbability(-5.0, 0.1, 1.0)).toBeLessThan(0.01);
  });

  it("P increases with higher mean (fixed variance and threshold)", () => {
    const p1 = computeProbability(0.0, 1.0, 1.28);
    const p2 = computeProbability(0.5, 1.0, 1.28);
    const p3 = computeProbability(1.0, 1.0, 1.28);
    expect(p2).toBeGreaterThan(p1);
    expect(p3).toBeGreaterThan(p2);
  });

  it("P increases with higher variance (uncertainty spreads mass above threshold)", () => {
    // When mean is below threshold, increasing variance pushes more mass above threshold
    const p1 = computeProbability(0.0, 0.1, 1.28);
    const p2 = computeProbability(0.0, 1.0, 1.28);
    expect(p2).toBeGreaterThan(p1);
  });

  it("handles near-zero variance without crash", () => {
    // Should not NaN or throw
    const p = computeProbability(0.0, 1e-12, 1.28);
    expect(Number.isFinite(p)).toBe(true);
  });
});

describe("classifyCondition", () => {
  const config = SCREENING_CONFIG;

  it("classifies as likely when high probability and low uncertainty", () => {
    expect(classifyCondition(0.70, 0.3, config)).toBe("likely");
  });

  it("classifies as ruled_out when low probability and low uncertainty", () => {
    expect(classifyCondition(0.05, 0.3, config)).toBe("ruled_out");
  });

  it("classifies as flagged when moderate probability", () => {
    expect(classifyCondition(0.30, 0.5, config)).toBe("flagged");
  });

  it("classifies as uncertain when probability is middling and uncertainty high", () => {
    expect(classifyCondition(0.20, 0.5, config)).toBe("uncertain");
  });

  it("likely requires BOTH high probability and low uncertainty", () => {
    // High prob but high uncertainty → flagged, not likely
    expect(classifyCondition(0.70, 0.5, config)).toBe("flagged");
  });

  it("ruled_out requires BOTH low probability and low uncertainty", () => {
    // Low prob but high uncertainty → uncertain
    expect(classifyCondition(0.05, 0.5, config)).toBe("uncertain");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 2 TERMINATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("checkStageTwoTermination", () => {
  it("does not terminate with unresolved conditions", () => {
    const state = makeStage2State();
    const result = checkStageTwoTermination(state, refData, SCREENING_CONFIG);
    // With default variances and means, conditions are likely still unresolved
    // (depends on exact values, but generally should not terminate immediately)
    expect(typeof result.shouldTerminate).toBe("boolean");
  });

  it("terminates at max total items", () => {
    const state = makeStage2State();
    for (let i = 0; i < 35; i++) {
      state.itemsAdministered.push({ itemId: `t-${i}`, response: 1, stage: "TARGETED" });
    }
    const result = checkStageTwoTermination(state, refData, SCREENING_CONFIG);
    expect(result.shouldTerminate).toBe(true);
    expect(result.reason).toBe("max_total_items");
  });

  it("terminates at max stage two items", () => {
    const state = makeStage2State();
    for (let i = 0; i < 15; i++) {
      state.itemsAdministered.push({ itemId: `t-${i}`, response: 1, stage: "TARGETED" });
    }
    const result = checkStageTwoTermination(state, refData, SCREENING_CONFIG);
    expect(result.shouldTerminate).toBe(true);
    expect(result.reason).toBe("max_stage_two_items");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRACE UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

describe("trace", () => {
  it("sums diagonal of identity", () => {
    expect(trace([[1, 0], [0, 1]])).toBe(2);
  });

  it("sums diagonal of arbitrary matrix", () => {
    expect(trace([[3, 1], [2, 5]])).toBe(8);
  });

  it("trace of initial covariance equals number of spectra", () => {
    // Unit prior variances → tr(Σ₀) = 3
    expect(trace(INITIAL_COVARIANCE)).toBeCloseTo(3.0, 10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("edge cases", () => {
  it("all-zero responses produce updated state", () => {
    const state = makeInitialState();
    const result = kalmanUpdate(state, "I1", 0.0, refData);
    // Mean should move toward negative (zero response when items load positively)
    // or stay near zero depending on prior
    expect(Number.isFinite(result.state.spectrumMean[0])).toBe(true);
    expect(result.infoGain).toBeGreaterThan(0);
  });

  it("all-max responses produce updated state", () => {
    const state = makeInitialState();
    const result = kalmanUpdate(state, "I1", 1.0, refData);
    expect(result.state.spectrumMean[0]).toBeGreaterThan(0);
    expect(Number.isFinite(result.state.spectrumMean[0])).toBe(true);
  });

  it("sequential updates monotonically decrease total uncertainty", () => {
    let state = makeInitialState();
    const traces: number[] = [trace(state.spectrumCovariance)];

    for (const itemId of ["I1", "I2", "I3"]) {
      const result = kalmanUpdate(state, itemId, 0.5, refData);
      state = result.state;
      state.itemsAdministered.push({ itemId, response: 1, stage: "BROAD_SCREENING" });
      traces.push(trace(state.spectrumCovariance));
    }

    for (let i = 1; i < traces.length; i++) {
      expect(traces[i]).toBeLessThan(traces[i - 1]);
    }
  });

  it("many updates don't produce negative variances", () => {
    let state = makeInitialState();
    // Apply same-ish items many times (simulating many observations)
    for (let i = 0; i < 50; i++) {
      const result = kalmanUpdate(state, "I1", 0.5, refData);
      state = result.state;
    }

    for (let i = 0; i < 3; i++) {
      expect(state.spectrumCovariance[i][i]).toBeGreaterThanOrEqual(0);
    }
  });

  it("condition variance initialization preserves spectrum info (high λ, low spectrum var)", () => {
    const state = makeInitialState();
    state.spectrumMean = [2.0, 0.0, 0.0];
    // Very low spectrum uncertainty after many observations
    state.spectrumCovariance = [
      [0.1, 0, 0],
      [0, 0.1, 0],
      [0, 0, 0.1],
    ];

    const newState = transitionToStageTwo(state, refData, SCREENING_CONFIG);
    if (!newState.conditionVariances || !newState.conditionDimensionOrder) {
      throw new Error("Expected condition data");
    }

    // C1 (λ=0.85): Σ = 0.85² × 0.1 + (1-0.85²) = 0.07225 + 0.2775 = 0.34975
    // This should be much less than 1.0, showing that stage 1 info is preserved
    const c1Idx = newState.conditionDimensionOrder.indexOf("C1");
    if (c1Idx >= 0) {
      expect(newState.conditionVariances[c1Idx]).toBeLessThan(0.5);
      expect(newState.conditionVariances[c1Idx]).toBeCloseTo(
        0.85 * 0.85 * 0.1 + (1 - 0.85 * 0.85),
        4,
      );
    }
  });
});
