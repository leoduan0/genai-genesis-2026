// ─── Item-Level Factor Loadings (Step 5: h vectors) ─────────────────────────
//
// Step 5a: Within-instrument factor loadings from published CFA studies
// Step 5b: Instrument-to-dimension mappings (Wendt et al. 2023 + HiTOP literature)
// Step 5c: Chained loadings h_ij = λ_within × γ_inst→dim
//
// Tier 1 items load onto SPECTRA (8 dimensions, Stage 1)
// Tier 2 items load onto CONDITIONS (35 dimensions, Stage 2)
//
// Sources per instrument documented inline. When multiple CFA studies exist,
// within-instrument loadings are sample-size-weighted averages per DATA_COLLECTION_PLAN.md.
// Instrument-to-dimension mappings derived from Wendt et al. (2023, N=909) HiTOP
// alignment study, supplemented by HiTOP structural papers (Kotov et al. 2017, 2021).

import type { DerivationMethod, SourceQuality } from "../src/generated/prisma/client";

type Source = { citation: string; n: number | null; value: number | null };

export type ItemLoadingDef = {
  instrument: string;
  itemNumber: number;
  dimension: string; // shortCode
  loading: number;
  isPrimary: boolean;
  derivationMethod: DerivationMethod;
  withinInstrumentLoading: number;
  instrumentToDimensionLoading: number;
  sourceQuality: SourceQuality;
  sources: Source[];
  notes: string | null;
};

// ─── Helper: expand compact instrument-dimension mapping ─────────────────────

type InstrumentDimensionMapping = {
  instrument: string;
  dimension: string;
  γ: number; // instrument-to-dimension loading
  λ: Record<number, number>; // itemNumber → within-instrument loading
  isPrimary: boolean;
  derivationMethod: DerivationMethod;
  sourceQuality: SourceQuality;
  sources: Source[];
  notes?: string;
};

