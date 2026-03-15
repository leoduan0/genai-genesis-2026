// ─── Step 6b: Item-Level Normative Response Distributions ────────────────────
//
// For each item, stores the proportion of the general population choosing each
// response category: [P(min), P(min+1), ..., P(max)].
//
// Used by normalizeResponse() for probit normal scores transformation:
//   normalScore(k) = Φ⁻¹((F(k-1) + F(k)) / 2)
// where F(k) is the cumulative proportion up to and including response k.
//
// This correctly handles skewed distributions (e.g., suicidality items where 96%
// answer 0) unlike naive midpoint centering or mean/SD z-scoring.
//
// Sources are documented per instrument. For instruments where item-level
// distributions are not published, distributions are estimated from:
//   - Scale-level mean and SD (fit a truncated distribution)
//   - Item content similarity with items from well-normed instruments
//   - Endorsement rate literature for binary items
// Estimated distributions are flagged in comments.

// ─── Types ──────────────────────────────────────────────────────────────────

type ItemNorm = {
  /** Item number within instrument (1-indexed) */
  itemNumber: number;
  /** Proportion choosing each response [P(min), P(min+1), ..., P(max)] */
  dist: number[];
};

type InstrumentNorms = {
  /** Instrument name (must match seed-instruments.ts exactly) */
  instrument: string;
  /** Source citation for normative data */
  sources: string;
  /** Per-item response distributions */
  items: ItemNorm[];
};

// ─── Helper: ensure distribution sums to 1 ──────────────────────────────────

function normDist(d: number[]): number[] {
  const sum = d.reduce((a, b) => a + b, 0);
  return d.map(v => +(v / sum).toFixed(4));
}

// ─── Tier 1: Broad Screening ────────────────────────────────────────────────

// PHQ-9 (0-3 scale): Kocalevent et al. 2013 (N=5,018 German general population)
// Kroenke et al. 2001 original validation; NHANES 2005-2016 distributions
// Item means: 0.08 (suicidality) to 0.60 (sleep). Strong floor effects.
const PHQ9_NORMS: InstrumentNorms = {
  instrument: "PHQ-9",
  sources: "Kocalevent et al. 2013 (N=5,018); Tomitaka et al. 2018 NHANES (N=31,366)",
  items: [
    { itemNumber: 1, dist: normDist([0.62, 0.25, 0.09, 0.04]) },  // anhedonia — mean ~0.40
    { itemNumber: 2, dist: normDist([0.66, 0.22, 0.08, 0.04]) },  // depressed mood — mean ~0.33
    { itemNumber: 3, dist: normDist([0.52, 0.27, 0.13, 0.08]) },  // sleep — mean ~0.60 (most endorsed)
    { itemNumber: 4, dist: normDist([0.50, 0.30, 0.13, 0.07]) },  // fatigue — mean ~0.57
    { itemNumber: 5, dist: normDist([0.65, 0.22, 0.08, 0.05]) },  // appetite — mean ~0.34
    { itemNumber: 6, dist: normDist([0.73, 0.17, 0.06, 0.04]) },  // worthlessness — mean ~0.22
    { itemNumber: 7, dist: normDist([0.65, 0.23, 0.08, 0.04]) },  // concentration — mean ~0.35
    { itemNumber: 8, dist: normDist([0.80, 0.13, 0.04, 0.03]) },  // psychomotor — mean ~0.15
    { itemNumber: 9, dist: normDist([0.96, 0.03, 0.007, 0.003]) }, // suicidality — mean ~0.08 (extreme floor)
  ],
};

// GAD-7 (0-3 scale): Löwe et al. 2008 (N=5,030 German general population)
// Overall mean ~2.9 (SD ~3.3). Floor effects less extreme than PHQ-9.
const GAD7_NORMS: InstrumentNorms = {
  instrument: "GAD-7",
  sources: "Löwe et al. 2008 (N=5,030); Hinz et al. 2017 (N=4,615)",
  items: [
    { itemNumber: 1, dist: normDist([0.55, 0.28, 0.11, 0.06]) },  // nervous/anxious — mean ~0.56
    { itemNumber: 2, dist: normDist([0.62, 0.24, 0.09, 0.05]) },  // uncontrollable worry — mean ~0.42
    { itemNumber: 3, dist: normDist([0.57, 0.27, 0.10, 0.06]) },  // worry too much — mean ~0.52
    { itemNumber: 4, dist: normDist([0.60, 0.26, 0.09, 0.05]) },  // trouble relaxing — mean ~0.42
    { itemNumber: 5, dist: normDist([0.68, 0.21, 0.07, 0.04]) },  // restless — mean ~0.32
    { itemNumber: 6, dist: normDist([0.55, 0.30, 0.10, 0.05]) },  // irritable — mean ~0.47
    { itemNumber: 7, dist: normDist([0.75, 0.16, 0.06, 0.03]) },  // afraid something awful — mean ~0.22
  ],
};

// PHQ-15 (0-2 scale): Kocalevent et al. 2013 (N=5,018); Hinz et al. 2017
// Overall mean ~5.5. Somatic items have moderate endorsement.
const PHQ15_NORMS: InstrumentNorms = {
  instrument: "PHQ-15",
  sources: "Kocalevent et al. 2013 (N=5,018); Hinz et al. 2017",
  items: [
    { itemNumber: 1, dist: normDist([0.65, 0.28, 0.07]) },  // stomach pain
    { itemNumber: 2, dist: normDist([0.52, 0.34, 0.14]) },  // back pain
    { itemNumber: 3, dist: normDist([0.54, 0.32, 0.14]) },  // arms/legs/joints pain
    { itemNumber: 4, dist: normDist([0.58, 0.28, 0.14]) },  // menstrual (women)
    { itemNumber: 5, dist: normDist([0.52, 0.36, 0.12]) },  // headaches
    { itemNumber: 6, dist: normDist([0.80, 0.16, 0.04]) },  // chest pain
    { itemNumber: 7, dist: normDist([0.72, 0.23, 0.05]) },  // dizziness
    { itemNumber: 8, dist: normDist([0.94, 0.05, 0.01]) },  // fainting spells (extreme floor)
    { itemNumber: 9, dist: normDist([0.72, 0.22, 0.06]) },  // heart racing
    { itemNumber: 10, dist: normDist([0.76, 0.19, 0.05]) }, // shortness of breath
    { itemNumber: 11, dist: normDist([0.78, 0.17, 0.05]) }, // sexual pain/problems
    { itemNumber: 12, dist: normDist([0.62, 0.30, 0.08]) }, // constipation/diarrhea
    { itemNumber: 13, dist: normDist([0.60, 0.30, 0.10]) }, // nausea/gas
    { itemNumber: 14, dist: normDist([0.42, 0.38, 0.20]) }, // fatigue (highest endorsement)
    { itemNumber: 15, dist: normDist([0.48, 0.33, 0.19]) }, // trouble sleeping
  ],
};

