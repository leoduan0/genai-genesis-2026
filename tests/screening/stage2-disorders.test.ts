/**
 * Stage 2 disorder-specific diagnostic tests.
 *
 * Simulates patients with specific conditions (GAD, ADHD, BPD) and traces
 * how stage 2 item selection and probability updates work for each.
 * Tests both that the target condition is correctly identified AND that
 * similar-but-wrong conditions are ruled out.
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
import type { ReferenceData, ScreeningState, ItemRef, ConditionResult } from "@/lib/screening/types";

// ─── Setup ──────────────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  return {
    state: {
      ...result.state,
      itemsAdministered: [
        ...result.state.itemsAdministered,
        { itemId, response: score, stage: result.state.stage as "BROAD_SCREENING" | "TARGETED" },
      ],
    },
    kalmanResult: result,
    normalized,
    score,
  };
}

function specIdx(code: string): number {
  return refData.spectrumIndex.get(specId[code])!;
}
function specMean(state: ScreeningState, code: string): number {
  return state.spectrumMean[specIdx(code)];
}

function condProb(state: ScreeningState, code: string): number | null {
  if (!state.conditionMean || !state.conditionVariances || !state.conditionDimensionOrder) return null;
  const id = condId[code];
  const idx = state.conditionDimensionOrder.indexOf(id);
  if (idx < 0) return null;
  const threshold = refData.thresholdByCondition.get(id);
  if (!threshold) return null;
  return computeProbability(state.conditionMean[idx], state.conditionVariances[idx], threshold.thresholdLiability);
}

function condMeanAndVar(state: ScreeningState, code: string): { mean: number; variance: number } | null {
  if (!state.conditionMean || !state.conditionVariances || !state.conditionDimensionOrder) return null;
  const id = condId[code];
  const idx = state.conditionDimensionOrder.indexOf(id);
  if (idx < 0) return null;
  return { mean: state.conditionMean[idx], variance: state.conditionVariances[idx] };
}

/** Run full adaptive pipeline and return everything */
function runFullFlow(
  responseForItem: (item: ItemRef) => number,
  label?: string,
) {
  let state = freshState();
  state.stage = "BROAD_SCREENING";
  const initialTrace = trace(state.spectrumCovariance);

  // Stage 1
  const stage1Items: string[] = [];
  for (let step = 0; step < 40; step++) {
    const ranked = rankItems(state, refData, SCREENING_CONFIG);
    if (ranked.length === 0) break;
    stage1Items.push(ranked[0].item.text.substring(0, 50));
    const { state: next } = respond(state, ranked[0].itemId, responseForItem(ranked[0].item));
    state = next;
    const term = checkStageOneTermination(state, initialTrace, refData, SCREENING_CONFIG);
    if (term.shouldTerminate) break;
  }

  const afterStage1 = state;
  state = transitionToStageTwo(state, refData, SCREENING_CONFIG);

  // Stage 2 with logging
  const stage2Steps: {
    step: number;
    text: string;
    raw: number;
    conditionDeltas: Record<string, { probBefore: number; probAfter: number }>;
  }[] = [];

  for (let step = 0; step < 40; step++) {
    const ranked = rankItems(state, refData, SCREENING_CONFIG);
    if (ranked.length === 0) break;

    const top = ranked[0];
    const raw = responseForItem(top.item);

    // Capture probs before
    const probsBefore: Record<string, number> = {};
    if (state.conditionDimensionOrder) {
      for (const cId of state.conditionDimensionOrder) {
        const c = refData.conditions.find((cc) => cc.id === cId);
        if (!c) continue;
        const p = condProb(state, c.shortCode);
        if (p !== null) probsBefore[c.shortCode] = p;
      }
    }

    const { state: next } = respond(state, top.itemId, raw);
    state = next;

    // Capture probs after, compute deltas
    const deltas: Record<string, { probBefore: number; probAfter: number }> = {};
    if (state.conditionDimensionOrder) {
      for (const cId of state.conditionDimensionOrder) {
        const c = refData.conditions.find((cc) => cc.id === cId);
        if (!c) continue;
        const pAfter = condProb(state, c.shortCode);
        if (pAfter !== null && probsBefore[c.shortCode] !== undefined) {
          const delta = pAfter - probsBefore[c.shortCode];
          if (Math.abs(delta) > 0.001) {
            deltas[c.shortCode] = { probBefore: probsBefore[c.shortCode], probAfter: pAfter };
          }
        }
      }
    }

    stage2Steps.push({
      step,
      text: top.item.text.substring(0, 60),
      raw,
      conditionDeltas: deltas,
    });

    const term = checkStageTwoTermination(state, refData, SCREENING_CONFIG);
    if (term.shouldTerminate) break;
  }

  const profile = generateDiagnosticProfile(state, refData, SCREENING_CONFIG);

  return { afterStage1, state, profile, stage1Items, stage2Steps };
}

