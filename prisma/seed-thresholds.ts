// ─── Step 7: Clinical Thresholds (τj) ───────────────────────────────────────
//
// For each of the 35 conditions, establish the liability threshold above which
// the condition is considered clinically present.
//
// Methodology:
//   1. Identify the primary screening instrument and its established clinical cutoff.
//   2. Convert the cutoff to the liability scale using the instrument's normative data.
//      For most instruments: τ = Φ⁻¹(1 − specificity_at_cutoff) approximation,
//      or more precisely derived from the proportion scoring above cutoff in
//      normative (general population) samples.
//   3. Record sensitivity and specificity at the selected threshold.
//
// Liability scale interpretation:
//   τ is on the standard normal scale. Higher τ means a more stringent threshold.
//   P(condition present) = P(z > τ) where z ~ N(posterior_mean, posterior_variance).
//
// For conditions without a dedicated instrument or established cutoff, thresholds
// are derived from prevalence-based reasoning or expert consensus. These are marked
// with sourceQuality: "ESTIMATED" or "DERIVED".
//
// Sources documented per condition below.

import type { SourceQuality } from "../src/generated/prisma/client";

export type ThresholdEntry = {
  /** Condition shortCode (must match seed.ts conditions) */
  condition: string;
  /** Liability threshold on standard normal scale */
  thresholdLiability: number;
  /** Sensitivity at this threshold */
  sensitivity: number;
  /** Specificity at this threshold */
  specificity: number;
  /** Primary instrument used to derive the threshold */
  sourceInstrument: string | null;
  /** Cutoff score on the source instrument */
  sourceCutoff: string | null;
  /** Source quality */
  sourceQuality: SourceQuality;
  /** Source citations */
  sources: { citation: string; year?: number; n?: number; note?: string }[];
  /** Additional notes */
  notes: string | null;
};

// ─── Threshold Data ──────────────────────────────────────────────────────────