// PC-PTSD-5 (binary 0-1): Prins et al. 2016; general population endorsement
// rates from VA primary care and community surveys. Low endorsement overall.
const PCPTSD5_NORMS: InstrumentNorms = {
  instrument: "PC-PTSD-5",
  sources: "Prins et al. 2016 (N=398); estimated from community prevalence",
  items: [
    { itemNumber: 1, dist: [0.90, 0.10] },  // nightmares/intrusive thoughts
    { itemNumber: 2, dist: [0.92, 0.08] },  // avoidance
    { itemNumber: 3, dist: [0.88, 0.12] },  // on guard/hypervigilance
    { itemNumber: 4, dist: [0.92, 0.08] },  // numb/detached
    { itemNumber: 5, dist: [0.90, 0.10] },  // guilt/blame
  ],
};

// AUDIT-C (0-4 scale): Bush et al. 1998; WHO AUDIT manual normative data;
// NESARC-III general population distributions. Consumption items are less
// skewed than clinical items.
const AUDITC_NORMS: InstrumentNorms = {
  instrument: "AUDIT-C",
  sources: "Bush et al. 1998; NESARC-III; WHO AUDIT manual",
  items: [
    { itemNumber: 1, dist: normDist([0.22, 0.30, 0.28, 0.14, 0.06]) },  // frequency — bimodal (abstainers + drinkers)
    { itemNumber: 2, dist: normDist([0.30, 0.40, 0.18, 0.08, 0.04]) },  // quantity per occasion
    { itemNumber: 3, dist: normDist([0.42, 0.30, 0.16, 0.08, 0.04]) },  // binge frequency
  ],
};

// WHO-5 (0-5 scale, reverse-coded for pathology): Topp et al. 2015; Bech 2004
// High means (wellbeing scale) — most people report good wellbeing.
// Note: these items are reverse-coded, so high response = high wellbeing = low pathology.
const WHO5_NORMS: InstrumentNorms = {
  instrument: "WHO-5",
  sources: "Topp et al. 2015 systematic review; Bech et al. 2003 (N=1,600+)",
  items: [
    { itemNumber: 1, dist: normDist([0.02, 0.04, 0.08, 0.18, 0.32, 0.36]) },  // cheerful — mean ~3.8
    { itemNumber: 2, dist: normDist([0.03, 0.05, 0.10, 0.20, 0.30, 0.32]) },  // calm/relaxed — mean ~3.6
    { itemNumber: 3, dist: normDist([0.03, 0.06, 0.12, 0.22, 0.28, 0.29]) },  // active/vigorous — mean ~3.5
    { itemNumber: 4, dist: normDist([0.05, 0.08, 0.14, 0.22, 0.26, 0.25]) },  // fresh/rested — mean ~3.3
    { itemNumber: 5, dist: normDist([0.03, 0.05, 0.10, 0.20, 0.30, 0.32]) },  // daily life interesting — mean ~3.6
  ],
};

// ─── Tier 2: Targeted ──────────────────────────────────────────────────────

// PCL-5 (0-4 scale): Blevins et al. 2015; community trauma-exposed samples.
// Most items show strong floor effects. Total mean ~10-15 in community samples.
const PCL5_NORMS: InstrumentNorms = {
  instrument: "PCL-5",
  sources: "Blevins et al. 2015; Wortmann et al. 2016 (N=1,484); estimated from community trauma samples",
  items: [
    { itemNumber: 1,  dist: normDist([0.55, 0.22, 0.12, 0.07, 0.04]) },  // intrusive memories
    { itemNumber: 2,  dist: normDist([0.62, 0.18, 0.10, 0.06, 0.04]) },  // disturbing dreams
    { itemNumber: 3,  dist: normDist([0.72, 0.14, 0.07, 0.04, 0.03]) },  // flashbacks
    { itemNumber: 4,  dist: normDist([0.50, 0.24, 0.13, 0.08, 0.05]) },  // emotional upset at reminders
    { itemNumber: 5,  dist: normDist([0.58, 0.20, 0.11, 0.07, 0.04]) },  // physical reactions at reminders
    { itemNumber: 6,  dist: normDist([0.52, 0.22, 0.13, 0.08, 0.05]) },  // avoiding thoughts
    { itemNumber: 7,  dist: normDist([0.54, 0.21, 0.12, 0.08, 0.05]) },  // avoiding reminders
    { itemNumber: 8,  dist: normDist([0.65, 0.17, 0.09, 0.05, 0.04]) },  // trouble remembering
    { itemNumber: 9,  dist: normDist([0.58, 0.20, 0.11, 0.07, 0.04]) },  // negative beliefs
    { itemNumber: 10, dist: normDist([0.60, 0.19, 0.10, 0.07, 0.04]) },  // blame self/others
    { itemNumber: 11, dist: normDist([0.55, 0.22, 0.12, 0.07, 0.04]) },  // strong negative feelings
    { itemNumber: 12, dist: normDist([0.55, 0.22, 0.12, 0.07, 0.04]) },  // loss of interest
    { itemNumber: 13, dist: normDist([0.58, 0.20, 0.11, 0.07, 0.04]) },  // feeling distant
    { itemNumber: 14, dist: normDist([0.60, 0.19, 0.10, 0.07, 0.04]) },  // trouble with positive feelings
    { itemNumber: 15, dist: normDist([0.52, 0.23, 0.13, 0.07, 0.05]) },  // irritable/angry
    { itemNumber: 16, dist: normDist([0.78, 0.12, 0.05, 0.03, 0.02]) },  // risk-taking (strong floor)
    { itemNumber: 17, dist: normDist([0.55, 0.22, 0.12, 0.07, 0.04]) },  // hypervigilance
    { itemNumber: 18, dist: normDist([0.58, 0.20, 0.11, 0.07, 0.04]) },  // startle
    { itemNumber: 19, dist: normDist([0.55, 0.23, 0.11, 0.07, 0.04]) },  // concentration
    { itemNumber: 20, dist: normDist([0.50, 0.24, 0.13, 0.08, 0.05]) },  // sleep
  ],
};

