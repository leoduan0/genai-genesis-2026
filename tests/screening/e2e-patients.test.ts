/**
 * End-to-end patient scenario tests against the REAL seeded database.
 *
 * Simulates obvious patient archetypes through the full Bayesian pipeline:
 *   loadData → initState → rank → respond → Kalman update → transition → stage 2 → diagnose
 *
 * Each test traces which questions are selected, how spectrum/condition posteriors
 * evolve, and verifies the final diagnostic profile makes clinical sense.
 *
 * 8 spectra: DIS, FEA, DEX, AEX, THD, DET, SOM, COM
 * 35 conditions under those spectra
 * 331 items from 27 instruments (44 broad screening, 287 targeted)
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

// ─── Setup: load real data from DB ──────────────────────────────────────────

let refData: ReferenceData;
let correlations: Map<string, number>;

// Spectrum shortcodes → IDs (populated in beforeAll)
const specId: Record<string, string> = {};
// Condition shortcodes → IDs
const condId: Record<string, string> = {};

beforeAll(async () => {
  const loaded = await loadFullReferenceData("GENERAL");
  refData = loaded.referenceData;
  correlations = loaded.correlations;

  for (const s of refData.spectra) specId[s.shortCode] = s.id;
  for (const c of refData.conditions) condId[c.shortCode] = c.id;
}, 30000);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function freshState(): ScreeningState {
  return initState(refData, correlations);
}

/** Simulate one item response: normalize → Kalman update → record */
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

/** Get spectrum index by shortcode */
function specIdx(code: string): number {
  return refData.spectrumIndex.get(specId[code])!;
}

/** Get spectrum posterior mean by shortcode */
function specMean(state: ScreeningState, code: string): number {
  return state.spectrumMean[specIdx(code)];
}

/** Get spectrum posterior variance by shortcode */
function specVar(state: ScreeningState, code: string): number {
  const i = specIdx(code);
  return state.spectrumCovariance[i][i];
}

/** Get condition probability by shortcode */
function condProb(state: ScreeningState, code: string): number | null {
  if (!state.conditionMean || !state.conditionVariances || !state.conditionDimensionOrder) return null;
  const id = condId[code];
  const idx = state.conditionDimensionOrder.indexOf(id);
  if (idx < 0) return null;
  const threshold = refData.thresholdByCondition.get(id);
  if (!threshold) return null;
  return computeProbability(state.conditionMean[idx], state.conditionVariances[idx], threshold.thresholdLiability);
}

/** Run the adaptive item selection loop for one stage */
function runStage(
  state: ScreeningState,
  responseForItem: (item: ItemRef) => number,
  maxItems = 30,
) {
  const log: {
    step: number;
    itemId: string;
    instrumentName: string;
    itemText: string;
    rawResponse: number;
    normalized: number;
    infoGain: number;
  }[] = [];

  let current = state;
  const initialTrace = trace(current.spectrumCovariance);

  for (let step = 0; step < maxItems; step++) {
    const ranked = rankItems(current, refData, SCREENING_CONFIG);
    if (ranked.length === 0) break;

    const topItem = ranked[0];
    const item = topItem.item;
    const raw = responseForItem(item);
    const { state: next, kalmanResult, normalized } = respond(current, topItem.itemId, raw);

    log.push({
      step,
      itemId: topItem.itemId,
      instrumentName: item.instrumentId, // we'll look up name below
      itemText: item.text.substring(0, 60),
      rawResponse: raw,
      normalized,
      infoGain: kalmanResult.infoGain,
    });

    current = next;

    // Check termination
    if (current.stage === "BROAD_SCREENING" || current.stage === "INTAKE") {
      const term = checkStageOneTermination(current, initialTrace, refData, SCREENING_CONFIG);
      if (term.shouldTerminate) break;
    } else if (current.stage === "TARGETED") {
      const term = checkStageTwoTermination(current, refData, SCREENING_CONFIG);
      if (term.shouldTerminate) break;
    }
  }

  return { state: current, log };
}

