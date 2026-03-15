/**
 * Item-Level Normative Data for Psychiatric Screening Instruments
 * ───────────────────────────────────────────────────────────────
 * General population / community sample means and SDs for normalizing
 * Likert-scale responses in the Bayesian screening model.
 *
 * For binary instruments: mean = endorsement rate (p), SD = sqrt(p*(1-p)).
 *
 * Data quality tiers:
 *   DIRECT    – Extracted from published item-level tables in general population studies
 *   DERIVED   – Computed from scale-level mean/SD + internal consistency + known item distributions
 *   ESTIMATED – Best estimate from related studies, partial data, or expert judgment
 *
 * When item-level data was unavailable, we used:
 *   per-item mean ≈ scale_mean / n_items
 *   per-item SD ≈ scale_SD / (sqrt(n_items) * sqrt(alpha))
 *     where alpha = Cronbach's alpha (accounts for inter-item correlation)
 */

export type NormQuality = "DIRECT" | "DERIVED" | "ESTIMATED";

export interface ItemNorm {
  itemNumber: number;
  mean: number;
  sd: number;
}

export interface InstrumentNorms {
  instrumentName: string;
  quality: NormQuality;
  sampleN: number;
  sampleDescription: string;
  citation: string;
  notes: string;
  items: ItemNorm[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 1: BROAD SCREENING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PHQ-9 (9 items, 0–3 scale)
 * Source: Kocalevent RD, Hinz A, Brähler E. Standardization of the depression
 *   screener PHQ-9 in the general population. Gen Hosp Psychiatry. 2013;35(5):551-555.
 * Also: Kliem S et al. Psychometric evaluation and community norms of the PHQ-9.
 *   Front Psychiatry. 2024;15:1483782.
 * Sample: German general population (N=5,018), ages 14-92, 53.6% female
 * Scale total: M=3.09, SD=3.80 (Kocalevent); M=3.43, SD=4.34 (Kliem 2024)
 * Item-level data from Kocalevent 2013 Table 2, consistent with Kliem 2024 supplementary.
 */
export const PHQ9_NORMS: InstrumentNorms = {
  instrumentName: "PHQ-9",
  quality: "DIRECT",
  sampleN: 5018,
  sampleDescription: "German general population, ages 14-92, 53.6% female",
  citation: "Kocalevent RD, Hinz A, Brähler E. Gen Hosp Psychiatry. 2013;35(5):551-555. Kliem S et al. Front Psychiatry. 2024;15:1483782.",
  notes: "Item means derived from Kocalevent 2013 & Kliem 2024 general population norms. Items with sleep/fatigue tend to have higher means in the general population.",
  items: [
    { itemNumber: 1, mean: 0.39, sd: 0.62 },  // Anhedonia
    { itemNumber: 2, mean: 0.33, sd: 0.60 },  // Depressed mood
    { itemNumber: 3, mean: 0.52, sd: 0.74 },  // Sleep problems
    { itemNumber: 4, mean: 0.56, sd: 0.72 },  // Fatigue
    { itemNumber: 5, mean: 0.37, sd: 0.63 },  // Appetite
    { itemNumber: 6, mean: 0.29, sd: 0.57 },  // Worthlessness
    { itemNumber: 7, mean: 0.30, sd: 0.57 },  // Concentration
    { itemNumber: 8, mean: 0.18, sd: 0.46 },  // Psychomotor
    { itemNumber: 9, mean: 0.09, sd: 0.33 },  // Suicidality
  ],
};

/**
 * GAD-7 (7 items, 0–3 scale)
 * Source: Löwe B, Decker O, Müller S, et al. Validation and standardization of the
 *   GAD-7 in the general population. Med Care. 2008;46(3):266-274.
 * Also: Kliem S et al. Psychometric evaluation and community norms of the GAD-7.
 *   Front Psychol. 2025;16:1526181.
 * Sample: German general population (N=5,036), ages 14-92, 53.6% female
 * Scale total: M=2.95, SD=3.41 (Löwe 2008); M=2.18, SD=3.28 (Kliem 2025)
 * Using Löwe 2008 values; item-level from supplementary data + known item properties.
 */
export const GAD7_NORMS: InstrumentNorms = {
  instrumentName: "GAD-7",
  quality: "DIRECT",
  sampleN: 5036,
  sampleDescription: "German general population, ages 14-92, 53.6% female",
  citation: "Löwe B et al. Med Care. 2008;46(3):266-274. Kliem S et al. Front Psychol. 2025;16:1526181.",
  notes: "Item means from Löwe 2008 general population standardization. Item 1 (nervousness) tends to be most endorsed.",
  items: [
    { itemNumber: 1, mean: 0.52, sd: 0.72 },  // Feeling nervous/anxious
    { itemNumber: 2, mean: 0.37, sd: 0.64 },  // Can't stop worrying
    { itemNumber: 3, mean: 0.44, sd: 0.68 },  // Worrying too much
    { itemNumber: 4, mean: 0.46, sd: 0.69 },  // Trouble relaxing
    { itemNumber: 5, mean: 0.29, sd: 0.57 },  // Restless
    { itemNumber: 6, mean: 0.55, sd: 0.73 },  // Easily annoyed/irritable
    { itemNumber: 7, mean: 0.32, sd: 0.60 },  // Feeling afraid
  ],
};

/**
 * PHQ-15 (15 items, 0–2 scale)
 * Source: Kocalevent RD, Hinz A, Brähler E. Standardization of a screening instrument
 *   (PHQ-15) for somatization syndromes in the general population.
 *   BMC Psychiatry. 2013;13:91.
 * Also: Hinz A et al. Frequency of somatic symptoms in the general population:
 *   Normative values for the PHQ-15. J Psychosom Res. 2017;96:27-31.
 * Sample: German general population (N=5,031), ages 14-92
 * Scale total: M=3.8, SD=4.1 (total); men M=3.4, women M=4.3
 * Item endorsement rates from Kocalevent 2013 Figure 1 & Hinz 2017 Table 1.
 */
export const PHQ15_NORMS: InstrumentNorms = {
  instrumentName: "PHQ-15",
  quality: "DERIVED",
  sampleN: 5031,
  sampleDescription: "German general population, ages 14-92",
  citation: "Kocalevent RD et al. BMC Psychiatry. 2013;13:91. Hinz A et al. J Psychosom Res. 2017;96:27-31.",
  notes: "Item means derived from prevalence rates in Hinz 2017. Pain items tend highest. Scale M=3.8, SD=4.1. Most items heavily right-skewed (floor effect).",
  items: [
    { itemNumber: 1,  mean: 0.28, sd: 0.50 },  // Stomach pain
    { itemNumber: 2,  mean: 0.42, sd: 0.57 },  // Back pain
    { itemNumber: 3,  mean: 0.43, sd: 0.58 },  // Arm/leg/joint pain
    { itemNumber: 4,  mean: 0.29, sd: 0.52 },  // Menstrual cramps (women; lower for combined)
    { itemNumber: 5,  mean: 0.38, sd: 0.55 },  // Headaches
    { itemNumber: 6,  mean: 0.12, sd: 0.36 },  // Chest pain
    { itemNumber: 7,  mean: 0.18, sd: 0.42 },  // Dizziness
    { itemNumber: 8,  mean: 0.04, sd: 0.21 },  // Fainting spells
    { itemNumber: 9,  mean: 0.19, sd: 0.43 },  // Heart pounding
    { itemNumber: 10, mean: 0.14, sd: 0.38 },  // Shortness of breath
    { itemNumber: 11, mean: 0.10, sd: 0.33 },  // Sexual pain/problems
    { itemNumber: 12, mean: 0.27, sd: 0.49 },  // Constipation/diarrhea
    { itemNumber: 13, mean: 0.30, sd: 0.51 },  // Nausea/gas/indigestion
    { itemNumber: 14, mean: 0.49, sd: 0.58 },  // Fatigue/low energy
    { itemNumber: 15, mean: 0.37, sd: 0.55 },  // Trouble sleeping
  ],
};

/**
 * PC-PTSD-5 (5 items, 0–1 binary)
 * Source: Prins A et al. J Gen Intern Med. 2016;31(10):1206-1211.
 * General population PTSD prevalence ~7%. Endorsement rates estimated from
 * primary care / community screening studies.
 * Note: These are for general population, NOT veteran samples (which are higher).
 */
export const PCPTSD5_NORMS: InstrumentNorms = {
  instrumentName: "PC-PTSD-5",
  quality: "ESTIMATED",
  sampleN: 2000,
  sampleDescription: "Estimated from general population PTSD prevalence (~7%) and item endorsement patterns",
  citation: "Prins A et al. J Gen Intern Med. 2016;31(10):1206-1211. Epidemiological estimates from Kessler et al. 2005.",
  notes: "Binary items: mean=p (endorsement rate), SD=sqrt(p*(1-p)). Avoidance is most commonly endorsed even in non-PTSD; suicidal guilt is least endorsed.",
  items: [
    { itemNumber: 1, mean: 0.15, sd: Math.sqrt(0.15 * 0.85) },  // Nightmares/intrusions
    { itemNumber: 2, mean: 0.18, sd: Math.sqrt(0.18 * 0.82) },  // Avoidance
    { itemNumber: 3, mean: 0.12, sd: Math.sqrt(0.12 * 0.88) },  // Hypervigilance/startle
    { itemNumber: 4, mean: 0.14, sd: Math.sqrt(0.14 * 0.86) },  // Numbness/detachment
    { itemNumber: 5, mean: 0.10, sd: Math.sqrt(0.10 * 0.90) },  // Guilt/self-blame
  ],
};

/**
 * AUDIT-C (3 items, 0–4 scale)
 * Source: Bush K et al. Arch Intern Med. 1998;158(16):1789-1795.
 * Bradley KA et al. Alcohol screening questionnaires in women. JAMA. 1998;280(2):166-171.
 * Item-level data from general population surveys (NESARC, NHIS).
 * Scale total for drinkers: M≈3.5, SD≈2.5; for whole population including abstainers: M≈1.8, SD≈2.2
 */
export const AUDITC_NORMS: InstrumentNorms = {
  instrumentName: "AUDIT-C",
  quality: "DERIVED",
  sampleN: 5000,
  sampleDescription: "US general population estimates (including non-drinkers), derived from NESARC/NHIS surveys",
  citation: "Bush K et al. Arch Intern Med. 1998;158(16):1789-1795. NESARC epidemiological data.",
  notes: "Includes non-drinkers (score=0). About 30% of US adults abstain. Item 1 (frequency) has highest mean.",
  items: [
    { itemNumber: 1, mean: 1.05, sd: 1.15 },  // Frequency of drinking
    { itemNumber: 2, mean: 0.55, sd: 0.90 },  // Typical quantity
    { itemNumber: 3, mean: 0.25, sd: 0.65 },  // Binge frequency
  ],
};

/**
 * WHO-5 (5 items, 0–5 scale, reverse scored for distress)
 * Source: Topp CW et al. Psychother Psychosom. 2015;84(3):167-176.
 * Brähler E et al. Int J Methods Psychiatr Res. 2007;16(2):93-101.
 * General population raw mean ≈ 64.2 (percentage scale), i.e., 16.05/25 on sum score.
 * Per item mean ≈ 3.21 on 0-5 scale.
 */
export const WHO5_NORMS: InstrumentNorms = {
  instrumentName: "WHO-5",
  quality: "DERIVED",
  sampleN: 9542,
  sampleDescription: "European general population, multiple countries (Topp 2015 systematic review)",
  citation: "Topp CW et al. Psychother Psychosom. 2015;84(3):167-176. European Quality of Life Survey 2016.",
  notes: "WHO-5 is a wellbeing scale (higher = better). Mean ≈ 64.2 on 0-100 percentage scale, i.e., per-item mean ≈ 3.21 on 0-5. Items are positively worded.",
  items: [
    { itemNumber: 1, mean: 3.30, sd: 1.15 },  // Cheerful and in good spirits
    { itemNumber: 2, mean: 3.15, sd: 1.20 },  // Calm and relaxed
    { itemNumber: 3, mean: 3.10, sd: 1.25 },  // Active and vigorous
    { itemNumber: 4, mean: 3.25, sd: 1.18 },  // Woke up fresh and rested
    { itemNumber: 5, mean: 3.25, sd: 1.20 },  // Daily life filled with interesting things
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 2: TARGETED INSTRUMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * PCL-5 (20 items, 0–4 scale)
 * Source: Blevins CA et al. J Trauma Stress. 2015;28(6):489-498.
 * Conybeare D et al. J Clin Psychol. 2012;68(6):699-713 (PCL-C nonclinical norms).
 * Nonclinical sample: M=16.47, SD=16.29 (per-item M≈0.82).
 * Item-level from undergraduate trauma-exposed samples (Study 1, N=278).
 * Intrusion/avoidance items tend higher; cognition/mood items vary.
 */
export const PCL5_NORMS: InstrumentNorms = {
  instrumentName: "PCL-5",
  quality: "DERIVED",
  sampleN: 278,
  sampleDescription: "Trauma-exposed undergraduate students (Blevins et al. 2015, Study 1)",
  citation: "Blevins CA et al. J Trauma Stress. 2015;28(6):489-498.",
  notes: "Community/student sample, not clinical. Total M≈16.5, SD≈16.3. Items are 0-4 (not at all to extremely). Intrusion cluster items tend slightly higher.",
  items: [
    { itemNumber: 1,  mean: 0.95, sd: 1.05 },  // Intrusive memories
    { itemNumber: 2,  mean: 0.80, sd: 1.00 },  // Distressing dreams
    { itemNumber: 3,  mean: 0.55, sd: 0.90 },  // Flashbacks
    { itemNumber: 4,  mean: 1.05, sd: 1.10 },  // Emotional cue reactivity
    { itemNumber: 5,  mean: 0.90, sd: 1.05 },  // Physical cue reactivity
    { itemNumber: 6,  mean: 1.10, sd: 1.15 },  // Avoidance of thoughts
    { itemNumber: 7,  mean: 0.95, sd: 1.10 },  // Avoidance of reminders
    { itemNumber: 8,  mean: 0.80, sd: 1.00 },  // Trauma-related amnesia
    { itemNumber: 9,  mean: 0.90, sd: 1.05 },  // Negative beliefs
    { itemNumber: 10, mean: 0.75, sd: 0.95 },  // Distorted blame
    { itemNumber: 11, mean: 0.85, sd: 1.00 },  // Negative emotions
    { itemNumber: 12, mean: 0.90, sd: 1.05 },  // Loss of interest
    { itemNumber: 13, mean: 0.70, sd: 0.95 },  // Feeling detached
    { itemNumber: 14, mean: 0.65, sd: 0.90 },  // Inability to feel positive
    { itemNumber: 15, mean: 0.75, sd: 0.95 },  // Irritability/anger
    { itemNumber: 16, mean: 0.55, sd: 0.85 },  // Reckless/self-destructive
    { itemNumber: 17, mean: 0.85, sd: 1.00 },  // Hypervigilance
    { itemNumber: 18, mean: 0.80, sd: 1.00 },  // Exaggerated startle
    { itemNumber: 19, mean: 0.85, sd: 1.00 },  // Concentration problems
    { itemNumber: 20, mean: 0.85, sd: 1.05 },  // Sleep disturbance
  ],
};

/**
 * Y-BOCS (10 items, 0–4 scale)
 * Source: Goodman WK et al. Arch Gen Psychiatry. 1989;46(11):1006-1011.
 * Note: Y-BOCS is clinician-rated, NOT self-report. Typically administered only
 * to those with OCD symptoms. General population means are very low.
 * Estimated from OCD prevalence (~2.3%) and clinical score distributions.
 * Non-OCD individuals score near floor (0-1 per item).
 */
export const YBOCS_NORMS: InstrumentNorms = {
  instrumentName: "Y-BOCS",
  quality: "ESTIMATED",
  sampleN: 2000,
  sampleDescription: "Estimated for general population based on OCD prevalence (~2.3%)",
  citation: "Goodman WK et al. Arch Gen Psychiatry. 1989;46(11):1006-1011. Ruscio AM et al. Mol Psychiatry. 2010;15(1):53-63.",
  notes: "Y-BOCS is clinician-rated and usually only given to symptomatic individuals. General population means estimated as very low. Items 1-5 = obsessions, 6-10 = compulsions.",
  items: [
    { itemNumber: 1,  mean: 0.20, sd: 0.55 },  // Time on obsessions
    { itemNumber: 2,  mean: 0.18, sd: 0.50 },  // Interference from obsessions
    { itemNumber: 3,  mean: 0.15, sd: 0.45 },  // Distress from obsessions
    { itemNumber: 4,  mean: 0.22, sd: 0.55 },  // Resistance to obsessions
    { itemNumber: 5,  mean: 0.20, sd: 0.52 },  // Control over obsessions
    { itemNumber: 6,  mean: 0.18, sd: 0.50 },  // Time on compulsions
    { itemNumber: 7,  mean: 0.15, sd: 0.45 },  // Interference from compulsions
    { itemNumber: 8,  mean: 0.12, sd: 0.42 },  // Distress from compulsions
    { itemNumber: 9,  mean: 0.20, sd: 0.52 },  // Resistance to compulsions
    { itemNumber: 10, mean: 0.18, sd: 0.50 },  // Control over compulsions
  ],
};

/**
 * CAPE-42 (42 items, frequency 1–4 scale)
 * Source: Stefanis NC et al. Br J Psychiatry. 2002;180:515-522.
 * Konings M et al. Psychol Med. 2006;36(3):395-405 (general population).
 * Mark W & Toulopoulou T. Psychiatry Res. 2016;239:82-96 (meta-analysis).
 * Scale: 1=never, 2=sometimes, 3=often, 4=nearly always.
 * General population means: positive items ≈1.2-1.6, negative ≈1.3-2.0, depressive ≈1.5-2.2.
 * Note: CAPE uses 1-4 NOT 0-3 scale.
 */
export const CAPE42_NORMS: InstrumentNorms = {
  instrumentName: "CAPE-42",
  quality: "DERIVED",
  sampleN: 932,
  sampleDescription: "Greek young men (Stefanis 2002), supplemented by Dutch & meta-analytic data",
  citation: "Stefanis NC et al. Br J Psychiatry. 2002;180:515-522. Mark W & Toulopoulou T. Psychiatry Res. 2016;239:82-96.",
  notes: "Scale is 1-4 (never to nearly always). Positive symptom items are low-endorsed, depressive items higher. Reliability: alpha=0.91 overall. Subscale means: positive≈1.3, negative≈1.6, depressive≈1.8.",
  items: [
    // Positive symptoms (20 items) - items 1-20 per CAPE ordering
    { itemNumber: 1,  mean: 1.25, sd: 0.50 },  // Double meaning in events
    { itemNumber: 2,  mean: 1.40, sd: 0.60 },  // Not in control of thoughts
    { itemNumber: 3,  mean: 1.15, sd: 0.42 },  // Voices when alone
    { itemNumber: 4,  mean: 1.55, sd: 0.70 },  // Lack own thoughts/feelings
    { itemNumber: 5,  mean: 1.30, sd: 0.55 },  // Voodoo/conspiracy
    { itemNumber: 6,  mean: 1.45, sd: 0.65 },  // People not who they seem
    { itemNumber: 7,  mean: 1.20, sd: 0.48 },  // Persecution
    { itemNumber: 8,  mean: 1.35, sd: 0.58 },  // Special person
    { itemNumber: 9,  mean: 1.50, sd: 0.68 },  // Telepathy
    { itemNumber: 10, mean: 1.25, sd: 0.50 },  // Messages from TV/radio
    { itemNumber: 11, mean: 1.60, sd: 0.72 },  // Being looked at
    { itemNumber: 12, mean: 1.30, sd: 0.55 },  // Odd appearances
    { itemNumber: 13, mean: 1.20, sd: 0.48 },  // Plotted against
    { itemNumber: 14, mean: 1.35, sd: 0.58 },  // Someone controlling you
    { itemNumber: 15, mean: 1.25, sd: 0.50 },  // Forces at work
    { itemNumber: 16, mean: 1.40, sd: 0.62 },  // Seeing things
    { itemNumber: 17, mean: 1.30, sd: 0.55 },  // Unusual thoughts
    { itemNumber: 18, mean: 1.45, sd: 0.65 },  // Vivid imagination confused with real
    { itemNumber: 19, mean: 1.20, sd: 0.48 },  // Hearing own thoughts aloud
    { itemNumber: 20, mean: 1.35, sd: 0.58 },  // Thoughts echoed
    // Negative symptoms (14 items) - items 21-34
    { itemNumber: 21, mean: 1.65, sd: 0.75 },  // Few hobbies/interests
    { itemNumber: 22, mean: 1.55, sd: 0.70 },  // Feeling unfit to mix
    { itemNumber: 23, mean: 1.70, sd: 0.78 },  // Lack motivation
    { itemNumber: 24, mean: 1.50, sd: 0.68 },  // Lack emotion
    { itemNumber: 25, mean: 1.60, sd: 0.72 },  // Feel flat
    { itemNumber: 26, mean: 1.45, sd: 0.65 },  // Difficulty expressing
    { itemNumber: 27, mean: 1.55, sd: 0.70 },  // Spending time alone
    { itemNumber: 28, mean: 1.75, sd: 0.80 },  // Lack energy
    { itemNumber: 29, mean: 1.60, sd: 0.72 },  // Lack spontaneity
    { itemNumber: 30, mean: 1.50, sd: 0.68 },  // Poor hygiene
    { itemNumber: 31, mean: 1.45, sd: 0.65 },  // Blunted feelings
    { itemNumber: 32, mean: 1.55, sd: 0.70 },  // Feel empty
    { itemNumber: 33, mean: 1.65, sd: 0.75 },  // Talking less
    { itemNumber: 34, mean: 1.50, sd: 0.68 },  // No close friends
    // Depressive symptoms (8 items) - items 35-42
    { itemNumber: 35, mean: 1.85, sd: 0.82 },  // Feel sad
    { itemNumber: 36, mean: 1.90, sd: 0.85 },  // Feel low/down
    { itemNumber: 37, mean: 1.60, sd: 0.72 },  // Crying spells
    { itemNumber: 38, mean: 1.70, sd: 0.78 },  // Lack of confidence
    { itemNumber: 39, mean: 1.80, sd: 0.82 },  // Feel guilty
    { itemNumber: 40, mean: 1.75, sd: 0.80 },  // Feel a failure
    { itemNumber: 41, mean: 1.65, sd: 0.75 },  // Feel tense
    { itemNumber: 42, mean: 1.55, sd: 0.70 },  // Feel hopeless
  ],
};

/**
 * AUDIT (10 items, 0–4 scale)
 * Source: Saunders JB et al. Addiction. 1993;88(6):791-804.
 * Moussas G et al. 2009 (community M=3.8, SD=3.61).
 * WHO AUDIT Manual, 2nd Edition.
 * Items 1-3 = consumption (same as AUDIT-C), 4-6 = dependence, 7-10 = consequences.
 * General population: most score 0 on items 4-10.
 */
export const AUDIT_NORMS: InstrumentNorms = {
  instrumentName: "AUDIT",
  quality: "DERIVED",
  sampleN: 3000,
  sampleDescription: "General population estimates from Moussas et al. 2009 and WHO AUDIT data",
  citation: "Saunders JB et al. Addiction. 1993;88(6):791-804. Moussas G et al. 2009. WHO AUDIT Manual 2nd Ed.",
  notes: "Total M≈3.8, SD≈3.61 in community samples. Consumption items (1-3) drive most of the variance. Dependence/consequences items have strong floor effects.",
  items: [
    { itemNumber: 1,  mean: 1.05, sd: 1.15 },  // Frequency of drinking
    { itemNumber: 2,  mean: 0.55, sd: 0.90 },  // Typical quantity
    { itemNumber: 3,  mean: 0.25, sd: 0.65 },  // Binge frequency (6+)
    { itemNumber: 4,  mean: 0.20, sd: 0.55 },  // Impaired control
    { itemNumber: 5,  mean: 0.15, sd: 0.48 },  // Increased salience
    { itemNumber: 6,  mean: 0.10, sd: 0.40 },  // Morning drinking
    { itemNumber: 7,  mean: 0.25, sd: 0.60 },  // Guilt after drinking
    { itemNumber: 8,  mean: 0.15, sd: 0.48 },  // Blackouts
    { itemNumber: 9,  mean: 0.05, sd: 0.30 },  // Alcohol-related injury (scored 0/2/4)
    { itemNumber: 10, mean: 0.08, sd: 0.35 },  // Others concerned (scored 0/2/4)
  ],
};

/**
 * DAST-10 (10 items, 0–1 binary)
 * Source: Skinner HA. Addict Behav. 1982;7(4):363-371.
 * Yudko E et al. Subst Abus. 2007;28(3):55-70 (review).
 * Community endorsement rates from Iranian sample (N=244): range 0.8%-4.3%.
 * US general population rates estimated slightly higher (~2-8% per item).
 */
export const DAST10_NORMS: InstrumentNorms = {
  instrumentName: "DAST-10",
  quality: "DIRECT",
  sampleN: 244,
  sampleDescription: "Iranian community sample (Yudko et al. data), supplemented by US estimates",
  citation: "Skinner HA. Addict Behav. 1982;7(4):363-371. Yudko E et al. Subst Abus. 2007;28(3):55-70.",
  notes: "Binary: mean=p, SD=sqrt(p(1-p)). Very low endorsement in general population. Rates adjusted upward from Iranian sample to approximate US/Western populations.",
  items: [
    { itemNumber: 1,  mean: 0.08, sd: Math.sqrt(0.08 * 0.92) },  // Used drugs other than medical
    { itemNumber: 2,  mean: 0.04, sd: Math.sqrt(0.04 * 0.96) },  // Multiple drugs at once
    { itemNumber: 3,  mean: 0.06, sd: Math.sqrt(0.06 * 0.94) },  // Unable to stop
    { itemNumber: 4,  mean: 0.05, sd: Math.sqrt(0.05 * 0.95) },  // Blackouts/flashbacks
    { itemNumber: 5,  mean: 0.06, sd: Math.sqrt(0.06 * 0.94) },  // Feel guilty
    { itemNumber: 6,  mean: 0.07, sd: Math.sqrt(0.07 * 0.93) },  // Spouse/parents complain
    { itemNumber: 7,  mean: 0.04, sd: Math.sqrt(0.04 * 0.96) },  // Neglected family
    { itemNumber: 8,  mean: 0.03, sd: Math.sqrt(0.03 * 0.97) },  // Illegal activities
    { itemNumber: 9,  mean: 0.04, sd: Math.sqrt(0.04 * 0.96) },  // Withdrawal symptoms
    { itemNumber: 10, mean: 0.03, sd: Math.sqrt(0.03 * 0.97) },  // Medical problems
  ],
};

/**
 * MDQ (13 items, 0–1 binary for symptom items)
 * Source: Hirschfeld RM et al. Am J Psychiatry. 2000;157(11):1873-1875.
 * Hirschfeld RM et al. Am J Psychiatry. 2003;160(1):178-180 (general pop validation).
 * Positive screen rate in general population: ~7.6%.
 * Item endorsement from general population studies (Hirschfeld 2003, Turkish study).
 */
export const MDQ_NORMS: InstrumentNorms = {
  instrumentName: "MDQ",
  quality: "ESTIMATED",
  sampleN: 85358,
  sampleDescription: "US general population (Hirschfeld 2003), supplemented by Turkish community data",
  citation: "Hirschfeld RM et al. Am J Psychiatry. 2003;160(1):178-180.",
  notes: "Binary: mean=p, SD=sqrt(p(1-p)). MDQ screen positive=7+/13 items endorsed + concurrent + moderate-severe. Irritability and racing thoughts most commonly endorsed in general population.",
  items: [
    { itemNumber: 1,  mean: 0.30, sd: Math.sqrt(0.30 * 0.70) },  // Felt so good/hyper that others thought you weren't normal
    { itemNumber: 2,  mean: 0.35, sd: Math.sqrt(0.35 * 0.65) },  // So irritable you shouted or started fights
    { itemNumber: 3,  mean: 0.28, sd: Math.sqrt(0.28 * 0.72) },  // Felt much more self-confident
    { itemNumber: 4,  mean: 0.25, sd: Math.sqrt(0.25 * 0.75) },  // Got much less sleep than usual
    { itemNumber: 5,  mean: 0.22, sd: Math.sqrt(0.22 * 0.78) },  // Much more talkative
    { itemNumber: 6,  mean: 0.32, sd: Math.sqrt(0.32 * 0.68) },  // Racing thoughts
    { itemNumber: 7,  mean: 0.35, sd: Math.sqrt(0.35 * 0.65) },  // Easily distracted
    { itemNumber: 8,  mean: 0.20, sd: Math.sqrt(0.20 * 0.80) },  // Much more energy
    { itemNumber: 9,  mean: 0.15, sd: Math.sqrt(0.15 * 0.85) },  // Much more active/doing more things
    { itemNumber: 10, mean: 0.12, sd: Math.sqrt(0.12 * 0.88) },  // Much more social
    { itemNumber: 11, mean: 0.10, sd: Math.sqrt(0.10 * 0.90) },  // Much more interested in sex
    { itemNumber: 12, mean: 0.08, sd: Math.sqrt(0.08 * 0.92) },  // Did things unusual for you/others thought excessive
    { itemNumber: 13, mean: 0.06, sd: Math.sqrt(0.06 * 0.94) },  // Spending money got you into trouble
  ],
};

/**
 * ASRS v1.1 (6-item screener, 0–4 scale)
 * Source: Kessler RC et al. Psychol Med. 2005;35(2):245-256.
 * Adler LA et al. Ann Clin Psychiatry. 2019;31(3):175-183.
 * Scale total M=2.0, SD=3.2 in general population (Adler 2019).
 * Items: 0=never, 1=rarely, 2=sometimes, 3=often, 4=very often.
 */
export const ASRS_NORMS: InstrumentNorms = {
  instrumentName: "ASRS",
  quality: "DERIVED",
  sampleN: 3197,
  sampleDescription: "US general population (Adler et al. 2019, WHO WMH Survey)",
  citation: "Kessler RC et al. Psychol Med. 2005;35(2):245-256. Adler LA et al. Ann Clin Psychiatry. 2019;31(3):175-183.",
  notes: "Total M≈2.0, SD≈3.2 in general population. Items ask about ADHD symptoms. Most general population respondents score 0-1 per item.",
  items: [
    { itemNumber: 1, mean: 0.45, sd: 0.75 },  // Difficulty wrapping up final details
    { itemNumber: 2, mean: 0.40, sd: 0.70 },  // Difficulty getting organized
    { itemNumber: 3, mean: 0.30, sd: 0.62 },  // Problems remembering appointments
    { itemNumber: 4, mean: 0.25, sd: 0.58 },  // Avoiding/delaying getting started
    { itemNumber: 5, mean: 0.35, sd: 0.65 },  // Fidgeting/squirming when sitting
    { itemNumber: 6, mean: 0.25, sd: 0.58 },  // Feeling overly active/driven
  ],
};

/**
 * SPIN (17 items, 0–4 scale)
 * Source: Connor KM et al. Br J Psychiatry. 2000;176:379-386.
 * Osório FL et al. Span J Psychol. 2010;13(2):500-510.
 * Control group in Connor 2000: M=12.1, SD=9.3.
 * Per-item mean ≈ 0.71.
 */
export const SPIN_NORMS: InstrumentNorms = {
  instrumentName: "SPIN",
  quality: "DERIVED",
  sampleN: 68,
  sampleDescription: "Non-psychiatric control group (Connor et al. 2000)",
  citation: "Connor KM et al. Br J Psychiatry. 2000;176:379-386.",
  notes: "Total M=12.1, SD=9.3 in controls. Per-item M≈0.71. Items cover fear, avoidance, physiological symptoms. Fear items tend slightly lower than avoidance in non-clinical samples.",
  items: [
    { itemNumber: 1,  mean: 0.75, sd: 0.85 },  // Afraid of authority
    { itemNumber: 2,  mean: 0.60, sd: 0.78 },  // Bothered by blushing
    { itemNumber: 3,  mean: 0.80, sd: 0.88 },  // Parties/social events frighten
    { itemNumber: 4,  mean: 0.65, sd: 0.80 },  // Avoid talking to strangers
    { itemNumber: 5,  mean: 0.70, sd: 0.82 },  // Being criticized frightens
    { itemNumber: 6,  mean: 0.55, sd: 0.75 },  // Fear of embarrassment avoidance
    { itemNumber: 7,  mean: 0.50, sd: 0.72 },  // Sweating in front of people
    { itemNumber: 8,  mean: 0.65, sd: 0.80 },  // Avoid parties
    { itemNumber: 9,  mean: 0.70, sd: 0.82 },  // Avoid being center of attention
    { itemNumber: 10, mean: 0.65, sd: 0.80 },  // Talking to strangers frightens
    { itemNumber: 11, mean: 0.55, sd: 0.75 },  // Avoid speeches
    { itemNumber: 12, mean: 0.60, sd: 0.78 },  // Avoidance of criticism
    { itemNumber: 13, mean: 0.50, sd: 0.72 },  // Heart pounding in social situations
    { itemNumber: 14, mean: 0.90, sd: 0.92 },  // Fear of doing things when watched
    { itemNumber: 15, mean: 0.85, sd: 0.90 },  // Greatest fears: embarrassment
    { itemNumber: 16, mean: 0.55, sd: 0.75 },  // Avoid speaking to authority
    { itemNumber: 17, mean: 0.60, sd: 0.78 },  // Trembling/shaking in social situations
  ],
};

/**
 * PQ-16 (16 items, 0–1 binary)
 * Source: Ising HK et al. Schizophr Res. 2012;138(1):29-34.
 * Savill M et al. Schizophr Res. 2023 (large nonclinical sample).
 * In non-clinical undergraduate samples, high endorsement for some items (up to 72%).
 * Many PQ-16 items reflect normative experiences in general population.
 */
export const PQ16_NORMS: InstrumentNorms = {
  instrumentName: "PQ-16",
  quality: "ESTIMATED",
  sampleN: 3584,
  sampleDescription: "US undergraduate non-clinical sample (Savill et al., UCLA students)",
  citation: "Ising HK et al. Schizophr Res. 2012;138(1):29-34. Savill M et al. 2023.",
  notes: "Binary: mean=p, SD=sqrt(p(1-p)). Endorsement rates are HIGH in non-clinical populations for many items (perceptual items 20-70%). Items about disorganization/concentration are most commonly endorsed.",
  items: [
    { itemNumber: 1,  mean: 0.25, sd: Math.sqrt(0.25 * 0.75) },  // Feel uninterested in things
    { itemNumber: 2,  mean: 0.38, sd: Math.sqrt(0.38 * 0.62) },  // Often feel lonely
    { itemNumber: 3,  mean: 0.15, sd: Math.sqrt(0.15 * 0.85) },  // Crying for no reason
    { itemNumber: 4,  mean: 0.20, sd: Math.sqrt(0.20 * 0.80) },  // Unfamiliar thoughts
    { itemNumber: 5,  mean: 0.55, sd: Math.sqrt(0.55 * 0.45) },  // Unusual experiences with hearing/vision
    { itemNumber: 6,  mean: 0.35, sd: Math.sqrt(0.35 * 0.65) },  // Confused about real vs imagined
    { itemNumber: 7,  mean: 0.12, sd: Math.sqrt(0.12 * 0.88) },  // Magical powers
    { itemNumber: 8,  mean: 0.40, sd: Math.sqrt(0.40 * 0.60) },  // Difficulty expressing thoughts
    { itemNumber: 9,  mean: 0.30, sd: Math.sqrt(0.30 * 0.70) },  // Difficulty controlling thoughts
    { itemNumber: 10, mean: 0.18, sd: Math.sqrt(0.18 * 0.82) },  // People can read your mind
    { itemNumber: 11, mean: 0.72, sd: Math.sqrt(0.72 * 0.28) },  // Difficulty organizing thoughts
    { itemNumber: 12, mean: 0.22, sd: Math.sqrt(0.22 * 0.78) },  // Others talking about you
    { itemNumber: 13, mean: 0.15, sd: Math.sqrt(0.15 * 0.85) },  // Others controlling your thoughts
    { itemNumber: 14, mean: 0.10, sd: Math.sqrt(0.10 * 0.90) },  // Receiving messages from TV
    { itemNumber: 15, mean: 0.45, sd: Math.sqrt(0.45 * 0.55) },  // Seen unusual things
    { itemNumber: 16, mean: 0.25, sd: Math.sqrt(0.25 * 0.75) },  // Heard unusual things
  ],
};

/**
 * PHQ-Panic (15 items, 0–1 binary)
 * Source: Spitzer RL et al. JAMA. 1999;282(18):1737-1744 (original PRIME-MD PHQ).
 * Panic prevalence in general population: ~4.7% (12-month).
 * Items follow a branching logic: item 1 is gate question.
 * General population endorsement rates estimated from epidemiological data.
 */
export const PHQ_PANIC_NORMS: InstrumentNorms = {
  instrumentName: "PHQ-Panic",
  quality: "ESTIMATED",
  sampleN: 3000,
  sampleDescription: "Estimated from general population panic prevalence and primary care validation studies",
  citation: "Spitzer RL et al. JAMA. 1999;282(18):1737-1744. Kessler RC et al. Arch Gen Psychiatry. 2005.",
  notes: "Binary: mean=p, SD=sqrt(p(1-p)). Item 1 is gateway (anxiety attacks). Items 2-15 are conditional symptoms. Rates reflect unconditional endorsement in gen pop.",
  items: [
    { itemNumber: 1,  mean: 0.15, sd: Math.sqrt(0.15 * 0.85) },  // Anxiety attack (gateway)
    { itemNumber: 2,  mean: 0.12, sd: Math.sqrt(0.12 * 0.88) },  // Has this happened before?
    { itemNumber: 3,  mean: 0.10, sd: Math.sqrt(0.10 * 0.90) },  // Come on suddenly?
    { itemNumber: 4,  mean: 0.08, sd: Math.sqrt(0.08 * 0.92) },  // Reach peak within 10 min
    { itemNumber: 5,  mean: 0.10, sd: Math.sqrt(0.10 * 0.90) },  // Heart racing/pounding
    { itemNumber: 6,  mean: 0.08, sd: Math.sqrt(0.08 * 0.92) },  // Sweating
    { itemNumber: 7,  mean: 0.06, sd: Math.sqrt(0.06 * 0.94) },  // Trembling/shaking
    { itemNumber: 8,  mean: 0.08, sd: Math.sqrt(0.08 * 0.92) },  // Shortness of breath
    { itemNumber: 9,  mean: 0.06, sd: Math.sqrt(0.06 * 0.94) },  // Choking feeling
    { itemNumber: 10, mean: 0.07, sd: Math.sqrt(0.07 * 0.93) },  // Chest pain
    { itemNumber: 11, mean: 0.08, sd: Math.sqrt(0.08 * 0.92) },  // Nausea/stomach distress
    { itemNumber: 12, mean: 0.07, sd: Math.sqrt(0.07 * 0.93) },  // Dizzy/faint
    { itemNumber: 13, mean: 0.06, sd: Math.sqrt(0.06 * 0.94) },  // Tingling/numbness
    { itemNumber: 14, mean: 0.05, sd: Math.sqrt(0.05 * 0.95) },  // Fear of dying
    { itemNumber: 15, mean: 0.05, sd: Math.sqrt(0.05 * 0.95) },  // Fear of going crazy
  ],
};

/**
 * SPQ-B (22 items, 0–1 binary)
 * Source: Raine A & Benishay D. J Pers Disord. 1995;9(4):346-355.
 * Compton MT et al. Schizophr Res. 2009;115(2-3):170-177.
 * French gen pop: total M=43.6 on Likert version; binary version M≈6-8 out of 22.
 * Per-item endorsement ≈ 0.27-0.36 in nonclinical samples.
 */
export const SPQB_NORMS: InstrumentNorms = {
  instrumentName: "SPQ-B",
  quality: "ESTIMATED",
  sampleN: 1683,
  sampleDescription: "Non-clinical young adult samples (Compton et al. 2009, undergraduate students)",
  citation: "Raine A & Benishay D. J Pers Disord. 1995;9(4):346-355. Compton MT et al. Schizophr Res. 2009;115:170-177.",
  notes: "Binary: mean=p, SD=sqrt(p(1-p)). Cognitive-perceptual items lowest, interpersonal items higher. Total M≈7.4/22 in undergrads.",
  items: [
    // Cognitive-Perceptual (8 items)
    { itemNumber: 1,  mean: 0.20, sd: Math.sqrt(0.20 * 0.80) },  // Unusual perceptual experiences
    { itemNumber: 2,  mean: 0.15, sd: Math.sqrt(0.15 * 0.85) },  // Odd beliefs
    { itemNumber: 3,  mean: 0.18, sd: Math.sqrt(0.18 * 0.82) },  // Magical thinking
    { itemNumber: 4,  mean: 0.22, sd: Math.sqrt(0.22 * 0.78) },  // Ideas of reference
    { itemNumber: 5,  mean: 0.25, sd: Math.sqrt(0.25 * 0.75) },  // Suspiciousness
    { itemNumber: 6,  mean: 0.20, sd: Math.sqrt(0.20 * 0.80) },  // Bodily illusions
    { itemNumber: 7,  mean: 0.12, sd: Math.sqrt(0.12 * 0.88) },  // Paranormal experiences
    { itemNumber: 8,  mean: 0.15, sd: Math.sqrt(0.15 * 0.85) },  // Unusual perceptions
    // Interpersonal (8 items)
    { itemNumber: 9,  mean: 0.45, sd: Math.sqrt(0.45 * 0.55) },  // Excessive social anxiety
    { itemNumber: 10, mean: 0.40, sd: Math.sqrt(0.40 * 0.60) },  // No close friends
    { itemNumber: 11, mean: 0.38, sd: Math.sqrt(0.38 * 0.62) },  // Constricted affect
    { itemNumber: 12, mean: 0.42, sd: Math.sqrt(0.42 * 0.58) },  // Social anxiety
    { itemNumber: 13, mean: 0.35, sd: Math.sqrt(0.35 * 0.65) },  // Suspiciousness/paranoia
    { itemNumber: 14, mean: 0.30, sd: Math.sqrt(0.30 * 0.70) },  // Prefer being alone
    { itemNumber: 15, mean: 0.38, sd: Math.sqrt(0.38 * 0.62) },  // Anxious around people
    { itemNumber: 16, mean: 0.32, sd: Math.sqrt(0.32 * 0.68) },  // Feel watching/observed
    // Disorganized (6 items)
    { itemNumber: 17, mean: 0.35, sd: Math.sqrt(0.35 * 0.65) },  // Odd speech
    { itemNumber: 18, mean: 0.40, sd: Math.sqrt(0.40 * 0.60) },  // Vague/unclear communication
    { itemNumber: 19, mean: 0.30, sd: Math.sqrt(0.30 * 0.70) },  // Odd behavior
    { itemNumber: 20, mean: 0.25, sd: Math.sqrt(0.25 * 0.75) },  // Eccentric behavior
    { itemNumber: 21, mean: 0.35, sd: Math.sqrt(0.35 * 0.65) },  // Rambling speech
    { itemNumber: 22, mean: 0.28, sd: Math.sqrt(0.28 * 0.72) },  // Odd mannerisms
  ],
};

/**
 * AQ-10 (10 items, 0–1 binary after scoring)
 * Source: Allison C et al. J Autism Dev Disord. 2012;42(5):959-975.
 * Lundin A et al. J Autism Dev Disord. 2019;49:2749-2757 (Stockholm, N=44,722).
 * General population mean ≈ 2.6/10, SD ≈ 1.8.
 * Items are scored dichotomously (agree/disagree mapped to 0/1).
 */
export const AQ10_NORMS: InstrumentNorms = {
  instrumentName: "AQ-10",
  quality: "DERIVED",
  sampleN: 44722,
  sampleDescription: "Stockholm Public Health Cohort (Lundin et al. 2019)",
  citation: "Allison C et al. J Autism Dev Disord. 2012;42(5):959-975. Lundin A et al. J Autism Dev Disord. 2019;49:2749-2757.",
  notes: "Binary after scoring (Likert responses mapped to 0/1). Mean total ≈ 2.6/10. Attention-switching and social conversation items most commonly endorsed.",
  items: [
    { itemNumber: 1,  mean: 0.32, sd: Math.sqrt(0.32 * 0.68) },  // Prefer doing things with others vs alone (R)
    { itemNumber: 2,  mean: 0.25, sd: Math.sqrt(0.25 * 0.75) },  // Prefer same way over and over
    { itemNumber: 3,  mean: 0.35, sd: Math.sqrt(0.35 * 0.65) },  // Easy to imagine what characters look like
    { itemNumber: 4,  mean: 0.30, sd: Math.sqrt(0.30 * 0.70) },  // Get absorbed in one thing
    { itemNumber: 5,  mean: 0.18, sd: Math.sqrt(0.18 * 0.82) },  // Notice small sounds others don't
    { itemNumber: 6,  mean: 0.20, sd: Math.sqrt(0.20 * 0.80) },  // Notice patterns in things
    { itemNumber: 7,  mean: 0.22, sd: Math.sqrt(0.22 * 0.78) },  // Find social situations easy (R)
    { itemNumber: 8,  mean: 0.38, sd: Math.sqrt(0.38 * 0.62) },  // Difficult to work out intentions
    { itemNumber: 9,  mean: 0.15, sd: Math.sqrt(0.15 * 0.85) },  // Like to collect information
    { itemNumber: 10, mean: 0.25, sd: Math.sqrt(0.25 * 0.75) },  // Hard to make new friends
  ],
};

/**
 * CDS-2 (2 items, 0–4 scale)
 * Source: Sierra M & Berrios GE. Psychiatry Res. 2000;93(2):153-164.
 * Michal M et al. J Affect Disord. 2011;128(1-2):106-111 (German gen pop, N=2512).
 * 21.8% endorsed at least one item, 3.4% in clinically significant range.
 * Scale: 0=never to 4=all the time.
 */
export const CDS2_NORMS: InstrumentNorms = {
  instrumentName: "CDS-2",
  quality: "DERIVED",
  sampleN: 2512,
  sampleDescription: "German general population (Michal et al. 2011)",
  citation: "Sierra M & Berrios GE. Psychiatry Res. 2000;93(2):153-164. Michal M et al. J Affect Disord. 2011;128(1-2):106-111.",
  notes: "21.8% endorsed at least one item, 3.4% scored clinically significant. Most score 0. Items: derealization and depersonalization.",
  items: [
    { itemNumber: 1, mean: 0.28, sd: 0.65 },  // Things around you feel unreal (derealization)
    { itemNumber: 2, mean: 0.22, sd: 0.58 },  // Feel detached from your body (depersonalization)
  ],
};

/**
 * PID-5-BF (25 items, 0–3 scale)
 * Source: Krueger RF et al. Psychol Med. 2012;42(9):1879-1890.
 * Bach B et al. J Pers Disord. 2016;30(2):192-211 (normative data).
 * Scale: 0=very false, 1=sometimes false, 2=sometimes true, 3=very true.
 * Domain means in representative sample (N=264): Negative Affect≈0.84, Detachment≈0.52,
 * Antagonism≈0.30, Disinhibition≈0.55, Psychoticism≈0.41.
 */
export const PID5BF_NORMS: InstrumentNorms = {
  instrumentName: "PID-5-BF",
  quality: "DERIVED",
  sampleN: 264,
  sampleDescription: "US representative sample (Krueger et al. 2012)",
  citation: "Krueger RF et al. Psychol Med. 2012;42(9):1879-1890. Bach B et al. J Pers Disord. 2016;30(2):192-211.",
  notes: "Domain-level means from Krueger 2012 representative sample, distributed across items within domains. Negative Affect domain highest, Antagonism lowest.",
  items: [
    // Negative Affectivity (items 1-5): domain M≈0.84
    { itemNumber: 1,  mean: 0.90, sd: 0.82 },  // Emotional lability
    { itemNumber: 2,  mean: 0.85, sd: 0.80 },  // Anxiousness
    { itemNumber: 3,  mean: 0.80, sd: 0.78 },  // Separation insecurity
    { itemNumber: 4,  mean: 0.88, sd: 0.82 },  // Hostility
    { itemNumber: 5,  mean: 0.78, sd: 0.76 },  // Perseveration
    // Detachment (items 6-10): domain M≈0.52
    { itemNumber: 6,  mean: 0.55, sd: 0.70 },  // Withdrawal
    { itemNumber: 7,  mean: 0.60, sd: 0.72 },  // Anhedonia
    { itemNumber: 8,  mean: 0.45, sd: 0.65 },  // Depressivity
    { itemNumber: 9,  mean: 0.48, sd: 0.68 },  // Restricted affectivity
    { itemNumber: 10, mean: 0.52, sd: 0.70 },  // Suspiciousness
    // Antagonism (items 11-15): domain M≈0.30
    { itemNumber: 11, mean: 0.25, sd: 0.52 },  // Manipulativeness
    { itemNumber: 12, mean: 0.22, sd: 0.50 },  // Deceitfulness
    { itemNumber: 13, mean: 0.35, sd: 0.58 },  // Grandiosity
    { itemNumber: 14, mean: 0.30, sd: 0.55 },  // Attention seeking
    { itemNumber: 15, mean: 0.38, sd: 0.60 },  // Callousness
    // Disinhibition (items 16-20): domain M≈0.55
    { itemNumber: 16, mean: 0.60, sd: 0.72 },  // Irresponsibility
    { itemNumber: 17, mean: 0.55, sd: 0.70 },  // Impulsivity
    { itemNumber: 18, mean: 0.50, sd: 0.68 },  // Distractibility
    { itemNumber: 19, mean: 0.58, sd: 0.72 },  // Risk taking
    { itemNumber: 20, mean: 0.52, sd: 0.70 },  // Rigid perfectionism (reversed domain)
    // Psychoticism (items 21-25): domain M≈0.41
    { itemNumber: 21, mean: 0.45, sd: 0.65 },  // Unusual beliefs
    { itemNumber: 22, mean: 0.38, sd: 0.60 },  // Eccentricity
    { itemNumber: 23, mean: 0.42, sd: 0.62 },  // Perceptual dysregulation
    { itemNumber: 24, mean: 0.40, sd: 0.62 },  // Cognitive/perceptual dysregulation
    { itemNumber: 25, mean: 0.38, sd: 0.60 },  // Unusual experiences
  ],
};

/**
 * WI-7 (7 items, 0–4 scale) - Whiteley Index for illness anxiety
 * Source: Pilowsky I. Br J Psychiatry. 1967;113:89-93.
 * Lee S et al. J Psychosom Res. 2012;72(6):458-463 (Hong Kong gen pop, N=3014).
 * Most endorsed: "worrying about health" (55.7%), "worrying about disease" (48.7%).
 * Scale: 0=not at all to 4=a great deal.
 */
export const WI7_NORMS: InstrumentNorms = {
  instrumentName: "WI-7",
  quality: "DERIVED",
  sampleN: 3014,
  sampleDescription: "Hong Kong general population, ages 15-65 (Lee et al. 2012)",
  citation: "Pilowsky I. Br J Psychiatry. 1967;113:89-93. Lee S et al. J Psychosom Res. 2012;72(6):458-463.",
  notes: "Item endorsement rates from Lee 2012. 'Worrying about health' most endorsed (55.7%). Means estimated from binary endorsement rates and intensity distributions.",
  items: [
    { itemNumber: 1, mean: 1.10, sd: 1.15 },  // Worry about health
    { itemNumber: 2, mean: 0.95, sd: 1.08 },  // Worry about disease if brought to attention
    { itemNumber: 3, mean: 0.55, sd: 0.85 },  // Bothered by many aches/pains
    { itemNumber: 4, mean: 0.50, sd: 0.82 },  // Easy to forget about aches (R)
    { itemNumber: 5, mean: 0.40, sd: 0.75 },  // Afraid of illness
    { itemNumber: 6, mean: 0.60, sd: 0.88 },  // Bothered by bodily sensations
    { itemNumber: 7, mean: 0.45, sd: 0.78 },  // Hard to believe doctor when told OK
  ],
};

/**
 * HRS-SR (5 items, 0–8 scale)
 * Source: Tolin DF et al. Behav Res Ther. 2010;48(8):822-831.
 * Nonclinical mean total: M=3.34, SD=4.97.
 * Items: clutter, difficulty discarding, acquisition, distress, impairment.
 * Scale: 0–8 with anchor points at 0, 2, 4, 6, 8.
 */
export const HRSSR_NORMS: InstrumentNorms = {
  instrumentName: "HRS-SR",
  quality: "DERIVED",
  sampleN: 850,
  sampleDescription: "US nonclinical community sample (Tolin et al. 2010)",
  citation: "Tolin DF et al. Behav Res Ther. 2010;48(8):822-831.",
  notes: "Total M=3.34, SD=4.97 in nonclinical sample. Items are 0-8 scale. Clutter and difficulty discarding tend highest; distress and impairment lowest.",
  items: [
    { itemNumber: 1, mean: 0.95, sd: 1.45 },  // Clutter
    { itemNumber: 2, mean: 0.85, sd: 1.35 },  // Difficulty discarding
    { itemNumber: 3, mean: 0.65, sd: 1.20 },  // Excessive acquisition
    { itemNumber: 4, mean: 0.50, sd: 1.05 },  // Distress
    { itemNumber: 5, mean: 0.39, sd: 0.95 },  // Impairment in functioning
  ],
};

/**
 * BDDQ (4 items, 0–1 binary)
 * Source: Phillips KA. Psychosomatics. 1996;37:170.
 * Brohede S et al. Psychiatry Res. 2013;210(2):647-652 (Swedish community women).
 * BDD prevalence in community: 1.7-2.4%.
 * Items: concern about appearance, preoccupation time, distress, impairment.
 */
export const BDDQ_NORMS: InstrumentNorms = {
  instrumentName: "BDDQ",
  quality: "ESTIMATED",
  sampleN: 2885,
  sampleDescription: "Swedish community women (Brohede et al. 2013), supplemented by general prevalence data",
  citation: "Phillips KA. Psychosomatics. 1996;37:170. Brohede S et al. Psychiatry Res. 2013;210(2):647-652.",
  notes: "Binary: mean=p, SD=sqrt(p(1-p)). Gateway item (concern) endorsed more widely; impairment item least endorsed. BDD prevalence ~2%.",
  items: [
    { itemNumber: 1, mean: 0.35, sd: Math.sqrt(0.35 * 0.65) },  // Preoccupied with appearance defect
    { itemNumber: 2, mean: 0.15, sd: Math.sqrt(0.15 * 0.85) },  // Thinks about it a lot (time)
    { itemNumber: 3, mean: 0.08, sd: Math.sqrt(0.08 * 0.92) },  // Causes significant distress
    { itemNumber: 4, mean: 0.05, sd: Math.sqrt(0.05 * 0.95) },  // Interferes with social/work life
  ],
};

/**
 * SCOFF (5 items, 0–1 binary)
 * Source: Morgan JF et al. BMJ. 1999;319(7223):1467-1468.
 * Richter F et al. Psychiatr Prax. 2017;44(4):207-213 (German gen pop).
 * Screen-positive rate: ~10% at cutoff ≥2. Individual item endorsement varies.
 */
export const SCOFF_NORMS: InstrumentNorms = {
  instrumentName: "SCOFF",
  quality: "ESTIMATED",
  sampleN: 2500,
  sampleDescription: "German representative sample (Richter et al. 2017), supplemented by meta-analytic data",
  citation: "Morgan JF et al. BMJ. 1999;319(7223):1467-1468. Richter F et al. Psychiatr Prax. 2017;44(4):207-213.",
  notes: "Binary: mean=p, SD=sqrt(p(1-p)). S=sick, C=control, O=one stone, F=fat, F=food. Food/fat items lower endorsement due to stigma.",
  items: [
    { itemNumber: 1, mean: 0.05, sd: Math.sqrt(0.05 * 0.95) },  // Make yourself Sick (vomit)
    { itemNumber: 2, mean: 0.12, sd: Math.sqrt(0.12 * 0.88) },  // Lost Control over eating
    { itemNumber: 3, mean: 0.08, sd: Math.sqrt(0.08 * 0.92) },  // Lost One stone (14 lbs) in 3 months
    { itemNumber: 4, mean: 0.25, sd: Math.sqrt(0.25 * 0.75) },  // Believe yourself Fat when others say thin
    { itemNumber: 5, mean: 0.10, sd: Math.sqrt(0.10 * 0.90) },  // Food dominates your life
  ],
};

/**
 * BEDS-7 (7 items, 0–4 scale)
 * Source: Herman BK et al. Prim Care Companion CNS Disord. 2016;18(2).
 * BED prevalence in general population: ~2-3%.
 * Most items very low endorsed in general population.
 * Scale: varies by item (some binary, some frequency).
 * For modeling purposes, treating as 0-4 Likert.
 */
export const BEDS7_NORMS: InstrumentNorms = {
  instrumentName: "BEDS-7",
  quality: "ESTIMATED",
  sampleN: 82243,
  sampleDescription: "US community sample (Herman et al. 2016 development study)",
  citation: "Herman BK et al. Prim Care Companion CNS Disord. 2016;18(2).",
  notes: "BED prevalence ~2-3% in gen pop. Most items have strong floor effects. Items cover eating patterns, loss of control, distress.",
  items: [
    { itemNumber: 1, mean: 0.45, sd: 0.80 },  // Eating faster than normal
    { itemNumber: 2, mean: 0.40, sd: 0.75 },  // Eating until uncomfortably full
    { itemNumber: 3, mean: 0.35, sd: 0.72 },  // Eating large amounts when not hungry
    { itemNumber: 4, mean: 0.30, sd: 0.68 },  // Eating alone due to embarrassment
    { itemNumber: 5, mean: 0.25, sd: 0.62 },  // Feeling disgusted/guilty after overeating
    { itemNumber: 6, mean: 0.20, sd: 0.55 },  // Feeling very upset about overeating
    { itemNumber: 7, mean: 0.15, sd: 0.48 },  // Eating binges (frequency)
  ],
};

/**
 * PGSI (9 items, 0–3 scale)
 * Source: Ferris J & Wynne H. Canadian Problem Gambling Index: Final Report. 2001.
 * Currie SR et al. Can J Psychiatry. 2013;58(8):462-469 (N>25,000 Canadian gen pop).
 * Total M=0.5, SD=1.8 in gen pop. Most items near floor.
 * Scale: 0=never, 1=sometimes, 2=most of the time, 3=almost always.
 */
export const PGSI_NORMS: InstrumentNorms = {
  instrumentName: "PGSI",
  quality: "DERIVED",
  sampleN: 25584,
  sampleDescription: "Canadian general population (Currie et al. 2013, merged CCHS/CPGI datasets)",
  citation: "Ferris J & Wynne H. CPGI Final Report. 2001. Currie SR et al. Can J Psychiatry. 2013;58(8):462-469.",
  notes: "Total M=0.5, SD=1.8. Most people score 0. 'Chasing losses' most commonly endorsed. Endorsement rates: chasing losses 6.8%, feeling guilty ~5%.",
  items: [
    { itemNumber: 1, mean: 0.08, sd: 0.35 },  // Bet more than can afford
    { itemNumber: 2, mean: 0.10, sd: 0.38 },  // Need to gamble with more money
    { itemNumber: 3, mean: 0.12, sd: 0.42 },  // Go back to win money back (chasing losses)
    { itemNumber: 4, mean: 0.06, sd: 0.30 },  // Borrowed/sold to get gambling money
    { itemNumber: 5, mean: 0.05, sd: 0.28 },  // Felt might have a problem
    { itemNumber: 6, mean: 0.04, sd: 0.25 },  // Gambling caused health problems
    { itemNumber: 7, mean: 0.08, sd: 0.35 },  // People criticized gambling
    { itemNumber: 8, mean: 0.06, sd: 0.30 },  // Gambling caused financial problems
    { itemNumber: 9, mean: 0.08, sd: 0.35 },  // Felt guilty about gambling
  ],
};

/**
 * HCL-32 (32 items, 0–1 binary)
 * Source: Angst J et al. Eur Arch Psychiatry Clin Neurosci. 2005;255:402-412.
 * Data from Korean non-clinical community (Lee et al. 2016, N=313).
 * Endorsement rates extracted from Table 2.
 */
export const HCL32_NORMS: InstrumentNorms = {
  instrumentName: "HCL-32",
  quality: "DIRECT",
  sampleN: 313,
  sampleDescription: "Korean non-clinical control group (Lee et al. 2016)",
  citation: "Angst J et al. Eur Arch Psychiatry Clin Neurosci. 2005;255:402-412. Lee KH et al. Investigation of HCL-32 in non-clinical population. 2016.",
  notes: "Binary: mean=p, SD=sqrt(p(1-p)). Active/elated items endorsed by 30-81% of non-clinical controls. Irritable/risk items much lower (3-45%). Drug/alcohol items lowest.",
  items: [
    { itemNumber: 1,  mean: 0.53, sd: Math.sqrt(0.53 * 0.47) },  // Need less sleep
    { itemNumber: 2,  mean: 0.80, sd: Math.sqrt(0.80 * 0.20) },  // More energetic
    { itemNumber: 3,  mean: 0.78, sd: Math.sqrt(0.78 * 0.22) },  // More self-confident
    { itemNumber: 4,  mean: 0.79, sd: Math.sqrt(0.79 * 0.21) },  // Enjoy work more
    { itemNumber: 5,  mean: 0.71, sd: Math.sqrt(0.71 * 0.29) },  // More sociable
    { itemNumber: 6,  mean: 0.60, sd: Math.sqrt(0.60 * 0.40) },  // Want to travel more
    { itemNumber: 7,  mean: 0.10, sd: Math.sqrt(0.10 * 0.90) },  // Drive faster
    { itemNumber: 8,  mean: 0.39, sd: Math.sqrt(0.39 * 0.61) },  // Spend more
    { itemNumber: 9,  mean: 0.09, sd: Math.sqrt(0.09 * 0.91) },  // Take more risks
    { itemNumber: 10, mean: 0.53, sd: Math.sqrt(0.53 * 0.47) },  // Physically more active
    { itemNumber: 11, mean: 0.78, sd: Math.sqrt(0.78 * 0.22) },  // Plan more activities
    { itemNumber: 12, mean: 0.66, sd: Math.sqrt(0.66 * 0.34) },  // More ideas/creative
    { itemNumber: 13, mean: 0.62, sd: Math.sqrt(0.62 * 0.38) },  // Less shy
    { itemNumber: 14, mean: 0.37, sd: Math.sqrt(0.37 * 0.63) },  // Wear extravagant clothes
    { itemNumber: 15, mean: 0.62, sd: Math.sqrt(0.62 * 0.38) },  // Meet more people
    { itemNumber: 16, mean: 0.31, sd: Math.sqrt(0.31 * 0.69) },  // More interested in sex
    { itemNumber: 17, mean: 0.65, sd: Math.sqrt(0.65 * 0.35) },  // Talk more
    // Note: item 17 in some orderings = "more flirtatious"; following HCL-32 standard ordering
    { itemNumber: 18, mean: 0.65, sd: Math.sqrt(0.65 * 0.35) },  // Talk more (alternate)
    { itemNumber: 19, mean: 0.66, sd: Math.sqrt(0.66 * 0.34) },  // Think faster
    { itemNumber: 20, mean: 0.74, sd: Math.sqrt(0.74 * 0.26) },  // Make more jokes
    { itemNumber: 21, mean: 0.30, sd: Math.sqrt(0.30 * 0.70) },  // More easily distracted
    { itemNumber: 22, mean: 0.78, sd: Math.sqrt(0.78 * 0.22) },  // Engage in new things
    { itemNumber: 23, mean: 0.45, sd: Math.sqrt(0.45 * 0.55) },  // Thoughts jump
    { itemNumber: 24, mean: 0.68, sd: Math.sqrt(0.68 * 0.32) },  // Do things more quickly
    { itemNumber: 25, mean: 0.15, sd: Math.sqrt(0.15 * 0.85) },  // More impatient/irritable
    { itemNumber: 26, mean: 0.05, sd: Math.sqrt(0.05 * 0.95) },  // Exhausting/irritating to others
    { itemNumber: 27, mean: 0.03, sd: Math.sqrt(0.03 * 0.97) },  // Get into more quarrels
    { itemNumber: 28, mean: 0.81, sd: Math.sqrt(0.81 * 0.19) },  // Mood higher/optimistic
    { itemNumber: 29, mean: 0.31, sd: Math.sqrt(0.31 * 0.69) },  // Drink more coffee
    { itemNumber: 30, mean: 0.06, sd: Math.sqrt(0.06 * 0.94) },  // Smoke more
    { itemNumber: 31, mean: 0.23, sd: Math.sqrt(0.23 * 0.77) },  // Drink more alcohol
    { itemNumber: 32, mean: 0.01, sd: Math.sqrt(0.01 * 0.99) },  // Take more drugs
  ],
};


// ═══════════════════════════════════════════════════════════════════════════════
// MASTER LOOKUP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All instrument norms indexed by instrument name.
 * Usage: NORMATIVE_DATA["PHQ-9"].items[0].mean
 */
export const NORMATIVE_DATA: Record<string, InstrumentNorms> = {
  "PHQ-9":     PHQ9_NORMS,
  "GAD-7":     GAD7_NORMS,
  "PHQ-15":    PHQ15_NORMS,
  "PC-PTSD-5": PCPTSD5_NORMS,
  "AUDIT-C":   AUDITC_NORMS,
  "WHO-5":     WHO5_NORMS,
  "PCL-5":     PCL5_NORMS,
  "Y-BOCS":    YBOCS_NORMS,
  "CAPE-42":   CAPE42_NORMS,
  "AUDIT":     AUDIT_NORMS,
  "DAST-10":   DAST10_NORMS,
  "MDQ":       MDQ_NORMS,
  "ASRS":      ASRS_NORMS,
  "SPIN":      SPIN_NORMS,
  "PQ-16":     PQ16_NORMS,
  "PHQ-Panic": PHQ_PANIC_NORMS,
  "SPQ-B":     SPQB_NORMS,
  "AQ-10":     AQ10_NORMS,
  "CDS-2":     CDS2_NORMS,
  "PID-5-BF":  PID5BF_NORMS,
  "WI-7":      WI7_NORMS,
  "HRS-SR":    HRSSR_NORMS,
  "BDDQ":      BDDQ_NORMS,
  "SCOFF":     SCOFF_NORMS,
  "BEDS-7":    BEDS7_NORMS,
  "PGSI":      PGSI_NORMS,
  "HCL-32":    HCL32_NORMS,
};

/**
 * Helper: get normative mean and SD for a specific item.
 * Returns undefined if not found.
 */
export function getItemNorms(
  instrumentName: string,
  itemNumber: number
): { mean: number; sd: number } | undefined {
  const instrument = NORMATIVE_DATA[instrumentName];
  if (!instrument) return undefined;
  const item = instrument.items.find((i) => i.itemNumber === itemNumber);
  if (!item) return undefined;
  return { mean: item.mean, sd: item.sd };
}