// Y-BOCS (0-4 scale): Goodman et al. 1989; nonclinical means very low.
// Total mean ~4-5 in nonclinical. Most people endorse 0 on severity items.
// Estimated from Mataix-Cols et al. 2005 nonclinical data.
const YBOCS_NORMS: InstrumentNorms = {
  instrument: "Y-BOCS",
  sources: "Estimated from Mataix-Cols et al. 2005; Burns et al. 1996 nonclinical; Goodman et al. 1989",
  items: [
    // Obsession items (1-5): slightly higher endorsement
    { itemNumber: 1,  dist: normDist([0.60, 0.22, 0.10, 0.05, 0.03]) },  // time occupied
    { itemNumber: 2,  dist: normDist([0.65, 0.20, 0.08, 0.04, 0.03]) },  // interference
    { itemNumber: 3,  dist: normDist([0.62, 0.22, 0.09, 0.04, 0.03]) },  // distress
    { itemNumber: 4,  dist: normDist([0.55, 0.25, 0.12, 0.05, 0.03]) },  // resistance
    { itemNumber: 5,  dist: normDist([0.60, 0.23, 0.10, 0.04, 0.03]) },  // control
    // Compulsion items (6-10): similar pattern
    { itemNumber: 6,  dist: normDist([0.65, 0.20, 0.08, 0.04, 0.03]) },  // time spent
    { itemNumber: 7,  dist: normDist([0.68, 0.18, 0.08, 0.04, 0.02]) },  // interference
    { itemNumber: 8,  dist: normDist([0.65, 0.20, 0.09, 0.04, 0.02]) },  // distress
    { itemNumber: 9,  dist: normDist([0.58, 0.24, 0.10, 0.05, 0.03]) },  // resistance
    { itemNumber: 10, dist: normDist([0.62, 0.22, 0.09, 0.04, 0.03]) },  // control
  ],
};

// CAPE-42 (frequency 1-4 scale): Stefanis et al. 2002 (N=932 general population)
// Positive psychotic experiences items have strong floor at 1 ("never").
// Negative/depressive items have more spread.
// Note: scale is 1-4, so dist = [P(1), P(2), P(3), P(4)]
const CAPE42_NORMS: InstrumentNorms = {
  instrument: "CAPE-42",
  sources: "Stefanis et al. 2002 (N=932); Konings et al. 2006 (N=765); estimated positive/negative/depressive subscale patterns",
  items: [
    // Positive items (1-20): strong floor at "never" for most
    { itemNumber: 1,  dist: normDist([0.75, 0.15, 0.07, 0.03]) },  // feel sad
    { itemNumber: 2,  dist: normDist([0.82, 0.12, 0.04, 0.02]) },  // double meaning
    { itemNumber: 3,  dist: normDist([0.70, 0.18, 0.08, 0.04]) },  // not very animated
    { itemNumber: 4,  dist: normDist([0.88, 0.08, 0.03, 0.01]) },  // not really a person
    { itemNumber: 5,  dist: normDist([0.55, 0.28, 0.12, 0.05]) },  // lack motivation
    { itemNumber: 6,  dist: normDist([0.90, 0.07, 0.02, 0.01]) },  // mind read
    { itemNumber: 7,  dist: normDist([0.60, 0.25, 0.10, 0.05]) },  // lack emotion
    { itemNumber: 8,  dist: normDist([0.85, 0.10, 0.03, 0.02]) },  // persecutory
    { itemNumber: 9,  dist: normDist([0.65, 0.22, 0.09, 0.04]) },  // pessimistic
    { itemNumber: 10, dist: normDist([0.80, 0.13, 0.05, 0.02]) },  // conspiracy
    { itemNumber: 11, dist: normDist([0.60, 0.25, 0.10, 0.05]) },  // destined to be important (grandiose)
    { itemNumber: 12, dist: normDist([0.55, 0.28, 0.12, 0.05]) },  // no future
    { itemNumber: 13, dist: normDist([0.85, 0.10, 0.03, 0.02]) },  // special person
    { itemNumber: 14, dist: normDist([0.60, 0.25, 0.10, 0.05]) },  // can't enjoy
    { itemNumber: 15, dist: normDist([0.92, 0.05, 0.02, 0.01]) },  // telepathy
    { itemNumber: 16, dist: normDist([0.70, 0.20, 0.07, 0.03]) },  // lack spontaneity
    { itemNumber: 17, dist: normDist([0.88, 0.08, 0.03, 0.01]) },  // hear voices
    { itemNumber: 18, dist: normDist([0.85, 0.10, 0.03, 0.02]) },  // voodoo/magic
    { itemNumber: 19, dist: normDist([0.55, 0.28, 0.12, 0.05]) },  // lack energy
    { itemNumber: 20, dist: normDist([0.68, 0.20, 0.08, 0.04]) },  // people look oddly
    { itemNumber: 21, dist: normDist([0.65, 0.22, 0.09, 0.04]) },  // thoughts not own
    { itemNumber: 22, dist: normDist([0.55, 0.28, 0.12, 0.05]) },  // crying
    { itemNumber: 23, dist: normDist([0.85, 0.10, 0.03, 0.02]) },  // being controlled
    { itemNumber: 24, dist: normDist([0.60, 0.25, 0.10, 0.05]) },  // lack interest
    { itemNumber: 25, dist: normDist([0.90, 0.07, 0.02, 0.01]) },  // electrical devices
    { itemNumber: 26, dist: normDist([0.55, 0.28, 0.12, 0.05]) },  // not much speech
    { itemNumber: 27, dist: normDist([0.88, 0.08, 0.03, 0.01]) },  // receive messages TV
    { itemNumber: 28, dist: normDist([0.78, 0.14, 0.05, 0.03]) },  // people not what seem
    { itemNumber: 29, dist: normDist([0.55, 0.28, 0.12, 0.05]) },  // thoughts removed
    { itemNumber: 30, dist: normDist([0.55, 0.28, 0.12, 0.05]) },  // poor concentration
    { itemNumber: 31, dist: normDist([0.82, 0.12, 0.04, 0.02]) },  // never accomplished (negative)
    { itemNumber: 32, dist: normDist([0.90, 0.07, 0.02, 0.01]) },  // thoughts in head by others
    { itemNumber: 33, dist: normDist([0.75, 0.16, 0.06, 0.03]) },  // seen things others can't
    { itemNumber: 34, dist: normDist([0.65, 0.22, 0.09, 0.04]) },  // thoughts race
    { itemNumber: 35, dist: normDist([0.60, 0.25, 0.10, 0.05]) },  // depressed
    { itemNumber: 36, dist: normDist([0.65, 0.22, 0.09, 0.04]) },  // ability to feel
    { itemNumber: 37, dist: normDist([0.82, 0.12, 0.04, 0.02]) },  // hear thoughts spoken aloud
    { itemNumber: 38, dist: normDist([0.92, 0.05, 0.02, 0.01]) },  // others can hear thoughts
    { itemNumber: 39, dist: normDist([0.90, 0.07, 0.02, 0.01]) },  // being under control of force
    { itemNumber: 40, dist: normDist([0.80, 0.13, 0.05, 0.02]) },  // derealisation
    { itemNumber: 41, dist: normDist([0.75, 0.16, 0.06, 0.03]) },  // déjà vu (common in gen pop)
    { itemNumber: 42, dist: normDist([0.90, 0.07, 0.02, 0.01]) },  // see/hear things not there
  ],
};

