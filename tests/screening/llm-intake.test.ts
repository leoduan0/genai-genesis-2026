/**
 * LLM integration tests for the intake (Phase 0) flow.
 *
 * These tests call the real OpenAI API (gpt-5.4) to verify:
 * - The screening LLM correctly analyzes free-text patient concerns
 * - It returns flag_implied_scores tool calls with valid item IDs
 * - Scores are within valid response ranges
 * - It handles various patient concern styles
 */

import { describe, it, expect } from "vitest";
import { callScreeningLLM } from "@/lib/screening/llm/client";
import { SCREENING_SYSTEM_PROMPT, SCREENING_TOOLS } from "@/lib/screening/llm/screening";
import { SCREENING_CONFIG } from "@/lib/screening/config";
import type { ScreeningState, ReferenceData, ItemRef, ItemLoadingRef, SpectrumRef, ConditionRef } from "@/lib/screening/types";
import type { ToolCall } from "@/lib/screening/llm/types";

// ─── Minimal mock reference data for testing ────────────────────────────────

function buildTestReferenceData(): ReferenceData {
  const spectra: SpectrumRef[] = [
    { id: "spec_mood", name: "Mood / Affect", shortCode: "MOOD", sortOrder: 1 },
    { id: "spec_anx", name: "Anxiety / Fear", shortCode: "ANX", sortOrder: 2 },
  ];

  const conditions: ConditionRef[] = [
    { id: "cond_mdd", name: "Major Depressive Disorder", shortCode: "MDD", parentId: "spec_mood", sortOrder: 1 },
    { id: "cond_gad", name: "Generalized Anxiety Disorder", shortCode: "GAD", parentId: "spec_anx", sortOrder: 1 },
  ];

  const items: ItemRef[] = [
    {
      id: "phq9_1",
      instrumentId: "phq9",
      itemNumber: 1,
      text: "Little interest or pleasure in doing things",
      responseMin: 0,
      responseMax: 3,
      responseLabels: { "0": "Not at all", "1": "Several days", "2": "More than half the days", "3": "Nearly every day" },
      isReverseCoded: false,
      noiseVariance: 0.3,
      noiseInflationFactor: 1.0,
      tags: [],
      tier: "BROAD",
    },
    {
      id: "phq9_2",
      instrumentId: "phq9",
      itemNumber: 2,
      text: "Feeling down, depressed, or hopeless",
      responseMin: 0,
      responseMax: 3,
      responseLabels: { "0": "Not at all", "1": "Several days", "2": "More than half the days", "3": "Nearly every day" },
      isReverseCoded: false,
      noiseVariance: 0.3,
      noiseInflationFactor: 1.0,
      tags: [],
      tier: "BROAD",
    },
    {
      id: "phq9_3",
      instrumentId: "phq9",
      itemNumber: 3,
      text: "Trouble falling or staying asleep, or sleeping too much",
      responseMin: 0,
      responseMax: 3,
      responseLabels: { "0": "Not at all", "1": "Several days", "2": "More than half the days", "3": "Nearly every day" },
      isReverseCoded: false,
      noiseVariance: 0.3,
      noiseInflationFactor: 1.0,
      tags: [],
      tier: "BROAD",
    },
    {
      id: "phq9_5",
      instrumentId: "phq9",
      itemNumber: 5,
      text: "Poor appetite or overeating",
      responseMin: 0,
      responseMax: 3,
      responseLabels: { "0": "Not at all", "1": "Several days", "2": "More than half the days", "3": "Nearly every day" },
      isReverseCoded: false,
      noiseVariance: 0.3,
      noiseInflationFactor: 1.0,
      tags: [],
      tier: "BROAD",
    },
    {
      id: "gad7_1",
      instrumentId: "gad7",
      itemNumber: 1,
      text: "Feeling nervous, anxious, or on edge",
      responseMin: 0,
      responseMax: 3,
      responseLabels: { "0": "Not at all", "1": "Several days", "2": "More than half the days", "3": "Nearly every day" },
      isReverseCoded: false,
      noiseVariance: 0.3,
      noiseInflationFactor: 1.0,
      tags: [],
      tier: "BROAD",
    },
    {
      id: "gad7_2",
      instrumentId: "gad7",
      itemNumber: 2,
      text: "Not being able to stop or control worrying",
      responseMin: 0,
      responseMax: 3,
      responseLabels: { "0": "Not at all", "1": "Several days", "2": "More than half the days", "3": "Nearly every day" },
      isReverseCoded: false,
      noiseVariance: 0.3,
      noiseInflationFactor: 1.0,
      tags: [],
      tier: "BROAD",
    },
  ];

  const itemLoadings: ItemLoadingRef[] = [
    { itemId: "phq9_1", dimensionId: "spec_mood", loading: 0.8, isPrimary: true },
    { itemId: "phq9_2", dimensionId: "spec_mood", loading: 0.85, isPrimary: true },
    { itemId: "phq9_3", dimensionId: "spec_mood", loading: 0.6, isPrimary: true },
    { itemId: "phq9_5", dimensionId: "spec_mood", loading: 0.55, isPrimary: true },
    { itemId: "gad7_1", dimensionId: "spec_anx", loading: 0.8, isPrimary: true },
    { itemId: "gad7_2", dimensionId: "spec_anx", loading: 0.75, isPrimary: true },
  ];

  return {
    spectra,
    conditions,
    conditionSpectrumLoadings: [
      { conditionId: "cond_mdd", spectrumId: "spec_mood", loading: 0.85, isPrimary: true },
      { conditionId: "cond_gad", spectrumId: "spec_anx", loading: 0.80, isPrimary: true },
    ],
    correlationMatrix: [[1, 0.4], [0.4, 1]],
    baseRates: [
      { dimensionId: "cond_mdd", populationType: "GENERAL", prevalence: 0.07, liabilityMean: 0 },
      { dimensionId: "cond_gad", populationType: "GENERAL", prevalence: 0.06, liabilityMean: 0 },
    ],
    items,
    itemLoadings,
    itemOverlaps: [],
    thresholds: [
      { dimensionId: "cond_mdd", threshold: 1.48 },
      { dimensionId: "cond_gad", threshold: 1.55 },
    ],
  } as unknown as ReferenceData;
}

