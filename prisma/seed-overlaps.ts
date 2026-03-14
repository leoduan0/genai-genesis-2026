// ─── Item Overlap Data for Step 4c ──────────────────────────────────────────
// Precomputed content-overlapping item pairs across instruments.
// Used for deterministic deduplication during adaptive screening sessions.
//
// Overlap identification method:
// 1. Matched items sharing ContentTag values across different instruments
// 2. Verified by comparing item text for semantic equivalence
// 3. Assigned overlap strength based on content similarity:
//    - HIGH: Nearly identical wording/content (noiseInflationMultiplier = 3.0)
//    - MODERATE: Same construct, different framing (noiseInflationMultiplier = 2.0)
//    - LOW: Thematically related, different focus (noiseInflationMultiplier = 1.5)
//
// Convention: itemA instrument is alphabetically/ordinally before itemB instrument
// within a tier, and Tier 1 instruments come before Tier 2 instruments.

import type { ContentTag, OverlapStrength } from "../generated/prisma/client";

export type OverlapDef = {
  instrumentA: string;
  itemNumberA: number;
  instrumentB: string;
  itemNumberB: number;
  overlapStrength: OverlapStrength;
  sharedTags: ContentTag[];
  description: string;
  noiseInflationMultiplier: number;
};

export const overlaps: OverlapDef[] = [
  // ════════════════════════════════════════════════════════════════════════════
  // HIGH OVERLAPS — Nearly identical content (multiplier: 3.0)
  // ════════════════════════════════════════════════════════════════════════════

  // AUDIT-C items 1-3 are literally the first 3 items of the full AUDIT
  {
    instrumentA: "AUDIT-C", itemNumberA: 1,
    instrumentB: "AUDIT", itemNumberB: 1,
    overlapStrength: "HIGH", sharedTags: ["ALCOHOL_USE"],
    description: "Identical item: alcohol frequency",
    noiseInflationMultiplier: 3.0,
  },
  {
    instrumentA: "AUDIT-C", itemNumberA: 2,
    instrumentB: "AUDIT", itemNumberB: 2,
    overlapStrength: "HIGH", sharedTags: ["ALCOHOL_USE"],
    description: "Identical item: typical drinks per day",
    noiseInflationMultiplier: 3.0,
  },
  {
    instrumentA: "AUDIT-C", itemNumberA: 3,
    instrumentB: "AUDIT", itemNumberB: 3,
    overlapStrength: "HIGH", sharedTags: ["ALCOHOL_USE", "IMPULSIVITY"],
    description: "Identical item: binge drinking frequency",
    noiseInflationMultiplier: 3.0,
  },

  // PHQ-15 and PHQ-9 share somatic/depression items with near-identical wording
  {
    instrumentA: "PHQ-9", itemNumberA: 4,
    instrumentB: "PHQ-15", itemNumberB: 14,
    overlapStrength: "HIGH", sharedTags: ["FATIGUE"],
    description: "Both assess fatigue/low energy with near-identical wording",
    noiseInflationMultiplier: 3.0,
  },
  {
    instrumentA: "PHQ-9", itemNumberA: 3,
    instrumentB: "PHQ-15", itemNumberB: 15,
    overlapStrength: "HIGH", sharedTags: ["SLEEP"],
    description: "Both assess sleep problems with near-identical wording",
    noiseInflationMultiplier: 3.0,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // MODERATE OVERLAPS — Same construct, different framing (multiplier: 2.0)
  // ════════════════════════════════════════════════════════════════════════════

  // ── Anhedonia cluster ──────────────────────────────────────────────────────
  {
    instrumentA: "PHQ-9", itemNumberA: 1,
    instrumentB: "WHO-5", itemNumberB: 5,
    overlapStrength: "MODERATE", sharedTags: ["ANHEDONIA"],
    description: "Both assess interest/pleasure in activities (PHQ-9 direct, WHO-5 reverse-coded)",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-9", itemNumberA: 1,
    instrumentB: "WHO-5", itemNumberB: 1,
    overlapStrength: "MODERATE", sharedTags: ["ANHEDONIA"],
    description: "Both assess positive affect/pleasure (PHQ-9 loss of pleasure, WHO-5 cheerfulness)",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-9", itemNumberA: 1,
    instrumentB: "PCL-5", itemNumberB: 12,
    overlapStrength: "MODERATE", sharedTags: ["ANHEDONIA"],
    description: "Both assess loss of interest in previously enjoyed activities",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-9", itemNumberA: 1,
    instrumentB: "CAPE-42", itemNumberB: 21,
    overlapStrength: "MODERATE", sharedTags: ["ANHEDONIA"],
    description: "Both assess loss of motivation/interest",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-9", itemNumberA: 1,
    instrumentB: "PQ-16", itemNumberB: 1,
    overlapStrength: "MODERATE", sharedTags: ["ANHEDONIA"],
    description: "Both assess loss of interest in previously enjoyed activities",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PCL-5", itemNumberA: 14,
    instrumentB: "CAPE-42", itemNumberB: 24,
    overlapStrength: "MODERATE", sharedTags: ["NUMBING"],
    description: "Both assess emotional numbing/difficulty experiencing positive feelings",
    noiseInflationMultiplier: 2.0,
  },

  // ── Depressed mood cluster ─────────────────────────────────────────────────
  {
    instrumentA: "PHQ-9", itemNumberA: 2,
    instrumentB: "WHO-5", itemNumberB: 1,
    overlapStrength: "MODERATE", sharedTags: ["DEPRESSED_MOOD"],
    description: "Both assess mood valence (PHQ-9 depressed mood, WHO-5 cheerfulness reverse)",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-9", itemNumberA: 2,
    instrumentB: "CAPE-42", itemNumberB: 35,
    overlapStrength: "MODERATE", sharedTags: ["DEPRESSED_MOOD"],
    description: "Both assess sadness/depressed mood",
    noiseInflationMultiplier: 2.0,
  },

  // ── Sleep cluster ──────────────────────────────────────────────────────────
  {
    instrumentA: "PHQ-9", itemNumberA: 3,
    instrumentB: "PCL-5", itemNumberB: 20,
    overlapStrength: "MODERATE", sharedTags: ["SLEEP"],
    description: "Both assess difficulty falling or staying asleep",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-15", itemNumberA: 15,
    instrumentB: "PCL-5", itemNumberB: 20,
    overlapStrength: "MODERATE", sharedTags: ["SLEEP"],
    description: "Both assess sleep difficulties",
    noiseInflationMultiplier: 2.0,
  },

  // ── Fatigue/energy cluster ─────────────────────────────────────────────────
  {
    instrumentA: "PHQ-9", itemNumberA: 4,
    instrumentB: "WHO-5", itemNumberB: 3,
    overlapStrength: "MODERATE", sharedTags: ["FATIGUE"],
    description: "Both assess energy/vitality (PHQ-9 fatigue, WHO-5 active/vigorous reverse)",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-9", itemNumberA: 4,
    instrumentB: "WHO-5", itemNumberB: 4,
    overlapStrength: "MODERATE", sharedTags: ["FATIGUE"],
    description: "Both assess energy/rest (PHQ-9 fatigue, WHO-5 waking fresh/rested reverse)",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-9", itemNumberA: 4,
    instrumentB: "CAPE-42", itemNumberB: 21,
    overlapStrength: "MODERATE", sharedTags: ["FATIGUE"],
    description: "Both assess low energy/motivation",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-15", itemNumberA: 14,
    instrumentB: "WHO-5", itemNumberB: 3,
    overlapStrength: "MODERATE", sharedTags: ["FATIGUE"],
    description: "Both assess energy level (PHQ-15 low energy, WHO-5 active/vigorous reverse)",
    noiseInflationMultiplier: 2.0,
  },

  // ── Worthlessness/guilt cluster ────────────────────────────────────────────
  {
    instrumentA: "PHQ-9", itemNumberA: 6,
    instrumentB: "PC-PTSD-5", itemNumberB: 5,
    overlapStrength: "MODERATE", sharedTags: ["WORTHLESSNESS"],
    description: "Both assess guilt/self-blame",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-9", itemNumberA: 6,
    instrumentB: "PCL-5", itemNumberB: 9,
    overlapStrength: "MODERATE", sharedTags: ["WORTHLESSNESS"],
    description: "Both assess negative self-beliefs/feeling like a failure",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-9", itemNumberA: 6,
    instrumentB: "CAPE-42", itemNumberB: 36,
    overlapStrength: "MODERATE", sharedTags: ["WORTHLESSNESS"],
    description: "Both assess feeling worthless/no good",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-9", itemNumberA: 6,
    instrumentB: "CAPE-42", itemNumberB: 41,
    overlapStrength: "MODERATE", sharedTags: ["WORTHLESSNESS"],
    description: "Both assess feeling like a failure",
    noiseInflationMultiplier: 2.0,
  },

  // ── Concentration cluster ──────────────────────────────────────────────────
  {
    instrumentA: "PHQ-9", itemNumberA: 7,
    instrumentB: "PCL-5", itemNumberB: 19,
    overlapStrength: "MODERATE", sharedTags: ["CONCENTRATION"],
    description: "Both assess difficulty concentrating",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-9", itemNumberA: 7,
    instrumentB: "CAPE-42", itemNumberB: 33,
    overlapStrength: "MODERATE", sharedTags: ["CONCENTRATION"],
    description: "Both assess difficulty paying attention/concentrating",
    noiseInflationMultiplier: 2.0,
  },

  // ── Suicidality cluster ────────────────────────────────────────────────────
  {
    instrumentA: "PHQ-9", itemNumberA: 9,
    instrumentB: "CAPE-42", itemNumberB: 38,
    overlapStrength: "MODERATE", sharedTags: ["SUICIDALITY"],
    description: "Both assess suicidal ideation (PHQ-9 better off dead, CAPE-42 life not worth living)",
    noiseInflationMultiplier: 2.0,
  },

  // ── Anxiety/worry cluster ──────────────────────────────────────────────────
  {
    instrumentA: "GAD-7", itemNumberA: 1,
    instrumentB: "WHO-5", itemNumberB: 2,
    overlapStrength: "MODERATE", sharedTags: ["WORRY", "RESTLESSNESS"],
    description: "Both assess anxiety/calm (GAD-7 nervous/anxious, WHO-5 calm/relaxed reverse)",
    noiseInflationMultiplier: 2.0,
  },

  // ── Irritability cluster ───────────────────────────────────────────────────
  {
    instrumentA: "GAD-7", itemNumberA: 6,
    instrumentB: "PCL-5", itemNumberB: 15,
    overlapStrength: "MODERATE", sharedTags: ["IRRITABILITY"],
    description: "Both assess irritability/angry outbursts",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "GAD-7", itemNumberA: 6,
    instrumentB: "MDQ", itemNumberB: 2,
    overlapStrength: "MODERATE", sharedTags: ["IRRITABILITY"],
    description: "Both assess irritability (GAD-7 easily annoyed, MDQ irritable/shouting/fights)",
    noiseInflationMultiplier: 2.0,
  },

  // ── Restlessness cluster ───────────────────────────────────────────────────
  {
    instrumentA: "GAD-7", itemNumberA: 5,
    instrumentB: "ASRS v1.1", itemNumberB: 5,
    overlapStrength: "MODERATE", sharedTags: ["RESTLESSNESS"],
    description: "Both assess motor restlessness/difficulty sitting still",
    noiseInflationMultiplier: 2.0,
  },

  // ── PTSD screening ↔ PCL-5 (screener vs full scale) ────────────────────────
  {
    instrumentA: "PC-PTSD-5", itemNumberA: 1,
    instrumentB: "PCL-5", itemNumberB: 1,
    overlapStrength: "MODERATE", sharedTags: ["INTRUSIONS"],
    description: "Both assess intrusive memories/nightmares about traumatic events",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PC-PTSD-5", itemNumberA: 2,
    instrumentB: "PCL-5", itemNumberB: 6,
    overlapStrength: "MODERATE", sharedTags: ["AVOIDANCE"],
    description: "Both assess avoidance of trauma-related thoughts and situations",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PC-PTSD-5", itemNumberA: 3,
    instrumentB: "PCL-5", itemNumberB: 17,
    overlapStrength: "MODERATE", sharedTags: ["HYPERAROUSAL"],
    description: "Both assess hypervigilance/being on guard",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PC-PTSD-5", itemNumberA: 4,
    instrumentB: "PCL-5", itemNumberB: 13,
    overlapStrength: "MODERATE", sharedTags: ["NUMBING"],
    description: "Both assess emotional numbing/feeling detached from others",
    noiseInflationMultiplier: 2.0,
  },

  // ── Somatic/panic cluster (PHQ-15 ↔ PHQ-Panic) ────────────────────────────
  {
    instrumentA: "PHQ-15", itemNumberA: 9,
    instrumentB: "PHQ-Panic", itemNumberB: 6,
    overlapStrength: "MODERATE", sharedTags: ["SOMATIC_CARDIO", "PANIC"],
    description: "Both assess heart pounding/racing",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-15", itemNumberA: 10,
    instrumentB: "PHQ-Panic", itemNumberB: 5,
    overlapStrength: "MODERATE", sharedTags: ["SOMATIC_CARDIO", "PANIC"],
    description: "Both assess shortness of breath",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-15", itemNumberA: 6,
    instrumentB: "PHQ-Panic", itemNumberB: 7,
    overlapStrength: "MODERATE", sharedTags: ["SOMATIC_CARDIO"],
    description: "Both assess chest pain/pressure",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-15", itemNumberA: 7,
    instrumentB: "PHQ-Panic", itemNumberB: 12,
    overlapStrength: "MODERATE", sharedTags: ["SOMATIC_NEURO"],
    description: "Both assess dizziness/faintness",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PHQ-15", itemNumberA: 13,
    instrumentB: "PHQ-Panic", itemNumberB: 11,
    overlapStrength: "MODERATE", sharedTags: ["SOMATIC_GI"],
    description: "Both assess nausea/GI distress",
    noiseInflationMultiplier: 2.0,
  },

  // ── Psychotic experiences (CAPE-42 ↔ PQ-16) ───────────────────────────────
  {
    instrumentA: "CAPE-42", itemNumberA: 15,
    instrumentB: "PQ-16", itemNumberB: 13,
    overlapStrength: "MODERATE", sharedTags: ["HALLUCINATIONS"],
    description: "Both assess auditory hallucinations (hearing voices)",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "CAPE-42", itemNumberA: 18,
    instrumentB: "PQ-16", itemNumberB: 5,
    overlapStrength: "MODERATE", sharedTags: ["HALLUCINATIONS"],
    description: "Both assess visual hallucinations (seeing things others can't)",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "CAPE-42", itemNumberA: 6,
    instrumentB: "PQ-16", itemNumberB: 14,
    overlapStrength: "MODERATE", sharedTags: ["GRANDIOSITY"],
    description: "Both assess grandiosity/being unusually important",
    noiseInflationMultiplier: 2.0,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // LOW OVERLAPS — Thematically related (multiplier: 1.5)
  // ════════════════════════════════════════════════════════════════════════════

  // ── Psychomotor/activity ───────────────────────────────────────────────────
  {
    instrumentA: "PHQ-9", itemNumberA: 8,
    instrumentB: "CAPE-42", itemNumberB: 23,
    overlapStrength: "LOW", sharedTags: ["PSYCHOMOTOR"],
    description: "Both assess psychomotor changes (PHQ-9 slowed/restless, CAPE-42 days doing nothing)",
    noiseInflationMultiplier: 1.5,
  },

  // ── Tension/restlessness ───────────────────────────────────────────────────
  {
    instrumentA: "GAD-7", itemNumberA: 4,
    instrumentB: "CAPE-42", itemNumberB: 42,
    overlapStrength: "LOW", sharedTags: ["RESTLESSNESS", "MUSCLE_TENSION"],
    description: "Both assess tension/difficulty relaxing",
    noiseInflationMultiplier: 1.5,
  },

  // ── Concentration/attention (cross-instrument) ─────────────────────────────
  {
    instrumentA: "PHQ-9", itemNumberA: 7,
    instrumentB: "MDQ", itemNumberB: 7,
    overlapStrength: "LOW", sharedTags: ["CONCENTRATION"],
    description: "Both assess concentration difficulty (depression vs mania context)",
    noiseInflationMultiplier: 1.5,
  },
  {
    instrumentA: "PHQ-9", itemNumberA: 7,
    instrumentB: "ASRS v1.1", itemNumberB: 3,
    overlapStrength: "LOW", sharedTags: ["CONCENTRATION"],
    description: "Both assess cognitive difficulties (PHQ-9 concentration, ASRS memory/obligations)",
    noiseInflationMultiplier: 1.5,
  },
  {
    instrumentA: "CAPE-42", itemNumberA: 33,
    instrumentB: "ASRS v1.1", itemNumberB: 1,
    overlapStrength: "LOW", sharedTags: ["INATTENTION"],
    description: "Both assess difficulty paying attention/completing tasks",
    noiseInflationMultiplier: 1.5,
  },
  {
    instrumentA: "CAPE-42", itemNumberA: 26,
    instrumentB: "PCL-5", itemNumberB: 19,
    overlapStrength: "LOW", sharedTags: ["CONCENTRATION"],
    description: "Both assess cognitive difficulties (CAPE-42 can't think clearly, PCL-5 difficulty concentrating)",
    noiseInflationMultiplier: 1.5,
  },

  // ── Thought control/insertion ──────────────────────────────────────────────
  {
    instrumentA: "CAPE-42", itemNumberA: 20,
    instrumentB: "PQ-16", itemNumberB: 12,
    overlapStrength: "LOW", sharedTags: ["DELUSIONS", "DISORGANIZED_THOUGHT"],
    description: "Both assess feeling thoughts are not one's own/not in control of thoughts",
    noiseInflationMultiplier: 1.5,
  },

  // ── Paranoia ───────────────────────────────────────────────────────────────
  {
    instrumentA: "CAPE-42", itemNumberA: 4,
    instrumentB: "PQ-16", itemNumberB: 10,
    overlapStrength: "LOW", sharedTags: ["PARANOIA"],
    description: "Both assess persecutory ideation/odd unexplained events",
    noiseInflationMultiplier: 1.5,
  },

  // ── Somatic-cardiac/hyperarousal ───────────────────────────────────────────
  {
    instrumentA: "PHQ-15", itemNumberA: 9,
    instrumentB: "PCL-5", itemNumberB: 5,
    overlapStrength: "LOW", sharedTags: ["SOMATIC_CARDIO"],
    description: "Both assess cardiac symptoms (PHQ-15 heart racing, PCL-5 physical reactions to reminders)",
    noiseInflationMultiplier: 1.5,
  },

  // ── Somatic neuro/trembling ────────────────────────────────────────────────
  {
    instrumentA: "PHQ-Panic", itemNumberA: 14,
    instrumentB: "SPIN", itemNumberB: 17,
    overlapStrength: "LOW", sharedTags: ["SOMATIC_NEURO"],
    description: "Both assess trembling/shaking (panic context vs social anxiety context)",
    noiseInflationMultiplier: 1.5,
  },

  // ── Derealization ──────────────────────────────────────────────────────────
  {
    instrumentA: "CAPE-42", itemNumberA: 27,
    instrumentB: "PQ-16", itemNumberB: 11,
    overlapStrength: "LOW", sharedTags: ["DEREALIZATION"],
    description: "Both assess derealization/things seeming abnormal or unreal",
    noiseInflationMultiplier: 1.5,
  },

  // ── Emotional detachment ────────────────────────────────────────────────────
  {
    instrumentA: "PC-PTSD-5", itemNumberA: 4,
    instrumentB: "CAPE-42", itemNumberB: 24,
    overlapStrength: "LOW", sharedTags: ["NUMBING", "EMOTIONAL_DETACHMENT"],
    description: "Both assess emotional detachment/numbing",
    noiseInflationMultiplier: 1.5,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // NEW INSTRUMENT OVERLAPS — Gap-filling instruments
  // ════════════════════════════════════════════════════════════════════════════

  // ── Hypomania cluster (HCL-32 ↔ MDQ) ────────────────────────────────────
  {
    instrumentA: "MDQ", itemNumberA: 1,
    instrumentB: "HCL-32", itemNumberB: 28,
    overlapStrength: "HIGH", sharedTags: ["HYPOMANIA"],
    description: "Both assess elevated/euphoric mood",
    noiseInflationMultiplier: 3.0,
  },
  {
    instrumentA: "MDQ", itemNumberA: 2,
    instrumentB: "HCL-32", itemNumberB: 25,
    overlapStrength: "HIGH", sharedTags: ["IRRITABILITY", "HYPOMANIA"],
    description: "Both assess irritability in hypomanic context",
    noiseInflationMultiplier: 3.0,
  },
  {
    instrumentA: "MDQ", itemNumberA: 3,
    instrumentB: "HCL-32", itemNumberB: 3,
    overlapStrength: "HIGH", sharedTags: ["GRANDIOSITY", "HYPOMANIA"],
    description: "Both assess increased self-confidence/grandiosity",
    noiseInflationMultiplier: 3.0,
  },
  {
    instrumentA: "MDQ", itemNumberA: 4,
    instrumentB: "HCL-32", itemNumberB: 1,
    overlapStrength: "HIGH", sharedTags: ["SLEEP", "HYPOMANIA"],
    description: "Both assess decreased need for sleep",
    noiseInflationMultiplier: 3.0,
  },
  {
    instrumentA: "MDQ", itemNumberA: 5,
    instrumentB: "HCL-32", itemNumberB: 18,
    overlapStrength: "HIGH", sharedTags: ["TALKATIVENESS", "HYPOMANIA"],
    description: "Both assess pressured speech / increased talkativeness",
    noiseInflationMultiplier: 3.0,
  },
  {
    instrumentA: "MDQ", itemNumberA: 6,
    instrumentB: "HCL-32", itemNumberB: 19,
    overlapStrength: "HIGH", sharedTags: ["HYPOMANIA"],
    description: "Both assess racing thoughts / thinking faster",
    noiseInflationMultiplier: 3.0,
  },
  {
    instrumentA: "MDQ", itemNumberA: 7,
    instrumentB: "HCL-32", itemNumberB: 21,
    overlapStrength: "HIGH", sharedTags: ["CONCENTRATION", "HYPOMANIA"],
    description: "Both assess distractibility",
    noiseInflationMultiplier: 3.0,
  },
  {
    instrumentA: "MDQ", itemNumberA: 8,
    instrumentB: "HCL-32", itemNumberB: 2,
    overlapStrength: "HIGH", sharedTags: ["HYPOMANIA"],
    description: "Both assess increased energy/activity",
    noiseInflationMultiplier: 3.0,
  },
  {
    instrumentA: "MDQ", itemNumberA: 9,
    instrumentB: "HCL-32", itemNumberB: 5,
    overlapStrength: "HIGH", sharedTags: ["SOCIAL_WITHDRAWAL", "HYPOMANIA"],
    description: "Both assess increased sociability",
    noiseInflationMultiplier: 3.0,
  },
  {
    instrumentA: "MDQ", itemNumberA: 10,
    instrumentB: "HCL-32", itemNumberB: 16,
    overlapStrength: "HIGH", sharedTags: ["HYPOMANIA", "IMPULSIVITY"],
    description: "Both assess increased sexual drive/activity",
    noiseInflationMultiplier: 3.0,
  },
  {
    instrumentA: "MDQ", itemNumberA: 12,
    instrumentB: "HCL-32", itemNumberB: 8,
    overlapStrength: "HIGH", sharedTags: ["IMPULSIVITY", "RISK_TAKING"],
    description: "Both assess excessive spending",
    noiseInflationMultiplier: 3.0,
  },

  // ── Psychotic/schizotypal experiences (SPQ-B ↔ CAPE-42 ↔ PQ-16 ↔ PID-5-BF) ─
  {
    instrumentA: "CAPE-42", itemNumberA: 5,
    instrumentB: "SPQ-B", itemNumberB: 9,
    overlapStrength: "MODERATE", sharedTags: ["PARANOIA"],
    description: "Both assess ideas of reference / hidden meanings in others' behavior",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "CAPE-42", itemNumberA: 4,
    instrumentB: "SPQ-B", itemNumberB: 4,
    overlapStrength: "MODERATE", sharedTags: ["PARANOIA", "MAGICAL_THINKING"],
    description: "Both assess thought broadcasting / others knowing your thoughts",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "SPQ-B", itemNumberA: 2,
    instrumentB: "PID-5-BF", itemNumberB: 22,
    overlapStrength: "MODERATE", sharedTags: ["HALLUCINATIONS", "MAGICAL_THINKING"],
    description: "Both assess unusual perceptual experiences (presence of unseen person/force)",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "SPQ-B", itemNumberA: 12,
    instrumentB: "PID-5-BF", itemNumberB: 21,
    overlapStrength: "MODERATE", sharedTags: ["MAGICAL_THINKING"],
    description: "Both assess unusual beliefs/perceptual experiences",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "PQ-16", itemNumberA: 13,
    instrumentB: "SPQ-B", itemNumberB: 16,
    overlapStrength: "MODERATE", sharedTags: ["HALLUCINATIONS", "SENSORY_SENSITIVITY"],
    description: "Both assess unusual auditory/perceptual experiences",
    noiseInflationMultiplier: 2.0,
  },

  // ── Social withdrawal / detachment (SPQ-B ↔ AQ-10 ↔ PID-5-BF) ───────────
  {
    instrumentA: "SPQ-B", itemNumberA: 1,
    instrumentB: "PID-5-BF", itemNumberB: 6,
    overlapStrength: "MODERATE", sharedTags: ["SOCIAL_WITHDRAWAL", "EMOTIONAL_DETACHMENT"],
    description: "Both assess aloofness / not wanting to get close to people",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "SPQ-B", itemNumberA: 18,
    instrumentB: "PID-5-BF", itemNumberB: 9,
    overlapStrength: "MODERATE", sharedTags: ["SOCIAL_WITHDRAWAL", "EMOTIONAL_DETACHMENT"],
    description: "Both assess inability to get close to people / avoiding relationships",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "SPQ-B", itemNumberA: 15,
    instrumentB: "AQ-10", itemNumberB: 5,
    overlapStrength: "LOW", sharedTags: ["SOCIAL_WITHDRAWAL"],
    description: "Both assess social difficulties (SPQ-B background preference, AQ-10 reading between lines)",
    noiseInflationMultiplier: 1.5,
  },
  {
    instrumentA: "AQ-10", itemNumberA: 7,
    instrumentB: "PID-5-BF", itemNumberB: 6,
    overlapStrength: "LOW", sharedTags: ["SOCIAL_WITHDRAWAL"],
    description: "Both assess interpersonal difficulties (AQ-10 reading intentions, PID-5-BF closeness avoidance)",
    noiseInflationMultiplier: 1.5,
  },
  {
    instrumentA: "SPQ-B", itemNumberA: 10,
    instrumentB: "PID-5-BF", itemNumberB: 10,
    overlapStrength: "LOW", sharedTags: ["SOCIAL_WITHDRAWAL"],
    description: "Both assess discomfort with social interaction (SPQ-B paranoid, PID-5-BF disinterest)",
    noiseInflationMultiplier: 1.5,
  },

  // ── Depersonalization/derealization (CDS-2 ↔ CAPE-42 ↔ PQ-16 ↔ PID-5-BF) ─
  {
    instrumentA: "CAPE-42", itemNumberA: 27,
    instrumentB: "CDS-2", itemNumberB: 1,
    overlapStrength: "MODERATE", sharedTags: ["DEREALIZATION", "DEPERSONALIZATION"],
    description: "Both assess feeling strange/cut off from the world",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "CDS-2", itemNumberA: 2,
    instrumentB: "PQ-16", itemNumberB: 11,
    overlapStrength: "MODERATE", sharedTags: ["DEREALIZATION"],
    description: "Both assess visual derealization (things looking flat/unreal)",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "CDS-2", itemNumberA: 1,
    instrumentB: "PID-5-BF", itemNumberB: 25,
    overlapStrength: "MODERATE", sharedTags: ["DEPERSONALIZATION", "DEREALIZATION"],
    description: "Both assess feelings of unreality / being cut off",
    noiseInflationMultiplier: 2.0,
  },

  // ── Paranoia (SPQ-B ↔ existing instruments) ──────────────────────────────
  {
    instrumentA: "SPQ-B", itemNumberA: 7,
    instrumentB: "CAPE-42", itemNumberB: 4,
    overlapStrength: "MODERATE", sharedTags: ["PARANOIA"],
    description: "Both assess interpersonal suspiciousness / need to be on guard",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "SPQ-B", itemNumberA: 17,
    instrumentB: "PQ-16", itemNumberB: 10,
    overlapStrength: "MODERATE", sharedTags: ["PARANOIA"],
    description: "Both assess persecutory ideation / people taking advantage",
    noiseInflationMultiplier: 2.0,
  },

  // ── Hoarding (HRS-SR ↔ Y-BOCS) ──────────────────────────────────────────
  {
    instrumentA: "Y-BOCS", itemNumberA: 6,
    instrumentB: "HRS-SR", itemNumberB: 2,
    overlapStrength: "MODERATE", sharedTags: ["HOARDING", "COMPULSIONS"],
    description: "Both assess difficulty discarding / compulsive saving behavior",
    noiseInflationMultiplier: 2.0,
  },

  // ── Body image (BDDQ ↔ SCOFF) ───────────────────────────────────────────
  {
    instrumentA: "BDDQ", itemNumberA: 2,
    instrumentB: "SCOFF", itemNumberB: 4,
    overlapStrength: "MODERATE", sharedTags: ["BODY_IMAGE"],
    description: "Both assess distorted body perception (thinking too fat when others disagree)",
    noiseInflationMultiplier: 2.0,
  },

  // ── Eating behavior (SCOFF ↔ BEDS-7) ────────────────────────────────────
  {
    instrumentA: "SCOFF", itemNumberA: 2,
    instrumentB: "BEDS-7", itemNumberB: 2,
    overlapStrength: "HIGH", sharedTags: ["BINGE_EATING"],
    description: "Both assess loss of control over eating",
    noiseInflationMultiplier: 3.0,
  },
  {
    instrumentA: "SCOFF", itemNumberA: 5,
    instrumentB: "BEDS-7", itemNumberB: 1,
    overlapStrength: "MODERATE", sharedTags: ["BINGE_EATING"],
    description: "Both assess food dominating life / excessive overeating",
    noiseInflationMultiplier: 2.0,
  },

  // ── Binge eating cross-instrument (BEDS-7 ↔ PID-5-BF) ──────────────────
  {
    instrumentA: "BEDS-7", itemNumberA: 7,
    instrumentB: "PHQ-9", itemNumberB: 6,
    overlapStrength: "LOW", sharedTags: ["WORTHLESSNESS"],
    description: "Both assess guilt/self-disgust (BEDS-7 after overeating, PHQ-9 general)",
    noiseInflationMultiplier: 1.5,
  },

  // ── Irritability cross-instrument (HCL-32 ↔ GAD-7) ──────────────────────
  {
    instrumentA: "GAD-7", itemNumberA: 6,
    instrumentB: "HCL-32", itemNumberB: 25,
    overlapStrength: "MODERATE", sharedTags: ["IRRITABILITY"],
    description: "Both assess irritability (GAD-7 anxiety context, HCL-32 hypomania context)",
    noiseInflationMultiplier: 2.0,
  },

  // ── Sleep cross-instrument (HCL-32 ↔ PHQ-9) ─────────────────────────────
  {
    instrumentA: "PHQ-9", itemNumberA: 3,
    instrumentB: "HCL-32", itemNumberB: 1,
    overlapStrength: "LOW", sharedTags: ["SLEEP"],
    description: "Both assess sleep changes (PHQ-9 insomnia, HCL-32 decreased need — opposite poles)",
    noiseInflationMultiplier: 1.5,
  },

  // ── Concentration cross-instrument (HCL-32 ↔ PHQ-9 / ASRS) ─────────────
  {
    instrumentA: "PHQ-9", itemNumberA: 7,
    instrumentB: "HCL-32", itemNumberB: 21,
    overlapStrength: "LOW", sharedTags: ["CONCENTRATION"],
    description: "Both assess concentration difficulty (depression vs hypomania context)",
    noiseInflationMultiplier: 1.5,
  },
  {
    instrumentA: "ASRS v1.1", itemNumberA: 1,
    instrumentB: "HCL-32", itemNumberB: 21,
    overlapStrength: "LOW", sharedTags: ["CONCENTRATION", "INATTENTION"],
    description: "Both assess distractibility (ADHD vs hypomania context)",
    noiseInflationMultiplier: 1.5,
  },

  // ── Impulsivity / risk-taking (PGSI ↔ HCL-32 ↔ PID-5-BF) ──────────────
  {
    instrumentA: "HCL-32", itemNumberA: 8,
    instrumentB: "PGSI", itemNumberB: 1,
    overlapStrength: "LOW", sharedTags: ["IMPULSIVITY", "RISK_TAKING"],
    description: "Both assess reckless spending/gambling behavior",
    noiseInflationMultiplier: 1.5,
  },
  {
    instrumentA: "PID-5-BF", itemNumberA: 19,
    instrumentB: "PGSI", itemNumberB: 1,
    overlapStrength: "LOW", sharedTags: ["IMPULSIVITY", "RISK_TAKING"],
    description: "Both assess reckless risk-taking behavior",
    noiseInflationMultiplier: 1.5,
  },
  {
    instrumentA: "PID-5-BF", itemNumberA: 20,
    instrumentB: "HCL-32", itemNumberB: 9,
    overlapStrength: "LOW", sharedTags: ["IMPULSIVITY"],
    description: "Both assess acting on impulse / taking more risks",
    noiseInflationMultiplier: 1.5,
  },

  // ── Health anxiety / somatic (WI-7 ↔ PHQ-15) ────────────────────────────
  {
    instrumentA: "PHQ-15", itemNumberA: 1,
    instrumentB: "WI-7", itemNumberB: 7,
    overlapStrength: "MODERATE", sharedTags: ["SOMATIC_PAIN", "HEALTH_ANXIETY"],
    description: "Both assess being bothered by multiple physical symptoms",
    noiseInflationMultiplier: 2.0,
  },
  {
    instrumentA: "GAD-7", itemNumberA: 1,
    instrumentB: "WI-7", itemNumberB: 1,
    overlapStrength: "LOW", sharedTags: ["WORRY"],
    description: "Both assess worry (GAD-7 general, WI-7 health-specific)",
    noiseInflationMultiplier: 1.5,
  },

  // ── Antagonism (PID-5-BF ↔ existing) ─────────────────────────────────────
  {
    instrumentA: "CAPE-42", itemNumberA: 6,
    instrumentB: "PID-5-BF", itemNumberB: 15,
    overlapStrength: "LOW", sharedTags: ["GRANDIOSITY"],
    description: "Both assess grandiosity / feeling superior to others",
    noiseInflationMultiplier: 1.5,
  },

  // ── Emotional detachment cross-instruments ────────────────────────────────
  {
    instrumentA: "SPQ-B", itemNumberA: 22,
    instrumentB: "AQ-10", itemNumberB: 9,
    overlapStrength: "LOW", sharedTags: ["EMOTIONAL_DETACHMENT"],
    description: "Both assess emotional processing difficulties (SPQ-B keeping feelings in, AQ-10 reading faces)",
    noiseInflationMultiplier: 1.5,
  },
  {
    instrumentA: "PID-5-BF", itemNumberA: 8,
    instrumentB: "PCL-5", itemNumberB: 14,
    overlapStrength: "LOW", sharedTags: ["EMOTIONAL_DETACHMENT"],
    description: "Both assess emotional numbing / not caring (PID-5-BF apathy, PCL-5 loss of positive emotions)",
    noiseInflationMultiplier: 1.5,
  },
];
