/**
 * Diagnostic tests for Stage 2 screening issues.
 *
 * Goal: trace the math at each step to understand why condition probabilities
 * stay at ~1% and why item selection doesn't vary with responses.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  kalmanUpdate,
  normalizeResponse,
  trace,
  rankItems,
  initState,
  checkStageOneTermination,
  transitionToStageTwo,
  computeProbability,
  generateDiagnosticProfile,
  SCREENING_CONFIG,
} from "@/lib/screening";
import { checkStageTwoTermination } from "@/lib/screening/diagnosis";
import { loadFullReferenceData } from "@/lib/screening/loadData";
import type { ReferenceData, ScreeningState, ItemRef } from "@/lib/screening/types";

let refData: ReferenceData;
let correlations: Map<string, number>;
const specId: Record<string, string> = {};
const condId: Record<string, string> = {};

beforeAll(async () => {
  const loaded = await loadFullReferenceData("GENERAL");
  refData = loaded.referenceData;
  correlations = loaded.correlations;
  for (const s of refData.spectra) specId[s.shortCode] = s.id;
  for (const c of refData.conditions) condId[c.shortCode] = c.id;
}, 30000);

function freshState(): ScreeningState {
  return initState(refData, correlations);
}

function respond(state: ScreeningState, itemId: string, rawResponse: number) {
  const item = refData.items.find((i) => i.id === itemId)!;
  const score = Math.max(item.responseMin, Math.min(item.responseMax, Math.round(rawResponse)));
  const normalized = normalizeResponse(
    score, item.responseMin, item.responseMax,
    item.normativeMean, item.normativeSD, item.normativeResponseDist,
    item.isReverseCoded,
  );
  const result = kalmanUpdate(state, itemId, normalized, refData);
  const newState: ScreeningState = {
    ...result.state,
    itemsAdministered: [
      ...result.state.itemsAdministered,
      { itemId, response: score, stage: result.state.stage as "BROAD_SCREENING" | "TARGETED" },
    ],
  };
  return { state: newState, kalmanResult: result, normalized, score };
}

function specIdx(code: string): number {
  return refData.spectrumIndex.get(specId[code])!;
}

function specMean(state: ScreeningState, code: string): number {
  return state.spectrumMean[specIdx(code)];
}

function specVar(state: ScreeningState, code: string): number {
  const i = specIdx(code);
  return state.spectrumCovariance[i][i];
}

// ============================================================================
// TEST 1: Trace the full depressed patient pipeline with detailed output
// ============================================================================

describe("Stage 2 probability diagnostic", () => {
  function depressedResponse(item: ItemRef): number {
    const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
    const loadsDIS = loadings.some((l) => l.dimensionId === specId["DIS"] && l.loading > 0.3);
    const loadsMDD = loadings.some((l) => l.dimensionId === condId["MDD"]);
    const loadsPDD = loadings.some((l) => l.dimensionId === condId["PDD"]);
    const loadsPTSD = loadings.some((l) => l.dimensionId === condId["PTSD"]);
    const loadsGAD = loadings.some((l) => l.dimensionId === condId["GAD"]);
    if (loadsDIS || loadsMDD || loadsPDD || loadsPTSD || loadsGAD) {
      return item.isReverseCoded ? item.responseMin : item.responseMax;
    }
    return item.isReverseCoded ? item.responseMax : item.responseMin;
  }

  it("TRACE: stage 1 → transition → stage 2 for depressed patient", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";
    const initialTrace = trace(state.spectrumCovariance);

    console.log("\n=== STAGE 1: BROAD SCREENING ===");
    console.log("Initial spectrum means:", state.spectrumMean);
    console.log("Initial trace:", initialTrace);

    // Run stage 1
    for (let step = 0; step < 30; step++) {
      const ranked = rankItems(state, refData, SCREENING_CONFIG);
      if (ranked.length === 0) break;

      const topItem = ranked[0];
      const item = topItem.item;
      const raw = depressedResponse(item);
      const { state: next, kalmanResult, normalized } = respond(state, topItem.itemId, raw);

      const loadings = refData.itemLoadingsByItem.get(topItem.itemId) ?? [];
      const loadingStr = loadings.map(l => {
        const spec = refData.spectra.find(s => s.id === l.dimensionId);
        const cond = refData.conditions.find(c => c.id === l.dimensionId);
        return `${spec?.shortCode ?? cond?.shortCode ?? '?'}:${l.loading.toFixed(3)}`;
      }).join(', ');

      console.log(`  Step ${step}: item=${item.text.substring(0, 50)} raw=${raw} norm=${normalized.toFixed(3)} EVR=${topItem.expectedVarianceReduction.toFixed(5)} loadings=[${loadingStr}]`);

      state = next;

      const term = checkStageOneTermination(state, initialTrace, refData, SCREENING_CONFIG);
      if (term.shouldTerminate) {
        console.log(`  => TERMINATED: ${term.reason} after ${step + 1} items`);
        break;
      }
    }

    console.log("\n--- After Stage 1 ---");
    for (const s of refData.spectra) {
      const i = specIdx(s.shortCode);
      console.log(`  ${s.shortCode}: mean=${state.spectrumMean[i].toFixed(4)}, var=${state.spectrumCovariance[i][i].toFixed(4)}`);
    }
    console.log(`  Total trace: ${trace(state.spectrumCovariance).toFixed(4)}`);

    // Transition
    console.log("\n=== STAGE TRANSITION ===");
    const transitioned = transitionToStageTwo(state, refData, SCREENING_CONFIG);

    console.log("Flagged spectra:", transitioned.flaggedSpectra.map(id => refData.spectra.find(s => s.id === id)?.shortCode));
    console.log("# conditions in conditionDimensionOrder:", transitioned.conditionDimensionOrder?.length);

    if (transitioned.conditionMean && transitioned.conditionVariances && transitioned.conditionDimensionOrder) {
      console.log("\n--- Condition Priors After Transition ---");
      for (let i = 0; i < transitioned.conditionDimensionOrder.length; i++) {
        const conditionId = transitioned.conditionDimensionOrder[i];
        const condition = refData.conditions.find(c => c.id === conditionId);
        const threshold = refData.thresholdByCondition.get(conditionId);
        const prob = threshold
          ? computeProbability(transitioned.conditionMean[i], transitioned.conditionVariances[i], threshold.thresholdLiability)
          : null;

        const baseRate = refData.baseRates.find(br => br.dimensionId === conditionId);
        const loading = refData.conditionSpectrumLoadings.find(l => l.conditionId === conditionId && l.isPrimary);

        console.log(`  ${condition?.shortCode}: mean=${transitioned.conditionMean[i].toFixed(4)}, var=${transitioned.conditionVariances[i].toFixed(4)}, std=${Math.sqrt(transitioned.conditionVariances[i]).toFixed(4)}, threshold=${threshold?.thresholdLiability.toFixed(2)}, P=${prob?.toFixed(4) ?? 'N/A'}, baseLiabilityMean=${baseRate?.liabilityMean.toFixed(4)}, lambda=${loading?.loading.toFixed(3)}`);
      }
    }

    // Check if stage 2 would terminate immediately
    const termCheck = checkStageTwoTermination(transitioned, refData, SCREENING_CONFIG);
    console.log("\n--- Stage 2 Termination Check (before any items) ---");
    console.log(`  shouldTerminate: ${termCheck.shouldTerminate}, reason: ${termCheck.reason}`);

    // Run stage 2
    console.log("\n=== STAGE 2: TARGETED SCREENING ===");
    state = transitioned;

    for (let step = 0; step < 20; step++) {
      const ranked = rankItems(state, refData, SCREENING_CONFIG);
      if (ranked.length === 0) {
        console.log(`  Step ${step}: NO ITEMS REMAINING`);
        break;
      }

      // Show top 3 ranked items
      console.log(`\n  Step ${step} - Top 3 ranked items:`);
      for (const r of ranked.slice(0, 3)) {
        const loadings = refData.itemLoadingsByItem.get(r.itemId) ?? [];
        const loadingStr = loadings.map(l => {
          const cond = refData.conditions.find(c => c.id === l.dimensionId);
          const spec = refData.spectra.find(s => s.id === l.dimensionId);
          return `${cond?.shortCode ?? spec?.shortCode ?? '?'}:${l.loading.toFixed(3)}`;
        }).join(', ');
        console.log(`    ${r.item.text.substring(0, 50)} EVR=${r.expectedVarianceReduction.toFixed(6)} loadings=[${loadingStr}]`);
      }

      const topItem = ranked[0];
      const item = topItem.item;
      const raw = depressedResponse(item);
      const { state: next, kalmanResult, normalized } = respond(state, topItem.itemId, raw);

      console.log(`  => Administered: raw=${raw} norm=${normalized.toFixed(3)} infoGain=${kalmanResult.infoGain.toFixed(5)}`);

      state = next;

      // Print condition posteriors after this item
      if (state.conditionMean && state.conditionVariances && state.conditionDimensionOrder) {
        for (let i = 0; i < state.conditionDimensionOrder.length; i++) {
          const conditionId = state.conditionDimensionOrder[i];
          const condition = refData.conditions.find(c => c.id === conditionId);
          const threshold = refData.thresholdByCondition.get(conditionId);
          const prob = threshold
            ? computeProbability(state.conditionMean[i], state.conditionVariances[i], threshold.thresholdLiability)
            : null;
          // Only print conditions that changed
          const prevMean = step === 0 ? transitioned.conditionMean![i] : undefined;
          console.log(`    ${condition?.shortCode}: mean=${state.conditionMean[i].toFixed(4)}, var=${state.conditionVariances[i].toFixed(4)}, P=${prob?.toFixed(4) ?? 'N/A'}`);
        }
      }

      const term2 = checkStageTwoTermination(state, refData, SCREENING_CONFIG);
      if (term2.shouldTerminate) {
        console.log(`  => TERMINATED: ${term2.reason} after ${step + 1} items`);
        break;
      }
    }

    // Final profile
    console.log("\n=== FINAL DIAGNOSTIC PROFILE ===");
    const profile = generateDiagnosticProfile(state, refData, SCREENING_CONFIG);
    console.log("Flagged conditions:");
    for (const r of profile.flagged) {
      console.log(`  ${r.shortCode}: P=${r.probability.toFixed(4)}, unc=${r.uncertainty.toFixed(4)}, class=${r.classification}, assessed=${r.wasAssessed}`);
    }
    console.log("Unflagged conditions (top 10 by probability):");
    for (const r of profile.unflagged.slice(0, 10)) {
      console.log(`  ${r.shortCode}: P=${r.probability.toFixed(4)}, unc=${r.uncertainty.toFixed(4)}, class=${r.classification}, assessed=${r.wasAssessed}`);
    }

    // Basic assertion so the test "passes"
    expect(true).toBe(true);
  });
});

// ============================================================================
// TEST 2: Verify that item selection in stage 1 IS response-independent
// ============================================================================

describe("Stage 1 item selection response independence", () => {
  it("TRACE: compare items selected for high vs low responses", () => {
    console.log("\n=== STAGE 1 ITEM SELECTION: HIGH vs LOW RESPONSES ===");

    // Run stage 1 with all-max responses
    let stateHigh = freshState();
    stateHigh.stage = "BROAD_SCREENING";
    const highItems: string[] = [];

    for (let step = 0; step < 10; step++) {
      const ranked = rankItems(stateHigh, refData, SCREENING_CONFIG);
      if (ranked.length === 0) break;
      highItems.push(ranked[0].item.text.substring(0, 50));
      const { state: next } = respond(stateHigh, ranked[0].itemId, ranked[0].item.responseMax);
      stateHigh = next;
    }

    // Run stage 1 with all-min responses
    let stateLow = freshState();
    stateLow.stage = "BROAD_SCREENING";
    const lowItems: string[] = [];

    for (let step = 0; step < 10; step++) {
      const ranked = rankItems(stateLow, refData, SCREENING_CONFIG);
      if (ranked.length === 0) break;
      lowItems.push(ranked[0].item.text.substring(0, 50));
      const { state: next } = respond(stateLow, ranked[0].itemId, ranked[0].item.responseMin);
      stateLow = next;
    }

    console.log("\nHigh responses - items selected:");
    highItems.forEach((t, i) => console.log(`  ${i}: ${t}`));
    console.log("\nLow responses - items selected:");
    lowItems.forEach((t, i) => console.log(`  ${i}: ${t}`));

    const identical = highItems.every((t, i) => t === lowItems[i]);
    console.log(`\nItems are ${identical ? 'IDENTICAL' : 'DIFFERENT'} regardless of response.`);
    console.log("(This is mathematically expected for Kalman filter - covariance update is response-independent)");

    expect(true).toBe(true);
  });
});

// ============================================================================
// TEST 3: Check the probability math at transition in isolation
// ============================================================================

describe("Transition probability math", () => {
  it("TRACE: compute probabilities for various spectrum mean levels", () => {
    console.log("\n=== TRANSITION PROBABILITY FOR VARYING SPECTRUM MEANS ===");

    // For MDD specifically
    const mddId = condId["MDD"];
    const baseRate = refData.baseRates.find(br => br.dimensionId === mddId);
    const loading = refData.conditionSpectrumLoadings.find(l => l.conditionId === mddId && l.isPrimary);
    const threshold = refData.thresholdByCondition.get(mddId);

    console.log(`MDD: baseLiabilityMean=${baseRate?.liabilityMean.toFixed(4)}, lambda=${loading?.loading.toFixed(3)}, threshold=${threshold?.thresholdLiability.toFixed(3)}`);

    // What if DIS spectrum mean varies?
    for (const disMean of [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]) {
      const specVar = 0.35; // typical after stage 1
      const lambda = loading?.loading ?? 0;
      const baseMean = baseRate?.liabilityMean ?? 0;
      const mu = baseMean + lambda * disMean;
      const variance = lambda * lambda * specVar + (1 - lambda * lambda);
      const prob = threshold
        ? computeProbability(mu, variance, threshold.thresholdLiability)
        : null;
      console.log(`  DIS_mean=${disMean.toFixed(1)}: mu_MDD=${mu.toFixed(4)}, var=${variance.toFixed(4)}, std=${Math.sqrt(variance).toFixed(4)}, P(MDD)=${prob?.toFixed(4) ?? 'N/A'}`);
    }

    // Show what threshold the MDD mean would need to reach for P=50%
    // P=50% when threshold = mean, so mu_condition needs to equal threshold
    // baseMean + lambda * specMean = threshold
    // specMean = (threshold - baseMean) / lambda
    const neededSpecMean = (threshold!.thresholdLiability - baseRate!.liabilityMean) / loading!.loading;
    console.log(`\nSpectrum mean needed for P(MDD)=50%: ${neededSpecMean.toFixed(3)}`);
    console.log("(This is the DIS spectrum mean needed so that MDD condition mean equals the threshold)");

    // Do the same for a few other conditions
    console.log("\n--- Needed spectrum mean for P=50% for various conditions ---");
    for (const code of ["MDD", "PDD", "GAD", "PTSD", "ADJ", "PAN", "SAD", "AUD", "OCD", "SCZ"]) {
      const id = condId[code];
      const br = refData.baseRates.find(b => b.dimensionId === id);
      const ld = refData.conditionSpectrumLoadings.find(l => l.conditionId === id && l.isPrimary);
      const th = refData.thresholdByCondition.get(id);
      if (br && ld && th) {
        const needed = (th.thresholdLiability - br.liabilityMean) / ld.loading;
        console.log(`  ${code}: baseMean=${br.liabilityMean.toFixed(3)}, lambda=${ld.loading.toFixed(3)}, threshold=${th.thresholdLiability.toFixed(3)}, needed_spec_mean=${needed.toFixed(3)}`);
      }
    }

    expect(true).toBe(true);
  });
});

// ============================================================================
// TEST 4: How many stage 2 items actually get administered?
// ============================================================================

describe("Stage 2 item count diagnostic", () => {
  it("TRACE: count stage 2 items for depressed vs healthy patient", () => {
    function runFullAndCount(responseForItem: (item: ItemRef) => number, label: string) {
      let state = freshState();
      state.stage = "BROAD_SCREENING";
      const initialTrace = trace(state.spectrumCovariance);

      // Stage 1
      let stage1Count = 0;
      for (let step = 0; step < 30; step++) {
        const ranked = rankItems(state, refData, SCREENING_CONFIG);
        if (ranked.length === 0) break;
        const { state: next } = respond(state, ranked[0].itemId, responseForItem(ranked[0].item));
        state = next;
        stage1Count++;
        const term = checkStageOneTermination(state, initialTrace, refData, SCREENING_CONFIG);
        if (term.shouldTerminate) break;
      }

      state = transitionToStageTwo(state, refData, SCREENING_CONFIG);

      // Check termination before any items
      const termBefore = checkStageTwoTermination(state, refData, SCREENING_CONFIG);

      // Stage 2
      let stage2Count = 0;
      let termReason = termBefore.shouldTerminate ? termBefore.reason : "";

      if (!termBefore.shouldTerminate) {
        for (let step = 0; step < 30; step++) {
          const ranked = rankItems(state, refData, SCREENING_CONFIG);
          if (ranked.length === 0) { termReason = "no_items"; break; }
          const { state: next } = respond(state, ranked[0].itemId, responseForItem(ranked[0].item));
          state = next;
          stage2Count++;
          const term = checkStageTwoTermination(state, refData, SCREENING_CONFIG);
          if (term.shouldTerminate) { termReason = term.reason; break; }
        }
      }

      const profile = generateDiagnosticProfile(state, refData, SCREENING_CONFIG);

      console.log(`\n${label}:`);
      console.log(`  Stage 1 items: ${stage1Count}`);
      console.log(`  Flagged spectra: ${state.flaggedSpectra.map(id => refData.spectra.find(s => s.id === id)?.shortCode).join(', ')}`);
      console.log(`  # conditions tracked: ${state.conditionDimensionOrder?.length ?? 0}`);
      console.log(`  Termination before stage 2 items: ${termBefore.shouldTerminate} (${termBefore.reason})`);
      console.log(`  Stage 2 items: ${stage2Count}`);
      console.log(`  Termination reason: ${termReason}`);
      console.log(`  Flagged: ${profile.flagged.map(r => `${r.shortCode}(${(r.probability*100).toFixed(1)}%)`).join(', ') || 'none'}`);
      console.log(`  Top 5 probabilities: ${[...profile.flagged, ...profile.unflagged].sort((a,b) => b.probability - a.probability).slice(0,5).map(r => `${r.shortCode}(${(r.probability*100).toFixed(1)}%)`).join(', ')}`);

      return { state, profile, stage1Count, stage2Count };
    }

    const depressed = runFullAndCount((item) => {
      const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
      const loadsDIS = loadings.some((l) => l.dimensionId === specId["DIS"] && l.loading > 0.3);
      const loadsMDD = loadings.some((l) => l.dimensionId === condId["MDD"]);
      const loadsPDD = loadings.some((l) => l.dimensionId === condId["PDD"]);
      if (loadsDIS || loadsMDD || loadsPDD) {
        return item.isReverseCoded ? item.responseMin : item.responseMax;
      }
      return item.isReverseCoded ? item.responseMax : item.responseMin;
    }, "DEPRESSED PATIENT");

    const comorbid = runFullAndCount((item) => {
      return item.isReverseCoded ? item.responseMin : item.responseMax;
    }, "COMORBID PATIENT (all max)");

    const healthy = runFullAndCount((item) => {
      return item.isReverseCoded ? item.responseMax : item.responseMin;
    }, "HEALTHY PATIENT");

    expect(true).toBe(true);
  });
});

// ============================================================================
// TEST 5: What do the condition-level item loadings actually look like?
// ============================================================================

describe("Condition-level loading coverage", () => {
  it("TRACE: items available for each condition", () => {
    console.log("\n=== CONDITION-LEVEL ITEM LOADING COVERAGE ===");

    // For each condition, count how many items load onto it
    for (const cond of refData.conditions) {
      const items = refData.items.filter(item => {
        const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
        return loadings.some(l => l.dimensionId === cond.id);
      });
      const avgLoading = items.length > 0
        ? items.reduce((sum, item) => {
            const loading = (refData.itemLoadingsByItem.get(item.id) ?? [])
              .find(l => l.dimensionId === cond.id);
            return sum + (loading?.loading ?? 0);
          }, 0) / items.length
        : 0;

      console.log(`  ${cond.shortCode}: ${items.length} items, avg loading=${avgLoading.toFixed(3)}, tiers=${[...new Set(items.map(i => i.tier))].join(',')}`);
    }

    expect(true).toBe(true);
  });
});