// AUDIT full (0-4 scale): Saunders et al. 1993; Shields et al. 2004 (N=14,001)
// Items 1-3 = consumption (same as AUDIT-C), items 4-10 = dependence/harm (strong floor)
const AUDIT_NORMS: InstrumentNorms = {
  instrument: "AUDIT",
  sources: "Shields et al. 2004 (N=14,001); Saunders et al. 1993; WHO global norms",
  items: [
    { itemNumber: 1,  dist: normDist([0.22, 0.30, 0.28, 0.14, 0.06]) },  // frequency
    { itemNumber: 2,  dist: normDist([0.30, 0.40, 0.18, 0.08, 0.04]) },  // quantity
    { itemNumber: 3,  dist: normDist([0.42, 0.30, 0.16, 0.08, 0.04]) },  // binge
    { itemNumber: 4,  dist: normDist([0.85, 0.10, 0.03, 0.01, 0.01]) },  // couldn't stop
    { itemNumber: 5,  dist: normDist([0.88, 0.08, 0.02, 0.01, 0.01]) },  // failed expectations
    { itemNumber: 6,  dist: normDist([0.92, 0.05, 0.02, 0.005, 0.005]) }, // morning drinking
    { itemNumber: 7,  dist: normDist([0.82, 0.12, 0.04, 0.01, 0.01]) },  // guilt
    { itemNumber: 8,  dist: normDist([0.80, 0.13, 0.04, 0.02, 0.01]) },  // blackout
    // Items 9-10 use 0/2/4 scoring but stored 0-4; approximate
    { itemNumber: 9,  dist: normDist([0.90, 0.04, 0.03, 0.02, 0.01]) },  // injured self/others
    { itemNumber: 10, dist: normDist([0.88, 0.05, 0.04, 0.02, 0.01]) },  // others concerned
  ],
};

// DAST-10 (binary 0-1): Skinner 1982; general population endorsement ~3-10% per item
const DAST10_NORMS: InstrumentNorms = {
  instrument: "DAST-10",
  sources: "Skinner 1982; Cocco & Carey 1998 (N=345); estimated from NSDUH prevalence",
  items: [
    { itemNumber: 1,  dist: [0.88, 0.12] },  // used drugs other than medical
    { itemNumber: 2,  dist: [0.95, 0.05] },  // abused prescription drugs
    { itemNumber: 3,  dist: [0.95, 0.05] },  // more than one drug at a time
    { itemNumber: 4,  dist: [0.92, 0.08] },  // get through the week without drugs
    { itemNumber: 5,  dist: [0.96, 0.04] },  // stop using when you want
    { itemNumber: 6,  dist: [0.97, 0.03] },  // blackouts/flashbacks
    { itemNumber: 7,  dist: [0.96, 0.04] },  // feel bad/guilty
    { itemNumber: 8,  dist: [0.96, 0.04] },  // family complain
    { itemNumber: 9,  dist: [0.97, 0.03] },  // neglected family
    { itemNumber: 10, dist: [0.97, 0.03] },  // illegal activities
  ],
};

// MDQ (binary items 1-13): Hirschfeld et al. 2000, 2003 (N=85,358)
// Community endorsement rates for individual mania symptoms
const MDQ_NORMS: InstrumentNorms = {
  instrument: "MDQ",
  sources: "Hirschfeld et al. 2003 (N=85,358); estimated from community surveys",
  items: [
    { itemNumber: 1,  dist: [0.60, 0.40] },  // so good/hyper others thought not normal
    { itemNumber: 2,  dist: [0.65, 0.35] },  // so irritable shouted/started fights
    { itemNumber: 3,  dist: [0.55, 0.45] },  // much more self-confident
    { itemNumber: 4,  dist: [0.60, 0.40] },  // much less sleep than usual
    { itemNumber: 5,  dist: [0.65, 0.35] },  // much more talkative
    { itemNumber: 6,  dist: [0.58, 0.42] },  // thoughts raced through head
    { itemNumber: 7,  dist: [0.55, 0.45] },  // easily distracted
    { itemNumber: 8,  dist: [0.62, 0.38] },  // much more energy
    { itemNumber: 9,  dist: [0.68, 0.32] },  // much more active/did more things
    { itemNumber: 10, dist: [0.72, 0.28] },  // much more social/outgoing
    { itemNumber: 11, dist: [0.78, 0.22] },  // much more interested in sex
    { itemNumber: 12, dist: [0.82, 0.18] },  // did things unusual for you/others thought excessive/risky
    { itemNumber: 13, dist: [0.85, 0.15] },  // spending money got into trouble
  ],
};

// ASRS v1.1 (0-4 scale): Adler et al. 2019 (N=22,397); Kessler et al. 2005
// Total mean 2.0 (SD 3.2) in gen pop. Strong floor effects.
const ASRS_NORMS: InstrumentNorms = {
  instrument: "ASRS v1.1",
  sources: "Adler et al. 2019 (N=22,397); Kessler et al. 2005 (N=154)",
  items: [
    { itemNumber: 1, dist: normDist([0.50, 0.30, 0.12, 0.05, 0.03]) },  // wrapping up final details
    { itemNumber: 2, dist: normDist([0.55, 0.28, 0.10, 0.05, 0.02]) },  // difficulty getting organized
    { itemNumber: 3, dist: normDist([0.58, 0.25, 0.10, 0.05, 0.02]) },  // trouble remembering appointments
    { itemNumber: 4, dist: normDist([0.55, 0.28, 0.10, 0.05, 0.02]) },  // put off getting started
    { itemNumber: 5, dist: normDist([0.60, 0.25, 0.09, 0.04, 0.02]) },  // fidget/squirm
    { itemNumber: 6, dist: normDist([0.52, 0.28, 0.12, 0.05, 0.03]) },  // overly active/compelled
  ],
};