function buildTestState(): ScreeningState {
  return {
    stage: "INTAKE",
    spectrumMean: [0, 0],
    spectrumCovariance: [[1, 0.4], [0.4, 1]],
    conditionMean: null,
    conditionVariances: null,
    conditionDimensionOrder: null,
    itemsAdministered: [],
    autoScoredItems: [],
    flaggedSpectra: [],
    flaggedConditions: [],
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("LLM Intake Integration", () => {
  const TIMEOUT = 30_000; // 30s for API calls

  it("should return flag_implied_scores for a depression concern", async () => {
    const refData = buildTestReferenceData();
    const state = buildTestState();

    const result = await callScreeningLLM({
      systemPrompt: SCREENING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: "I've been feeling really sad and hopeless for weeks. I can't sleep at night and I've lost my appetite completely.",
        },
      ],
      tools: SCREENING_TOOLS,
      maxToolCalls: SCREENING_CONFIG.maxLlmToolCalls,
      context: {
        screeningState: state,
        conversationHistory: [],
        referenceData: refData,
      },
    });

    // Should have at least one tool call
    expect(result.toolCalls.length).toBeGreaterThan(0);

    // Should have flag_implied_scores
    const impliedCalls = result.toolCalls.filter(
      (tc): tc is Extract<ToolCall, { tool: "flag_implied_scores" }> =>
        tc.tool === "flag_implied_scores",
    );
    expect(impliedCalls.length).toBeGreaterThan(0);

    // Check the scores
    const allScores = impliedCalls.flatMap((c) => c.scores);
    expect(allScores.length).toBeGreaterThan(0);

    // All item IDs should be from our reference data
    const validIds = new Set(refData.items.map((i) => i.id));
    for (const s of allScores) {
      expect(validIds.has(s.itemId)).toBe(true);
    }

    // All scores should be within valid range (0-3)
    for (const s of allScores) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(3);
    }

    // Should score depression-related items (phq9_2 for hopelessness, phq9_3 for sleep, phq9_5 for appetite)
    const scoredIds = allScores.map((s) => s.itemId);
    // At minimum, "feeling sad and hopeless" should map to phq9_2
    expect(scoredIds).toContain("phq9_2");

    // Should have a message
    expect(result.message).toBeTruthy();
    expect(result.message.length).toBeGreaterThan(0);
  }, TIMEOUT);

  it("should return flag_implied_scores for an anxiety concern", async () => {
    const refData = buildTestReferenceData();
    const state = buildTestState();

    const result = await callScreeningLLM({
      systemPrompt: SCREENING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: "I've been feeling really nervous and on edge lately. I can't stop worrying about everything — work, family, money. It feels like my mind won't turn off.",
        },
      ],
      tools: SCREENING_TOOLS,
      maxToolCalls: SCREENING_CONFIG.maxLlmToolCalls,
      context: {
        screeningState: state,
        conversationHistory: [],
        referenceData: refData,
      },
    });

    const impliedCalls = result.toolCalls.filter(
      (tc): tc is Extract<ToolCall, { tool: "flag_implied_scores" }> =>
        tc.tool === "flag_implied_scores",
    );
    expect(impliedCalls.length).toBeGreaterThan(0);

    const allScores = impliedCalls.flatMap((c) => c.scores);
    expect(allScores.length).toBeGreaterThan(0);

    // Should score anxiety items
    const scoredIds = allScores.map((s) => s.itemId);
    expect(scoredIds).toContain("gad7_1"); // nervous/on edge

    // Scores should be elevated (2 or 3) for clear anxiety description
    const gad1Score = allScores.find((s) => s.itemId === "gad7_1");
    expect(gad1Score!.score).toBeGreaterThanOrEqual(2);
  }, TIMEOUT);

  it("should return a compassionate message", async () => {
    const refData = buildTestReferenceData();
    const state = buildTestState();

    const result = await callScreeningLLM({
      systemPrompt: SCREENING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: "I just feel empty inside. Nothing brings me joy anymore.",
        },
      ],
      tools: SCREENING_TOOLS,
      maxToolCalls: SCREENING_CONFIG.maxLlmToolCalls,
      context: {
        screeningState: state,
        conversationHistory: [],
        referenceData: refData,
      },
    });

    // Message should exist and not be clinical/cold
    expect(result.message).toBeTruthy();
    expect(result.message.length).toBeGreaterThan(10);
    // Should not contain diagnostic language
    expect(result.message.toLowerCase()).not.toContain("you have");
    expect(result.message.toLowerCase()).not.toContain("diagnosed");
  }, TIMEOUT);

  it("should handle vague/minimal input gracefully", async () => {
    const refData = buildTestReferenceData();
    const state = buildTestState();

    const result = await callScreeningLLM({
      systemPrompt: SCREENING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: "I don't feel great.",
        },
      ],
      tools: SCREENING_TOOLS,
      maxToolCalls: SCREENING_CONFIG.maxLlmToolCalls,
      context: {
        screeningState: state,
        conversationHistory: [],
        referenceData: refData,
      },
    });

    // Should still return a response (maybe fewer scores or none due to vagueness)
    expect(result.message).toBeTruthy();
    // Should not crash or error
  }, TIMEOUT);
});