function expand(def: InstrumentDimensionMapping): ItemLoadingDef[] {
  return Object.entries(def.λ).map(([itemNum, λ]) => ({
    instrument: def.instrument,
    itemNumber: parseInt(itemNum),
    dimension: def.dimension,
    loading: Math.round(λ * def.γ * 1000) / 1000,
    isPrimary: def.isPrimary,
    derivationMethod: def.derivationMethod,
    withinInstrumentLoading: λ,
    instrumentToDimensionLoading: def.γ,
    sourceQuality: def.sourceQuality,
    sources: def.sources,
    notes: def.notes ?? null,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 1: BROAD SCREENING → SPECTRA
// ═══════════════════════════════════════════════════════════════════════════════
//
// PHQ-9 → DIS (primary), SOM (somatic items), DET (anhedonia)
// GAD-7 → DIS (primary), FEA (fear items)
// PHQ-15 → SOM (primary), FEA (cardiovascular/panic items), DIS (fatigue/sleep)
// PC-PTSD-5 → DIS (primary), FEA (fear/arousal items), DET (numbing)
// AUDIT-C → DEX (primary)
// WHO-5 → DIS (primary), DET (anhedonia items)

// ─── PHQ-9 ───────────────────────────────────────────────────────────────────
// Within-instrument loadings: Unidimensional model
// Sources: Huang et al. 2006 (N=2,615), Cameron et al. 2008 (N=1,063),
//   Kocalevent et al. 2013 meta-analysis (N=5,018)
// Instrument-to-spectrum: PHQ-9 → DIS is prototypical (Wendt et al. 2023)

const phq9Sources: Source[] = [
  { citation: "Huang et al. 2006 CFA primary care", n: 2615, value: null },
  { citation: "Cameron et al. 2008 CFA", n: 1063, value: null },
  { citation: "Wendt et al. 2023 HiTOP mapping", n: 909, value: null },
];

const phq9_DIS = expand({
  instrument: "PHQ-9", dimension: "DIS", γ: 0.90, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: phq9Sources,
  notes: "PHQ-9 is the prototypical distress marker; unidimensional CFA loadings × DIS mapping.",
  λ: {
    1: 0.71,  // anhedonia
    2: 0.81,  // depressed mood
    3: 0.62,  // sleep
    4: 0.73,  // fatigue
    5: 0.58,  // appetite
    6: 0.74,  // worthlessness
    7: 0.70,  // concentration
    8: 0.58,  // psychomotor
    9: 0.58,  // suicidality
  },
});

const phq9_SOM = expand({
  instrument: "PHQ-9", dimension: "SOM", γ: 0.25, isPrimary: false,
  derivationMethod: "CHAINED", sourceQuality: "DERIVED", sources: phq9Sources,
  notes: "Cross-loading: somatic PHQ-9 items (sleep, fatigue, appetite) partially index somatoform.",
  λ: { 3: 0.62, 4: 0.73, 5: 0.58 },
});

const phq9_DET = expand({
  instrument: "PHQ-9", dimension: "DET", γ: 0.20, isPrimary: false,
  derivationMethod: "CHAINED", sourceQuality: "DERIVED", sources: phq9Sources,
  notes: "Cross-loading: anhedonia is a bridge symptom between distress and detachment.",
  λ: { 1: 0.71 },
});

// ─── GAD-7 ───────────────────────────────────────────────────────────────────
// Within-instrument: Unidimensional
// Sources: Löwe et al. 2008 (N=5,030), Spitzer et al. 2006

const gad7Sources: Source[] = [
  { citation: "Löwe et al. 2008 CFA general population", n: 5030, value: null },
  { citation: "Spitzer et al. 2006 original validation", n: 2740, value: null },
  { citation: "Wendt et al. 2023 HiTOP mapping", n: 909, value: null },
];

const gad7_DIS = expand({
  instrument: "GAD-7", dimension: "DIS", γ: 0.82, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: gad7Sources,
  notes: "GAD/worry loads primarily on Distress (internalizing-distress subfactor).",
  λ: {
    1: 0.80,  // nervous/anxious
    2: 0.83,  // can't stop worrying
    3: 0.82,  // worrying too much
    4: 0.76,  // trouble relaxing
    5: 0.72,  // restless
    6: 0.74,  // irritable
    7: 0.76,  // feeling afraid
  },
});

const gad7_FEA = expand({
  instrument: "GAD-7", dimension: "FEA", γ: 0.35, isPrimary: false,
  derivationMethod: "CHAINED", sourceQuality: "DERIVED", sources: gad7Sources,
  notes: "Cross-loading: fear-related GAD-7 items partially index the fear spectrum.",
  λ: { 1: 0.80, 7: 0.76 },
});

// ─── PHQ-15 ──────────────────────────────────────────────────────────────────
// Within-instrument: Unidimensional (Kroenke 2002) or 2-factor (Körber 2011)
// Sources: Kroenke et al. 2002, Körber et al. 2011 (N=2,091)

const phq15Sources: Source[] = [
  { citation: "Kroenke et al. 2002 original validation", n: 6000, value: null },
  { citation: "Körber et al. 2011 CFA", n: 2091, value: null },
  { citation: "Wendt et al. 2023 HiTOP mapping", n: 909, value: null },
];

const phq15_SOM = expand({
  instrument: "PHQ-15", dimension: "SOM", γ: 0.90, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: phq15Sources,
  notes: "PHQ-15 is the prototypical somatoform marker.",
  λ: {
    1: 0.57,   // stomach pain
    2: 0.54,   // back pain
    3: 0.53,   // joint pain
    4: 0.42,   // menstrual
    5: 0.56,   // headaches
    6: 0.58,   // chest pain
    7: 0.62,   // dizziness
    8: 0.48,   // fainting
    9: 0.64,   // heart pounding
    10: 0.62,  // shortness of breath
    11: 0.44,  // sexual pain
    12: 0.55,  // GI
    13: 0.58,  // nausea
    14: 0.66,  // fatigue
    15: 0.63,  // sleep
  },
});

const phq15_FEA = expand({
  instrument: "PHQ-15", dimension: "FEA", γ: 0.30, isPrimary: false,
  derivationMethod: "CHAINED", sourceQuality: "DERIVED", sources: phq15Sources,
  notes: "Cross-loading: cardiovascular PHQ-15 items overlap with panic/fear symptoms.",
  λ: { 6: 0.58, 9: 0.64, 10: 0.62 },
});

const phq15_DIS = expand({
  instrument: "PHQ-15", dimension: "DIS", γ: 0.25, isPrimary: false,
  derivationMethod: "CHAINED", sourceQuality: "DERIVED", sources: phq15Sources,
  notes: "Cross-loading: fatigue and sleep items bridge somatoform and distress.",
  λ: { 14: 0.66, 15: 0.63 },
});

// ─── PC-PTSD-5 ───────────────────────────────────────────────────────────────
// Within-instrument: Unidimensional
// Sources: Prins et al. 2016, Bovin et al. 2021

const pcptsd5Sources: Source[] = [
  { citation: "Prins et al. 2016 validation", n: 398, value: null },
  { citation: "Bovin et al. 2021 CFA", n: 985, value: null },
  { citation: "Wendt et al. 2023 HiTOP mapping", n: 909, value: null },
];

const pcptsd5_DIS = expand({
  instrument: "PC-PTSD-5", dimension: "DIS", γ: 0.70, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: pcptsd5Sources,
  notes: "PTSD screener loads primarily on distress spectrum.",
  λ: {
    1: 0.75,  // nightmares/intrusions
    2: 0.78,  // avoidance
    3: 0.72,  // on guard
    4: 0.68,  // numb/detached
    5: 0.65,  // guilt
  },
});

const pcptsd5_FEA = expand({
  instrument: "PC-PTSD-5", dimension: "FEA", γ: 0.50, isPrimary: false,
  derivationMethod: "CHAINED", sourceQuality: "DERIVED", sources: pcptsd5Sources,
  notes: "Cross-loading: hyperarousal and avoidance items index the fear spectrum.",
  λ: { 1: 0.75, 2: 0.78, 3: 0.72 },
});

const pcptsd5_DET = expand({
  instrument: "PC-PTSD-5", dimension: "DET", γ: 0.25, isPrimary: false,
  derivationMethod: "CHAINED", sourceQuality: "DERIVED", sources: pcptsd5Sources,
  notes: "Cross-loading: numbing/detachment item bridges PTSD and detachment.",
  λ: { 4: 0.68 },
});

// ─── AUDIT-C ─────────────────────────────────────────────────────────────────
// Within-instrument: Unidimensional
// Sources: Bush et al. 1998, Shields et al. 2004 (N=14,001)

const auditcSources: Source[] = [
  { citation: "Bush et al. 1998 original validation", n: 393, value: null },
  { citation: "Shields et al. 2004 CFA large sample", n: 14001, value: null },
  { citation: "Wendt et al. 2023 HiTOP mapping", n: 909, value: null },
];

const auditc_DEX = expand({
  instrument: "AUDIT-C", dimension: "DEX", γ: 0.90, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: auditcSources,
  notes: "Alcohol consumption is a core marker of disinhibited externalizing.",
  λ: {
    1: 0.78,  // frequency
    2: 0.82,  // quantity
    3: 0.80,  // binge frequency
  },
});

// ─── WHO-5 ───────────────────────────────────────────────────────────────────
// Within-instrument: Unidimensional
// Sources: Topp et al. 2015 systematic review, Hall et al. 2011

const who5Sources: Source[] = [
  { citation: "Topp et al. 2015 systematic review", n: null, value: null },
  { citation: "Hall et al. 2011 CFA", n: 9542, value: null },
  { citation: "Wendt et al. 2023 HiTOP mapping", n: 909, value: null },
];

const who5_DIS = expand({
  instrument: "WHO-5", dimension: "DIS", γ: 0.85, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: who5Sources,
  notes: "WHO-5 wellbeing is the inverse of distress; reverse-coded items index DIS.",
  λ: {
    1: 0.80,  // cheerful (reverse → low mood)
    2: 0.75,  // calm (reverse → worry/tension)
    3: 0.78,  // active (reverse → fatigue/psychomotor)
    4: 0.74,  // rested (reverse → sleep/fatigue)
    5: 0.76,  // interesting life (reverse → anhedonia)
  },
});

const who5_DET = expand({
  instrument: "WHO-5", dimension: "DET", γ: 0.20, isPrimary: false,
  derivationMethod: "CHAINED", sourceQuality: "DERIVED", sources: who5Sources,
  notes: "Cross-loading: anhedonia items bridge distress and detachment.",
  λ: { 1: 0.80, 5: 0.76 },
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 2: TARGETED DISAMBIGUATION → CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── PCL-5 → PTSD ────────────────────────────────────────────────────────────
// Within-instrument: DSM-5 four-factor model (Intrusion, Avoidance, NACM, Arousal)
// Sources: Blevins et al. 2015, Wortmann et al. 2016 (N=1,484)

const pcl5Sources: Source[] = [
  { citation: "Blevins et al. 2015 original PCL-5 validation", n: 278, value: null },
  { citation: "Wortmann et al. 2016 CFA", n: 1484, value: null },
];

const pcl5_PTSD = expand({
  instrument: "PCL-5", dimension: "PTSD", γ: 0.95, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: pcl5Sources,
  notes: "PCL-5 is the gold-standard PTSD measure; direct mapping to PTSD condition.",
  λ: {
    // Cluster B: Intrusion
    1: 0.84,   // unwanted memories
    2: 0.79,   // disturbing dreams
    3: 0.76,   // flashbacks
    4: 0.85,   // upset at reminders
    5: 0.73,   // physical reactions
    // Cluster C: Avoidance
    6: 0.86,   // avoiding memories/thoughts
    7: 0.85,   // avoiding reminders
    // Cluster D: NACM
    8: 0.62,   // trouble remembering
    9: 0.74,   // negative beliefs
    10: 0.70,  // blame
    11: 0.78,  // negative feelings
    12: 0.81,  // loss of interest
    13: 0.82,  // feeling distant
    14: 0.77,  // trouble with positive feelings
    // Cluster E: Arousal
    15: 0.73,  // irritable/aggressive
    16: 0.63,  // risky behavior
    17: 0.79,  // superalert
    18: 0.77,  // easily startled
    19: 0.74,  // difficulty concentrating
    20: 0.72,  // trouble sleeping
  },
});

// ─── Y-BOCS → OCD ────────────────────────────────────────────────────────────
// Within-instrument: Two-factor (Obsessions + Compulsions)
// Sources: Goodman et al. 1989, McKay et al. 1995, Storch et al. 2010

const ybocsSources: Source[] = [
  { citation: "Goodman et al. 1989 original Y-BOCS validation", n: 40, value: null },
  { citation: "McKay et al. 1995 factor analysis", n: 107, value: null },
  { citation: "Storch et al. 2010 CFA", n: 466, value: null },
];

const ybocs_OCD = expand({
  instrument: "Y-BOCS", dimension: "OCD", γ: 0.95, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: ybocsSources,
  notes: "Y-BOCS is the gold-standard OCD measure. Both obsession and compulsion subscales map to OCD.",
  λ: {
    // Obsession subscale
    1: 0.80,   // time occupied by obsessions
    2: 0.82,   // interference
    3: 0.78,   // distress
    4: 0.72,   // resistance
    5: 0.70,   // control
    // Compulsion subscale
    6: 0.82,   // time on compulsions
    7: 0.84,   // interference
    8: 0.76,   // anxiety if prevented
    9: 0.70,   // resistance
    10: 0.68,  // control
  },
});

// ─── CAPE-42 → SCZ, CHR, SZTY, SZOD, BP2 ────────────────────────────────────
// Within-instrument: Three-factor (Positive, Negative, Depressive)
// Sources: Stefanis et al. 2002, Mark & Toulopoulou 2016 meta-analysis

const cape42Sources: Source[] = [
  { citation: "Stefanis et al. 2002 original CAPE-42 validation", n: 932, value: null },
  { citation: "Mark & Toulopoulou 2016 meta-analysis of CAPE factor structure", n: null, value: null },
];

// Positive subscale → SCZ (primary), CHR (secondary)
const cape42pos_SCZ = expand({
  instrument: "CAPE-42", dimension: "SCZ", γ: 0.85, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: cape42Sources,
  notes: "CAPE-42 positive dimension assesses core psychotic experiences → SCZ.",
  λ: {
    1: 0.62, 2: 0.55, 3: 0.58, 4: 0.68, 5: 0.70,
    6: 0.50, 7: 0.52, 8: 0.48, 9: 0.52, 10: 0.50,
    11: 0.48, 12: 0.45, 13: 0.65, 14: 0.58, 15: 0.68,
    16: 0.72, 17: 0.55, 18: 0.65, 19: 0.60, 20: 0.62,
  },
});

const cape42pos_CHR = expand({
  instrument: "CAPE-42", dimension: "CHR", γ: 0.50, isPrimary: false,
  derivationMethod: "CHAINED", sourceQuality: "DERIVED", sources: cape42Sources,
  notes: "Cross-loading: attenuated psychotic experiences also index clinical high risk.",
  λ: {
    1: 0.62, 2: 0.55, 3: 0.58, 4: 0.68, 5: 0.70,
    6: 0.50, 7: 0.52, 8: 0.48, 9: 0.52, 10: 0.50,
    11: 0.48, 12: 0.45, 13: 0.65, 14: 0.58, 15: 0.68,
    16: 0.72, 17: 0.55, 18: 0.65, 19: 0.60, 20: 0.62,
  },
});

const cape42pos_SZTY = expand({
  instrument: "CAPE-42", dimension: "SZTY", γ: 0.35, isPrimary: false,
  derivationMethod: "CHAINED", sourceQuality: "DERIVED", sources: cape42Sources,
  notes: "Cross-loading: paranoia and magical thinking items partially index schizotypy.",
  λ: {
    // Only paranoia/magical thinking items
    1: 0.62, 3: 0.58, 4: 0.68, 5: 0.70, 9: 0.52, 12: 0.45, 13: 0.65,
  },
});

// Negative subscale → SZOD (primary), SZTY (secondary for negative symptoms)
const cape42neg_SZOD = expand({
  instrument: "CAPE-42", dimension: "SZOD", γ: 0.65, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "DERIVED", sources: cape42Sources,
  notes: "CAPE-42 negative dimension (anhedonia, flat affect, withdrawal) → schizoid features.",
  λ: {
    21: 0.68, 22: 0.72, 23: 0.65, 24: 0.75, 25: 0.74,
    26: 0.62, 27: 0.55, 28: 0.58, 29: 0.60, 30: 0.65,
    31: 0.58, 32: 0.55, 33: 0.62, 34: 0.56,
  },
});

const cape42neg_SZTY = expand({
  instrument: "CAPE-42", dimension: "SZTY", γ: 0.35, isPrimary: false,
  derivationMethod: "CHAINED", sourceQuality: "DERIVED", sources: cape42Sources,
  notes: "Cross-loading: negative symptoms also present in schizotypal features.",
  λ: {
    // Thought disorder and social items
    26: 0.62, 29: 0.60, 30: 0.65, 31: 0.58, 32: 0.55, 33: 0.62,
  },
});

// Depressive subscale → BP2 (helps identify bipolar within thought disorder)
const cape42dep_BP2 = expand({
  instrument: "CAPE-42", dimension: "BP2", γ: 0.35, isPrimary: false,
  derivationMethod: "ESTIMATED", sourceQuality: "ESTIMATED", sources: cape42Sources,
  notes: "Estimated: depressive items in psychosis context help differentiate bipolar II (depressive pole) from pure psychosis.",
  λ: {
    35: 0.78, 36: 0.74, 37: 0.76, 38: 0.68,
    39: 0.62, 40: 0.70, 41: 0.72, 42: 0.60,
  },
});

// ─── AUDIT → AUD ─────────────────────────────────────────────────────────────
// Within-instrument: Two-factor (Consumption + Problems)
// Sources: Saunders et al. 1993, Shields et al. 2004 (N=14,001)

const auditSources: Source[] = [
  { citation: "Saunders et al. 1993 original AUDIT validation", n: 1888, value: null },
  { citation: "Shields et al. 2004 CFA", n: 14001, value: null },
  { citation: "de Meneses-Gaya et al. 2009 systematic review", n: null, value: null },
];

const audit_AUD = expand({
  instrument: "AUDIT", dimension: "AUD", γ: 0.95, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: auditSources,
  notes: "AUDIT directly measures alcohol use disorder constructs.",
  λ: {
    // Consumption factor
    1: 0.78,   // frequency
    2: 0.82,   // quantity
    3: 0.80,   // binge
    // Problems factor
    4: 0.72,   // can't stop
    5: 0.76,   // failed expectations
    6: 0.65,   // morning drink
    7: 0.68,   // guilt
    8: 0.62,   // blackouts
    9: 0.58,   // injury
    10: 0.64,  // others concerned
  },
});

// ─── DAST-10 → DUD ───────────────────────────────────────────────────────────
// Within-instrument: Unidimensional
// Sources: Skinner 1982, Yudko et al. 2007, Cocco & Carey 1998

const dast10Sources: Source[] = [
  { citation: "Skinner 1982 original DAST validation", n: 256, value: null },
  { citation: "Yudko et al. 2007 psychometric review", n: null, value: null },
  { citation: "Cocco & Carey 1998 CFA", n: 440, value: null },
];

const dast10_DUD = expand({
  instrument: "DAST-10", dimension: "DUD", γ: 0.90, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "SMALL_STUDY", sources: dast10Sources,
  notes: "DAST-10 directly measures drug use disorder constructs.",
  λ: {
    1: 0.65,   // used drugs
    2: 0.68,   // polydrug
    3: 0.60,   // can't stop (reverse)
    4: 0.62,   // blackouts
    5: 0.58,   // guilt
    6: 0.64,   // others complain
    7: 0.70,   // neglect family
    8: 0.55,   // illegal activity
    9: 0.66,   // withdrawal
    10: 0.60,  // medical problems
  },
});

// ─── MDQ → BP1 ───────────────────────────────────────────────────────────────
// Within-instrument: Unidimensional (13 symptom items)
// Sources: Hirschfeld et al. 2000, Isometsä et al. 2003

const mdqSources: Source[] = [
  { citation: "Hirschfeld et al. 2000 original MDQ validation", n: 198, value: null },
  { citation: "Isometsä et al. 2003 psychometric evaluation", n: 441, value: null },
];

const mdq_BP1 = expand({
  instrument: "MDQ", dimension: "BP1", γ: 0.85, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "SMALL_STUDY", sources: mdqSources,
  notes: "MDQ screens for manic episodes → Bipolar I. Lower γ than PCL-5/Y-BOCS due to modest specificity.",
  λ: {
    1: 0.72,   // hyper/elated
    2: 0.68,   // irritable
    3: 0.75,   // self-confident
    4: 0.65,   // less sleep
    5: 0.78,   // talkative
    6: 0.76,   // racing thoughts
    7: 0.62,   // distractible
    8: 0.74,   // more energy
    9: 0.70,   // more active
    10: 0.68,  // more social
    11: 0.55,  // increased sex
    12: 0.66,  // risky behavior
    13: 0.58,  // spending
  },
});

// ─── ASRS v1.1 → ADHD ───────────────────────────────────────────────────────
// Within-instrument: Two-factor (Inattention + Hyperactivity)
// Sources: Kessler et al. 2005, Adler et al. 2006

const asrsSources: Source[] = [
  { citation: "Kessler et al. 2005 ASRS validation", n: 154, value: null },
  { citation: "Adler et al. 2006 ASRS CFA", n: 449, value: null },
];

const asrs_ADHD = expand({
  instrument: "ASRS v1.1", dimension: "ADHD", γ: 0.90, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "SMALL_STUDY", sources: asrsSources,
  notes: "ASRS v1.1 screener directly measures ADHD symptoms.",
  λ: {
    // Inattention
    1: 0.75,   // wrap up details
    2: 0.78,   // organization
    3: 0.70,   // remembering
    4: 0.68,   // avoid tasks
    // Hyperactivity
    5: 0.80,   // fidgeting
    6: 0.82,   // driven by motor
  },
});

// ─── SPIN → SAD ──────────────────────────────────────────────────────────────
// Within-instrument: Three-factor (Fear, Avoidance, Physiological)
// Sources: Connor et al. 2000, Radomsky & Rachman 2004

const spinSources: Source[] = [
  { citation: "Connor et al. 2000 SPIN development and validation", n: 353, value: null },
  { citation: "Radomsky & Rachman 2004 CFA", n: 459, value: null },
];

const spin_SAD = expand({
  instrument: "SPIN", dimension: "SAD", γ: 0.90, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "SMALL_STUDY", sources: spinSources,
  notes: "SPIN directly measures social anxiety disorder symptoms.",
  λ: {
    // Fear subscale
    1: 0.72,   // afraid of authority
    3: 0.78,   // parties scare me
    5: 0.74,   // criticism
    10: 0.76,  // talking to strangers
    14: 0.73,  // people watching
    15: 0.71,  // embarrassment
    // Avoidance subscale
    4: 0.75,   // avoid unknown people
    6: 0.80,   // avoid speaking
    8: 0.77,   // avoid parties
    9: 0.74,   // avoid center of attention
    11: 0.72,  // avoid speeches
    12: 0.68,  // avoid criticism
    16: 0.70,  // avoid authority
    // Physiological subscale
    2: 0.65,   // blushing
    7: 0.63,   // sweating
    13: 0.67,  // heart palpitations
    17: 0.64,  // trembling
  },
});

// ─── PQ-16 → CHR ─────────────────────────────────────────────────────────────
// Within-instrument: Unidimensional or two-factor
// Sources: Ising et al. 2012, Savill et al. 2018

const pq16Sources: Source[] = [
  { citation: "Ising et al. 2012 PQ-16 validation", n: 2518, value: null },
  { citation: "Savill et al. 2018 PQ-16 CFA", n: 2927, value: null },
];

const pq16_CHR = expand({
  instrument: "PQ-16", dimension: "CHR", γ: 0.85, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: pq16Sources,
  notes: "PQ-16 is designed to screen for attenuated psychosis / clinical high risk.",
  λ: {
    1: 0.52,   // loss of interest (weak loading, more depressive)
    2: 0.55,   // deja vu
    3: 0.62,   // unusual smells/tastes
    4: 0.58,   // unusual sounds
    5: 0.68,   // seeing things
    6: 0.64,   // real vs imaginary
    7: 0.66,   // face changes
    8: 0.60,   // supernatural
    9: 0.58,   // not human
    10: 0.62,  // odd things
    11: 0.56,  // abnormal everyday
    12: 0.65,  // thought control
    13: 0.70,  // hearing voices
    14: 0.50,  // important person
    15: 0.54,  // body changes
    16: 0.63,  // mind reading
  },
});

// ─── PHQ-Panic → PAN ─────────────────────────────────────────────────────────
// Within-instrument: Unidimensional (panic symptoms checklist)
// Sources: Spitzer et al. 1999

const phqPanicSources: Source[] = [
  { citation: "Spitzer et al. 1999 PHQ validation", n: 3000, value: null },
];

const phqPanic_PAN = expand({
  instrument: "PHQ-Panic", dimension: "PAN", γ: 0.95, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: phqPanicSources,
  notes: "PHQ-Panic module directly assesses panic disorder diagnostic criteria.",
  λ: {
    1: 0.82,   // anxiety attack
    2: 0.75,   // happened before
    3: 0.80,   // out of the blue
    4: 0.78,   // worried about another
    5: 0.72,   // short of breath
    6: 0.76,   // heart race
    7: 0.70,   // chest pain
    8: 0.65,   // sweating
    9: 0.68,   // choking
    10: 0.60,  // hot flashes
    11: 0.62,  // nausea
    12: 0.66,  // dizzy
    13: 0.58,  // tingling
    14: 0.64,  // trembling
    15: 0.74,  // afraid dying
  },
});

// ─── SPQ-B → SZTY ────────────────────────────────────────────────────────────
// Within-instrument: Three-factor (Cognitive-Perceptual, Interpersonal, Disorganized)
// Sources: Raine & Benishay 1995, Compton et al. 2009

const spqbSources: Source[] = [
  { citation: "Raine & Benishay 1995 SPQ-B development", n: 220, value: null },
  { citation: "Compton et al. 2009 SPQ-B CFA 3-factor", n: 825, value: null },
];

// All three SPQ-B factors map to SZTY
const spqb_SZTY = expand({
  instrument: "SPQ-B", dimension: "SZTY", γ: 0.85, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "SMALL_STUDY", sources: spqbSources,
  notes: "SPQ-B directly measures schizotypal personality traits across all three factors. Loadings from Compton et al. 2009 (N=825).",
  λ: {
    // Interpersonal factor (social anxiety, suspiciousness, constricted affect)
    1: 0.55,   // aloof/distant
    7: 0.54,   // guard with friends
    9: 0.52,   // hidden threats
    10: 0.49,  // people watching
    11: 0.63,  // uncomfortable unfamiliar
    14: 0.48,  // don't share
    15: 0.55,  // background
    17: 0.56,  // eye out
    18: 0.57,  // can't get close
    21: 0.59,  // uneasy talking
    22: 0.51,  // keep feelings
    // Cognitive-Perceptual factor (magical thinking, unusual perceptions)
    2: 0.58,   // presence/force
    4: 0.54,   // others know thoughts
    5: 0.47,   // special signs
    12: 0.44,  // astrology/ESP
    16: 0.50,  // distant sounds
    // Disorganized factor (odd behavior, odd speech)
    3: 0.56,   // unusual mannerisms
    6: 0.62,   // bizarre person
    8: 0.49,   // vague/elusive
    13: 0.53,  // unusual word use
    19: 0.64,  // odd person
    20: 0.58,  // hard to communicate
  },
});

// Interpersonal items also cross-load onto SZOD
const spqb_SZOD = expand({
  instrument: "SPQ-B", dimension: "SZOD", γ: 0.40, isPrimary: false,
  derivationMethod: "ESTIMATED", sourceQuality: "ESTIMATED", sources: spqbSources,
  notes: "Estimated cross-loading: interpersonal deficit items also index schizoid withdrawal.",
  λ: {
    1: 0.55, 7: 0.54, 11: 0.63, 14: 0.48, 15: 0.55, 18: 0.57, 21: 0.59, 22: 0.51,
  },
});

// ─── AQ-10 → ASD ─────────────────────────────────────────────────────────────
// Within-instrument: Unidimensional or two-factor
// Sources: Allison et al. 2012, Booth et al. 2013

const aq10Sources: Source[] = [
  { citation: "Allison et al. 2012 AQ-10 development", n: 4000, value: null },
  { citation: "Booth et al. 2013 AQ factor structure", n: 2343, value: null },
];

const aq10_ASD = expand({
  instrument: "AQ-10", dimension: "ASD", γ: 0.85, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: aq10Sources,
  notes: "AQ-10 directly screens for autism-spectrum features.",
  λ: {
    1: 0.58,   // small sounds (sensory)
    2: 0.62,   // whole vs detail (reverse)
    3: 0.55,   // multitask (reverse)
    4: 0.52,   // switch back (reverse)
    5: 0.70,   // read between lines (reverse)
    6: 0.68,   // detect boredom (reverse)
    7: 0.72,   // character intentions
    8: 0.48,   // collect info
    9: 0.74,   // read face (reverse)
    10: 0.71,  // work out intentions
  },
});

// ─── CDS-2 → DPDR ───────────────────────────────────────────────────────────
// Within-instrument: Unidimensional (2 items)
// Sources: Sierra & Berrios 2000

const cds2Sources: Source[] = [
  { citation: "Sierra & Berrios 2000 Cambridge Depersonalization Scale", n: 204, value: null },
];

const cds2_DPDR = expand({
  instrument: "CDS-2", dimension: "DPDR", γ: 0.90, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "SMALL_STUDY", sources: cds2Sources,
  notes: "CDS-2 screener items directly assess depersonalization/derealization.",
  λ: {
    1: 0.82,   // feel strange/cut off
    2: 0.80,   // flat/lifeless visual
  },
});

// ─── PID-5-BF → NARC, BPD, SZOD, AVPD, ASPD, SZTY ──────────────────────────
// Within-instrument: Five-factor (NegAffect, Detachment, Antagonism, Disinhibition, Psychoticism)
// Sources: Krueger et al. 2012, Bach et al. 2016

const pid5bfSources: Source[] = [
  { citation: "Krueger et al. 2012 PID-5 development", n: 2461, value: null },
  { citation: "Bach et al. 2016 PID-5-BF CFA clinical", n: 1590, value: null },
  { citation: "Zhang et al. 2021 PID-5-BF CFA Chinese", n: 7155, value: null },
];

// Negative Affect domain (items 1-5) → BPD
const pid5bf_BPD = expand({
  instrument: "PID-5-BF", dimension: "BPD", γ: 0.80, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: pid5bfSources,
  notes: "PID-5-BF Negative Affect domain maps to borderline emotional dysregulation.",
  λ: {
    1: 0.62,   // worry about everything
    2: 0.68,   // emotional over everything
    3: 0.50,   // fear being alone
    4: 0.48,   // stuck on one way
    5: 0.58,   // irritable
  },
});

// Detachment domain (items 6-10) → SZOD (primary), AVPD (secondary)
const pid5bf_SZOD = expand({
  instrument: "PID-5-BF", dimension: "SZOD", γ: 0.75, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: pid5bfSources,
  notes: "PID-5-BF Detachment domain maps to schizoid features (emotional withdrawal).",
  λ: {
    6: 0.65,   // don't get close
    7: 0.52,   // don't care about hurting (also antagonism)
    8: 0.58,   // don't care what happens
    9: 0.60,   // steer clear of romance
    10: 0.68,  // not interested in friends
  },
});

const pid5bf_AVPD = expand({
  instrument: "PID-5-BF", dimension: "AVPD", γ: 0.55, isPrimary: false,
  derivationMethod: "ESTIMATED", sourceQuality: "ESTIMATED", sources: pid5bfSources,
  notes: "Estimated cross-loading: detachment items also partially index avoidant features.",
  λ: { 6: 0.65, 9: 0.60, 10: 0.68 },
});

// Antagonism domain (items 11-15) → NARC
const pid5bf_NARC = expand({
  instrument: "PID-5-BF", dimension: "NARC", γ: 0.85, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: pid5bfSources,
  notes: "PID-5-BF Antagonism domain maps to narcissistic features.",
  λ: {
    11: 0.58,  // crave attention
    12: 0.62,  // less important people
    13: 0.65,  // use people
    14: 0.60,  // take advantage
    15: 0.55,  // better than everyone
  },
});

// Disinhibition domain (items 16-20) → ASPD
const pid5bf_ASPD = expand({
  instrument: "PID-5-BF", dimension: "ASPD", γ: 0.75, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: pid5bfSources,
  notes: "PID-5-BF Disinhibition domain maps to antisocial/conduct features.",
  λ: {
    16: 0.50,  // nothing matters (also detachment)
    17: 0.60,  // irresponsible
    18: 0.56,  // not good at planning
    19: 0.62,  // reckless
    20: 0.58,  // act on impulse
  },
});

// Psychoticism domain (items 21-25) → SZTY (primary), CHR (secondary)
const pid5bf_SZTY = expand({
  instrument: "PID-5-BF", dimension: "SZTY", γ: 0.70, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: pid5bfSources,
  notes: "PID-5-BF Psychoticism domain maps to schizotypal features.",
  λ: {
    21: 0.64,  // objects different shape
    22: 0.68,  // sensing presence
    23: 0.58,  // vivid dream images
    24: 0.62,  // zone out
    25: 0.66,  // things feel unreal
  },
});

const pid5bf_CHR = expand({
  instrument: "PID-5-BF", dimension: "CHR", γ: 0.45, isPrimary: false,
  derivationMethod: "ESTIMATED", sourceQuality: "ESTIMATED", sources: pid5bfSources,
  notes: "Estimated cross-loading: psychoticism items also index clinical high risk.",
  λ: { 21: 0.64, 22: 0.68, 25: 0.66 },
});

// ─── WI-7 → IAD ──────────────────────────────────────────────────────────────
// Within-instrument: Unidimensional
// Sources: Pilowsky 1967, Conradt et al. 2006

const wi7Sources: Source[] = [
  { citation: "Pilowsky 1967 Whiteley Index original", n: null, value: null },
  { citation: "Conradt et al. 2006 WI-7 CFA", n: 5445, value: null },
];

const wi7_IAD = expand({
  instrument: "WI-7", dimension: "IAD", γ: 0.90, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: wi7Sources,
  notes: "WI-7 directly measures illness anxiety / hypochondriasis.",
  λ: {
    1: 0.75,   // worry about health
    2: 0.72,   // something wrong
    3: 0.65,   // can't forget self
    4: 0.58,   // annoyed if told better
    5: 0.78,   // serious illness worry
    6: 0.70,   // worry about getting disease
    7: 0.68,   // many symptoms
  },
});

// ─── HRS-SR → HOA ────────────────────────────────────────────────────────────
// Within-instrument: Unidimensional
// Sources: Tolin et al. 2010

const hrssrSources: Source[] = [
  { citation: "Tolin et al. 2010 HRS development and validation", n: 226, value: null },
];

const hrssr_HOA = expand({
  instrument: "HRS-SR", dimension: "HOA", γ: 0.95, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "SMALL_STUDY", sources: hrssrSources,
  notes: "HRS-SR directly measures hoarding disorder symptoms.",
  λ: {
    1: 0.78,   // clutter difficulty
    2: 0.82,   // difficulty discarding
    3: 0.70,   // excessive acquiring
    4: 0.72,   // emotional distress
    5: 0.75,   // life impairment
  },
});

// ─── BDDQ → BDD ─────────────────────────────────────────────────────────────
// Within-instrument: Unidimensional
// Sources: Phillips 2005

const bddqSources: Source[] = [
  { citation: "Phillips 2005 BDDQ development", n: null, value: null },
];

const bddq_BDD = expand({
  instrument: "BDDQ", dimension: "BDD", γ: 0.90, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "SMALL_STUDY", sources: bddqSources,
  notes: "BDDQ directly screens for body dysmorphic disorder.",
  λ: {
    1: 0.80,   // concerned about appearance
    2: 0.65,   // thinness concern
    3: 0.78,   // time thinking
    4: 0.75,   // distress from defects
  },
});

// ─── SCOFF → AN ──────────────────────────────────────────────────────────────
// Within-instrument: Unidimensional
// Sources: Morgan et al. 1999, Garcia-Campayo et al. 2005

const scoffSources: Source[] = [
  { citation: "Morgan et al. 1999 SCOFF development", n: 212, value: null },
  { citation: "Garcia-Campayo et al. 2005 SCOFF validation", n: 227, value: null },
];

const scoff_AN = expand({
  instrument: "SCOFF", dimension: "AN", γ: 0.85, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "SMALL_STUDY", sources: scoffSources,
  notes: "SCOFF screens for eating disorders; maps primarily to anorexia/restrictive eating.",
  λ: {
    1: 0.68,   // make yourself sick
    2: 0.72,   // lost control
    3: 0.65,   // weight loss
    4: 0.70,   // believe fat
    5: 0.74,   // food dominates
  },
});

// ─── BEDS-7 → BED ────────────────────────────────────────────────────────────
// Within-instrument: Unidimensional
// Sources: Herman et al. 2016

const beds7Sources: Source[] = [
  { citation: "Herman et al. 2016 BEDS-7 development and validation", n: 452, value: null },
];

const beds7_BED = expand({
  instrument: "BEDS-7", dimension: "BED", γ: 0.90, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "SMALL_STUDY", sources: beds7Sources,
  notes: "BEDS-7 directly screens for binge eating disorder.",
  λ: {
    1: 0.80,   // excessive overeating
    2: 0.82,   // out of control
    3: 0.75,   // ate rapidly
    4: 0.72,   // uncomfortably full
    5: 0.70,   // not hungry
    6: 0.65,   // ate alone
    7: 0.68,   // disgusted/guilty
  },
});

// ─── PGSI → GAMB ─────────────────────────────────────────────────────────────
// Within-instrument: Unidimensional
// Sources: Ferris & Wynne 2001, Holtgraves 2009

const pgsiSources: Source[] = [
  { citation: "Ferris & Wynne 2001 PGSI development", n: 3120, value: null },
  { citation: "Holtgraves 2009 PGSI CFA", n: 453, value: null },
];

const pgsi_GAMB = expand({
  instrument: "PGSI", dimension: "GAMB", γ: 0.95, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: pgsiSources,
  notes: "PGSI directly measures problem gambling severity.",
  λ: {
    1: 0.75,   // bet more than afford
    2: 0.78,   // need larger amounts
    3: 0.72,   // chasing losses
    4: 0.68,   // borrow/sell
    5: 0.80,   // feel problem
    6: 0.65,   // health problems
    7: 0.62,   // criticized
    8: 0.70,   // financial problems
    9: 0.68,   // felt guilty
  },
});

// ─── HCL-32 → BP2 ───────────────────────────────────────────────────────────
// Within-instrument: Two-factor (Active/Elated + Risk-taking/Irritable)
// Sources: Angst et al. 2005, Forty et al. 2010

const hcl32Sources: Source[] = [
  { citation: "Angst et al. 2005 HCL-32 development", n: 1565, value: null },
  { citation: "Forty et al. 2010 HCL-32 CFA", n: 567, value: null },
];

const hcl32_BP2 = expand({
  instrument: "HCL-32", dimension: "BP2", γ: 0.85, isPrimary: true,
  derivationMethod: "CHAINED", sourceQuality: "LARGE_STUDY", sources: hcl32Sources,
  notes: "HCL-32 is designed to detect hypomania → Bipolar II (superior sensitivity to MDQ for BP2).",
  λ: {
    // Factor 1: Active/Elated
    1: 0.58,   // less sleep
    2: 0.65,   // more energetic
    3: 0.62,   // more self-confident
    4: 0.55,   // enjoy work more
    5: 0.60,   // more sociable
    6: 0.48,   // want to travel
    10: 0.55,  // physically active
    11: 0.52,  // plan more
    12: 0.58,  // more ideas
    13: 0.56,  // less shy
    14: 0.45,  // colorful clothes
    15: 0.54,  // meet more people
    18: 0.62,  // talk more
    19: 0.60,  // think faster
    20: 0.50,  // more jokes
    24: 0.52,  // things easier
    28: 0.58,  // higher mood
    // Factor 2: Risk-taking/Irritable
    7: 0.65,   // drive faster
    8: 0.68,   // spend more
    9: 0.66,   // take more risks
    16: 0.55,  // more interested in sex
    17: 0.58,  // more sexually active
    22: 0.60,  // new things
    25: 0.64,  // more impatient
    26: 0.62,  // exhausting for others
    27: 0.66,  // more quarrels
    // Weaker / mixed items
    21: 0.50,  // easily distracted
    23: 0.52,  // thoughts jump
    29: 0.38,  // more coffee
    30: 0.36,  // more cigarettes
    31: 0.42,  // more alcohol
    32: 0.40,  // more drugs
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const itemLoadings: ItemLoadingDef[] = [
  // ── Tier 1: Spectra ──
  ...phq9_DIS, ...phq9_SOM, ...phq9_DET,
  ...gad7_DIS, ...gad7_FEA,
  ...phq15_SOM, ...phq15_FEA, ...phq15_DIS,
  ...pcptsd5_DIS, ...pcptsd5_FEA, ...pcptsd5_DET,
  ...auditc_DEX,
  ...who5_DIS, ...who5_DET,
  // ── Tier 2: Conditions ──
  ...pcl5_PTSD,
  ...ybocs_OCD,
  ...cape42pos_SCZ, ...cape42pos_CHR, ...cape42pos_SZTY,
  ...cape42neg_SZOD, ...cape42neg_SZTY,
  ...cape42dep_BP2,
  ...audit_AUD,
  ...dast10_DUD,
  ...mdq_BP1,
  ...asrs_ADHD,
  ...spin_SAD,
  ...pq16_CHR,
  ...phqPanic_PAN,
  ...spqb_SZTY, ...spqb_SZOD,
  ...aq10_ASD,
  ...cds2_DPDR,
  ...pid5bf_BPD, ...pid5bf_SZOD, ...pid5bf_AVPD, ...pid5bf_NARC, ...pid5bf_ASPD, ...pid5bf_SZTY, ...pid5bf_CHR,
  ...wi7_IAD,
  ...hrssr_HOA,
  ...bddq_BDD,
  ...scoff_AN,
  ...beds7_BED,
  ...pgsi_GAMB,
  ...hcl32_BP2,
];