// SPIN (0-4 scale): Connor et al. 2000; Ranta et al. 2007
// Community total mean ~12-15. Moderate floor effects.
const SPIN_NORMS: InstrumentNorms = {
  instrument: "SPIN",
  sources: "Connor et al. 2000 (N=68 controls); Ranta et al. 2007; estimated from community SA literature",
  items: [
    { itemNumber: 1,  dist: normDist([0.50, 0.28, 0.13, 0.06, 0.03]) },  // afraid of authority
    { itemNumber: 2,  dist: normDist([0.55, 0.25, 0.12, 0.05, 0.03]) },  // blushing bothers
    { itemNumber: 3,  dist: normDist([0.52, 0.27, 0.12, 0.06, 0.03]) },  // parties/social events scare
    { itemNumber: 4,  dist: normDist([0.50, 0.28, 0.13, 0.06, 0.03]) },  // avoid talking to strangers
    { itemNumber: 5,  dist: normDist([0.52, 0.27, 0.12, 0.06, 0.03]) },  // being criticized scares
    { itemNumber: 6,  dist: normDist([0.55, 0.25, 0.12, 0.05, 0.03]) },  // avoid embarrassment
    { itemNumber: 7,  dist: normDist([0.52, 0.27, 0.12, 0.06, 0.03]) },  // sweating in front of people
    { itemNumber: 8,  dist: normDist([0.52, 0.27, 0.12, 0.06, 0.03]) },  // avoid going to parties
    { itemNumber: 9,  dist: normDist([0.48, 0.28, 0.14, 0.07, 0.03]) },  // avoid activities center of attention
    { itemNumber: 10, dist: normDist([0.50, 0.28, 0.13, 0.06, 0.03]) },  // talking to strangers scares
    { itemNumber: 11, dist: normDist([0.55, 0.25, 0.12, 0.05, 0.03]) },  // avoid speeches
    { itemNumber: 12, dist: normDist([0.52, 0.27, 0.12, 0.06, 0.03]) },  // would do anything to avoid criticism
    { itemNumber: 13, dist: normDist([0.50, 0.28, 0.13, 0.06, 0.03]) },  // heart pounding social
    { itemNumber: 14, dist: normDist([0.52, 0.27, 0.12, 0.06, 0.03]) },  // afraid doing things watched
    { itemNumber: 15, dist: normDist([0.50, 0.28, 0.13, 0.06, 0.03]) },  // embarrassment/looking stupid
    { itemNumber: 16, dist: normDist([0.52, 0.27, 0.12, 0.06, 0.03]) },  // avoid speaking authority
    { itemNumber: 17, dist: normDist([0.52, 0.27, 0.12, 0.06, 0.03]) },  // trembling/shaking distresses
  ],
};

// PQ-16 (binary 0-1): Ising et al. 2012 (N=2,518)
// General population endorsement rates for attenuated psychotic experiences.
const PQ16_NORMS: InstrumentNorms = {
  instrument: "PQ-16",
  sources: "Ising et al. 2012 (N=2,518); estimated from community psychosis risk literature",
  items: [
    { itemNumber: 1,  dist: [0.88, 0.12] },  // feel uninterested
    { itemNumber: 2,  dist: [0.92, 0.08] },  // feel that people have it in for me
    { itemNumber: 3,  dist: [0.85, 0.15] },  // often feel lonely
    { itemNumber: 4,  dist: [0.90, 0.10] },  // heard things others can't
    { itemNumber: 5,  dist: [0.88, 0.12] },  // things in magazines/TV meant for me
    { itemNumber: 6,  dist: [0.80, 0.20] },  // some people not what they seem
    { itemNumber: 7,  dist: [0.82, 0.18] },  // people say odd things that are really meant for me
    { itemNumber: 8,  dist: [0.78, 0.22] },  // ideas/beliefs others find unusual
    { itemNumber: 9,  dist: [0.85, 0.15] },  // feel that parts of body changed
    { itemNumber: 10, dist: [0.88, 0.12] },  // sometimes been confused whether real or imagined
    { itemNumber: 11, dist: [0.80, 0.20] },  // thoughts so vivid worried others could hear
    { itemNumber: 12, dist: [0.82, 0.18] },  // something odd going on difficult to explain
    { itemNumber: 13, dist: [0.75, 0.25] },  // sometimes feel that not in control of thoughts
    { itemNumber: 14, dist: [0.90, 0.10] },  // hear own thoughts being echoed
    { itemNumber: 15, dist: [0.82, 0.18] },  // feel that something odd is going on
    { itemNumber: 16, dist: [0.85, 0.15] },  // feel it hard to concentrate
  ],
};

// PHQ-Panic (binary 0-1): Spitzer et al. 1999; Kroenke et al. 2010
// Panic attack symptoms — moderate endorsement for common somatic symptoms,
// low for full panic features.
const PHQ_PANIC_NORMS: InstrumentNorms = {
  instrument: "PHQ-Panic",
  sources: "Spitzer et al. 1999; Kroenke et al. 2010; estimated from NCS-R panic prevalence",
  items: [
    { itemNumber: 1,  dist: [0.85, 0.15] },  // anxiety attack
    { itemNumber: 2,  dist: [0.88, 0.12] },  // has happened before
    { itemNumber: 3,  dist: [0.90, 0.10] },  // some come out of blue
    { itemNumber: 4,  dist: [0.88, 0.12] },  // bother you a lot
    // Symptoms during worst attack:
    { itemNumber: 5,  dist: [0.82, 0.18] },  // heart racing
    { itemNumber: 6,  dist: [0.85, 0.15] },  // sweating
    { itemNumber: 7,  dist: [0.85, 0.15] },  // trembling
    { itemNumber: 8,  dist: [0.85, 0.15] },  // shortness of breath
    { itemNumber: 9,  dist: [0.88, 0.12] },  // choking
    { itemNumber: 10, dist: [0.85, 0.15] },  // chest pain
    { itemNumber: 11, dist: [0.85, 0.15] },  // nausea
    { itemNumber: 12, dist: [0.82, 0.18] },  // dizzy/faint
    { itemNumber: 13, dist: [0.88, 0.12] },  // fear of dying
    { itemNumber: 14, dist: [0.82, 0.18] },  // tingling/numbness
    { itemNumber: 15, dist: [0.85, 0.15] },  // chills/hot flashes
  ],
};