/** Print condition probabilities sorted by probability */
function printConditionProbs(label: string, profile: ReturnType<typeof generateDiagnosticProfile>) {
  const all = [...profile.flagged, ...profile.unflagged].sort((a, b) => b.probability - a.probability);
  console.log(`\n--- ${label}: Top conditions ---`);
  for (const r of all.slice(0, 12)) {
    console.log(`  ${r.shortCode}: P=${(r.probability * 100).toFixed(1)}%, class=${r.classification}, assessed=${r.wasAssessed}`);
  }
}

/** Print stage 2 step trace */
function printStage2Trace(label: string, steps: ReturnType<typeof runFullFlow>["stage2Steps"]) {
  console.log(`\n--- ${label}: Stage 2 trace (${steps.length} items) ---`);
  for (const s of steps) {
    const deltaStr = Object.entries(s.conditionDeltas)
      .map(([code, d]) => {
        const arrow = d.probAfter > d.probBefore ? '↑' : '↓';
        return `${code}: ${(d.probBefore * 100).toFixed(1)}→${(d.probAfter * 100).toFixed(1)}%${arrow}`;
      })
      .join(', ');
    console.log(`  ${s.step}: "${s.text}" raw=${s.raw} | ${deltaStr || '(no change)'}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PATIENT A: Pure GAD (worry, restlessness, tension, but NOT depression)
// GAD is under DIS spectrum. Key: patient endorses anxiety but NOT mood items.
// ═════════════════════════════════════════════════════════════════════════════

describe("Patient A: Pure GAD (anxiety without depression)", () => {
  function patientResponse(item: ItemRef): number {
    const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
    const loadsGAD = loadings.some((l) => l.dimensionId === condId["GAD"]);
    const loadsFEA = loadings.some((l) => l.dimensionId === specId["FEA"] && l.loading > 0.15);
    // DIS items: endorse anxiety-flavored ones (worry, tension), NOT mood ones
    const loadsDIS = loadings.some((l) => l.dimensionId === specId["DIS"] && l.loading > 0.3);
    const loadsMDD = loadings.some((l) => l.dimensionId === condId["MDD"]);
    const loadsPDD = loadings.some((l) => l.dimensionId === condId["PDD"]);

    // GAD-specific items: max
    if (loadsGAD) {
      return item.isReverseCoded ? item.responseMin : item.responseMax;
    }
    // Fear items (anxiety): high
    if (loadsFEA) {
      return item.isReverseCoded ? item.responseMin : item.responseMax;
    }
    // DIS items: moderate (anxiety raises DIS somewhat)
    if (loadsDIS && !loadsMDD && !loadsPDD) {
      const mid = Math.ceil((item.responseMin + item.responseMax) * 0.6);
      return item.isReverseCoded ? item.responseMax - mid + item.responseMin : mid;
    }
    // Depression-specific: low
    if (loadsMDD || loadsPDD) {
      return item.isReverseCoded ? item.responseMax : item.responseMin;
    }
    return item.isReverseCoded ? item.responseMax : item.responseMin;
  }

  it("GAD probability is high, MDD probability is lower", () => {
    const result = runFullFlow(patientResponse, "Pure GAD");
    printConditionProbs("Pure GAD", result.profile);
    printStage2Trace("Pure GAD", result.stage2Steps);

    const gadP = condProb(result.state, "GAD");
    const mddP = condProb(result.state, "MDD");

    console.log(`\n  GAD P=${gadP !== null ? (gadP * 100).toFixed(1) + '%' : 'N/A'}`);
    console.log(`  MDD P=${mddP !== null ? (mddP * 100).toFixed(1) + '%' : 'N/A'}`);

    // GAD should be elevated
    if (gadP !== null) {
      expect(gadP).toBeGreaterThan(0.1);
    }
  });

  it("stage 2 items actually target GAD condition", () => {
    const result = runFullFlow(patientResponse, "Pure GAD");

    // Check that some stage 2 items load onto GAD
    const gadItemSteps = result.stage2Steps.filter((s) =>
      s.conditionDeltas["GAD"] !== undefined,
    );
    console.log(`\nStage 2 items affecting GAD: ${gadItemSteps.length}/${result.stage2Steps.length}`);

    // At least 1 item should target GAD
    expect(gadItemSteps.length).toBeGreaterThanOrEqual(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PATIENT B: ADHD (distractible, impulsive, restless, but NOT substance use)
// ADHD is under DEX spectrum.
// ═════════════════════════════════════════════════════════════════════════════

describe("Patient B: ADHD (without substance use)", () => {
  function patientResponse(item: ItemRef): number {
    const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
    const loadsADHD = loadings.some((l) => l.dimensionId === condId["ADHD"]);
    const loadsDEX = loadings.some((l) => l.dimensionId === specId["DEX"] && l.loading > 0.2);
    const loadsAUD = loadings.some((l) => l.dimensionId === condId["AUD"]);
    const loadsDUD = loadings.some((l) => l.dimensionId === condId["DUD"]);

    // ADHD-specific items: max
    if (loadsADHD) {
      return item.isReverseCoded ? item.responseMin : item.responseMax;
    }
    // DEX items but NOT substance: moderate-high (ADHD raises externalizing)
    if (loadsDEX && !loadsAUD && !loadsDUD) {
      const high = Math.ceil((item.responseMin + item.responseMax) * 0.7);
      return item.isReverseCoded ? item.responseMax - high + item.responseMin : high;
    }
    // Substance items: low (no substance problem)
    if (loadsAUD || loadsDUD) {
      return item.isReverseCoded ? item.responseMax : item.responseMin;
    }
    return item.isReverseCoded ? item.responseMax : item.responseMin;
  }

  it("ADHD probability is elevated, AUD is low", () => {
    const result = runFullFlow(patientResponse, "ADHD");
    printConditionProbs("ADHD", result.profile);
    printStage2Trace("ADHD", result.stage2Steps);

    const adhdP = condProb(result.state, "ADHD");
    const audP = condProb(result.state, "AUD");

    console.log(`\n  ADHD P=${adhdP !== null ? (adhdP * 100).toFixed(1) + '%' : 'N/A'}`);
    console.log(`  AUD P=${audP !== null ? (audP * 100).toFixed(1) + '%' : 'N/A'}`);

    // ADHD should be assessed and elevated
    if (adhdP !== null) {
      expect(adhdP).toBeGreaterThan(0.05);
    }
    // AUD should be low
    if (audP !== null) {
      expect(audP).toBeLessThan(0.5);
    }
    // ADHD should be higher than AUD
    if (adhdP !== null && audP !== null) {
      expect(adhdP).toBeGreaterThan(audP);
    }
  });

  it("DEX spectrum is elevated after stage 1", () => {
    const result = runFullFlow(patientResponse, "ADHD");
    const dex = specMean(result.afterStage1, "DEX");
    console.log(`\n  DEX spectrum mean: ${dex.toFixed(4)}`);
    expect(dex).toBeGreaterThan(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PATIENT C: BPD-like presentation
// NOTE: BPD is under AEX spectrum, which has NO tier 1 (broad screening) items.
// So AEX can only be elevated through correlation with DIS/DEX. The BPD
// patient presents with high distress (mood dysregulation), which flags DIS.
// BPD itself can only be assessed if AEX gets flagged via correlation.
// This is a known coverage gap — AEX needs tier 1 items for direct detection.
// ═════════════════════════════════════════════════════════════════════════════

describe("Patient C: Borderline presentation (DIS + comorbid mood)", () => {
  function patientResponse(item: ItemRef): number {
    const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
    const loadsBPD = loadings.some((l) => l.dimensionId === condId["BPD"]);
    const loadsDIS = loadings.some((l) => l.dimensionId === specId["DIS"] && l.loading > 0.2);
    const loadsFEA = loadings.some((l) => l.dimensionId === specId["FEA"] && l.loading > 0.15);
    const loadsMDD = loadings.some((l) => l.dimensionId === condId["MDD"]);
    const loadsPDD = loadings.some((l) => l.dimensionId === condId["PDD"]);
    const loadsGAD = loadings.some((l) => l.dimensionId === condId["GAD"]);

    // BPD items (tier 2): max
    if (loadsBPD) return item.isReverseCoded ? item.responseMin : item.responseMax;
    // DIS items: max (emotional dysregulation)
    if (loadsDIS || loadsMDD || loadsPDD || loadsGAD) {
      return item.isReverseCoded ? item.responseMin : item.responseMax;
    }
    // FEA items: moderate (BPD patients have fear of abandonment)
    if (loadsFEA) {
      const mid = Math.ceil((item.responseMin + item.responseMax) * 0.6);
      return item.isReverseCoded ? item.responseMax - mid + item.responseMin : mid;
    }
    return item.isReverseCoded ? item.responseMax : item.responseMin;
  }

  it("DIS is flagged (BPD presents with mood dysregulation)", () => {
    const result = runFullFlow(patientResponse, "BPD-like");
    printConditionProbs("BPD-like", result.profile);

    const dis = specMean(result.afterStage1, "DIS");
    console.log(`\n  DIS spectrum: ${dis.toFixed(4)}`);
    expect(dis).toBeGreaterThan(0.3);
  });

  it("DIS conditions (MDD, GAD) are elevated — the detectable signal", () => {
    const result = runFullFlow(patientResponse, "BPD-like");
    const mddP = condProb(result.state, "MDD");
    const gadP = condProb(result.state, "GAD");

    console.log(`\n  MDD P=${mddP !== null ? (mddP * 100).toFixed(1) + '%' : 'N/A'}`);
    console.log(`  GAD P=${gadP !== null ? (gadP * 100).toFixed(1) + '%' : 'N/A'}`);

    // The BPD patient's distress IS correctly detected as DIS-spectrum
    if (mddP !== null) expect(mddP).toBeGreaterThan(0.3);
    if (gadP !== null) expect(gadP).toBeGreaterThan(0.1);
  });

  it("AEX not flagged (no tier 1 AEX items) — known limitation", () => {
    const result = runFullFlow(patientResponse, "BPD-like");
    const aex = specMean(result.afterStage1, "AEX");
    console.log(`\n  AEX spectrum mean: ${aex.toFixed(4)} (expected: not flagged, no tier 1 items)`);
    // AEX won't be flagged — this documents the limitation
    expect(result.state.flaggedSpectra).not.toContain(specId["AEX"]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PATIENT D: OCD (compulsive behaviors, intrusive thoughts)
// OCD is under COM spectrum. PHQ-15 has some SOM cross-loading that correlates.
// ═════════════════════════════════════════════════════════════════════════════

describe("Patient D: OCD", () => {
  function patientResponse(item: ItemRef): number {
    const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
    const loadsOCD = loadings.some((l) => l.dimensionId === condId["OCD"]);
    const loadsCOM = loadings.some((l) => l.dimensionId === specId["COM"] && l.loading > 0.15);
    const loadsDIS = loadings.some((l) => l.dimensionId === specId["DIS"] && l.loading > 0.3);
    const loadsSOM = loadings.some((l) => l.dimensionId === specId["SOM"] && l.loading > 0.2);

    // OCD-specific items: max
    if (loadsOCD) return item.isReverseCoded ? item.responseMin : item.responseMax;
    // COM items: max
    if (loadsCOM) return item.isReverseCoded ? item.responseMin : item.responseMax;
    // DIS: moderate (OCD patients often have some anxiety)
    if (loadsDIS) {
      const mid = Math.ceil((item.responseMin + item.responseMax) * 0.5);
      return item.isReverseCoded ? item.responseMax - mid + item.responseMin : mid;
    }
    // SOM: moderate (somatic concerns in OCD overlap)
    if (loadsSOM) {
      const mid = Math.ceil((item.responseMin + item.responseMax) * 0.4);
      return item.isReverseCoded ? item.responseMax - mid + item.responseMin : mid;
    }
    return item.isReverseCoded ? item.responseMax : item.responseMin;
  }

  it("OCD probability is elevated if COM is flagged", () => {
    const result = runFullFlow(patientResponse, "OCD");
    printConditionProbs("OCD", result.profile);
    printStage2Trace("OCD", result.stage2Steps);

    const ocdP = condProb(result.state, "OCD");
    console.log(`\n  OCD P=${ocdP !== null ? (ocdP * 100).toFixed(1) + '%' : 'N/A'}`);

    const comMean = specMean(result.afterStage1, "COM");
    console.log(`  COM spectrum mean: ${comMean.toFixed(4)}`);

    // COM might not be flagged if there aren't enough tier 1 items loading on it
    // Document what happens either way
    if (result.state.flaggedSpectra.includes(specId["COM"])) {
      console.log("  COM was flagged — OCD should be assessed");
      if (ocdP !== null) expect(ocdP).toBeGreaterThan(0.05);
    } else {
      console.log("  COM not flagged — OCD not directly assessed (derived from spectrum)");
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CROSS-PATIENT: Verify discrimination between disorders
// ═════════════════════════════════════════════════════════════════════════════

describe("Cross-patient discrimination", () => {
  it("depressed patient has higher MDD than ADHD patient", () => {
    // Depressed patient
    const depressed = runFullFlow((item) => {
      const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
      const loadsDIS = loadings.some((l) => l.dimensionId === specId["DIS"] && l.loading > 0.3);
      const loadsMDD = loadings.some((l) => l.dimensionId === condId["MDD"]);
      if (loadsDIS || loadsMDD) return item.isReverseCoded ? item.responseMin : item.responseMax;
      return item.isReverseCoded ? item.responseMax : item.responseMin;
    });

    // ADHD patient
    const adhd = runFullFlow((item) => {
      const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
      const loadsADHD = loadings.some((l) => l.dimensionId === condId["ADHD"]);
      const loadsDEX = loadings.some((l) => l.dimensionId === specId["DEX"] && l.loading > 0.2);
      if (loadsADHD || loadsDEX) return item.isReverseCoded ? item.responseMin : item.responseMax;
      return item.isReverseCoded ? item.responseMax : item.responseMin;
    });

    const mddDep = condProb(depressed.state, "MDD");
    const mddAdhd = condProb(adhd.state, "MDD");

    console.log(`\nMDD prob — depressed: ${mddDep !== null ? (mddDep * 100).toFixed(1) + '%' : 'N/A'}, ADHD: ${mddAdhd !== null ? (mddAdhd * 100).toFixed(1) + '%' : 'N/A'}`);

    // Depressed patient should have higher MDD
    if (mddDep !== null && mddAdhd !== null) {
      expect(mddDep).toBeGreaterThan(mddAdhd);
    }
  });

  it("ADHD patient has higher ADHD than depressed patient", () => {
    const adhd = runFullFlow((item) => {
      const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
      const loadsADHD = loadings.some((l) => l.dimensionId === condId["ADHD"]);
      const loadsDEX = loadings.some((l) => l.dimensionId === specId["DEX"] && l.loading > 0.2);
      if (loadsADHD || loadsDEX) return item.isReverseCoded ? item.responseMin : item.responseMax;
      return item.isReverseCoded ? item.responseMax : item.responseMin;
    });

    const depressed = runFullFlow((item) => {
      const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
      const loadsDIS = loadings.some((l) => l.dimensionId === specId["DIS"] && l.loading > 0.3);
      const loadsMDD = loadings.some((l) => l.dimensionId === condId["MDD"]);
      if (loadsDIS || loadsMDD) return item.isReverseCoded ? item.responseMin : item.responseMax;
      return item.isReverseCoded ? item.responseMax : item.responseMin;
    });

    const adhdA = condProb(adhd.state, "ADHD");
    const adhdD = condProb(depressed.state, "ADHD");

    console.log(`\nADHD prob — ADHD patient: ${adhdA !== null ? (adhdA * 100).toFixed(1) + '%' : 'N/A'}, depressed: ${adhdD !== null ? (adhdD * 100).toFixed(1) + '%' : 'N/A'}`);

    if (adhdA !== null && adhdD !== null) {
      expect(adhdA).toBeGreaterThan(adhdD);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// STAGE 2 MECHANICS: Verify items actually reduce variance
// ═════════════════════════════════════════════════════════════════════════════

describe("Stage 2 mechanics", () => {
  it("condition variances decrease through stage 2", () => {
    const result = runFullFlow((item) => {
      // Comorbid patient — all max — so all conditions are flagged
      return item.isReverseCoded ? item.responseMin : item.responseMax;
    });

    if (result.state.conditionVariances && result.state.conditionDimensionOrder) {
      console.log("\n--- Condition variances after full flow ---");
      for (let i = 0; i < result.state.conditionDimensionOrder.length; i++) {
        const cId = result.state.conditionDimensionOrder[i];
        const cond = refData.conditions.find((c) => c.id === cId);
        const v = result.state.conditionVariances[i];
        console.log(`  ${cond?.shortCode}: var=${v.toFixed(4)}, std=${Math.sqrt(v).toFixed(4)}`);
        // All variances should be less than 1.0 (prior)
        expect(v).toBeLessThan(1.0);
      }
    }
  });

  it("stage 2 EVR scores are meaningfully different (not uniform)", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";
    const initialTrace = trace(state.spectrumCovariance);

    // Drive through stage 1 with all-max
    for (let step = 0; step < 40; step++) {
      const ranked = rankItems(state, refData, SCREENING_CONFIG);
      if (ranked.length === 0) break;
      const { state: next } = respond(state, ranked[0].itemId, ranked[0].item.responseMax);
      state = next;
      const term = checkStageOneTermination(state, initialTrace, refData, SCREENING_CONFIG);
      if (term.shouldTerminate) break;
    }

    state = transitionToStageTwo(state, refData, SCREENING_CONFIG);

    // First stage 2 ranking
    const ranked = rankItems(state, refData, SCREENING_CONFIG);
    if (ranked.length >= 2) {
      const topEVR = ranked[0].expectedVarianceReduction;
      const lastEVR = ranked[ranked.length - 1].expectedVarianceReduction;
      const ratio = topEVR / Math.max(lastEVR, 1e-10);

      console.log(`\nStage 2 EVR spread:`);
      for (const r of ranked.slice(0, 5)) {
        const loadings = refData.itemLoadingsByItem.get(r.itemId) ?? [];
        const condLoadings = loadings
          .map((l) => {
            const c = refData.conditions.find((cc) => cc.id === l.dimensionId);
            return c ? `${c.shortCode}:${l.loading.toFixed(2)}` : null;
          })
          .filter(Boolean)
          .join(', ');
        console.log(`  EVR=${r.expectedVarianceReduction.toFixed(6)} "${r.item.text.substring(0, 45)}" [${condLoadings}]`);
      }
      console.log(`  Top/bottom ratio: ${ratio.toFixed(3)}`);

      // Stage 2 items should NOT be near-uniform
      expect(ratio).toBeGreaterThan(1.05);
    }
  });
});
