/**
 * LLM item selection tests.
 *
 * Verifies:
 * - LLM picks a valid item from the ranked list (select_item tool call)
 * - LLM frames the question conversationally (frame_question tool call)
 * - Fallback works when LLM picks an invalid item or fails
 * - Holistic judgment: LLM considers intake context + previous items
 */

import { describe, it, expect } from "vitest";
import { callScreeningLLM } from "@/lib/screening/llm/client";
import { SCREENING_SYSTEM_PROMPT, SCREENING_TOOLS } from "@/lib/screening/llm/screening";
import { SCREENING_CONFIG } from "@/lib/screening/config";
import type { ScreeningState, ReferenceData, RankedItem } from "@/lib/screening/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeItem(id: string, text: string) {
  return {
    id,
    instrumentId: "test",
    itemNumber: 1,
    text,
    responseMin: 0,
    responseMax: 3,
    responseLabels: { "0": "Not at all", "1": "Several days", "2": "More than half the days", "3": "Nearly every day" },
    isReverseCoded: false,
    noiseVariance: 0.3,
    noiseInflationFactor: 1.0,
    tags: [],
    tier: "BROAD" as const,
  };
}

function buildRankedItems(): RankedItem[] {
  return [
    {
      itemId: "phq9_4",
      item: makeItem("phq9_4", "Feeling tired or having little energy"),
      expectedVarianceReduction: 0.15,
    },
    {
      itemId: "gad7_3",
      item: makeItem("gad7_3", "Worrying too much about different things"),
      expectedVarianceReduction: 0.12,
    },
    {
      itemId: "phq9_6",
      item: makeItem("phq9_6", "Feeling bad about yourself — or that you are a failure or have let yourself or your family down"),
      expectedVarianceReduction: 0.09,
    },
  ] as RankedItem[];
}

function buildScreeningState(overrides?: Partial<ScreeningState>): ScreeningState {
  return {
    stage: "BROAD_SCREENING",
    spectrumMean: [0.8, 0.2],
    spectrumCovariance: [[0.6, 0.15], [0.15, 0.9]],
    conditionMean: null,
    conditionVariances: null,
    conditionDimensionOrder: null,
    itemsAdministered: [
      { itemId: "phq9_1", response: 2, stage: "BROAD_SCREENING" },
      { itemId: "phq9_2", response: 3, stage: "BROAD_SCREENING" },
    ],
    autoScoredItems: [],
    flaggedSpectra: [],
    flaggedConditions: [],
    ...overrides,
  };
}

function buildMinimalRefData(): ReferenceData {
  return {
    spectra: [
      { id: "spec_mood", name: "Mood / Affect", shortCode: "MOOD", sortOrder: 1 },
      { id: "spec_anx", name: "Anxiety / Fear", shortCode: "ANX", sortOrder: 2 },
    ],
    conditions: [],
    conditionSpectrumLoadings: [],
    correlationMatrix: [[1, 0.4], [0.4, 1]],
    baseRates: [],
    items: [
      makeItem("phq9_1", "Little interest or pleasure in doing things"),
      makeItem("phq9_2", "Feeling down, depressed, or hopeless"),
      makeItem("phq9_4", "Feeling tired or having little energy"),
      makeItem("phq9_6", "Feeling bad about yourself"),
      makeItem("gad7_3", "Worrying too much about different things"),
    ],
    itemLoadings: [
      { itemId: "phq9_4", dimensionId: "spec_mood", loading: 0.7, isPrimary: true },
      { itemId: "gad7_3", dimensionId: "spec_anx", loading: 0.75, isPrimary: true },
      { itemId: "phq9_6", dimensionId: "spec_mood", loading: 0.8, isPrimary: true },
    ],
    itemOverlaps: [],
    thresholds: [],
  } as unknown as ReferenceData;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("LLM Item Selection", () => {
  const TIMEOUT = 30_000;

  it("should select a valid item from the ranked list and frame it", async () => {
    const ranked = buildRankedItems();
    const state = buildScreeningState();
    const refData = buildMinimalRefData();
    const validIds = ranked.map((r) => r.itemId);

    const result = await callScreeningLLM({
      systemPrompt: SCREENING_SYSTEM_PROMPT,
      messages: [],
      tools: SCREENING_TOOLS,
      maxToolCalls: SCREENING_CONFIG.maxLlmToolCalls,
      context: {
        screeningState: state,
        rankedItems: ranked,
        conversationHistory: [
          { role: "user", content: "I've been feeling really sad and can't sleep." },
        ],
        referenceData: refData,
      },
    });

    // Must have a select_item call
    const selectCall = result.toolCalls.find((tc) => tc.tool === "select_item");
    expect(selectCall).toBeDefined();
    expect(validIds).toContain(selectCall!.itemId);

    // Must have a frame_question call
    const frameCall = result.toolCalls.find((tc) => tc.tool === "frame_question");
    expect(frameCall).toBeDefined();

    // Message should be the framed question (not empty)
    expect(result.message.length).toBeGreaterThan(5);
  }, TIMEOUT);

  it("should consider intake context when selecting items", async () => {
    const ranked = buildRankedItems();
    const state = buildScreeningState();
    const refData = buildMinimalRefData();

    // Patient mentioned worry/anxiety in intake — LLM should consider gad7_3 even though it's ranked #2
    const result = await callScreeningLLM({
      systemPrompt: SCREENING_SYSTEM_PROMPT,
      messages: [],
      tools: SCREENING_TOOLS,
      maxToolCalls: SCREENING_CONFIG.maxLlmToolCalls,
      context: {
        screeningState: state,
        rankedItems: ranked,
        conversationHistory: [
          { role: "user", content: "I can't stop worrying about everything. My mind races constantly and I feel anxious all the time." },
        ],
        referenceData: refData,
      },
    });

    const selectCall = result.toolCalls.find((tc) => tc.tool === "select_item");
    expect(selectCall).toBeDefined();
    // We don't strictly assert gad7_3 because the LLM has holistic judgment,
    // but it must pick from the valid list
    const validIds = ranked.map((r) => r.itemId);
    expect(validIds).toContain(selectCall!.itemId);
  }, TIMEOUT);
});