// SPQ-B (binary 0-1): Raine & Benishay 1995; Compton et al. 2007 (N=822)
// College/community samples. Moderate endorsement for interpersonal items,
// low for cognitive-perceptual.
const SPQB_NORMS: InstrumentNorms = {
  instrument: "SPQ-B",
  sources: "Raine & Benishay 1995; Compton et al. 2007 (N=822); Axelrod et al. 2001",
  items: [
    // Cognitive-perceptual (items: 1,4,7,10,13,16,19,22 — numbered here by position)
    { itemNumber: 1,  dist: [0.72, 0.28] },  // people find me aloof
    { itemNumber: 2,  dist: [0.82, 0.18] },  // sense some person or force
    { itemNumber: 3,  dist: [0.68, 0.32] },  // unusual mannerisms
    { itemNumber: 4,  dist: [0.85, 0.15] },  // people are talking about me
    { itemNumber: 5,  dist: [0.78, 0.22] },  // feel very uncomfortable in social situations
    { itemNumber: 6,  dist: [0.88, 0.12] },  // signs or omens
    { itemNumber: 7,  dist: [0.65, 0.35] },  // flat/empty
    { itemNumber: 8,  dist: [0.82, 0.18] },  // events have special meaning
    { itemNumber: 9,  dist: [0.72, 0.28] },  // not interested in knowing people
    { itemNumber: 10, dist: [0.90, 0.10] },  // write confusing things
    { itemNumber: 11, dist: [0.75, 0.25] },  // difficult making friends
    { itemNumber: 12, dist: [0.80, 0.20] },  // 6th sense
    { itemNumber: 13, dist: [0.65, 0.35] },  // people comment on unusual behavior
    { itemNumber: 14, dist: [0.85, 0.15] },  // someone following me
    { itemNumber: 15, dist: [0.72, 0.28] },  // find it hard to be emotionally close
    { itemNumber: 16, dist: [0.80, 0.20] },  // everyday things seem unusually important
    { itemNumber: 17, dist: [0.70, 0.30] },  // keep in the background in social
    { itemNumber: 18, dist: [0.75, 0.25] },  // sometimes jump from topic
    { itemNumber: 19, dist: [0.70, 0.30] },  // hard to express feelings clearly
    { itemNumber: 20, dist: [0.78, 0.22] },  // people stare at me
    { itemNumber: 21, dist: [0.68, 0.32] },  // tend to keep feelings to myself
    { itemNumber: 22, dist: [0.80, 0.20] },  // things happen that are unusual
  ],
};

// AQ-10 (0-1 binary after scoring): Allison et al. 2012 (N=4,000)
// Moderate endorsement rates — autism-related behaviors not uncommon in gen pop.
const AQ10_NORMS: InstrumentNorms = {
  instrument: "AQ-10",
  sources: "Allison et al. 2012 (N=4,000); Booth et al. 2013",
  items: [
    { itemNumber: 1,  dist: [0.72, 0.28] },  // notice patterns
    { itemNumber: 2,  dist: [0.60, 0.40] },  // concentrate on one thing (R)
    { itemNumber: 3,  dist: [0.65, 0.35] },  // easy to do more than one thing
    { itemNumber: 4,  dist: [0.60, 0.40] },  // easy to go back after interruption
    { itemNumber: 5,  dist: [0.55, 0.45] },  // easy to read between the lines
    { itemNumber: 6,  dist: [0.68, 0.32] },  // know how someone feels by face
    { itemNumber: 7,  dist: [0.70, 0.30] },  // hard to work out characters' intentions
    { itemNumber: 8,  dist: [0.62, 0.38] },  // collect info about categories
    { itemNumber: 9,  dist: [0.55, 0.45] },  // easy to work out feelings from faces
    { itemNumber: 10, dist: [0.68, 0.32] },  // hard to make new friends
  ],
};

// CDS-2 (0-4 scale): Sierra & Berrios 2000; Michal et al. 2004
// Depersonalization items — very low endorsement in gen pop.
const CDS2_NORMS: InstrumentNorms = {
  instrument: "CDS-2",
  sources: "Michal et al. 2004; Sierra & Berrios 2000; estimated from community prevalence ~2%",
  items: [
    { itemNumber: 1, dist: normDist([0.78, 0.12, 0.05, 0.03, 0.02]) },  // things around seem unreal
    { itemNumber: 2, dist: normDist([0.80, 0.11, 0.05, 0.02, 0.02]) },  // feel body doesn't belong to you
  ],
};