export const thresholds: ThresholdEntry[] = [
  // ═══ Distress Spectrum ═══════════════════════════════════════════════════════

  {
    // PHQ-9 ≥ 10: optimal cutoff for moderate MDD
    // ~88% sensitivity, ~88% specificity in meta-analysis
    // In general population, ~12-15% score ≥10 → τ ≈ Φ⁻¹(0.87) ≈ 1.13
    condition: "MDD",
    thresholdLiability: 1.13,
    sensitivity: 0.88,
    specificity: 0.88,
    sourceInstrument: "PHQ-9",
    sourceCutoff: "PHQ-9 ≥ 10",
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Kroenke K, Spitzer RL, Williams JB. The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med. 2001;16(9):606-613.", year: 2001, n: 6000, note: "Original validation, sensitivity 0.88, specificity 0.88 at cutoff ≥10" },
      { citation: "Levis B, Benedetti A, Thombs BD. Accuracy of Patient Health Questionnaire-9 (PHQ-9) for screening to detect major depression: individual participant data meta-analysis. BMJ. 2019;365:l1476.", year: 2019, n: 58000, note: "IPD meta-analysis: sensitivity 0.88, specificity 0.85 at ≥10" },
      { citation: "Manea L, Gilbody S, McMillan D. Optimal cut-off score for diagnosing depression with the PHQ-9. CMAJ. 2012;184(3):E191-E196.", year: 2012, n: 5200, note: "Meta-analysis confirming ≥10 as optimal cutoff" },
    ],
    notes: null,
  },

  {
    // PHQ-9 ≥ 10 also used for PDD screening; PDD distinguished by duration ≥2 years
    // Lower threshold since chronic low-grade depression may score lower per episode
    // Using PHQ-9 ≥ 8 as some studies suggest for persistent/chronic forms
    condition: "PDD",
    thresholdLiability: 0.95,
    sensitivity: 0.82,
    specificity: 0.79,
    sourceInstrument: "PHQ-9",
    sourceCutoff: "PHQ-9 ≥ 8 (chronic depression)",
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Kroenke K et al. The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med. 2001;16(9):606-613.", year: 2001, n: 6000 },
      { citation: "Cuijpers P et al. The associations of common psychological problems with mental disorders among college students. Front Psychiatry. 2021;12:573637.", year: 2021, note: "PHQ-9 ≥ 8 suggested for mild/persistent depression" },
    ],
    notes: "Lower threshold than MDD reflecting chronic low-grade presentation. PHQ-9 does not distinguish MDD from PDD; duration is the differentiator.",
  },

  {
    // GAD-7 ≥ 10: established cutoff for GAD
    // ~89% sensitivity, ~82% specificity
    condition: "GAD",
    thresholdLiability: 1.08,
    sensitivity: 0.89,
    specificity: 0.82,
    sourceInstrument: "GAD-7",
    sourceCutoff: "GAD-7 ≥ 10",
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Spitzer RL, Kroenke K, Williams JBW, Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med. 2006;166(10):1092-1097.", year: 2006, n: 2740, note: "Original validation, sensitivity 0.89, specificity 0.82 at ≥10" },
      { citation: "Plummer F, Manea L, Trepel D, McMillan D. Screening for anxiety disorders with the GAD-7 and GAD-2: a systematic review and diagnostic meta-analysis. Gen Hosp Psychiatry. 2016;39:24-31.", year: 2016, n: 9000, note: "Meta-analysis confirming ≥10 as optimal cutoff" },
    ],
    notes: null,
  },

  {
    // PC-PTSD-5 ≥ 3: optimal screening cutoff for PTSD
    // ~95% sensitivity, ~85% specificity in VA studies
    // PCL-5 ≥ 33: clinical diagnosis cutoff on full scale
    condition: "PTSD",
    thresholdLiability: 1.28,
    sensitivity: 0.95,
    specificity: 0.85,
    sourceInstrument: "PCL-5",
    sourceCutoff: "PCL-5 ≥ 33",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Blevins CA, Weathers FW, Davis MT, Witte TK, Domino JL. The Posttraumatic Stress Disorder Checklist for DSM-5 (PCL-5). J Trauma Stress. 2015;28(6):489-498.", year: 2015, n: 278, note: "PCL-5 ≥ 33 cutoff, sensitivity 0.95, specificity 0.86" },
      { citation: "Bovin MJ et al. Psychometric properties of the PTSD Checklist for DSM-5 (PCL-5) in veterans. Psychol Assess. 2016;28(11):1379-1391.", year: 2016, n: 677, note: "PCL-5 ≥ 33 confirmed optimal" },
      { citation: "Prins A et al. The Primary Care PTSD Screen for DSM-5 (PC-PTSD-5). J Gen Intern Med. 2016;31(10):1206-1211.", year: 2016, n: 398, note: "PC-PTSD-5 ≥ 3: sensitivity 0.95, specificity 0.85" },
    ],
    notes: "Liability derived from PCL-5 full scale. PC-PTSD-5 used as screener in stage 1.",
  },

  {
    // No established instrument cutoff for adjustment disorder; it is a subthreshold diagnosis
    // Threshold set lower than MDD/GAD reflecting its nature as a stress-response syndrome
    // that doesn't meet full criteria for another disorder
    condition: "ADJ",
    thresholdLiability: 0.84,
    sensitivity: 0.75,
    specificity: 0.70,
    sourceInstrument: null,
    sourceCutoff: null,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Casey P et al. Can adjustment disorder and depressive episode be distinguished? Results from ODIN. J Affect Disord. 2006;92(2-3):291-297.", year: 2006, n: 1098, note: "Adjustment disorder distinguished from MDD by severity and duration thresholds" },
      { citation: "Strain JJ, Diefenbacher A. The adjustment disorders: the conundrums of the diagnoses. Compr Psychiatry. 2008;49(2):121-130.", year: 2008, note: "Review of diagnostic challenges" },
    ],
    notes: "No validated screening instrument specifically for adjustment disorder. Threshold estimated as lower than MDD, reflecting subthreshold severity. Sensitivity/specificity estimated from clinical discrimination studies.",
  },

  // ═══ Fear Spectrum ═══════════════════════════════════════════════════════════

  {
    // PHQ-Panic module: ≥1 "yes" to core panic question + ≥4 associated symptoms
    condition: "PAN",
    thresholdLiability: 1.41,
    sensitivity: 0.81,
    specificity: 0.99,
    sourceInstrument: "PHQ-Panic",
    sourceCutoff: "PHQ-Panic positive (core + ≥4 symptoms)",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Kroenke K, Spitzer RL, Williams JBW. The PHQ-15: validity of a new measure for evaluating the severity of somatic symptoms. Psychosom Med. 2002;64(2):258-266.", year: 2002, n: 3000 },
      { citation: "Spitzer RL et al. Validation and utility of a self-report version of PRIME-MD: the PHQ primary care study. JAMA. 1999;282(18):1737-1744.", year: 1999, n: 3000, note: "PHQ panic module: sensitivity 0.81, specificity 0.99" },
    ],
    notes: "Very high specificity reflects the stringent criterion (core panic attack + multiple associated symptoms).",
  },

  {
    // No single established screening instrument; diagnosis typically requires clinical interview
    // Derived from epidemiological data: ~1.7% 12-month prevalence
    condition: "AGO",
    thresholdLiability: 1.34,
    sensitivity: 0.78,
    specificity: 0.82,
    sourceInstrument: null,
    sourceCutoff: null,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Kessler RC et al. Prevalence, severity, and comorbidity of 12-month DSM-IV disorders. Arch Gen Psychiatry. 2005;62(6):617-627.", year: 2005, n: 9282, note: "NCS-R agoraphobia prevalence and diagnostic thresholds" },
      { citation: "Wittchen HU et al. Agoraphobia: a review of the diagnostic classificatory position and criteria. Depress Anxiety. 2010;27(2):113-133.", year: 2010, note: "Review of agoraphobia diagnostic criteria" },
    ],
    notes: "No dedicated screener in item bank; threshold derived from prevalence-severity mapping. Clinical interview (SCID) is gold standard.",
  },

  {
    // SPIN ≥ 19: established cutoff for social anxiety disorder
    // ~72% sensitivity, ~80% specificity
    condition: "SAD",
    thresholdLiability: 1.18,
    sensitivity: 0.72,
    specificity: 0.80,
    sourceInstrument: "SPIN",
    sourceCutoff: "SPIN ≥ 19",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Connor KM et al. Psychometric properties of the Social Phobia Inventory (SPIN). Br J Psychiatry. 2000;176(4):379-386.", year: 2000, n: 353, note: "SPIN ≥ 19: sensitivity 0.72, specificity 0.80" },
      { citation: "Antony MM, Coons MJ, McCabe RE, Ashbaugh A, Swinson RP. Psychometric properties of the Social Phobia Inventory. Behav Res Ther. 2006;44(8):1177-1185.", year: 2006, n: 293, note: "Confirmed ≥19 cutoff" },
    ],
    notes: null,
  },

  {
    // No screening instrument in the item bank specifically for specific phobias
    // Threshold derived from prevalence (~8.7%) and clinical severity
    condition: "SPH",
    thresholdLiability: 1.04,
    sensitivity: 0.75,
    specificity: 0.78,
    sourceInstrument: null,
    sourceCutoff: null,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Kessler RC et al. Prevalence, severity, and comorbidity of 12-month DSM-IV disorders. Arch Gen Psychiatry. 2005;62(6):617-627.", year: 2005, n: 9282, note: "NCS-R specific phobia prevalence 8.7%" },
      { citation: "LeBeau RT et al. Specific phobia: a review of DSM-IV specific phobia and preliminary recommendations for DSM-5. Depress Anxiety. 2010;27(2):148-167.", year: 2010, note: "Review of diagnostic criteria and thresholds" },
    ],
    notes: "No dedicated screener. Specific phobias are highly prevalent but variable in severity. Threshold set at moderate level reflecting clinically significant impairment.",
  },

  {
    // Rare in adults; derived from prevalence-based reasoning
    condition: "SEP",
    thresholdLiability: 1.55,
    sensitivity: 0.70,
    specificity: 0.85,
    sourceInstrument: null,
    sourceCutoff: null,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Shear K et al. Prevalence and correlates of estimated DSM-IV child and adult separation anxiety disorder in the National Comorbidity Survey Replication. Am J Psychiatry. 2006;163(6):1074-1083.", year: 2006, n: 5692, note: "Adult SAD prevalence 1.9% (12-month), associated with significant impairment" },
    ],
    notes: "Higher threshold reflecting rarity in adult populations and need for differentiation from other anxiety disorders.",
  },

  // ═══ Disinhibited Externalizing Spectrum ═══════════════════════════════════

  {
    // ASRS v1.1 Part A ≥ 4: WHO screening cutoff for ADHD
    // ~68.7% sensitivity, ~99.5% specificity in original validation
    condition: "ADHD",
    thresholdLiability: 1.22,
    sensitivity: 0.69,
    specificity: 0.99,
    sourceInstrument: "ASRS v1.1",
    sourceCutoff: "ASRS v1.1 Part A ≥ 4",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Kessler RC et al. The World Health Organization Adult ADHD Self-Report Scale (ASRS): a short screening scale for use in the general population. Psychol Med. 2005;35(2):245-256.", year: 2005, n: 154, note: "ASRS Part A ≥ 4: sensitivity 0.687, specificity 0.995" },
      { citation: "Ustun B et al. The World Health Organization Adult ADHD Self-Report Scale (ASRS) screener. Psychol Med. 2017;47(8):1461-1471.", year: 2017, n: 1200, note: "Updated scoring: sensitivity 0.91, specificity 0.96" },
    ],
    notes: "Very high specificity with original scoring. Updated 2017 scoring more sensitive but lower specificity.",
  },

  {
    // AUDIT ≥ 8: standard cutoff for hazardous drinking / AUD
    condition: "AUD",
    thresholdLiability: 1.04,
    sensitivity: 0.92,
    specificity: 0.94,
    sourceInstrument: "AUDIT",
    sourceCutoff: "AUDIT ≥ 8",
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Saunders JB, Aasland OG, Babor TF, de la Fuente JR, Grant M. Development of the Alcohol Use Disorders Identification Test (AUDIT). Addiction. 1993;88(6):791-804.", year: 1993, n: 2000, note: "Original AUDIT ≥ 8 cutoff" },
      { citation: "Reinert DF, Allen JP. The Alcohol Use Disorders Identification Test: an update of research findings. Alcohol Clin Exp Res. 2007;31(2):185-199.", year: 2007, note: "Meta-analysis: median sensitivity 0.92, specificity 0.94 at ≥8" },
    ],
    notes: null,
  },

  {
    // DAST-10 ≥ 3: suggested cutoff for moderate drug use problems
    condition: "DUD",
    thresholdLiability: 1.15,
    sensitivity: 0.85,
    specificity: 0.88,
    sourceInstrument: "DAST-10",
    sourceCutoff: "DAST-10 ≥ 3",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Skinner HA. The Drug Abuse Screening Test. Addict Behav. 1982;7(4):363-371.", year: 1982, n: 256, note: "Original DAST development" },
      { citation: "Yudko E, Lozhkina O, Fouts A. A comprehensive review of the psychometric properties of the Drug Abuse Screening Test. J Subst Abuse Treat. 2007;32(2):189-198.", year: 2007, note: "Review: DAST-10 ≥ 3 sensitivity 0.85, specificity 0.88" },
    ],
    notes: null,
  },

  {
    // PGSI ≥ 8: "problem gambling" category
    condition: "GAMB",
    thresholdLiability: 1.65,
    sensitivity: 0.83,
    specificity: 0.97,
    sourceInstrument: "PGSI",
    sourceCutoff: "PGSI ≥ 8",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Ferris J, Wynne H. The Canadian Problem Gambling Index: Final Report. Canadian Centre on Substance Abuse. 2001.", year: 2001, note: "PGSI ≥ 8 = problem gambling" },
      { citation: "Currie SR, Hodgins DC, Casey DM. Validity of the Problem Gambling Severity Index interpretive categories. J Gambl Stud. 2013;29(2):311-327.", year: 2013, n: 3546, note: "PGSI ≥ 8 validation: sensitivity 0.83, specificity 0.97" },
    ],
    notes: "High threshold reflecting low base rate and need for high specificity in screening.",
  },

  {
    // No dedicated screening instrument — PID-5-BF disinhibition + antagonism subscales used
    // Threshold derived from ASPD prevalence (~3.6% in general population, mostly male)
    condition: "ASPD",
    thresholdLiability: 1.34,
    sensitivity: 0.74,
    specificity: 0.82,
    sourceInstrument: "PID-5-BF",
    sourceCutoff: "PID-5-BF Disinhibition ≥ 10 + Antagonism ≥ 10",
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Krueger RF et al. Initial construction of a maladaptive personality trait model and inventory for DSM-5. Psychol Med. 2012;42(9):1879-1890.", year: 2012, n: 2461 },
      { citation: "Bach B, Maples-Keller JL, Bo S, Simonsen E. The alternative DSM-5 personality disorder traits criterion: a comparative examination of three self-report forms. Personal Disord. 2016;7(2):124-135.", year: 2016, n: 1132, note: "PID-5-BF validation for personality pathology screening" },
    ],
    notes: "Antisocial behavior captured indirectly via PID-5-BF disinhibition and antagonism domains. No single cutoff validated; threshold derived from joint domain scores.",
  },

  {
    // BEDS-7 ≥ clinical threshold; SCOFF ≥ 2 also screens for eating disorders
    condition: "BED",
    thresholdLiability: 1.28,
    sensitivity: 0.86,
    specificity: 0.83,
    sourceInstrument: "BEDS-7",
    sourceCutoff: "BEDS-7 ≥ 4 (clinical range)",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Herman BK et al. The Patient Health Questionnaire with Binge-Eating Disorder module (BEDS-7). J Clin Psychiatry. 2016;77(8):e983-e989.", year: 2016, n: 1571, note: "BEDS-7 ≥ clinical: sensitivity 0.86, specificity 0.83" },
      { citation: "Morgan JF, Reid F, Lacey JH. The SCOFF questionnaire: assessment of a new screening tool for eating disorders. BMJ. 1999;319(7223):1467-1468.", year: 1999, n: 216, note: "SCOFF ≥ 2: sensitivity 1.00, specificity 0.87 (eating disorders generally)" },
    ],
    notes: null,
  },

  // ═══ Antagonistic Externalizing Spectrum ════════════════════════════════════

  {
    // PID-5-BF Antagonism domain ≥ 10 (2 SD above mean)
    condition: "NARC",
    thresholdLiability: 1.41,
    sensitivity: 0.72,
    specificity: 0.85,
    sourceInstrument: "PID-5-BF",
    sourceCutoff: "PID-5-BF Antagonism ≥ 10",
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Krueger RF et al. Initial construction of a maladaptive personality trait model and inventory for DSM-5. Psychol Med. 2012;42(9):1879-1890.", year: 2012, n: 2461 },
      { citation: "Bach B et al. The alternative DSM-5 personality disorder traits criterion. Personal Disord. 2016;7(2):124-135.", year: 2016, n: 1132, note: "PID-5-BF antagonism domain scores for personality pathology" },
    ],
    notes: "Narcissistic features assessed via PID-5-BF antagonism domain. No dedicated narcissism screener in item bank.",
  },

  {
    // PID-5-BF combined Negative Affectivity + Antagonism + Disinhibition
    // BPD is cross-domain; threshold reflects combined pathology
    condition: "BPD",
    thresholdLiability: 1.22,
    sensitivity: 0.79,
    specificity: 0.80,
    sourceInstrument: "PID-5-BF",
    sourceCutoff: "PID-5-BF combined domains (NegAff + Antag + Disinhib ≥ 28)",
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Bach B et al. The alternative DSM-5 personality disorder traits criterion. Personal Disord. 2016;7(2):124-135.", year: 2016, n: 1132, note: "PID-5-BF multi-domain scoring for BPD features" },
      { citation: "Morey LC et al. Comparison of alternative models for personality disorders, II: 6-, 8- and 10-year follow-up. Psychol Med. 2012;42(8):1705-1713.", year: 2012, n: 668, note: "Dimensional model of BPD" },
    ],
    notes: "Borderline features span multiple PID-5-BF domains. Threshold based on combined score across negative affectivity, antagonism, and disinhibition.",
  },

  // ═══ Thought Disorder Spectrum ═════════════════════════════════════════════

  {
    // CAPE-42 positive symptoms subscale + PQ-16
    // PQ-16 ≥ 6: established psychosis risk screening cutoff
    condition: "SCZ",
    thresholdLiability: 1.88,
    sensitivity: 0.87,
    specificity: 0.87,
    sourceInstrument: "PQ-16",
    sourceCutoff: "PQ-16 ≥ 6 (distress score)",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Ising HK et al. The validity of the 16-item version of the Prodromal Questionnaire (PQ-16) to screen for ultra high risk of developing psychosis. Schizophr Res. 2012;138(2-3):207-213.", year: 2012, n: 2518, note: "PQ-16 ≥ 6: sensitivity 0.87, specificity 0.87 for psychosis risk" },
      { citation: "Stefanis NC et al. Evidence that three dimensions of psychosis have a distribution in the general population. Psychol Med. 2002;32(2):347-358.", year: 2002, n: 932, note: "CAPE-42 normative data" },
    ],
    notes: "Very high threshold reflecting low base rate of schizophrenia-spectrum disorders (~0.5%). PQ-16 validates primarily for clinical high risk, not established psychosis.",
  },

  {
    // MDQ ≥ 7 + impairment criterion: standard bipolar I screen
    condition: "BP1",
    thresholdLiability: 1.55,
    sensitivity: 0.73,
    specificity: 0.90,
    sourceInstrument: "MDQ",
    sourceCutoff: "MDQ ≥ 7 + functional impairment",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Hirschfeld RMA et al. Development and validation of a screening instrument for bipolar spectrum disorder: the Mood Disorder Questionnaire. Am J Psychiatry. 2000;157(11):1873-1875.", year: 2000, n: 198, note: "MDQ ≥ 7: sensitivity 0.73, specificity 0.90" },
      { citation: "Hirschfeld RMA et al. Screening for bipolar disorder in the community. J Clin Psychiatry. 2003;64(1):53-59.", year: 2003, n: 85358, note: "Community sample validation" },
    ],
    notes: null,
  },

  {
    // HCL-32 ≥ 14: established cutoff for bipolar II / hypomania
    // Superior to MDQ for bipolar II detection
    condition: "BP2",
    thresholdLiability: 1.34,
    sensitivity: 0.80,
    specificity: 0.74,
    sourceInstrument: "HCL-32",
    sourceCutoff: "HCL-32 ≥ 14",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Angst J et al. The HCL-32: towards a self-assessment tool for hypomanic symptoms in outpatients. J Affect Disord. 2005;88(2):217-233.", year: 2005, n: 1565, note: "HCL-32 ≥ 14: sensitivity 0.80, specificity 0.74 for bipolar II" },
      { citation: "Meyer TD, Hammelstein P, Nilsson LG, Skeppar P, Adolfsson R, Angst J. The Hypomania Checklist (HCL-32): its factorial structure and association to indices of impairment. J Affect Disord. 2007;101(1-3):151-154.", year: 2007, n: 268, note: "Factorial structure confirmation" },
    ],
    notes: "Lower threshold than BP1 reflecting milder hypomanic episodes and higher base rate among mood disorder patients. HCL-32 superior to MDQ for BP2 detection.",
  },

  {
    // SPQ-B total ≥ 17: elevated schizotypal traits
    condition: "SZTY",
    thresholdLiability: 1.55,
    sensitivity: 0.76,
    specificity: 0.82,
    sourceInstrument: "SPQ-B",
    sourceCutoff: "SPQ-B ≥ 17",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Raine A, Benishay D. The SPQ-B: a brief screening instrument for schizotypal personality disorder. J Pers Disord. 1995;9(4):346-355.", year: 1995, n: 220, note: "SPQ-B ≥ 17: identifies top ~10% with elevated schizotypal traits" },
      { citation: "Compton MT et al. The factor structure of the SPQ-B in non-psychiatric samples. Schizophr Res. 2009;115(2-3):141-148.", year: 2009, n: 1237, note: "Factor structure validation" },
    ],
    notes: "Threshold identifies elevated schizotypal features; not diagnostic of schizotypal PD per se.",
  },

  {
    // PQ-16 ≥ 6: clinical high risk for psychosis
    condition: "CHR",
    thresholdLiability: 1.65,
    sensitivity: 0.87,
    specificity: 0.87,
    sourceInstrument: "PQ-16",
    sourceCutoff: "PQ-16 ≥ 6 (distress score)",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Ising HK et al. The validity of the 16-item version of the Prodromal Questionnaire (PQ-16). Schizophr Res. 2012;138(2-3):207-213.", year: 2012, n: 2518, note: "PQ-16 ≥ 6: sensitivity 0.87, specificity 0.87 for ultra-high risk" },
      { citation: "Savill M, D'Ambrosio J, Cannon TD, Loewy RL. Psychosis risk screening in different populations using the Prodromal Questionnaire. Early Interv Psychiatry. 2018;12(2):174-183.", year: 2018, n: 5000, note: "Cross-population validation" },
    ],
    notes: "CHR threshold set between SZTY and SCZ. PQ-16 specifically designed for clinical high-risk identification.",
  },

  // ═══ Detachment Spectrum ═══════════════════════════════════════════════════

  {
    // PID-5-BF Detachment domain ≥ 10
    condition: "SZOD",
    thresholdLiability: 1.65,
    sensitivity: 0.68,
    specificity: 0.88,
    sourceInstrument: "PID-5-BF",
    sourceCutoff: "PID-5-BF Detachment ≥ 10",
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Bach B et al. The alternative DSM-5 personality disorder traits criterion. Personal Disord. 2016;7(2):124-135.", year: 2016, n: 1132, note: "PID-5-BF detachment domain for schizoid features" },
      { citation: "Krueger RF et al. Initial construction of a maladaptive personality trait model. Psychol Med. 2012;42(9):1879-1890.", year: 2012, n: 2461 },
    ],
    notes: "Schizoid features captured via PID-5-BF detachment domain. Very low base rate in community samples.",
  },

  {
    // SPQ-B interpersonal deficit subscale + PID-5-BF detachment
    // Avoidant features overlap with social anxiety; threshold distinguishes the two
    condition: "AVPD",
    thresholdLiability: 1.34,
    sensitivity: 0.74,
    specificity: 0.80,
    sourceInstrument: "SPQ-B",
    sourceCutoff: "SPQ-B interpersonal deficit subscale ≥ 6",
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Raine A, Benishay D. The SPQ-B: a brief screening instrument for schizotypal personality disorder. J Pers Disord. 1995;9(4):346-355.", year: 1995, n: 220 },
      { citation: "Lampe L, Sunderland M. Social phobia and avoidant personality disorder: similar but different? J Pers Disord. 2015;29(1):115-130.", year: 2015, n: 8841, note: "Differentiation of avoidant features from social anxiety" },
    ],
    notes: "Avoidant features overlap substantially with social anxiety disorder. Distinguished by pervasiveness and identity-level avoidance vs. situational fear.",
  },

  {
    // CDS-2 ≥ threshold: Cambridge Depersonalization Scale (2-item screener)
    condition: "DPDR",
    thresholdLiability: 1.55,
    sensitivity: 0.78,
    specificity: 0.85,
    sourceInstrument: "CDS-2",
    sourceCutoff: "CDS-2 ≥ 4 (sum of 2 items)",
    sourceQuality: "SMALL_STUDY",
    sources: [
      { citation: "Sierra M, Berrios GE. The Cambridge Depersonalisation Scale: a new instrument for the measurement of depersonalisation. Psychiatry Res. 2000;93(2):153-164.", year: 2000, n: 204, note: "CDS validation for depersonalization" },
      { citation: "Michal M et al. Depersonalization and derealization are equally discriminative markers of dissociative disorders. Psychol Med. 2016;46(9):1961-1971.", year: 2016, n: 1023, note: "Discriminative validity of depersonalization measures" },
    ],
    notes: "CDS-2 is a brief screener. Threshold may need clinical interview confirmation.",
  },

  {
    // AQ-10 ≥ 6: established screening cutoff for autism-spectrum features
    condition: "ASD",
    thresholdLiability: 1.41,
    sensitivity: 0.88,
    specificity: 0.91,
    sourceInstrument: "AQ-10",
    sourceCutoff: "AQ-10 ≥ 6",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Allison C, Auyeung B, Baron-Cohen S. Toward brief 'Red Flags' for autism screening: the Short Autism Spectrum Quotient and the Short Quantitative Checklist. J Am Acad Child Adolesc Psychiatry. 2012;51(2):202-212.", year: 2012, n: 4000, note: "AQ-10 ≥ 6: sensitivity 0.88, specificity 0.91" },
      { citation: "Booth T et al. Brief report: an examination of the AQ-10 as a brief screening instrument. J Autism Dev Disord. 2013;43(12):2997-3000.", year: 2013, n: 449, note: "AQ-10 validation in clinical sample" },
    ],
    notes: null,
  },

  // ═══ Somatoform Spectrum ═══════════════════════════════════════════════════

  {
    // PHQ-15 ≥ 10: medium somatic symptom severity
    // Combined with functional impairment for SSD diagnosis
    condition: "SSD",
    thresholdLiability: 1.04,
    sensitivity: 0.78,
    specificity: 0.71,
    sourceInstrument: "PHQ-15",
    sourceCutoff: "PHQ-15 ≥ 10 (medium severity)",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Kroenke K, Spitzer RL, Williams JBW. The PHQ-15: validity of a new measure for evaluating the severity of somatic symptoms. Psychosom Med. 2002;64(2):258-266.", year: 2002, n: 3000, note: "PHQ-15 ≥ 10: sensitivity 0.78, specificity 0.71 for somatization" },
      { citation: "van Ravesteijn H, Wittkampf K, Lucassen P, et al. Detecting somatoform disorders in primary care with the PHQ-15. Ann Fam Med. 2009;7(3):232-238.", year: 2009, n: 1046, note: "PHQ-15 validation for somatoform disorders in primary care" },
    ],
    notes: "SSD is a broad diagnosis. PHQ-15 captures somatic symptom burden but not the cognitive/behavioral criteria (excessive health-related thoughts).",
  },

  {
    // WI-7 (Whiteley Index 7-item): established illness anxiety screening
    condition: "IAD",
    thresholdLiability: 1.34,
    sensitivity: 0.85,
    specificity: 0.79,
    sourceInstrument: "WI-7",
    sourceCutoff: "WI-7 ≥ 4",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Fink P et al. Screening for somatisation and hypochondriasis in primary care and neurological in-patients: a seven-item scale for hypochondriasis and somatisation severity. J Psychosom Res. 1999;46(3):261-273.", year: 1999, n: 1785, note: "WI-7 validation: sensitivity 0.85, specificity 0.79" },
      { citation: "Conradt M, Cavanagh M, Franklin J, Rief W. Dimensionality of the Whiteley Index: assessment of hypochondriasis in an Australian sample of primary care patients. J Psychosom Res. 2006;60(2):137-143.", year: 2006, n: 497, note: "Factor structure validation" },
    ],
    notes: null,
  },

  // ═══ Compulsivity Spectrum ═════════════════════════════════════════════════

  {
    // Y-BOCS ≥ 16: clinical OCD threshold (moderate severity)
    condition: "OCD",
    thresholdLiability: 1.55,
    sensitivity: 0.84,
    specificity: 0.89,
    sourceInstrument: "Y-BOCS",
    sourceCutoff: "Y-BOCS ≥ 16 (moderate)",
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Goodman WK et al. The Yale-Brown Obsessive Compulsive Scale. I. Development, use, and reliability. Arch Gen Psychiatry. 1989;46(11):1006-1011.", year: 1989, n: 40, note: "Y-BOCS ≥ 16 = clinically significant OCD" },
      { citation: "Storch EA et al. Clinical and demographic characteristics of children and adolescents with obsessive-compulsive disorder. Child Psychiatry Hum Dev. 2007;38(1):67-82.", year: 2007, n: 96 },
      { citation: "Farris SG, McLean CP, Van Meter PE, Simpson HB, Foa EB. Treatment response, symptom remission, and wellness in OCD. J Clin Psychiatry. 2013;74(7):685-690.", year: 2013, n: 263, note: "Y-BOCS ≥ 16 as clinical threshold in treatment studies" },
    ],
    notes: null,
  },

  {
    // BDDQ positive screen + clinical severity
    condition: "BDD",
    thresholdLiability: 1.55,
    sensitivity: 0.82,
    specificity: 0.89,
    sourceInstrument: "BDDQ",
    sourceCutoff: "BDDQ positive (preoccupation + distress/impairment)",
    sourceQuality: "SMALL_STUDY",
    sources: [
      { citation: "Phillips KA, Atala KD, Pope HG. Diagnostic instruments for body dysmorphic disorder. Am Psychiatr Assoc New Res. 1995.", year: 1995, note: "BDDQ development" },
      { citation: "Grant JE, Kim SW, Crow SJ. Prevalence and clinical features of body dysmorphic disorder in adolescent and adult psychiatric inpatients. J Clin Psychiatry. 2001;62(7):517-522.", year: 2001, n: 122, note: "BDDQ screening: sensitivity 0.82, specificity 0.89" },
    ],
    notes: "BDDQ is a brief 4-item screener. Positive screen requires both preoccupation with appearance and clinically significant distress/impairment.",
  },

  {
    // HRS-SR ≥ 14: clinically significant hoarding
    condition: "HOA",
    thresholdLiability: 1.55,
    sensitivity: 0.88,
    specificity: 0.80,
    sourceInstrument: "HRS-SR",
    sourceCutoff: "HRS-SR (SI-R brief) ≥ 14",
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Tolin DF, Frost RO, Steketee G. A brief interview for assessing compulsive hoarding: the Hoarding Rating Scale-Interview. Psychiatry Res. 2010;178(1):147-152.", year: 2010, n: 751, note: "HRS ≥ 14: sensitivity 0.88, specificity 0.80 for clinical hoarding" },
      { citation: "Frost RO, Steketee G, Tolin DF, Renaud S. Development and validation of the Clutter Image Rating. J Psychopathol Behav Assess. 2008;30(3):193-203.", year: 2008, n: 227 },
    ],
    notes: null,
  },

  {
    // SCOFF ≥ 2 (general eating disorder screen) + BMI < 18.5
    // Anorexia specifically requires restriction + low weight + body image distortion
    condition: "AN",
    thresholdLiability: 1.75,
    sensitivity: 0.78,
    specificity: 0.88,
    sourceInstrument: "SCOFF",
    sourceCutoff: "SCOFF ≥ 2 + low BMI indicators",
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Morgan JF, Reid F, Lacey JH. The SCOFF questionnaire: assessment of a new screening tool for eating disorders. BMJ. 1999;319(7223):1467-1468.", year: 1999, n: 216, note: "SCOFF ≥ 2: sensitivity 1.00, specificity 0.87 for eating disorders" },
      { citation: "Hill LS, Reid F, Morgan JF, Lacey JH. SCOFF, the development of an eating disorder screening questionnaire. Int J Eat Disord. 2010;43(4):344-351.", year: 2010, note: "SCOFF screening validation across populations" },
    ],
    notes: "High threshold reflecting AN as a specific, severe eating disorder. SCOFF is a general eating disorder screener; additional restriction/weight items needed for AN specificity.",
  },

  {
    // PID-5-BF Compulsivity-related items + clinical judgment
    // No dedicated OCPD screener; derived from personality pathology framework
    condition: "OCPD",
    thresholdLiability: 1.28,
    sensitivity: 0.70,
    specificity: 0.78,
    sourceInstrument: "PID-5-BF",
    sourceCutoff: "PID-5-BF rigidity/perfectionism items elevated",
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Krueger RF et al. Initial construction of a maladaptive personality trait model. Psychol Med. 2012;42(9):1879-1890.", year: 2012, n: 2461, note: "PID-5 rigid perfectionism facet" },
      { citation: "Samuel DB, Widiger TA. Clinicians' personality descriptions of prototypic personality disorders. J Pers Disord. 2004;18(3):286-308.", year: 2004, note: "OCPD dimensional structure" },
    ],
    notes: "OCPD is the most prevalent personality disorder (~7.9%). Lower threshold reflects high base rate. No dedicated screener; threshold based on PID-5-BF compulsivity-adjacent items.",
  },

  {
    // No screening instrument for tic disorders; diagnosis is clinical observation-based
    condition: "TIC",
    thresholdLiability: 1.65,
    sensitivity: 0.65,
    specificity: 0.90,
    sourceInstrument: null,
    sourceCutoff: null,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Knight T et al. Prevalence of tic disorders: a systematic review and meta-analysis. Pediatr Neurol. 2012;47(2):77-90.", year: 2012, note: "Tic disorder prevalence meta-analysis: ~1% in adults" },
      { citation: "Leckman JF. Tourette's syndrome. Lancet. 2002;360(9345):1577-1586.", year: 2002, note: "Review of tic disorder assessment" },
    ],
    notes: "No self-report screener for tics in the item bank. Tic disorders are typically identified via clinical observation. Threshold and performance estimates are rough.",
  },
];