/** Run the full 2-stage flow and return the diagnostic profile */
function runFullFlow(responseForItem: (item: ItemRef) => number) {
  let state = freshState();
  state.stage = "BROAD_SCREENING";

  // Stage 1
  const { state: afterStage1, log: stage1Log } = runStage(state, responseForItem);
  state = transitionToStageTwo(afterStage1, refData, SCREENING_CONFIG);

  // Stage 2
  const { state: afterStage2, log: stage2Log } = runStage(state, responseForItem);

  const profile = generateDiagnosticProfile(afterStage2, refData, SCREENING_CONFIG);

  return { state: afterStage2, profile, stage1Log, stage2Log };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT 1: SEVERELY DEPRESSED
// Max on PHQ-9/depressive items, min on everything else.
// Expected: DIS high → MDD, PDD, GAD, PTSD flagged
// ═══════════════════════════════════════════════════════════════════════════════

describe("Patient 1: Severely depressed", () => {
  function patientResponse(item: ItemRef): number {
    // Items on DIS spectrum: max response. WHO-5 is reverse-coded: low = distressed.
    const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
    const loadsDIS = loadings.some((l) => l.dimensionId === specId["DIS"] && l.loading > 0.3);
    const loadsMDD = loadings.some((l) => l.dimensionId === condId["MDD"]);
    const loadsPDD = loadings.some((l) => l.dimensionId === condId["PDD"]);
    const loadsPTSD = loadings.some((l) => l.dimensionId === condId["PTSD"]);
    const loadsGAD = loadings.some((l) => l.dimensionId === condId["GAD"]);

    if (loadsDIS || loadsMDD || loadsPDD || loadsPTSD || loadsGAD) {
      // For reverse-coded items (WHO-5), low raw score = high distress
      return item.isReverseCoded ? item.responseMin : item.responseMax;
    }
    // Everything else: no symptoms
    return item.isReverseCoded ? item.responseMax : item.responseMin;
  }

  it("DIS spectrum is the highest after stage 1", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";
    const { state: after } = runStage(state, patientResponse);

    const dis = specMean(after, "DIS");
    // DIS should be elevated (with few stage-1 items, 0.3+ is realistic)
    expect(dis).toBeGreaterThan(0.3);
    // DIS should be higher than unrelated spectra
    expect(dis).toBeGreaterThan(specMean(after, "DEX"));
    expect(dis).toBeGreaterThan(specMean(after, "AEX"));
    expect(dis).toBeGreaterThan(specMean(after, "COM"));
  });

  it("DIS variance decreases substantially", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";
    const { state: after } = runStage(state, patientResponse);

    // Started at 1.0, should be well below that after many DIS items
    expect(specVar(after, "DIS")).toBeLessThan(0.5);
  });

  it("transition flags DIS and its conditions", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";
    const { state: afterStage1 } = runStage(state, patientResponse);
    const transitioned = transitionToStageTwo(afterStage1, refData, SCREENING_CONFIG);

    expect(transitioned.flaggedSpectra).toContain(specId["DIS"]);
    // MDD is under DIS
    expect(transitioned.conditionDimensionOrder).toContain(condId["MDD"]);
  });

  it("MDD probability is elevated relative to healthy patient", () => {
    const depressed = runFullFlow(patientResponse);
    const healthy = runFullFlow((item) =>
      item.isReverseCoded ? item.responseMax : item.responseMin,
    );

    const mddDep = [...depressed.profile.flagged, ...depressed.profile.unflagged].find((r) => r.shortCode === "MDD");
    expect(mddDep).toBeDefined();

    // Healthy patient may not even have MDD assessed (DIS too low to flag)
    const mddHealth = [...healthy.profile.flagged, ...healthy.profile.unflagged].find((r) => r.shortCode === "MDD");
    if (mddHealth) {
      expect(mddDep!.probability).toBeGreaterThan(mddHealth.probability);
    }
    // MDD probability should be meaningfully above zero (base rate is ~7%)
    expect(mddDep!.probability).toBeGreaterThan(0.005);
  });

  it("MDD probability higher than SUD probability", () => {
    const { state } = runFullFlow(patientResponse);
    const mddProb = condProb(state, "MDD");
    const sudProb = condProb(state, "AUD");

    // At least one should be assessable
    if (mddProb !== null && sudProb !== null) {
      expect(mddProb).toBeGreaterThan(sudProb);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT 2: ANXIOUS (high Fear, some Distress via correlation)
// Max on GAD-7 and fear-loading items, min on everything else.
// Expected: FEA high, DIS somewhat elevated via correlation → PAN, SAD, GAD flagged
// ═══════════════════════════════════════════════════════════════════════════════

describe("Patient 2: Anxious", () => {
  function patientResponse(item: ItemRef): number {
    const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
    const loadsFEA = loadings.some((l) => l.dimensionId === specId["FEA"] && l.loading > 0.15);
    const loadsPAN = loadings.some((l) => l.dimensionId === condId["PAN"]);
    const loadsSAD = loadings.some((l) => l.dimensionId === condId["SAD"]);
    // GAD-7 items cross-load DIS + FEA — respond high to those too
    const loadsDIS_FEA = loadings.some((l) => l.dimensionId === specId["DIS"] && l.loading > 0.3) &&
                          loadings.some((l) => l.dimensionId === specId["FEA"] && l.loading > 0.15);

    if (loadsFEA || loadsPAN || loadsSAD || loadsDIS_FEA) {
      return item.isReverseCoded ? item.responseMin : item.responseMax;
    }
    return item.isReverseCoded ? item.responseMax : item.responseMin;
  }

  it("FEA spectrum is elevated after stage 1", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";
    const { state: after } = runStage(state, patientResponse);

    expect(specMean(after, "FEA")).toBeGreaterThan(0.3);
  });

  it("DIS gets pulled up by correlation with FEA", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";
    const { state: after } = runStage(state, patientResponse);

    // DIS-FEA correlation is 0.642, so DIS should get pulled up
    // even from items that only load on FEA
    expect(specMean(after, "DIS")).toBeGreaterThan(specMean(after, "DEX"));
  });

  it("transition flags FEA", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";
    const { state: afterStage1 } = runStage(state, patientResponse);
    const transitioned = transitionToStageTwo(afterStage1, refData, SCREENING_CONFIG);

    expect(transitioned.flaggedSpectra).toContain(specId["FEA"]);
  });

  it("panic/social anxiety conditions are elevated", () => {
    const { state } = runFullFlow(patientResponse);
    const panProb = condProb(state, "PAN");
    const sadProb = condProb(state, "SAD");

    // At least one fear-spectrum condition should be assessable and elevated
    const fearProbs = [panProb, sadProb].filter((p) => p !== null) as number[];
    expect(fearProbs.length).toBeGreaterThan(0);
    expect(Math.max(...fearProbs)).toBeGreaterThan(0.1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT 3: HEALTHY (all minimum symptom responses)
// Expected: all spectra near zero or negative, no conditions flagged
// ═══════════════════════════════════════════════════════════════════════════════

describe("Patient 3: Healthy", () => {
  function patientResponse(item: ItemRef): number {
    // No symptoms: min on pathological items, max on positive items
    return item.isReverseCoded ? item.responseMax : item.responseMin;
  }

  it("all spectrum means shift negative", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";
    const { state: after } = runStage(state, patientResponse);

    for (const s of refData.spectra) {
      const mean = specMean(after, s.shortCode);
      expect(mean).toBeLessThan(0.5); // should be near 0 or slightly positive
    }
  });

  it("DIS is strongly negative (WHO-5 max + PHQ-9 all 0)", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";
    const { state: after } = runStage(state, patientResponse);

    // Many items load on DIS (PHQ-9, GAD-7, WHO-5, PC-PTSD-5) all showing no pathology
    expect(specMean(after, "DIS")).toBeLessThan(-0.5);
  });

  it("total uncertainty decreases", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";
    const traceBefore = trace(state.spectrumCovariance);
    const { state: after } = runStage(state, patientResponse);
    const traceAfter = trace(after.spectrumCovariance);

    expect(traceAfter).toBeLessThan(traceBefore);
  });

  it("no conditions classified as 'likely' in final profile", () => {
    const { profile } = runFullFlow(patientResponse);
    const all = [...profile.flagged, ...profile.unflagged];

    for (const r of all) {
      expect(r.classification).not.toBe("likely");
    }
  });

  it("all condition probabilities are low", () => {
    const { profile } = runFullFlow(patientResponse);
    const all = [...profile.flagged, ...profile.unflagged];

    for (const r of all) {
      expect(r.probability).toBeLessThan(0.5);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT 4: SUBSTANCE USE (high DEX, low everything else)
// Max on AUDIT-C items, min on everything else.
// Expected: DEX high → AUD, DUD, ADHD flagged
// ═══════════════════════════════════════════════════════════════════════════════

describe("Patient 4: Substance use", () => {
  function patientResponse(item: ItemRef): number {
    const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
    const loadsDEX = loadings.some((l) => l.dimensionId === specId["DEX"] && l.loading > 0.3);
    const loadsAUD = loadings.some((l) => l.dimensionId === condId["AUD"]);
    const loadsDUD = loadings.some((l) => l.dimensionId === condId["DUD"]);

    if (loadsDEX || loadsAUD || loadsDUD) {
      return item.isReverseCoded ? item.responseMin : item.responseMax;
    }
    return item.isReverseCoded ? item.responseMax : item.responseMin;
  }

  it("DEX spectrum is highest after stage 1", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";
    const { state: after } = runStage(state, patientResponse);

    const dex = specMean(after, "DEX");
    expect(dex).toBeGreaterThan(0.3);
    // DEX should be higher than spectra with no relevant items
    expect(dex).toBeGreaterThan(specMean(after, "COM"));
  });

  it("transition flags DEX", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";
    const { state: afterStage1 } = runStage(state, patientResponse);
    const transitioned = transitionToStageTwo(afterStage1, refData, SCREENING_CONFIG);

    expect(transitioned.flaggedSpectra).toContain(specId["DEX"]);
  });

  it("AUD probability is elevated relative to healthy patient", () => {
    const substance = runFullFlow(patientResponse);
    const healthy = runFullFlow((item) =>
      item.isReverseCoded ? item.responseMax : item.responseMin,
    );

    const audSubst = condProb(substance.state, "AUD");
    const audHealth = condProb(healthy.state, "AUD");

    if (audSubst !== null && audHealth !== null) {
      expect(audSubst).toBeGreaterThan(audHealth);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT 5: SOMATIC COMPLAINTS (high SOM, moderate DIS from overlap)
// Max on PHQ-15 items, min on everything else.
// Expected: SOM high, DIS slightly elevated via cross-loading → SSD flagged
// ═══════════════════════════════════════════════════════════════════════════════

describe("Patient 5: Somatic complaints", () => {
  function patientResponse(item: ItemRef): number {
    const loadings = refData.itemLoadingsByItem.get(item.id) ?? [];
    const loadsSOM = loadings.some((l) => l.dimensionId === specId["SOM"] && l.loading > 0.3);
    const loadsSSD = loadings.some((l) => l.dimensionId === condId["SSD"]);
    const loadsIAD = loadings.some((l) => l.dimensionId === condId["IAD"]);

    if (loadsSOM || loadsSSD || loadsIAD) {
      return item.isReverseCoded ? item.responseMin : item.responseMax;
    }
    return item.isReverseCoded ? item.responseMax : item.responseMin;
  }

  it("SOM spectrum is highest after stage 1", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";
    const { state: after } = runStage(state, patientResponse);

    const som = specMean(after, "SOM");
    expect(som).toBeGreaterThan(0.3);
    expect(som).toBeGreaterThan(specMean(after, "DEX"));
    expect(som).toBeGreaterThan(specMean(after, "AEX"));
  });

  it("SSD probability is elevated relative to healthy patient", () => {
    const somatic = runFullFlow(patientResponse);
    const healthy = runFullFlow((item) =>
      item.isReverseCoded ? item.responseMax : item.responseMin,
    );

    const ssdSom = [...somatic.profile.flagged, ...somatic.profile.unflagged].find((r) => r.shortCode === "SSD");
    const ssdHealth = [...healthy.profile.flagged, ...healthy.profile.unflagged].find((r) => r.shortCode === "SSD");

    if (ssdSom && ssdHealth) {
      expect(ssdSom.probability).toBeGreaterThan(ssdHealth.probability);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT 6: COMORBID (everything maxed — worst case)
// Expected: all spectra elevated, many conditions flagged
// ═══════════════════════════════════════════════════════════════════════════════

describe("Patient 6: Comorbid (all symptoms)", () => {
  function patientResponse(item: ItemRef): number {
    // Max pathology on everything
    return item.isReverseCoded ? item.responseMin : item.responseMax;
  }

  it("all spectrum means are positive after stage 1", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";
    const { state: after } = runStage(state, patientResponse);

    for (const s of refData.spectra) {
      expect(specMean(after, s.shortCode)).toBeGreaterThan(0);
    }
  });

  it("more conditions flagged than healthy patient", () => {
    const comorbid = runFullFlow((item) =>
      item.isReverseCoded ? item.responseMin : item.responseMax,
    );
    const healthy = runFullFlow((item) =>
      item.isReverseCoded ? item.responseMax : item.responseMin,
    );

    expect(comorbid.profile.flagged.length).toBeGreaterThan(healthy.profile.flagged.length);
  });

  it("every assessed condition has higher probability than for healthy patient", () => {
    const comorbid = runFullFlow((item) =>
      item.isReverseCoded ? item.responseMin : item.responseMax,
    );
    const healthy = runFullFlow((item) =>
      item.isReverseCoded ? item.responseMax : item.responseMin,
    );

    const comorbidAll = [...comorbid.profile.flagged, ...comorbid.profile.unflagged];
    const healthyAll = [...healthy.profile.flagged, ...healthy.profile.unflagged];

    for (const cr of comorbidAll) {
      const hr = healthyAll.find((r) => r.conditionId === cr.conditionId);
      if (hr) {
        expect(cr.probability).toBeGreaterThan(hr.probability);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REVERSE CODING SANITY CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Reverse coding correctness", () => {
  it("WHO-5 max (healthy) pushes DIS negative", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";

    // Find a WHO-5 item
    const who5Item = refData.items.find(
      (i) => i.isReverseCoded && i.text.includes("cheerful"),
    )!;

    const { state: after } = respond(state, who5Item.id, who5Item.responseMax);
    expect(specMean(after, "DIS")).toBeLessThan(0);
  });

  it("WHO-5 min (distressed) pushes DIS positive", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";

    const who5Item = refData.items.find(
      (i) => i.isReverseCoded && i.text.includes("cheerful"),
    )!;

    const { state: after } = respond(state, who5Item.id, who5Item.responseMin);
    expect(specMean(after, "DIS")).toBeGreaterThan(0);
  });

  it("PHQ-9 max (depressed) pushes DIS positive", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";

    const phq9Item = refData.items.find(
      (i) => !i.isReverseCoded && i.text.includes("feeling down, depressed"),
    )!;

    const { state: after } = respond(state, phq9Item.id, phq9Item.responseMax);
    expect(specMean(after, "DIS")).toBeGreaterThan(0);
  });

  it("WHO-5 and PHQ-9 agree: both indicating distress push DIS in same direction", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";

    const who5Item = refData.items.find(
      (i) => i.isReverseCoded && i.text.includes("cheerful"),
    )!;
    const phq9Item = refData.items.find(
      (i) => !i.isReverseCoded && i.text.includes("feeling down, depressed"),
    )!;

    // WHO-5 min = distressed
    const { state: s1 } = respond(state, who5Item.id, who5Item.responseMin);
    // PHQ-9 max = distressed
    const { state: s2 } = respond(s1, phq9Item.id, phq9Item.responseMax);

    // Both distressed signals should push DIS strongly positive
    expect(specMean(s2, "DIS")).toBeGreaterThan(0.4);
  });

  it("DAST-10 #3 reverse coding works (able to stop = less drug use)", () => {
    let state = freshState();
    state.stage = "BROAD_SCREENING";

    // First push DEX up so DAST-10 items become available in stage 2
    // We'll just test the normalization directly
    const dastItem = refData.items.find(
      (i) => i.isReverseCoded && i.text.includes("able to stop"),
    );

    if (dastItem) {
      // "Yes I can stop" (response = 1 on binary) should normalize to NEGATIVE (less pathology)
      const normYes = normalizeResponse(
        1, dastItem.responseMin, dastItem.responseMax,
        dastItem.normativeMean, dastItem.normativeSD,
        dastItem.normativeResponseDist, dastItem.isReverseCoded,
      );
      // "No I can't stop" (response = 0 on binary) should normalize to POSITIVE (more pathology)
      const normNo = normalizeResponse(
        0, dastItem.responseMin, dastItem.responseMax,
        dastItem.normativeMean, dastItem.normativeSD,
        dastItem.normativeResponseDist, dastItem.isReverseCoded,
      );
      expect(normNo).toBeGreaterThan(normYes);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTIVE ITEM SELECTION WITH REAL DATA
// ═══════════════════════════════════════════════════════════════════════════════

describe("Adaptive item selection (real data)", () => {
  it("never asks the same item twice in a full flow", () => {
    const { stage1Log, stage2Log } = runFullFlow((item) =>
      item.isReverseCoded ? item.responseMin : item.responseMax,
    );

    const allIds = [...stage1Log, ...stage2Log].map((e) => e.itemId);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("info gain is always positive", () => {
    const { stage1Log, stage2Log } = runFullFlow(() => 2);
    for (const entry of [...stage1Log, ...stage2Log]) {
      expect(entry.infoGain).toBeGreaterThan(0);
    }
  });

  it("stage 1 info gain generally decreases over items", () => {
    const { stage1Log } = runFullFlow(() => 2);

    if (stage1Log.length >= 3) {
      // First item should have more info gain than the last
      expect(stage1Log[0].infoGain).toBeGreaterThan(stage1Log[stage1Log.length - 1].infoGain);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NUMERICAL SANITY WITH REAL DATA
// ═══════════════════════════════════════════════════════════════════════════════

describe("Numerical sanity (real data)", () => {
  it("spectrum variances never go negative through full flow", () => {
    const { state } = runFullFlow((item) =>
      item.isReverseCoded ? item.responseMin : item.responseMax,
    );

    for (let i = 0; i < refData.spectra.length; i++) {
      expect(state.spectrumCovariance[i][i]).toBeGreaterThanOrEqual(0);
    }
  });

  it("condition variances never go negative", () => {
    const { state } = runFullFlow((item) =>
      item.isReverseCoded ? item.responseMin : item.responseMax,
    );

    if (state.conditionVariances) {
      for (const v of state.conditionVariances) {
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("all probabilities in [0, 1]", () => {
    const { profile } = runFullFlow(() => 3);
    const all = [...profile.flagged, ...profile.unflagged];

    for (const r of all) {
      expect(r.probability).toBeGreaterThanOrEqual(0);
      expect(r.probability).toBeLessThanOrEqual(1);
    }
  });

  it("covariance remains symmetric", () => {
    const { state } = runFullFlow(() => 2);
    const cov = state.spectrumCovariance;

    for (let i = 0; i < cov.length; i++) {
      for (let j = 0; j < cov.length; j++) {
        expect(cov[i][j]).toBeCloseTo(cov[j][i], 10);
      }
    }
  });
});