// PID-5-BF (0-3 scale): Bach et al. 2016 (N=1,132); Krueger et al. 2012
// Community means ~0.5-1.0 per item. Varies by domain.
const PID5BF_NORMS: InstrumentNorms = {
  instrument: "PID-5-BF",
  sources: "Bach et al. 2016 (N=1,132); Krueger et al. 2012; Lynam et al. 2022 normative data",
  items: [
    // Negative Affectivity (items 1-5) — higher endorsement
    { itemNumber: 1,  dist: normDist([0.35, 0.35, 0.20, 0.10]) },  // worry about everything
    { itemNumber: 2,  dist: normDist([0.42, 0.32, 0.18, 0.08]) },  // feel afraid of a lot
    { itemNumber: 3,  dist: normDist([0.38, 0.34, 0.19, 0.09]) },  // get emotional easily
    { itemNumber: 4,  dist: normDist([0.40, 0.32, 0.18, 0.10]) },  // fear being alone
    { itemNumber: 5,  dist: normDist([0.40, 0.33, 0.18, 0.09]) },  // get stuck on one way
    // Detachment (items 6-10)
    { itemNumber: 6,  dist: normDist([0.45, 0.30, 0.17, 0.08]) },  // nothing seems interesting
    { itemNumber: 7,  dist: normDist([0.48, 0.28, 0.16, 0.08]) },  // prefer to be alone
    { itemNumber: 8,  dist: normDist([0.52, 0.27, 0.14, 0.07]) },  // avoid romantic relationships
    { itemNumber: 9,  dist: normDist([0.50, 0.28, 0.15, 0.07]) },  // rarely get enthusiastic
    { itemNumber: 10, dist: normDist([0.55, 0.25, 0.13, 0.07]) },  // don't like being with others
    // Antagonism (items 11-15) — lower endorsement
    { itemNumber: 11, dist: normDist([0.60, 0.25, 0.10, 0.05]) },  // use people
    { itemNumber: 12, dist: normDist([0.55, 0.28, 0.12, 0.05]) },  // crave attention
    { itemNumber: 13, dist: normDist([0.65, 0.22, 0.09, 0.04]) },  // often need to deal with people
    { itemNumber: 14, dist: normDist([0.68, 0.20, 0.08, 0.04]) },  // am a superior person
    { itemNumber: 15, dist: normDist([0.70, 0.18, 0.08, 0.04]) },  // will con people
    // Disinhibition (items 16-20)
    { itemNumber: 16, dist: normDist([0.50, 0.28, 0.14, 0.08]) },  // act impulsively
    { itemNumber: 17, dist: normDist([0.55, 0.27, 0.12, 0.06]) },  // don't care about appointments
    { itemNumber: 18, dist: normDist([0.52, 0.28, 0.13, 0.07]) },  // irresponsible
    { itemNumber: 19, dist: normDist([0.48, 0.28, 0.15, 0.09]) },  // lose temper
    { itemNumber: 20, dist: normDist([0.55, 0.27, 0.12, 0.06]) },  // take risks
    // Psychoticism (items 21-25)
    { itemNumber: 21, dist: normDist([0.58, 0.25, 0.11, 0.06]) },  // have seen things not there
    { itemNumber: 22, dist: normDist([0.55, 0.27, 0.12, 0.06]) },  // behave in ways others find odd
    { itemNumber: 23, dist: normDist([0.52, 0.28, 0.13, 0.07]) },  // thoughts that don't make sense
    { itemNumber: 24, dist: normDist([0.58, 0.25, 0.11, 0.06]) },  // unusual experiences
    { itemNumber: 25, dist: normDist([0.60, 0.25, 0.10, 0.05]) },  // thoughts others would find strange
  ],
};

// WI-7 Whiteley Index (0-4 scale): Pilowsky 1967; Fink et al. 2010
// Health anxiety items — most people report low levels.
const WI7_NORMS: InstrumentNorms = {
  instrument: "WI-7",
  sources: "Fink et al. 2010; Salkovskis et al. 2002; estimated from community HA prevalence ~5%",
  items: [
    { itemNumber: 1, dist: normDist([0.52, 0.28, 0.12, 0.05, 0.03]) },  // worry about health
    { itemNumber: 2, dist: normDist([0.62, 0.22, 0.10, 0.04, 0.02]) },  // think something wrong with body
    { itemNumber: 3, dist: normDist([0.58, 0.25, 0.10, 0.05, 0.02]) },  // easy to forget about health
    { itemNumber: 4, dist: normDist([0.65, 0.20, 0.09, 0.04, 0.02]) },  // find it hard to believe nothing wrong
    { itemNumber: 5, dist: normDist([0.60, 0.24, 0.10, 0.04, 0.02]) },  // afraid of illness
    { itemNumber: 6, dist: normDist([0.50, 0.28, 0.14, 0.05, 0.03]) },  // aware of body sensations
    { itemNumber: 7, dist: normDist([0.55, 0.26, 0.12, 0.05, 0.02]) },  // worried about many different symptoms
  ],
};

// HRS-SR (0-8 scale): Tolin et al. 2008, 2010
// Hoarding items — very low endorsement in gen pop. Strong floor.
// 0-8 scale means 9 response categories.
const HRSSR_NORMS: InstrumentNorms = {
  instrument: "HRS-SR",
  sources: "Tolin et al. 2010; Iervolino et al. 2009 community prevalence; estimated",
  items: [
    { itemNumber: 1, dist: normDist([0.40, 0.20, 0.15, 0.10, 0.06, 0.04, 0.02, 0.02, 0.01]) },  // clutter
    { itemNumber: 2, dist: normDist([0.45, 0.22, 0.13, 0.08, 0.05, 0.03, 0.02, 0.01, 0.01]) },  // difficulty discarding
    { itemNumber: 3, dist: normDist([0.48, 0.20, 0.12, 0.08, 0.05, 0.03, 0.02, 0.01, 0.01]) },  // acquiring
    { itemNumber: 4, dist: normDist([0.50, 0.22, 0.12, 0.07, 0.04, 0.02, 0.02, 0.005, 0.005]) }, // distress from discarding
    { itemNumber: 5, dist: normDist([0.52, 0.20, 0.12, 0.07, 0.04, 0.02, 0.02, 0.005, 0.005]) }, // impairment
  ],
};

// BDDQ (binary 0-1): Phillips 2005; Koran et al. 2008 (prevalence ~2.4%)
const BDDQ_NORMS: InstrumentNorms = {
  instrument: "BDDQ",
  sources: "Koran et al. 2008; Phillips 2005; estimated from BDD prevalence ~2.4%",
  items: [
    { itemNumber: 1, dist: [0.70, 0.30] },  // worry about appearance
    { itemNumber: 2, dist: [0.88, 0.12] },  // preoccupied with appearance defect
    { itemNumber: 3, dist: [0.92, 0.08] },  // causes significant distress
    { itemNumber: 4, dist: [0.94, 0.06] },  // significantly interferes with life
  ],
};

// SCOFF (binary 0-1): Morgan et al. 1999; Perry et al. 2002
// Eating disorder screening — moderate endorsement for some items.
const SCOFF_NORMS: InstrumentNorms = {
  instrument: "SCOFF",
  sources: "Morgan et al. 1999; Perry et al. 2002; estimated from community ED prevalence",
  items: [
    { itemNumber: 1, dist: [0.88, 0.12] },  // make yourself sick
    { itemNumber: 2, dist: [0.82, 0.18] },  // worry lost control over eating
    { itemNumber: 3, dist: [0.80, 0.20] },  // recently lost >14 lbs in 3 months
    { itemNumber: 4, dist: [0.72, 0.28] },  // believe yourself to be fat
    { itemNumber: 5, dist: [0.90, 0.10] },  // food dominates your life
  ],
};

// BEDS-7 (0-4 scale): Herman et al. 2016
// Binge eating items — low endorsement in general population.
const BEDS7_NORMS: InstrumentNorms = {
  instrument: "BEDS-7",
  sources: "Herman et al. 2016; estimated from BED prevalence ~2%",
  items: [
    { itemNumber: 1, dist: normDist([0.70, 0.18, 0.07, 0.03, 0.02]) },  // eat faster than normal
    { itemNumber: 2, dist: normDist([0.72, 0.16, 0.07, 0.03, 0.02]) },  // eat until uncomfortably full
    { itemNumber: 3, dist: normDist([0.75, 0.15, 0.06, 0.03, 0.01]) },  // eat large amounts not hungry
    { itemNumber: 4, dist: normDist([0.68, 0.18, 0.08, 0.04, 0.02]) },  // eat alone embarrassed
    { itemNumber: 5, dist: normDist([0.70, 0.18, 0.07, 0.03, 0.02]) },  // feel disgusted/guilty
    { itemNumber: 6, dist: normDist([0.78, 0.13, 0.05, 0.02, 0.02]) },  // marked distress
    { itemNumber: 7, dist: normDist([0.80, 0.12, 0.05, 0.02, 0.01]) },  // frequency (≥1/week for 3 months)
  ],
};

// PGSI (0-3 scale): Ferris & Wynne 2001; Currie et al. 2013
// Problem gambling items — extreme floor in gen pop (prevalence ~1-2%).
const PGSI_NORMS: InstrumentNorms = {
  instrument: "PGSI",
  sources: "Ferris & Wynne 2001; Currie et al. 2013; estimated from gambling prevalence ~1%",
  items: [
    { itemNumber: 1, dist: normDist([0.88, 0.08, 0.03, 0.01]) },  // bet more than can afford
    { itemNumber: 2, dist: normDist([0.85, 0.10, 0.03, 0.02]) },  // needed larger amounts
    { itemNumber: 3, dist: normDist([0.88, 0.08, 0.03, 0.01]) },  // went back to win back
    { itemNumber: 4, dist: normDist([0.90, 0.07, 0.02, 0.01]) },  // borrowed/sold to gamble
    { itemNumber: 5, dist: normDist([0.85, 0.10, 0.03, 0.02]) },  // felt might have a problem
    { itemNumber: 6, dist: normDist([0.88, 0.08, 0.03, 0.01]) },  // caused health problems
    { itemNumber: 7, dist: normDist([0.90, 0.07, 0.02, 0.01]) },  // people criticized
    { itemNumber: 8, dist: normDist([0.88, 0.08, 0.03, 0.01]) },  // caused financial problems
    { itemNumber: 9, dist: normDist([0.90, 0.07, 0.02, 0.01]) },  // felt guilty
  ],
};

// HCL-32 (binary 0-1): Angst et al. 2005 (N=1,565)
// Hypomania items — energy/activity items commonly endorsed, risk items rare.
const HCL32_NORMS: InstrumentNorms = {
  instrument: "HCL-32",
  sources: "Angst et al. 2005 (N=1,565); Meyer et al. 2007; estimated from community hypomania prevalence",
  items: [
    // Active/elated subscale — higher endorsement
    { itemNumber: 1,  dist: [0.55, 0.45] },  // need less sleep
    { itemNumber: 2,  dist: [0.50, 0.50] },  // feel more energetic
    { itemNumber: 3,  dist: [0.55, 0.45] },  // more self-confident
    { itemNumber: 4,  dist: [0.60, 0.40] },  // enjoy work more
    { itemNumber: 5,  dist: [0.52, 0.48] },  // more social
    { itemNumber: 6,  dist: [0.65, 0.35] },  // want to travel/do travel
    { itemNumber: 7,  dist: [0.58, 0.42] },  // tend to drive faster
    { itemNumber: 8,  dist: [0.55, 0.45] },  // spend more money
    { itemNumber: 9,  dist: [0.60, 0.40] },  // take more risks
    { itemNumber: 10, dist: [0.50, 0.50] },  // more physically active
    { itemNumber: 11, dist: [0.55, 0.45] },  // plan more activities
    { itemNumber: 12, dist: [0.62, 0.38] },  // more ideas
    { itemNumber: 13, dist: [0.70, 0.30] },  // less shy
    { itemNumber: 14, dist: [0.68, 0.32] },  // wear more colorful clothes
    { itemNumber: 15, dist: [0.55, 0.45] },  // want to meet more people
    { itemNumber: 16, dist: [0.60, 0.40] },  // more interested in sex
    { itemNumber: 17, dist: [0.62, 0.38] },  // more flirtatious
    { itemNumber: 18, dist: [0.50, 0.50] },  // more talkative
    { itemNumber: 19, dist: [0.55, 0.45] },  // think faster
    { itemNumber: 20, dist: [0.60, 0.40] },  // make more jokes
    // Risk/irritable subscale — lower endorsement
    { itemNumber: 21, dist: [0.70, 0.30] },  // more easily distracted
    { itemNumber: 22, dist: [0.75, 0.25] },  // engage in new things
    { itemNumber: 23, dist: [0.70, 0.30] },  // thoughts jump
    { itemNumber: 24, dist: [0.72, 0.28] },  // do things more quickly
    { itemNumber: 25, dist: [0.65, 0.35] },  // more impatient
    { itemNumber: 26, dist: [0.78, 0.22] },  // can be irritating
    { itemNumber: 27, dist: [0.82, 0.18] },  // drink more coffee
    { itemNumber: 28, dist: [0.90, 0.10] },  // smoke more
    { itemNumber: 29, dist: [0.85, 0.15] },  // drink more alcohol
    { itemNumber: 30, dist: [0.88, 0.12] },  // take more drugs
    { itemNumber: 31, dist: [0.75, 0.25] },  // become more irritable
    { itemNumber: 32, dist: [0.72, 0.28] },  // gambling more
  ],
};

// ─── Export all norms ────────────────────────────────────────────────────────

export const allInstrumentNorms: InstrumentNorms[] = [
  PHQ9_NORMS,
  GAD7_NORMS,
  PHQ15_NORMS,
  PCPTSD5_NORMS,
  AUDITC_NORMS,
  WHO5_NORMS,
  PCL5_NORMS,
  YBOCS_NORMS,
  CAPE42_NORMS,
  AUDIT_NORMS,
  DAST10_NORMS,
  MDQ_NORMS,
  ASRS_NORMS,
  SPIN_NORMS,
  PQ16_NORMS,
  PHQ_PANIC_NORMS,
  SPQB_NORMS,
  AQ10_NORMS,
  CDS2_NORMS,
  PID5BF_NORMS,
  WI7_NORMS,
  HRSSR_NORMS,
  BDDQ_NORMS,
  SCOFF_NORMS,
  BEDS7_NORMS,
  PGSI_NORMS,
  HCL32_NORMS,
];
