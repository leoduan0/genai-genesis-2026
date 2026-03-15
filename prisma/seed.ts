import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import "dotenv/config";
import { instruments } from "./seed-instruments";
import { overlaps } from "./seed-overlaps";
import { itemLoadings } from "./seed-loadings";
import { instrumentNoiseData, getItemNoise } from "./seed-noise";
import { thresholds } from "./seed-thresholds";
import { allInstrumentNorms } from "./seed-norms";

const connectionString = `${process.env.DIRECT_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─── 8 Spectra ───────────────────────────────────────────────────────────────

const spectra = [
  { shortCode: "DIS", name: "Distress", sortOrder: 0, description: "Internalizing distress spectrum: depression, worry, trauma-related distress" },
  { shortCode: "FEA", name: "Fear", sortOrder: 1, description: "Fear-based internalizing: panic, phobias, social evaluative anxiety" },
  { shortCode: "DEX", name: "Disinhibited Externalizing", sortOrder: 2, description: "Impulse control, substance use, behavioral addictions, conduct problems" },
  { shortCode: "AEX", name: "Antagonistic Externalizing", sortOrder: 3, description: "Interpersonal antagonism: narcissism, borderline antagonistic features" },
  { shortCode: "THD", name: "Thought Disorder", sortOrder: 4, description: "Psychotic and manic features: hallucinations, delusions, mania" },
  { shortCode: "DET", name: "Detachment", sortOrder: 5, description: "Social withdrawal, emotional numbing, depersonalization" },
  { shortCode: "SOM", name: "Somatoform", sortOrder: 6, description: "Somatic symptom amplification and health anxiety" },
  { shortCode: "COM", name: "Compulsivity", sortOrder: 7, description: "Obsessive-compulsive features, rigidity, perfectionism" },
];

// ─── 35 Conditions (grouped by parent spectrum) ──────────────────────────────

const conditions = [
  // Distress (5)
  { shortCode: "MDD", name: "Major Depressive Disorder", parent: "DIS", sortOrder: 0 },
  { shortCode: "PDD", name: "Persistent Depressive Disorder", parent: "DIS", sortOrder: 1 },
  { shortCode: "GAD", name: "Generalized Anxiety Disorder", parent: "DIS", sortOrder: 2 },
  { shortCode: "PTSD", name: "Post-Traumatic Stress Disorder", parent: "DIS", sortOrder: 3 },
  { shortCode: "ADJ", name: "Adjustment Disorder", parent: "DIS", sortOrder: 4 },

  // Fear (5)
  { shortCode: "PAN", name: "Panic Disorder", parent: "FEA", sortOrder: 0 },
  { shortCode: "AGO", name: "Agoraphobia", parent: "FEA", sortOrder: 1 },
  { shortCode: "SAD", name: "Social Anxiety Disorder", parent: "FEA", sortOrder: 2 },
  { shortCode: "SPH", name: "Specific Phobias", parent: "FEA", sortOrder: 3 },
  { shortCode: "SEP", name: "Separation Anxiety Disorder", parent: "FEA", sortOrder: 4 },

  // Disinhibited Externalizing (6)
  { shortCode: "ADHD", name: "ADHD", parent: "DEX", sortOrder: 0 },
  { shortCode: "AUD", name: "Alcohol Use Disorder", parent: "DEX", sortOrder: 1 },
  { shortCode: "DUD", name: "Drug Use Disorder", parent: "DEX", sortOrder: 2 },
  { shortCode: "GAMB", name: "Gambling / Behavioral Addictions", parent: "DEX", sortOrder: 3 },
  { shortCode: "ASPD", name: "Antisocial Behavior / Conduct Problems", parent: "DEX", sortOrder: 4 },
  { shortCode: "BED", name: "Binge Eating Disorder", parent: "DEX", sortOrder: 5 },

  // Antagonistic Externalizing (2)
  { shortCode: "NARC", name: "Narcissistic Features", parent: "AEX", sortOrder: 0 },
  { shortCode: "BPD", name: "Borderline Features", parent: "AEX", sortOrder: 1 },

  // Thought Disorder (5)
  { shortCode: "SCZ", name: "Schizophrenia-Spectrum", parent: "THD", sortOrder: 0 },
  { shortCode: "BP1", name: "Bipolar I", parent: "THD", sortOrder: 1 },
  { shortCode: "BP2", name: "Bipolar II", parent: "THD", sortOrder: 2 },
  { shortCode: "SZTY", name: "Schizotypal Features", parent: "THD", sortOrder: 3 },
  { shortCode: "CHR", name: "Attenuated Psychosis / Clinical High Risk", parent: "THD", sortOrder: 4 },

  // Detachment (4)
  { shortCode: "SZOD", name: "Schizoid Features", parent: "DET", sortOrder: 0 },
  { shortCode: "AVPD", name: "Avoidant Features", parent: "DET", sortOrder: 1 },
  { shortCode: "DPDR", name: "Depersonalization / Derealization", parent: "DET", sortOrder: 2 },
  { shortCode: "ASD", name: "Autism-Spectrum Features", parent: "DET", sortOrder: 3 },

  // Somatoform (2)
  { shortCode: "SSD", name: "Somatic Symptom Disorder", parent: "SOM", sortOrder: 0 },
  { shortCode: "IAD", name: "Illness Anxiety Disorder", parent: "SOM", sortOrder: 1 },

  // Compulsivity (6)
  { shortCode: "OCD", name: "Obsessive-Compulsive Disorder", parent: "COM", sortOrder: 0 },
  { shortCode: "BDD", name: "Body Dysmorphic Disorder", parent: "COM", sortOrder: 1 },
  { shortCode: "HOA", name: "Hoarding Disorder", parent: "COM", sortOrder: 2 },
  { shortCode: "AN", name: "Anorexia Nervosa", parent: "COM", sortOrder: 3 },
  { shortCode: "OCPD", name: "OCPD Features", parent: "COM", sortOrder: 4 },
  { shortCode: "TIC", name: "Tic Disorders", parent: "COM", sortOrder: 5 },
];

// ─── L Matrix: Condition-to-Spectrum Loadings ────────────────────────────────
// From SPECTRA_AND_CONDITIONS.md cross-loading notes + HiTOP structural literature.
// Primary loadings: 0.80 (strong primary), secondary: 0.30-0.40.
// Conditions with no cross-loading note get primary-only.

const loadings = [
  // Distress conditions
  { condition: "MDD",  spectrum: "DIS", loading: 0.85, isPrimary: true },
  { condition: "PDD",  spectrum: "DIS", loading: 0.80, isPrimary: true },
  { condition: "GAD",  spectrum: "DIS", loading: 0.75, isPrimary: true },
  { condition: "GAD",  spectrum: "FEA", loading: 0.30, isPrimary: false },  // somatic anxiety component
  { condition: "PTSD", spectrum: "DIS", loading: 0.65, isPrimary: true },
  { condition: "PTSD", spectrum: "FEA", loading: 0.40, isPrimary: false },  // re-experiencing/avoidance
  { condition: "ADJ",  spectrum: "DIS", loading: 0.60, isPrimary: true },   // subthreshold p-factor

  // Fear conditions
  { condition: "PAN",  spectrum: "FEA", loading: 0.85, isPrimary: true },
  { condition: "AGO",  spectrum: "FEA", loading: 0.80, isPrimary: true },
  { condition: "SAD",  spectrum: "FEA", loading: 0.80, isPrimary: true },
  { condition: "SPH",  spectrum: "FEA", loading: 0.75, isPrimary: true },
  { condition: "SEP",  spectrum: "FEA", loading: 0.75, isPrimary: true },

  // Disinhibited Externalizing conditions
  { condition: "ADHD", spectrum: "DEX", loading: 0.80, isPrimary: true },
  { condition: "AUD",  spectrum: "DEX", loading: 0.85, isPrimary: true },
  { condition: "DUD",  spectrum: "DEX", loading: 0.85, isPrimary: true },
  { condition: "GAMB", spectrum: "DEX", loading: 0.80, isPrimary: true },
  { condition: "ASPD", spectrum: "DEX", loading: 0.70, isPrimary: true },
  { condition: "ASPD", spectrum: "AEX", loading: 0.35, isPrimary: false },  // interpersonal antagonism
  { condition: "BED",  spectrum: "DEX", loading: 0.65, isPrimary: true },
  { condition: "BED",  spectrum: "DIS", loading: 0.30, isPrimary: false },  // emotional eating

  // Antagonistic Externalizing conditions
  { condition: "NARC", spectrum: "AEX", loading: 0.85, isPrimary: true },
  { condition: "BPD",  spectrum: "AEX", loading: 0.70, isPrimary: true },
  { condition: "BPD",  spectrum: "DIS", loading: 0.40, isPrimary: false },  // emotional dysregulation

  // Thought Disorder conditions
  { condition: "SCZ",  spectrum: "THD", loading: 0.90, isPrimary: true },
  { condition: "BP1",  spectrum: "THD", loading: 0.70, isPrimary: true },
  { condition: "BP1",  spectrum: "DIS", loading: 0.35, isPrimary: false },  // depressive pole
  { condition: "BP2",  spectrum: "THD", loading: 0.60, isPrimary: true },
  { condition: "BP2",  spectrum: "DIS", loading: 0.45, isPrimary: false },  // depressive pole stronger
  { condition: "SZTY", spectrum: "THD", loading: 0.85, isPrimary: true },
  { condition: "CHR",  spectrum: "THD", loading: 0.75, isPrimary: true },

  // Detachment conditions
  { condition: "SZOD", spectrum: "DET", loading: 0.85, isPrimary: true },
  { condition: "AVPD", spectrum: "DET", loading: 0.70, isPrimary: true },
  { condition: "AVPD", spectrum: "FEA", loading: 0.35, isPrimary: false },  // social evaluative
  { condition: "DPDR", spectrum: "DET", loading: 0.80, isPrimary: true },
  { condition: "ASD",  spectrum: "DET", loading: 0.65, isPrimary: true },
  { condition: "ASD",  spectrum: "COM", loading: 0.35, isPrimary: false },  // rigidity/restricted interests

  // Somatoform conditions
  { condition: "SSD",  spectrum: "SOM", loading: 0.85, isPrimary: true },
  { condition: "IAD",  spectrum: "SOM", loading: 0.70, isPrimary: true },
  { condition: "IAD",  spectrum: "FEA", loading: 0.30, isPrimary: false },  // health-specific phobia

  // Compulsivity conditions
  { condition: "OCD",  spectrum: "COM", loading: 0.85, isPrimary: true },
  { condition: "BDD",  spectrum: "COM", loading: 0.70, isPrimary: true },
  { condition: "BDD",  spectrum: "SOM", loading: 0.35, isPrimary: false },  // body focus
  { condition: "HOA",  spectrum: "COM", loading: 0.75, isPrimary: true },
  { condition: "AN",   spectrum: "COM", loading: 0.65, isPrimary: true },
  { condition: "AN",   spectrum: "SOM", loading: 0.30, isPrimary: false },  // body focus
  { condition: "AN",   spectrum: "DET", loading: 0.25, isPrimary: false },  // emotional restriction
  { condition: "OCPD", spectrum: "COM", loading: 0.80, isPrimary: true },
  { condition: "TIC",  spectrum: "COM", loading: 0.70, isPrimary: true },
];

// ─── 8×8 Spectrum Correlation Matrix (upper triangle, 28 pairs) ─────────────
// Sources:
//   - Ringwald et al. (2021): Meta-analysis, N=120,596, 35 studies — primary source
//   - Kotov et al. (2017): HiTOP structural paper — spectrum definitions
//   - Krueger (1999): Internalizing/externalizing structure, N=8,098 (NCS)
//   - Forbes et al. (2021): HiTOP utility paper with inter-spectrum correlations
//   - Caspi et al. (2014): p-factor / general psychopathology
//   - Forbush & Kotov (2021): HiTOP somatoform/detachment structure
//   - Kotov et al. (2021): HiTOP Compulsivity spectrum proposal
//
// Notes:
// - Standard HiTOP has 6 spectra. Our model splits Internalizing into Distress + Fear
//   (following Krueger 1999 subfactor structure) and adds Compulsivity.
// - DIS-FEA correlation derived from Krueger (1999) subfactor correlations and
//   confirmatory studies (Slade & Watson 2006, Eaton et al. 2013).
// - Compulsivity correlations derived from Kotov et al. (2021) proposal and
//   OCD/eating disorder comorbidity meta-analyses.
// - Final correlation values are sample-size-weighted averages of source estimates.
// - For sources without sample size (review/structural papers), the N-available
//   source is used; if no sources have N, simple average is used.

const correlations = [
  // Distress (DIS) pairs
  {
    spectrumA: "DIS", spectrumB: "FEA", correlation: 0.642,
    sourceQuality: "META_ANALYSIS" as const,
    sources: [
      { citation: "Krueger 1999, NCS", n: 8098, value: 0.63 },
      { citation: "Slade & Watson 2006", n: 5878, value: 0.68 },
      { citation: "Eaton et al. 2013, meta-analytic SEM", n: 59979, value: 0.64 },
    ],
    notes: "Distress and Fear are subfactors of Internalizing; consistently high correlation.",
  },
  {
    spectrumA: "DIS", spectrumB: "DEX", correlation: 0.315,
    sourceQuality: "META_ANALYSIS" as const,
    sources: [
      { citation: "Krueger 1999, NCS", n: 8098, value: 0.27 },
      { citation: "Ringwald et al. 2021, meta-analysis", n: 120596, value: 0.32 },
      { citation: "Eaton et al. 2013", n: 59979, value: 0.31 },
    ],
    notes: "Internalizing-Externalizing correlation; applied to Distress subfactor.",
  },
  {
    spectrumA: "DIS", spectrumB: "AEX", correlation: 0.24,
    sourceQuality: "LARGE_STUDY" as const,
    sources: [
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.24 },
      { citation: "Forbes et al. 2021", n: null, value: 0.26 },
    ],
    notes: "Primarily through BPD emotional dysregulation component.",
  },
  {
    spectrumA: "DIS", spectrumB: "THD", correlation: 0.420,
    sourceQuality: "META_ANALYSIS" as const,
    sources: [
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.42 },
      { citation: "Caspi et al. 2014 (p-factor mediation)", n: 1037, value: 0.38 },
      { citation: "Forbes et al. 2021", n: null, value: 0.40 },
    ],
    notes: "Depressive features in bipolar; shared p-factor loading.",
  },
  {
    spectrumA: "DIS", spectrumB: "DET", correlation: 0.46,
    sourceQuality: "META_ANALYSIS" as const,
    sources: [
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.46 },
      { citation: "Kotov et al. 2017", n: null, value: 0.44 },
    ],
    notes: "Anhedonia and social withdrawal bridge distress and detachment.",
  },
  {
    spectrumA: "DIS", spectrumB: "SOM", correlation: 0.48,
    sourceQuality: "LARGE_STUDY" as const,
    sources: [
      { citation: "Forbush & Kotov 2021", n: null, value: 0.52 },
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.48 },
    ],
    notes: "Somatic symptoms strongly comorbid with depression/anxiety (PHQ-9/PHQ-15 overlap).",
  },
  {
    spectrumA: "DIS", spectrumB: "COM", correlation: 0.37,
    sourceQuality: "DERIVED" as const,
    sources: [
      { citation: "Kotov et al. 2021 (Compulsivity proposal)", n: null, value: 0.33 },
      { citation: "OCD-depression comorbidity meta-analyses (Pallanti et al. 2011)", n: 3021, value: 0.37 },
    ],
    notes: "OCD has significant distress/anxiety component; derived from comorbidity rates.",
  },

  // Fear (FEA) pairs (DIS-FEA already covered)
  {
    spectrumA: "FEA", spectrumB: "DEX", correlation: 0.217,
    sourceQuality: "META_ANALYSIS" as const,
    sources: [
      { citation: "Krueger 1999", n: 8098, value: 0.18 },
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.22 },
    ],
    notes: "Fear subfactor has weaker externalizing link than Distress.",
  },
  {
    spectrumA: "FEA", spectrumB: "AEX", correlation: 0.14,
    sourceQuality: "LARGE_STUDY" as const,
    sources: [
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.14 },
      { citation: "Forbes et al. 2021", n: null, value: 0.16 },
    ],
    notes: "Low correlation; phobias and antagonism largely independent.",
  },
  {
    spectrumA: "FEA", spectrumB: "THD", correlation: 0.24,
    sourceQuality: "LARGE_STUDY" as const,
    sources: [
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.24 },
      { citation: "Forbes et al. 2021", n: null, value: 0.26 },
    ],
    notes: "Low-moderate; paranoid anxiety component.",
  },
  {
    spectrumA: "FEA", spectrumB: "DET", correlation: 0.28,
    sourceQuality: "LARGE_STUDY" as const,
    sources: [
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.28 },
      { citation: "Kotov et al. 2017", n: null, value: 0.32 },
    ],
    notes: "Avoidant features bridge fear and detachment spectra.",
  },
  {
    spectrumA: "FEA", spectrumB: "SOM", correlation: 0.49,
    sourceQuality: "LARGE_STUDY" as const,
    sources: [
      { citation: "Forbush & Kotov 2021", n: null, value: 0.51 },
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.49 },
    ],
    notes: "Panic disorder somatic symptoms strongly overlap with somatoform.",
  },
  {
    spectrumA: "FEA", spectrumB: "COM", correlation: 0.36,
    sourceQuality: "DERIVED" as const,
    sources: [
      { citation: "Kotov et al. 2021 (Compulsivity proposal)", n: null, value: 0.34 },
      { citation: "OCD-anxiety comorbidity (Ruscio et al. 2010)", n: 9282, value: 0.36 },
    ],
    notes: "OCD anxiety component; fear conditioning in compulsive behaviors.",
  },

  // Disinhibited Externalizing (DEX) pairs
  {
    spectrumA: "DEX", spectrumB: "AEX", correlation: 0.56,
    sourceQuality: "META_ANALYSIS" as const,
    sources: [
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.56 },
      { citation: "Krueger et al. 2007", n: null, value: 0.54 },
      { citation: "Forbes et al. 2021", n: null, value: 0.55 },
    ],
    notes: "Both are subfactors of Externalizing; high correlation expected.",
  },
  {
    spectrumA: "DEX", spectrumB: "THD", correlation: 0.24,
    sourceQuality: "LARGE_STUDY" as const,
    sources: [
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.24 },
      { citation: "Forbes et al. 2021", n: null, value: 0.26 },
    ],
    notes: "Substance use in psychotic populations; impulsivity in mania.",
  },
  {
    spectrumA: "DEX", spectrumB: "DET", correlation: 0.14,
    sourceQuality: "LARGE_STUDY" as const,
    sources: [
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.14 },
      { citation: "Forbes et al. 2021", n: null, value: 0.16 },
    ],
    notes: "Largely orthogonal; impulsivity vs. withdrawal.",
  },
  {
    spectrumA: "DEX", spectrumB: "SOM", correlation: 0.09,
    sourceQuality: "DERIVED" as const,
    sources: [
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.09 },
      { citation: "Forbes et al. 2021", n: null, value: 0.11 },
    ],
    notes: "Minimal direct relationship.",
  },
  {
    spectrumA: "DEX", spectrumB: "COM", correlation: 0.20,
    sourceQuality: "DERIVED" as const,
    sources: [
      { citation: "Kotov et al. 2021", n: null, value: 0.19 },
      { citation: "Behavioral addiction-OCD comorbidity estimates", n: null, value: 0.21 },
    ],
    notes: "Behavioral addictions share compulsive features; opposite ends of compulsivity-impulsivity dimension.",
  },

  // Antagonistic Externalizing (AEX) pairs
  {
    spectrumA: "AEX", spectrumB: "THD", correlation: 0.31,
    sourceQuality: "LARGE_STUDY" as const,
    sources: [
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.31 },
      { citation: "Forbes et al. 2021", n: null, value: 0.29 },
    ],
    notes: "Paranoia and grandiosity bridge antagonism and thought disorder.",
  },
  {
    spectrumA: "AEX", spectrumB: "DET", correlation: 0.24,
    sourceQuality: "LARGE_STUDY" as const,
    sources: [
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.24 },
      { citation: "Kotov et al. 2017", n: null, value: 0.26 },
    ],
    notes: "Callousness and emotional detachment overlap.",
  },
  {
    spectrumA: "AEX", spectrumB: "SOM", correlation: 0.10,
    sourceQuality: "ESTIMATED" as const,
    sources: [
      { citation: "Estimated from general comorbidity structure", n: null, value: 0.10 },
    ],
    notes: "Minimal direct relationship; estimated due to sparse data.",
  },
  {
    spectrumA: "AEX", spectrumB: "COM", correlation: 0.15,
    sourceQuality: "DERIVED" as const,
    sources: [
      { citation: "Kotov et al. 2021", n: null, value: 0.14 },
      { citation: "Forbes et al. 2021", n: null, value: 0.16 },
    ],
    notes: "Low; OCPD rigidity has weak antagonistic features.",
  },

  // Thought Disorder (THD) pairs
  {
    spectrumA: "THD", spectrumB: "DET", correlation: 0.46,
    sourceQuality: "META_ANALYSIS" as const,
    sources: [
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.46 },
      { citation: "Kotov et al. 2017", n: null, value: 0.44 },
      { citation: "Forbes et al. 2021", n: null, value: 0.45 },
    ],
    notes: "Negative symptoms of schizophrenia strongly overlap with detachment.",
  },
  {
    spectrumA: "THD", spectrumB: "SOM", correlation: 0.14,
    sourceQuality: "DERIVED" as const,
    sources: [
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.14 },
      { citation: "Forbes et al. 2021", n: null, value: 0.16 },
    ],
    notes: "Minimal; somatic delusions are rare pathway.",
  },
  {
    spectrumA: "THD", spectrumB: "COM", correlation: 0.22,
    sourceQuality: "DERIVED" as const,
    sources: [
      { citation: "Kotov et al. 2021", n: null, value: 0.19 },
      { citation: "Schizotypy-OCD comorbidity (Poyurovsky et al. 2004)", n: 200, value: 0.22 },
    ],
    notes: "Schizotypal features and OCD comorbidity; magical thinking overlap.",
  },

  // Detachment (DET) pairs
  {
    spectrumA: "DET", spectrumB: "SOM", correlation: 0.19,
    sourceQuality: "DERIVED" as const,
    sources: [
      { citation: "Ringwald et al. 2021", n: 120596, value: 0.19 },
      { citation: "Forbes et al. 2021", n: null, value: 0.21 },
    ],
    notes: "Low; depersonalization has minor somatic overlap.",
  },
  {
    spectrumA: "DET", spectrumB: "COM", correlation: 0.30,
    sourceQuality: "DERIVED" as const,
    sources: [
      { citation: "Kotov et al. 2021", n: null, value: 0.29 },
      { citation: "ASD-OCD comorbidity (Postorino et al. 2017)", n: null, value: 0.31 },
    ],
    notes: "Autism-spectrum features bridge detachment and compulsivity (rigidity, restricted interests).",
  },

  // Somatoform (SOM) pairs
  {
    spectrumA: "SOM", spectrumB: "COM", correlation: 0.35,
    sourceQuality: "DERIVED" as const,
    sources: [
      { citation: "Kotov et al. 2021", n: null, value: 0.34 },
      { citation: "BDD-somatoform comorbidity estimates", n: null, value: 0.36 },
    ],
    notes: "BDD and health anxiety bridge somatoform and compulsivity.",
  },
];

// ─── Condition Base Rates (12-month prevalence) ──────────────────────────────
// Sources:
//   GENERAL: NCS-R (Kessler et al. 2005, N=9,282), NESARC-III (Grant et al. 2015,
//     N=36,309), NSDUH 2019 (N=67,500), WHO WMH (Kessler et al. 2009), CDC ADDM
//   CLINICAL: Zimmerman et al. 2008 psychiatric outpatient survey (N=2,300),
//     Wittchen et al. 2011 (European clinical samples), STAR*D baseline
//   COLLEGE: ACHA-NCHA 2019 (N=67,972), Eisenberg et al. 2013, Blanco et al. 2008
//   PRIMARY_CARE: Kroenke et al. 2007 (N=3,000), Serrano-Blanco et al. 2010 (N=3,815),
//     Ansseau et al. 2004 (N=2,723)
//
// Methodology:
// - Prevalence is 12-month where available; point prevalence noted where 12-month unavailable
// - When estimates span >2× range, median of large-study estimates used per DATA_COLLECTION_PLAN.md
// - liabilityMean = Φ⁻¹(prevalence), computed at seed time via probit function
// - Clinical rates reflect psychiatric outpatient settings (not inpatient)

const baseRates: Array<{
  condition: string;
  populationType: "GENERAL" | "CLINICAL" | "COLLEGE" | "PRIMARY_CARE";
  prevalence: number;
  sourceQuality: "META_ANALYSIS" | "LARGE_STUDY" | "SMALL_STUDY" | "DERIVED" | "ESTIMATED";
  sources: Array<{ citation: string; n: number | null; value: number }>;
  notes: string | null;
}> = [
  // ── MDD ──────────────────────────────────────────────────────────────────
  { condition: "MDD", populationType: "GENERAL", prevalence: 0.071,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Kessler et al. 2005 NCS-R", n: 9282, value: 0.067 },
      { citation: "NSDUH 2019", n: 67500, value: 0.078 },
    ],
    notes: "Median of NCS-R (6.7%) and NSDUH (7.8%)." },
  { condition: "MDD", populationType: "CLINICAL", prevalence: 0.37,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman et al. 2008 psychiatric outpatients", n: 2300, value: 0.37 },
      { citation: "STAR*D baseline", n: 4041, value: 0.39 },
    ],
    notes: "Most common diagnosis in psychiatric outpatient settings." },
  { condition: "MDD", populationType: "COLLEGE", prevalence: 0.17,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "ACHA-NCHA 2019", n: 67972, value: 0.18 },
      { citation: "Eisenberg et al. 2013", n: 14175, value: 0.155 },
    ],
    notes: "Higher than general population; college counseling data." },
  { condition: "MDD", populationType: "PRIMARY_CARE", prevalence: 0.10,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Kroenke et al. 2007", n: 3000, value: 0.10 },
      { citation: "Serrano-Blanco et al. 2010", n: 3815, value: 0.097 },
    ],
    notes: "PHQ-9 validated prevalence in primary care." },

  // ── PDD ──────────────────────────────────────────────────────────────────
  { condition: "PDD", populationType: "GENERAL", prevalence: 0.015,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Kessler et al. 2005 NCS-R", n: 9282, value: 0.015 },
    ],
    notes: "Dysthymia; chronic low-grade depression." },
  { condition: "PDD", populationType: "CLINICAL", prevalence: 0.12,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman et al. 2008", n: 2300, value: 0.12 },
    ],
    notes: null },
  { condition: "PDD", populationType: "COLLEGE", prevalence: 0.04,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Estimated from general-to-college MDD ratio", n: null, value: 0.04 },
    ],
    notes: "Limited direct data; estimated from MDD elevation ratio." },
  { condition: "PDD", populationType: "PRIMARY_CARE", prevalence: 0.035,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Ansseau et al. 2004", n: 2723, value: 0.035 },
    ],
    notes: null },

  // ── GAD ──────────────────────────────────────────────────────────────────
  { condition: "GAD", populationType: "GENERAL", prevalence: 0.029,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Kessler et al. 2005 NCS-R", n: 9282, value: 0.031 },
      { citation: "WHO WMH Surveys", n: 85052, value: 0.027 },
    ],
    notes: "12-month prevalence; consistent across large surveys." },
  { condition: "GAD", populationType: "CLINICAL", prevalence: 0.22,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman et al. 2008", n: 2300, value: 0.22 },
    ],
    notes: null },
  { condition: "GAD", populationType: "COLLEGE", prevalence: 0.11,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "ACHA-NCHA 2019", n: 67972, value: 0.11 },
      { citation: "Eisenberg et al. 2013", n: 14175, value: 0.098 },
    ],
    notes: "GAD-7 validated in college samples." },
  { condition: "GAD", populationType: "PRIMARY_CARE", prevalence: 0.076,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Kroenke et al. 2007", n: 3000, value: 0.076 },
      { citation: "Serrano-Blanco et al. 2010", n: 3815, value: 0.068 },
    ],
    notes: null },

  // ── PTSD ─────────────────────────────────────────────────────────────────
  { condition: "PTSD", populationType: "GENERAL", prevalence: 0.036,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Kessler et al. 2005 NCS-R", n: 9282, value: 0.035 },
      { citation: "Kilpatrick et al. 2013", n: 2953, value: 0.037 },
    ],
    notes: null },
  { condition: "PTSD", populationType: "CLINICAL", prevalence: 0.25,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman et al. 2008", n: 2300, value: 0.25 },
    ],
    notes: "High comorbidity with MDD in clinical settings." },
  { condition: "PTSD", populationType: "COLLEGE", prevalence: 0.09,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Read et al. 2011 college samples", n: 3014, value: 0.09 },
    ],
    notes: "Includes sexual assault, accident, and childhood trauma exposure." },
  { condition: "PTSD", populationType: "PRIMARY_CARE", prevalence: 0.12,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Kroenke et al. 2007", n: 3000, value: 0.12 },
    ],
    notes: "PC-PTSD-5 screened prevalence." },

  // ── ADJ ──────────────────────────────────────────────────────────────────
  { condition: "ADJ", populationType: "GENERAL", prevalence: 0.02,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Casey et al. 2001 review", n: null, value: 0.02 },
    ],
    notes: "Wide range 0.5-2%; underdiagnosed in community. Median estimate used." },
  { condition: "ADJ", populationType: "CLINICAL", prevalence: 0.12,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman et al. 2008", n: 2300, value: 0.11 },
      { citation: "Evans et al. 2013 psychiatric liaison", n: 1039, value: 0.13 },
    ],
    notes: "Often a 'diagnosis of exclusion' in clinical settings." },
  { condition: "ADJ", populationType: "COLLEGE", prevalence: 0.06,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated from college counseling center data", n: null, value: 0.06 },
    ],
    notes: "Common in transition-age youth; limited epidemiological data." },
  { condition: "ADJ", populationType: "PRIMARY_CARE", prevalence: 0.03,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated from primary care comorbidity data", n: null, value: 0.03 },
    ],
    notes: null },

  // ── PAN ──────────────────────────────────────────────────────────────────
  { condition: "PAN", populationType: "GENERAL", prevalence: 0.027,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Kessler et al. 2005 NCS-R", n: 9282, value: 0.028 },
      { citation: "de Jonge et al. 2016 WHO WMH", n: 142405, value: 0.027 },
    ],
    notes: null },
  { condition: "PAN", populationType: "CLINICAL", prevalence: 0.18,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman et al. 2008", n: 2300, value: 0.18 },
    ],
    notes: null },
  { condition: "PAN", populationType: "COLLEGE", prevalence: 0.05,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Blanco et al. 2008 NCS-R college subsample", n: 2188, value: 0.05 },
    ],
    notes: null },
  { condition: "PAN", populationType: "PRIMARY_CARE", prevalence: 0.065,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Kroenke et al. 2007", n: 3000, value: 0.065 },
    ],
    notes: "PHQ-Panic screened prevalence." },

  // ── AGO ──────────────────────────────────────────────────────────────────
  { condition: "AGO", populationType: "GENERAL", prevalence: 0.017,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Kessler et al. 2005 NCS-R (DSM-IV)", n: 9282, value: 0.008 },
      { citation: "Scogin et al. DSM-5 estimates", n: null, value: 0.017 },
    ],
    notes: "DSM-5 broadened criteria; prevalence higher than DSM-IV estimates." },
  { condition: "AGO", populationType: "CLINICAL", prevalence: 0.10,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman et al. 2008", n: 2300, value: 0.10 },
    ],
    notes: null },
  { condition: "AGO", populationType: "COLLEGE", prevalence: 0.03,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated from general-to-college anxiety ratio", n: null, value: 0.03 },
    ],
    notes: null },
  { condition: "AGO", populationType: "PRIMARY_CARE", prevalence: 0.04,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from primary care anxiety surveys", n: null, value: 0.04 },
    ],
    notes: null },

  // ── SAD ──────────────────────────────────────────────────────────────────
  { condition: "SAD", populationType: "GENERAL", prevalence: 0.070,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Kessler et al. 2005 NCS-R", n: 9282, value: 0.068 },
      { citation: "Ruscio et al. 2008", n: 9282, value: 0.072 },
    ],
    notes: "One of the most common anxiety disorders." },
  { condition: "SAD", populationType: "CLINICAL", prevalence: 0.20,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman et al. 2008", n: 2300, value: 0.20 },
    ],
    notes: null },
  { condition: "SAD", populationType: "COLLEGE", prevalence: 0.14,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "ACHA-NCHA 2019 (social anxiety items)", n: 67972, value: 0.14 },
      { citation: "Blanco et al. 2008", n: 2188, value: 0.12 },
    ],
    notes: "Elevated in college-age due to social evaluative demands." },
  { condition: "SAD", populationType: "PRIMARY_CARE", prevalence: 0.06,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Serrano-Blanco et al. 2010", n: 3815, value: 0.06 },
    ],
    notes: "Often undiagnosed in primary care." },

  // ── SPH ──────────────────────────────────────────────────────────────────
  { condition: "SPH", populationType: "GENERAL", prevalence: 0.087,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Kessler et al. 2005 NCS-R", n: 9282, value: 0.087 },
    ],
    notes: "Most prevalent anxiety disorder; includes animal, natural environment, blood-injection, situational types." },
  { condition: "SPH", populationType: "CLINICAL", prevalence: 0.12,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman et al. 2008", n: 2300, value: 0.12 },
    ],
    notes: "Not elevated as much as other anxiety disorders in clinical settings." },
  { condition: "SPH", populationType: "COLLEGE", prevalence: 0.10,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Blanco et al. 2008", n: 2188, value: 0.10 },
    ],
    notes: null },
  { condition: "SPH", populationType: "PRIMARY_CARE", prevalence: 0.05,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from primary care anxiety surveys", n: null, value: 0.05 },
    ],
    notes: "Rarely presenting complaint in primary care." },

  // ── SEP ──────────────────────────────────────────────────────────────────
  { condition: "SEP", populationType: "GENERAL", prevalence: 0.012,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Kessler et al. 2005 NCS-R (adult)", n: 9282, value: 0.012 },
    ],
    notes: "DSM-5 removed age-of-onset criterion; adult prevalence now recognized." },
  { condition: "SEP", populationType: "CLINICAL", prevalence: 0.05,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Silove et al. 2015 clinical estimate", n: null, value: 0.05 },
    ],
    notes: "Often comorbid with panic disorder." },
  { condition: "SEP", populationType: "COLLEGE", prevalence: 0.03,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated from transition-age prevalence data", n: null, value: 0.03 },
    ],
    notes: "May be elevated during college transition." },
  { condition: "SEP", populationType: "PRIMARY_CARE", prevalence: 0.02,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated from primary care comorbidity data", n: null, value: 0.02 },
    ],
    notes: null },

  // ── ADHD ─────────────────────────────────────────────────────────────────
  { condition: "ADHD", populationType: "GENERAL", prevalence: 0.044,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Kessler et al. 2006 NCS-R adult ADHD", n: 3199, value: 0.044 },
      { citation: "Fayyad et al. 2017 WHO WMH", n: 26744, value: 0.029 },
    ],
    notes: "US estimates higher than international; NCS-R used as primary (US population)." },
  { condition: "ADHD", populationType: "CLINICAL", prevalence: 0.20,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman & Mattia 1999", n: 2100, value: 0.20 },
    ],
    notes: "Frequently comorbid with mood/anxiety disorders." },
  { condition: "ADHD", populationType: "COLLEGE", prevalence: 0.07,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "DuPaul et al. 2009 college ADHD prevalence", n: 2880, value: 0.07 },
    ],
    notes: "Includes both diagnosed and undiagnosed." },
  { condition: "ADHD", populationType: "PRIMARY_CARE", prevalence: 0.06,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from adult ADHD screening studies", n: null, value: 0.06 },
    ],
    notes: "Underdiagnosed in primary care." },

  // ── AUD ──────────────────────────────────────────────────────────────────
  { condition: "AUD", populationType: "GENERAL", prevalence: 0.054,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Grant et al. 2015 NESARC-III", n: 36309, value: 0.138 },
      { citation: "NSDUH 2019", n: 67500, value: 0.054 },
    ],
    notes: "NESARC-III (13.8%) uses DSM-5 broad criteria; NSDUH (5.4%) uses treatment/impairment criteria. NSDUH value used as more conservative." },
  { condition: "AUD", populationType: "CLINICAL", prevalence: 0.25,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman et al. 2008", n: 2300, value: 0.25 },
    ],
    notes: "Very common comorbidity in psychiatric outpatients." },
  { condition: "AUD", populationType: "COLLEGE", prevalence: 0.12,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Blanco et al. 2008 NCS-R college subsample", n: 2188, value: 0.12 },
    ],
    notes: "Elevated due to college drinking culture." },
  { condition: "AUD", populationType: "PRIMARY_CARE", prevalence: 0.08,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "AUDIT-C screened prevalence in primary care", n: null, value: 0.08 },
    ],
    notes: null },

  // ── DUD ──────────────────────────────────────────────────────────────────
  { condition: "DUD", populationType: "GENERAL", prevalence: 0.027,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "NSDUH 2019", n: 67500, value: 0.027 },
      { citation: "Grant et al. 2015 NESARC-III", n: 36309, value: 0.039 },
    ],
    notes: "NSDUH value used; includes all illicit substances." },
  { condition: "DUD", populationType: "CLINICAL", prevalence: 0.18,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman et al. 2008", n: 2300, value: 0.18 },
    ],
    notes: "High comorbidity with mood disorders." },
  { condition: "DUD", populationType: "COLLEGE", prevalence: 0.08,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Blanco et al. 2008", n: 2188, value: 0.08 },
    ],
    notes: "Cannabis use disorder most common." },
  { condition: "DUD", populationType: "PRIMARY_CARE", prevalence: 0.04,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "DAST-10 screened primary care estimates", n: null, value: 0.04 },
    ],
    notes: null },

  // ── GAMB ─────────────────────────────────────────────────────────────────
  { condition: "GAMB", populationType: "GENERAL", prevalence: 0.005,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Calado & Griffiths 2016 meta-analysis", n: null, value: 0.005 },
      { citation: "Petry et al. 2005", n: 43093, value: 0.003 },
    ],
    notes: "Includes gambling disorder and emerging behavioral addictions; low prevalence." },
  { condition: "GAMB", populationType: "CLINICAL", prevalence: 0.04,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from psychiatric comorbidity studies", n: null, value: 0.04 },
    ],
    notes: "Higher in SUD treatment settings." },
  { condition: "GAMB", populationType: "COLLEGE", prevalence: 0.01,
    sourceQuality: "SMALL_STUDY",
    sources: [
      { citation: "Nowak & Aloe 2014 college gambling meta-analysis", n: null, value: 0.01 },
    ],
    notes: "Online gambling increasingly prevalent." },
  { condition: "GAMB", populationType: "PRIMARY_CARE", prevalence: 0.005,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated from general population rate", n: null, value: 0.005 },
    ],
    notes: "Rarely screened in primary care." },

  // ── ASPD ─────────────────────────────────────────────────────────────────
  { condition: "ASPD", populationType: "GENERAL", prevalence: 0.01,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Kessler et al. 2005 NCS-R", n: 9282, value: 0.01 },
      { citation: "NESARC: Compton et al. 2005", n: 43093, value: 0.01 },
    ],
    notes: "12-month; lifetime ~3.6% (NESARC)." },
  { condition: "ASPD", populationType: "CLINICAL", prevalence: 0.08,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from personality disorder surveys in clinical settings", n: null, value: 0.08 },
    ],
    notes: "Higher in forensic settings." },
  { condition: "ASPD", populationType: "COLLEGE", prevalence: 0.008,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to general population", n: null, value: 0.008 },
    ],
    notes: null },
  { condition: "ASPD", populationType: "PRIMARY_CARE", prevalence: 0.01,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to general population", n: null, value: 0.01 },
    ],
    notes: null },

  // ── BED ──────────────────────────────────────────────────────────────────
  { condition: "BED", populationType: "GENERAL", prevalence: 0.016,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Hudson et al. 2007 NCS-R", n: 9282, value: 0.016 },
      { citation: "Kessler et al. 2013", n: 24124, value: 0.019 },
    ],
    notes: null },
  { condition: "BED", populationType: "CLINICAL", prevalence: 0.07,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from eating disorder clinic comorbidity", n: null, value: 0.07 },
    ],
    notes: "Higher in obesity treatment settings." },
  { condition: "BED", populationType: "COLLEGE", prevalence: 0.04,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Eisenberg et al. 2011 college eating disorders", n: 2822, value: 0.04 },
    ],
    notes: null },
  { condition: "BED", populationType: "PRIMARY_CARE", prevalence: 0.03,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Johnson et al. 2001 primary care estimate", n: 1382, value: 0.03 },
    ],
    notes: null },

  // ── NARC ─────────────────────────────────────────────────────────────────
  { condition: "NARC", populationType: "GENERAL", prevalence: 0.01,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Stinson et al. 2008 NESARC NPD", n: 34653, value: 0.01 },
    ],
    notes: "12-month estimate derived from lifetime 6.2% with chronicity adjustment." },
  { condition: "NARC", populationType: "CLINICAL", prevalence: 0.06,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from personality disorder prevalence in outpatient settings", n: null, value: 0.06 },
    ],
    notes: null },
  { condition: "NARC", populationType: "COLLEGE", prevalence: 0.01,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to general population", n: null, value: 0.01 },
    ],
    notes: null },
  { condition: "NARC", populationType: "PRIMARY_CARE", prevalence: 0.01,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to general population", n: null, value: 0.01 },
    ],
    notes: "Rarely identified in primary care." },

  // ── BPD ──────────────────────────────────────────────────────────────────
  { condition: "BPD", populationType: "GENERAL", prevalence: 0.016,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Grant et al. 2008 NESARC", n: 34653, value: 0.016 },
      { citation: "Trull et al. 2010 review", n: null, value: 0.022 },
    ],
    notes: "12-month; lifetime ~5.9% (NESARC)." },
  { condition: "BPD", populationType: "CLINICAL", prevalence: 0.15,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman et al. 2008", n: 2300, value: 0.15 },
    ],
    notes: "One of the most common personality disorders in clinical settings." },
  { condition: "BPD", populationType: "COLLEGE", prevalence: 0.02,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; slightly above general population", n: null, value: 0.02 },
    ],
    notes: "Emerging features in young adults." },
  { condition: "BPD", populationType: "PRIMARY_CARE", prevalence: 0.025,
    sourceQuality: "SMALL_STUDY",
    sources: [
      { citation: "Gross et al. 2002 primary care screening", n: 415, value: 0.025 },
    ],
    notes: null },

  // ── SCZ ──────────────────────────────────────────────────────────────────
  { condition: "SCZ", populationType: "GENERAL", prevalence: 0.004,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Moreno-Küstner et al. 2018 meta-analysis", n: null, value: 0.0033 },
      { citation: "Saha et al. 2005 systematic review", n: null, value: 0.0046 },
    ],
    notes: "12-month prevalence; broad schizophrenia-spectrum." },
  { condition: "SCZ", populationType: "CLINICAL", prevalence: 0.08,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Psychiatric outpatient surveys", n: null, value: 0.08 },
    ],
    notes: "Higher in community mental health centers." },
  { condition: "SCZ", populationType: "COLLEGE", prevalence: 0.003,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; onset peak overlaps with college age", n: null, value: 0.003 },
    ],
    notes: "Prodromal/first-episode often presents in college." },
  { condition: "SCZ", populationType: "PRIMARY_CARE", prevalence: 0.005,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from primary care mental health comorbidity", n: null, value: 0.005 },
    ],
    notes: null },

  // ── BP1 ──────────────────────────────────────────────────────────────────
  { condition: "BP1", populationType: "GENERAL", prevalence: 0.006,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Merikangas et al. 2011 NCS-R", n: 9282, value: 0.006 },
      { citation: "Merikangas et al. 2011 WHO WMH", n: 61392, value: 0.006 },
    ],
    notes: "Remarkably consistent across studies." },
  { condition: "BP1", populationType: "CLINICAL", prevalence: 0.10,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman et al. 2008", n: 2300, value: 0.10 },
    ],
    notes: null },
  { condition: "BP1", populationType: "COLLEGE", prevalence: 0.006,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Blanco et al. 2008", n: 2188, value: 0.006 },
    ],
    notes: "Similar to general population." },
  { condition: "BP1", populationType: "PRIMARY_CARE", prevalence: 0.01,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Das et al. 2005 primary care bipolar screening", n: 1157, value: 0.01 },
    ],
    notes: "Often misdiagnosed as unipolar depression." },

  // ── BP2 ──────────────────────────────────────────────────────────────────
  { condition: "BP2", populationType: "GENERAL", prevalence: 0.008,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Merikangas et al. 2011 NCS-R", n: 9282, value: 0.008 },
      { citation: "Merikangas et al. 2011 WHO WMH", n: 61392, value: 0.004 },
    ],
    notes: "US estimates higher; NCS-R used for US-focused model." },
  { condition: "BP2", populationType: "CLINICAL", prevalence: 0.08,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman et al. 2008", n: 2300, value: 0.08 },
    ],
    notes: "More common than BP1 in outpatient settings due to depressive predominance." },
  { condition: "BP2", populationType: "COLLEGE", prevalence: 0.008,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Blanco et al. 2008", n: 2188, value: 0.008 },
    ],
    notes: null },
  { condition: "BP2", populationType: "PRIMARY_CARE", prevalence: 0.015,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Das et al. 2005", n: 1157, value: 0.015 },
    ],
    notes: "Frequently presents as treatment-resistant depression." },

  // ── SZTY ─────────────────────────────────────────────────────────────────
  { condition: "SZTY", populationType: "GENERAL", prevalence: 0.006,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Pulay et al. 2009 NESARC", n: 34653, value: 0.006 },
    ],
    notes: "12-month; lifetime ~3.9%." },
  { condition: "SZTY", populationType: "CLINICAL", prevalence: 0.04,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from personality disorder clinical prevalence", n: null, value: 0.04 },
    ],
    notes: null },
  { condition: "SZTY", populationType: "COLLEGE", prevalence: 0.005,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to general population", n: null, value: 0.005 },
    ],
    notes: null },
  { condition: "SZTY", populationType: "PRIMARY_CARE", prevalence: 0.005,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to general population", n: null, value: 0.005 },
    ],
    notes: null },

  // ── CHR ──────────────────────────────────────────────────────────────────
  { condition: "CHR", populationType: "GENERAL", prevalence: 0.005,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Linscott & van Os 2013 meta-analysis (attenuated psychosis)", n: null, value: 0.032 },
      { citation: "Webb et al. 2015 clinical high risk", n: null, value: 0.005 },
    ],
    notes: "Subclinical psychotic experiences ~3.2%; clinical high risk state ~0.5%. Using CHR criteria." },
  { condition: "CHR", populationType: "CLINICAL", prevalence: 0.05,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from early intervention service data", n: null, value: 0.05 },
    ],
    notes: null },
  { condition: "CHR", populationType: "COLLEGE", prevalence: 0.01,
    sourceQuality: "SMALL_STUDY",
    sources: [
      { citation: "Schultze-Lutter et al. 2014 college screening", n: 3021, value: 0.01 },
    ],
    notes: "Peak onset age overlaps with college; PQ-16 screened." },
  { condition: "CHR", populationType: "PRIMARY_CARE", prevalence: 0.005,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to general population", n: null, value: 0.005 },
    ],
    notes: null },

  // ── SZOD ─────────────────────────────────────────────────────────────────
  { condition: "SZOD", populationType: "GENERAL", prevalence: 0.005,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Pulay et al. 2009 NESARC (schizoid PD estimate)", n: 34653, value: 0.005 },
    ],
    notes: "Very sparse epidemiological data; 12-month estimate from lifetime prevalence." },
  { condition: "SZOD", populationType: "CLINICAL", prevalence: 0.03,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated from personality disorder clinical surveys", n: null, value: 0.03 },
    ],
    notes: "Rarely a primary presenting complaint." },
  { condition: "SZOD", populationType: "COLLEGE", prevalence: 0.005,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to general population", n: null, value: 0.005 },
    ],
    notes: null },
  { condition: "SZOD", populationType: "PRIMARY_CARE", prevalence: 0.005,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to general population", n: null, value: 0.005 },
    ],
    notes: null },

  // ── AVPD ─────────────────────────────────────────────────────────────────
  { condition: "AVPD", populationType: "GENERAL", prevalence: 0.015,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Grant et al. 2004 NESARC avoidant PD", n: 43093, value: 0.015 },
    ],
    notes: "12-month; lifetime ~2.4%. Significant overlap with social anxiety disorder." },
  { condition: "AVPD", populationType: "CLINICAL", prevalence: 0.10,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from clinical personality disorder prevalence surveys", n: null, value: 0.10 },
    ],
    notes: "Common in anxiety disorder treatment settings." },
  { condition: "AVPD", populationType: "COLLEGE", prevalence: 0.02,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; slightly above general population", n: null, value: 0.02 },
    ],
    notes: null },
  { condition: "AVPD", populationType: "PRIMARY_CARE", prevalence: 0.02,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated from primary care anxiety data", n: null, value: 0.02 },
    ],
    notes: null },

  // ── DPDR ─────────────────────────────────────────────────────────────────
  { condition: "DPDR", populationType: "GENERAL", prevalence: 0.01,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Hunter et al. 2004 community survey", n: 1000, value: 0.019 },
      { citation: "Lee et al. 2012 systematic review", n: null, value: 0.008 },
    ],
    notes: "Range 0.8-1.9%; transient symptoms much more common (~25%)." },
  { condition: "DPDR", populationType: "CLINICAL", prevalence: 0.05,
    sourceQuality: "SMALL_STUDY",
    sources: [
      { citation: "Simeon et al. 1997 psychiatric outpatients", n: 256, value: 0.05 },
    ],
    notes: null },
  { condition: "DPDR", populationType: "COLLEGE", prevalence: 0.015,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; stress-related symptoms in young adults", n: null, value: 0.015 },
    ],
    notes: null },
  { condition: "DPDR", populationType: "PRIMARY_CARE", prevalence: 0.01,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to general population", n: null, value: 0.01 },
    ],
    notes: null },

  // ── ASD (Autism-Spectrum Features) ───────────────────────────────────────
  { condition: "ASD", populationType: "GENERAL", prevalence: 0.015,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "CDC ADDM Network 2020 (children/adolescents)", n: null, value: 0.023 },
      { citation: "Dietz et al. 2020 adult prevalence estimate", n: null, value: 0.015 },
    ],
    notes: "Adult prevalence less established; CDC child rate ~2.3%, adult estimate ~1.5%." },
  { condition: "ASD", populationType: "CLINICAL", prevalence: 0.06,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from psychiatric outpatient ASD screening studies", n: null, value: 0.06 },
    ],
    notes: "Increasingly recognized in adult psychiatric settings." },
  { condition: "ASD", populationType: "COLLEGE", prevalence: 0.02,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated from disability services data", n: null, value: 0.02 },
    ],
    notes: "Growing enrollment of autistic students; many undiagnosed." },
  { condition: "ASD", populationType: "PRIMARY_CARE", prevalence: 0.015,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to general population", n: null, value: 0.015 },
    ],
    notes: null },

  // ── SSD ──────────────────────────────────────────────────────────────────
  { condition: "SSD", populationType: "GENERAL", prevalence: 0.05,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Creed & Barsky 2004 review", n: null, value: 0.05 },
      { citation: "de Waal et al. 2004 somatization prevalence", n: null, value: 0.065 },
    ],
    notes: "DSM-5 SSD replaced somatization disorder with broader criteria; prevalence higher." },
  { condition: "SSD", populationType: "CLINICAL", prevalence: 0.12,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from psychiatric consultation-liaison data", n: null, value: 0.12 },
    ],
    notes: null },
  { condition: "SSD", populationType: "COLLEGE", prevalence: 0.04,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated from PHQ-15 screening in college samples", n: null, value: 0.04 },
    ],
    notes: null },
  { condition: "SSD", populationType: "PRIMARY_CARE", prevalence: 0.15,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "de Waal et al. 2004 primary care", n: 1046, value: 0.163 },
      { citation: "Creed & Barsky 2004", n: null, value: 0.15 },
    ],
    notes: "Very common in primary care; somatic presentations of distress." },

  // ── IAD ──────────────────────────────────────────────────────────────────
  { condition: "IAD", populationType: "GENERAL", prevalence: 0.013,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Sunderland et al. 2013 health anxiety prevalence", n: 8841, value: 0.013 },
    ],
    notes: "DSM-5 illness anxiety disorder; limited direct epidemiological data." },
  { condition: "IAD", populationType: "CLINICAL", prevalence: 0.06,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from health anxiety in psychiatric settings", n: null, value: 0.06 },
    ],
    notes: null },
  { condition: "IAD", populationType: "COLLEGE", prevalence: 0.015,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to general population", n: null, value: 0.015 },
    ],
    notes: null },
  { condition: "IAD", populationType: "PRIMARY_CARE", prevalence: 0.06,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Tyrer et al. 2011 primary care health anxiety", n: 28991, value: 0.06 },
    ],
    notes: "Common in high-utilizer primary care patients." },

  // ── OCD ──────────────────────────────────────────────────────────────────
  { condition: "OCD", populationType: "GENERAL", prevalence: 0.012,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Ruscio et al. 2010 NCS-R", n: 9282, value: 0.012 },
      { citation: "Kessler et al. 2005 NCS-R", n: 9282, value: 0.010 },
    ],
    notes: null },
  { condition: "OCD", populationType: "CLINICAL", prevalence: 0.10,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Zimmerman et al. 2008", n: 2300, value: 0.10 },
    ],
    notes: null },
  { condition: "OCD", populationType: "COLLEGE", prevalence: 0.025,
    sourceQuality: "SMALL_STUDY",
    sources: [
      { citation: "Blanco et al. 2008", n: 2188, value: 0.025 },
    ],
    notes: null },
  { condition: "OCD", populationType: "PRIMARY_CARE", prevalence: 0.02,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from primary care screening studies", n: null, value: 0.02 },
    ],
    notes: "Frequently undiagnosed." },

  // ── BDD ──────────────────────────────────────────────────────────────────
  { condition: "BDD", populationType: "GENERAL", prevalence: 0.018,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Veale et al. 2016 meta-analysis community", n: null, value: 0.018 },
    ],
    notes: "Community prevalence ~1.7-2.4%." },
  { condition: "BDD", populationType: "CLINICAL", prevalence: 0.08,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from psychiatric outpatient BDD screening", n: null, value: 0.08 },
    ],
    notes: "Higher in OCD and eating disorder clinics." },
  { condition: "BDD", populationType: "COLLEGE", prevalence: 0.03,
    sourceQuality: "SMALL_STUDY",
    sources: [
      { citation: "Bohne et al. 2002 college BDD screening", n: 133, value: 0.03 },
    ],
    notes: null },
  { condition: "BDD", populationType: "PRIMARY_CARE", prevalence: 0.02,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from dermatology/primary care screening", n: null, value: 0.02 },
    ],
    notes: "Often presents as dermatological complaints." },

  // ── HOA ──────────────────────────────────────────────────────────────────
  { condition: "HOA", populationType: "GENERAL", prevalence: 0.025,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Postlethwaite et al. 2019 meta-analysis", n: null, value: 0.025 },
    ],
    notes: "Community prevalence 2-5%; increases with age." },
  { condition: "HOA", populationType: "CLINICAL", prevalence: 0.06,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from OCD clinic hoarding comorbidity", n: null, value: 0.06 },
    ],
    notes: null },
  { condition: "HOA", populationType: "COLLEGE", prevalence: 0.015,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; lower in younger adults", n: null, value: 0.015 },
    ],
    notes: null },
  { condition: "HOA", populationType: "PRIMARY_CARE", prevalence: 0.03,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated from community prevalence data", n: null, value: 0.03 },
    ],
    notes: null },

  // ── AN ───────────────────────────────────────────────────────────────────
  { condition: "AN", populationType: "GENERAL", prevalence: 0.004,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Smink et al. 2012 meta-analysis 12-month", n: null, value: 0.004 },
      { citation: "Hudson et al. 2007 NCS-R", n: 9282, value: 0.003 },
    ],
    notes: "12-month prevalence; lifetime ~0.9%." },
  { condition: "AN", populationType: "CLINICAL", prevalence: 0.04,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from eating disorder clinic data", n: null, value: 0.04 },
    ],
    notes: null },
  { condition: "AN", populationType: "COLLEGE", prevalence: 0.01,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Eisenberg et al. 2011", n: 2822, value: 0.01 },
    ],
    notes: "Peak onset in late adolescence/young adulthood." },
  { condition: "AN", populationType: "PRIMARY_CARE", prevalence: 0.005,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated from general population data", n: null, value: 0.005 },
    ],
    notes: null },

  // ── OCPD ─────────────────────────────────────────────────────────────────
  { condition: "OCPD", populationType: "GENERAL", prevalence: 0.02,
    sourceQuality: "LARGE_STUDY",
    sources: [
      { citation: "Grant et al. 2004 NESARC OCPD", n: 43093, value: 0.02 },
    ],
    notes: "12-month estimate; lifetime ~7.9% (NESARC). Wide range across studies." },
  { condition: "OCPD", populationType: "CLINICAL", prevalence: 0.10,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from personality disorder clinical surveys", n: null, value: 0.10 },
    ],
    notes: "Most common personality disorder in many clinical samples." },
  { condition: "OCPD", populationType: "COLLEGE", prevalence: 0.02,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to general population", n: null, value: 0.02 },
    ],
    notes: null },
  { condition: "OCPD", populationType: "PRIMARY_CARE", prevalence: 0.02,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to general population", n: null, value: 0.02 },
    ],
    notes: null },

  // ── TIC ──────────────────────────────────────────────────────────────────
  { condition: "TIC", populationType: "GENERAL", prevalence: 0.01,
    sourceQuality: "META_ANALYSIS",
    sources: [
      { citation: "Knight et al. 2012 Tourette meta-analysis", n: null, value: 0.008 },
      { citation: "Scharf et al. 2015 tic disorder prevalence", n: null, value: 0.01 },
    ],
    notes: "Adult prevalence; much higher in children (~3-5%). Tourette's ~0.3-0.8%." },
  { condition: "TIC", populationType: "CLINICAL", prevalence: 0.04,
    sourceQuality: "DERIVED",
    sources: [
      { citation: "Derived from OCD/ADHD clinic comorbidity", n: null, value: 0.04 },
    ],
    notes: "Frequently comorbid with OCD and ADHD." },
  { condition: "TIC", populationType: "COLLEGE", prevalence: 0.01,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to adult general population", n: null, value: 0.01 },
    ],
    notes: null },
  { condition: "TIC", populationType: "PRIMARY_CARE", prevalence: 0.01,
    sourceQuality: "ESTIMATED",
    sources: [
      { citation: "Estimated; similar to general population", n: null, value: 0.01 },
    ],
    notes: null },
];

// ─── Inverse Normal CDF (Probit Function) ────────────────────────────────────
// Rational approximation (Abramowitz & Stegun, 1964; Peter Acklam's algorithm)
// Accurate to ~1.15e-9 for 0 < p < 1.

function probit(p: number): number {
  if (p <= 0 || p >= 1) throw new Error(`probit(p) requires 0 < p < 1, got ${p}`);

  const a = [
    -3.969683028665376e+01,  2.209460984245205e+02,
    -2.759285104469687e+02,  1.383577518672690e+02,
    -3.066479806614716e+01,  2.506628277459239e+00,
  ];
  const b = [
    -5.447609879822406e+01,  1.615858368580409e+02,
    -1.556989798598866e+02,  6.680131188771972e+01,
    -1.328068155288572e+01,
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
     4.374664141464968e+00,  2.938163982698783e+00,
  ];
  const d = [
     7.784695709041462e-03,  3.224671290700398e-01,
     2.445134137142996e+00,  3.754408661907416e+00,
  ];

  const p_low = 0.02425;
  const p_high = 1 - p_low;
  let q: number, r: number;

  if (p < p_low) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= p_high) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
             ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

// ─── PSD Verification ──────────────────────────────────────────────────────────
// Cholesky decomposition: returns true if matrix is positive definite.

function choleskyCheck(matrix: number[][]): boolean {
  const n = matrix.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }
      if (i === j) {
        const val = matrix[i][i] - sum;
        if (val <= 0) return false;
        L[i][j] = Math.sqrt(val);
      } else {
        L[i][j] = (matrix[i][j] - sum) / L[j][j];
      }
    }
  }
  return true;
}

function buildCorrelationMatrix(
  spectraOrder: string[],
  corrData: typeof correlations,
): number[][] {
  const n = spectraOrder.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  // Diagonal = 1
  for (let i = 0; i < n; i++) matrix[i][i] = 1.0;
  // Fill from correlation data
  for (const c of corrData) {
    const i = spectraOrder.indexOf(c.spectrumA);
    const j = spectraOrder.indexOf(c.spectrumB);
    if (i === -1 || j === -1) throw new Error(`Unknown spectrum: ${c.spectrumA} or ${c.spectrumB}`);
    matrix[i][j] = c.correlation;
    matrix[j][i] = c.correlation;
  }
  return matrix;
}

async function main() {
  console.log("Seeding spectra...");

  // Create spectra
  const spectraMap: Record<string, string> = {};
  for (const s of spectra) {
    const dim = await prisma.dimension.upsert({
      where: { shortCode: s.shortCode },
      update: { name: s.name, sortOrder: s.sortOrder, description: s.description },
      create: { ...s, level: "SPECTRUM" },
    });
    spectraMap[s.shortCode] = dim.id;
  }
  console.log(`  Created/updated ${Object.keys(spectraMap).length} spectra.`);

  // Create conditions
  console.log("Seeding conditions...");
  const conditionMap: Record<string, string> = {};
  for (const c of conditions) {
    const dim = await prisma.dimension.upsert({
      where: { shortCode: c.shortCode },
      update: { name: c.name, sortOrder: c.sortOrder, parentId: spectraMap[c.parent] },
      create: {
        shortCode: c.shortCode,
        name: c.name,
        level: "CONDITION",
        parentId: spectraMap[c.parent],
        sortOrder: c.sortOrder,
      },
    });
    conditionMap[c.shortCode] = dim.id;
  }
  console.log(`  Created/updated ${Object.keys(conditionMap).length} conditions.`);

  // Create L matrix loadings
  console.log("Seeding condition-spectrum loadings (L matrix)...");
  let loadingCount = 0;
  for (const l of loadings) {
    const conditionId = conditionMap[l.condition];
    const spectrumId = spectraMap[l.spectrum];
    await prisma.conditionSpectrumLoading.upsert({
      where: { conditionId_spectrumId: { conditionId, spectrumId } },
      update: { loading: l.loading, isPrimary: l.isPrimary },
      create: {
        conditionId,
        spectrumId,
        loading: l.loading,
        isPrimary: l.isPrimary,
        sourceQuality: "DERIVED",
        sources: [{ citation: "SPECTRA_AND_CONDITIONS.md + HiTOP structural literature", note: "Loading values estimated from HiTOP factor structure papers" }],
        notes: l.isPrimary ? null : "Secondary/cross-loading",
      },
    });
    loadingCount++;
  }
  console.log(`  Created/updated ${loadingCount} condition-spectrum loadings.`);

  // Verify PSD before seeding correlations
  console.log("Verifying correlation matrix is positive definite...");
  const spectraOrder = spectra.map((s) => s.shortCode);
  const corrMatrix = buildCorrelationMatrix(spectraOrder, correlations);
  const isPD = choleskyCheck(corrMatrix);
  if (!isPD) {
    console.error("ERROR: Correlation matrix is NOT positive definite!");
    console.error("Matrix:");
    for (const row of corrMatrix) {
      console.error(`  [${row.map((v) => v.toFixed(2)).join(", ")}]`);
    }
    throw new Error("Correlation matrix failed PSD check. Nearest-PSD projection needed.");
  }
  console.log("  Correlation matrix is positive definite. ✓");

  // Seed spectrum-spectrum correlations
  console.log("Seeding spectrum-spectrum correlations (28 pairs)...");
  let corrCount = 0;
  for (const c of correlations) {
    const dimAId = spectraMap[c.spectrumA];
    const dimBId = spectraMap[c.spectrumB];
    // Enforce A < B by sortOrder to match schema convention
    const sortA = spectra.find((s) => s.shortCode === c.spectrumA)!.sortOrder;
    const sortB = spectra.find((s) => s.shortCode === c.spectrumB)!.sortOrder;
    const [dimensionAId, dimensionBId] =
      sortA < sortB ? [dimAId, dimBId] : [dimBId, dimAId];

    await prisma.dimensionCorrelation.upsert({
      where: { dimensionAId_dimensionBId: { dimensionAId, dimensionBId } },
      update: {
        correlation: c.correlation,
        sourceQuality: c.sourceQuality,
        sources: c.sources,
        notes: c.notes,
      },
      create: {
        dimensionAId,
        dimensionBId,
        correlation: c.correlation,
        sourceQuality: c.sourceQuality,
        sources: c.sources,
        notes: c.notes,
      },
    });
    corrCount++;
  }
  console.log(`  Created/updated ${corrCount} spectrum-spectrum correlations.`);

  // Print the full correlation matrix for verification
  console.log("\n  Full 8×8 Spectrum Correlation Matrix:");
  console.log(`  ${"".padStart(5)}${spectraOrder.map((s) => s.padStart(6)).join("")}`);
  for (let i = 0; i < spectraOrder.length; i++) {
    const row = corrMatrix[i].map((v) => v.toFixed(2).padStart(6)).join("");
    console.log(`  ${spectraOrder[i].padStart(5)}${row}`);
  }

  // Seed condition base rates
  console.log("\nSeeding condition base rates (35 conditions × 4 populations)...");
  let baseRateCount = 0;
  for (const br of baseRates) {
    const dimensionId = conditionMap[br.condition];
    if (!dimensionId) {
      console.error(`  WARNING: No condition found for shortCode "${br.condition}"`);
      continue;
    }
    const liabilityMean = probit(br.prevalence);

    await prisma.baseRate.upsert({
      where: {
        dimensionId_populationType: {
          dimensionId,
          populationType: br.populationType,
        },
      },
      update: {
        prevalence: br.prevalence,
        liabilityMean: parseFloat(liabilityMean.toFixed(4)),
        sourceQuality: br.sourceQuality,
        sources: br.sources,
        notes: br.notes,
      },
      create: {
        dimensionId,
        populationType: br.populationType,
        prevalence: br.prevalence,
        liabilityMean: parseFloat(liabilityMean.toFixed(4)),
        sourceQuality: br.sourceQuality,
        sources: br.sources,
        notes: br.notes,
      },
    });
    baseRateCount++;
  }
  console.log(`  Created/updated ${baseRateCount} base rate entries.`);

  // Print summary table for verification
  console.log("\n  Base Rate Summary (prevalence → liability):");
  console.log(`  ${"Condition".padEnd(8)} ${"GENERAL".padStart(10)} ${"CLINICAL".padStart(10)} ${"COLLEGE".padStart(10)} ${"PRIM_CARE".padStart(10)}`);
  const conditionCodes = conditions.map(c => c.shortCode);
  for (const code of conditionCodes) {
    const entries = baseRates.filter(br => br.condition === code);
    const gen  = entries.find(e => e.populationType === "GENERAL")?.prevalence ?? 0;
    const clin = entries.find(e => e.populationType === "CLINICAL")?.prevalence ?? 0;
    const col  = entries.find(e => e.populationType === "COLLEGE")?.prevalence ?? 0;
    const pc   = entries.find(e => e.populationType === "PRIMARY_CARE")?.prevalence ?? 0;
    console.log(`  ${code.padEnd(8)} ${(gen * 100).toFixed(1).padStart(9)}% ${(clin * 100).toFixed(1).padStart(9)}% ${(col * 100).toFixed(1).padStart(9)}% ${(pc * 100).toFixed(1).padStart(9)}%`);
  }

  // ── Seed Instruments & Items (Step 4a) ─────────────────────────────────────
  console.log("\nSeeding instruments and items...");
  let instrumentCount = 0;
  let itemCount = 0;

  for (const inst of instruments) {
    const instrument = await prisma.instrument.upsert({
      where: { name: inst.name },
      update: {
        fullName: inst.fullName,
        tier: inst.tier,
        itemCount: inst.itemCount,
        responseScale: inst.responseScale,
        scaleReliabilityIcc: inst.scaleReliabilityIcc,
        retestIntervalDays: inst.retestIntervalDays,
        citation: inst.citation,
      },
      create: {
        name: inst.name,
        fullName: inst.fullName,
        tier: inst.tier,
        itemCount: inst.itemCount,
        responseScale: inst.responseScale,
        scaleReliabilityIcc: inst.scaleReliabilityIcc,
        retestIntervalDays: inst.retestIntervalDays,
        citation: inst.citation,
      },
    });
    instrumentCount++;

    for (const item of inst.items) {
      await prisma.item.upsert({
        where: {
          instrumentId_itemNumber: {
            instrumentId: instrument.id,
            itemNumber: item.itemNumber,
          },
        },
        update: {
          text: item.text,
          responseMin: item.responseMin,
          responseMax: item.responseMax,
          responseLabels: item.responseLabels,
          isReverseCoded: item.isReverseCoded ?? false,
          tags: item.tags,
        },
        create: {
          instrumentId: instrument.id,
          itemNumber: item.itemNumber,
          text: item.text,
          responseMin: item.responseMin,
          responseMax: item.responseMax,
          responseLabels: item.responseLabels,
          isReverseCoded: item.isReverseCoded ?? false,
          tags: item.tags,
        },
      });
      itemCount++;
    }
  }
  console.log(`  Created/updated ${instrumentCount} instruments with ${itemCount} total items.`);

  // Print summary table
  console.log("\n  Instrument Summary:");
  console.log(`  ${"Name".padEnd(15)} ${"Tier".padEnd(18)} ${"Items".padStart(5)}`);
  for (const inst of instruments) {
    console.log(`  ${inst.name.padEnd(15)} ${inst.tier.padEnd(18)} ${String(inst.itemCount).padStart(5)}`);
  }

  // ── Seed Item Overlaps (Step 4c) ──────────────────────────────────────────
  console.log("\nSeeding item overlaps...");
  let overlapCount = 0;

  // Build lookup: instrument name + item number → item ID
  const itemLookup = new Map<string, string>();
  for (const inst of instruments) {
    const dbInstrument = await prisma.instrument.findUnique({
      where: { name: inst.name },
      include: { items: true },
    });
    if (!dbInstrument) {
      console.error(`  WARNING: Instrument ${inst.name} not found in database`);
      continue;
    }
    for (const item of dbInstrument.items) {
      itemLookup.set(`${inst.name}:${item.itemNumber}`, item.id);
    }
  }

  for (const overlap of overlaps) {
    const itemAId = itemLookup.get(`${overlap.instrumentA}:${overlap.itemNumberA}`);
    const itemBId = itemLookup.get(`${overlap.instrumentB}:${overlap.itemNumberB}`);

    if (!itemAId || !itemBId) {
      console.error(`  WARNING: Could not resolve overlap ${overlap.instrumentA}:${overlap.itemNumberA} ↔ ${overlap.instrumentB}:${overlap.itemNumberB}`);
      continue;
    }

    // Enforce itemAId < itemBId (lexicographic) to avoid duplicates
    const [sortedA, sortedB] = itemAId < itemBId ? [itemAId, itemBId] : [itemBId, itemAId];

    await prisma.itemOverlap.upsert({
      where: {
        itemAId_itemBId: { itemAId: sortedA, itemBId: sortedB },
      },
      update: {
        overlapStrength: overlap.overlapStrength,
        sharedTags: overlap.sharedTags,
        description: overlap.description,
        noiseInflationMultiplier: overlap.noiseInflationMultiplier,
      },
      create: {
        itemAId: sortedA,
        itemBId: sortedB,
        overlapStrength: overlap.overlapStrength,
        sharedTags: overlap.sharedTags,
        description: overlap.description,
        noiseInflationMultiplier: overlap.noiseInflationMultiplier,
      },
    });
    overlapCount++;
  }

  console.log(`  Created/updated ${overlapCount} item overlaps.`);

  // Print overlap summary by strength
  const highCount = overlaps.filter(o => o.overlapStrength === "HIGH").length;
  const modCount = overlaps.filter(o => o.overlapStrength === "MODERATE").length;
  const lowCount = overlaps.filter(o => o.overlapStrength === "LOW").length;
  console.log(`  HIGH: ${highCount}, MODERATE: ${modCount}, LOW: ${lowCount}`);

  // ── Seed Item Loadings (Step 5) ─────────────────────────────────────────────
  console.log("\nSeeding item-level factor loadings (h vectors)...");
  let loadingItemCount = 0;
  let loadingSkipCount = 0;

  // Build dimension lookup: shortCode → id
  const dimLookup = new Map<string, string>();
  for (const [code, id] of Object.entries(spectraMap)) {
    dimLookup.set(code, id as string);
  }
  for (const [code, id] of Object.entries(conditionMap)) {
    dimLookup.set(code, id as string);
  }

  for (const il of itemLoadings) {
    const itemId = itemLookup.get(`${il.instrument}:${il.itemNumber}`);
    const dimensionId = dimLookup.get(il.dimension);

    if (!itemId) {
      console.error(`  WARNING: Could not resolve item ${il.instrument}:${il.itemNumber}`);
      loadingSkipCount++;
      continue;
    }
    if (!dimensionId) {
      console.error(`  WARNING: Could not resolve dimension "${il.dimension}"`);
      loadingSkipCount++;
      continue;
    }

    await prisma.itemLoading.upsert({
      where: {
        itemId_dimensionId: { itemId, dimensionId },
      },
      update: {
        loading: il.loading,
        isPrimary: il.isPrimary,
        derivationMethod: il.derivationMethod,
        withinInstrumentLoading: il.withinInstrumentLoading,
        instrumentToDimensionLoading: il.instrumentToDimensionLoading,
        sourceQuality: il.sourceQuality,
        sources: il.sources,
        notes: il.notes,
      },
      create: {
        itemId,
        dimensionId,
        loading: il.loading,
        isPrimary: il.isPrimary,
        derivationMethod: il.derivationMethod,
        withinInstrumentLoading: il.withinInstrumentLoading,
        instrumentToDimensionLoading: il.instrumentToDimensionLoading,
        sourceQuality: il.sourceQuality,
        sources: il.sources,
        notes: il.notes,
      },
    });
    loadingItemCount++;
  }
  console.log(`  Created/updated ${loadingItemCount} item loadings.`);
  if (loadingSkipCount > 0) {
    console.log(`  WARNING: ${loadingSkipCount} loadings skipped due to unresolved references.`);
  }

  // Print loading summary by dimension
  const loadingsByDim = new Map<string, number>();
  for (const il of itemLoadings) {
    loadingsByDim.set(il.dimension, (loadingsByDim.get(il.dimension) ?? 0) + 1);
  }
  console.log("\n  Item Loading Summary (entries per dimension):");
  const spectraDims = ["DIS", "FEA", "DEX", "AEX", "THD", "DET", "SOM", "COM"];
  for (const dim of spectraDims) {
    const count = loadingsByDim.get(dim) ?? 0;
    if (count > 0) console.log(`    ${dim.padEnd(6)} ${count} items (Tier 1 → spectrum)`);
  }
  const conditionDims = [...loadingsByDim.keys()].filter(d => !spectraDims.includes(d)).sort();
  for (const dim of conditionDims) {
    const count = loadingsByDim.get(dim) ?? 0;
    console.log(`    ${dim.padEnd(6)} ${count} items (Tier 2 → condition)`);
  }

  console.log(`\n  Total: ${itemLoadings.length} item-dimension loading entries across ${loadingsByDim.size} dimensions.`);

  // ── Seed Noise Variances (Step 6) ──────────────────────────────────────────
  console.log("\nSeeding noise variances (σi² = (1 − ri) × 1.5)...");
  let noiseUpdateCount = 0;

  for (const inst of instruments) {
    const dbInstrument = await prisma.instrument.findUnique({
      where: { name: inst.name },
      include: { items: true },
    });
    if (!dbInstrument) continue;

    for (const dbItem of dbInstrument.items) {
      const noise = getItemNoise(inst.name, dbItem.itemNumber);

      await prisma.item.update({
        where: { id: dbItem.id },
        data: {
          testRetestR: noise.testRetestR,
          noiseVariance: noise.noiseVariance,
          noiseInflationFactor: 1.5,
          sourceQuality: noise.sourceQuality as any,
        },
      });
      noiseUpdateCount++;
    }
  }
  console.log(`  Updated ${noiseUpdateCount} items with noise variance data.`);

  // Print noise variance summary by instrument
  console.log("\n  Noise Variance Summary:");
  console.log(`  ${"Instrument".padEnd(15)} ${"r (retest)".padStart(10)} ${"σ² floor".padStart(10)} ${"Source".padStart(14)}`);
  for (const nd of instrumentNoiseData) {
    const r = nd.defaultR;
    const sigma2 = +((1 - r) * 1.5).toFixed(4);
    const hasItemLevel = nd.itemOverrides ? "item-level" : "scale-level";
    console.log(`  ${nd.instrument.padEnd(15)} ${r.toFixed(2).padStart(10)} ${sigma2.toFixed(4).padStart(10)} ${hasItemLevel.padStart(14)}`);
  }

  // ── Seed Clinical Thresholds (Step 7) ─────────────────────────────────────
  console.log("\nSeeding clinical thresholds (35 conditions)...");
  let thresholdCount = 0;

  for (const t of thresholds) {
    const dimensionId = conditionMap[t.condition];
    if (!dimensionId) {
      console.error(`  WARNING: No condition found for shortCode "${t.condition}"`);
      continue;
    }

    await prisma.clinicalThreshold.upsert({
      where: { id: `threshold_${t.condition}` },
      update: {
        dimensionId,
        thresholdLiability: t.thresholdLiability,
        sensitivity: t.sensitivity,
        specificity: t.specificity,
        sourceInstrument: t.sourceInstrument,
        sourceCutoff: t.sourceCutoff,
        sources: t.sources,
        notes: t.notes,
      },
      create: {
        id: `threshold_${t.condition}`,
        dimensionId,
        thresholdLiability: t.thresholdLiability,
        sensitivity: t.sensitivity,
        specificity: t.specificity,
        sourceInstrument: t.sourceInstrument,
        sourceCutoff: t.sourceCutoff,
        sources: t.sources,
        notes: t.notes,
      },
    });
    thresholdCount++;
  }
  console.log(`  Created/updated ${thresholdCount} clinical thresholds.`);

  // Print threshold summary
  console.log("\n  Clinical Threshold Summary:");
  console.log(`  ${"Condition".padEnd(8)} ${"τ (liability)".padStart(14)} ${"Sensitivity".padStart(12)} ${"Specificity".padStart(12)} ${"Source".padEnd(20)}`);
  for (const t of thresholds) {
    const src = t.sourceInstrument ?? "(estimated)";
    console.log(`  ${t.condition.padEnd(8)} ${t.thresholdLiability.toFixed(2).padStart(14)} ${t.sensitivity.toFixed(2).padStart(12)} ${t.specificity.toFixed(2).padStart(12)} ${src.padEnd(20)}`);
  }

  // ── Seed Normative Response Distributions (Step 6b) ─────────────────────
  console.log("\nSeeding normative response distributions...");
  let normUpdateCount = 0;
  let normSkipCount = 0;

  for (const instNorms of allInstrumentNorms) {
    const dbInstrument = await prisma.instrument.findUnique({
      where: { name: instNorms.instrument },
      include: { items: true },
    });
    if (!dbInstrument) {
      console.error(`  WARNING: Instrument "${instNorms.instrument}" not found in DB`);
      normSkipCount += instNorms.items.length;
      continue;
    }

    for (const itemNorm of instNorms.items) {
      const dbItem = dbInstrument.items.find(i => i.itemNumber === itemNorm.itemNumber);
      if (!dbItem) {
        console.error(`  WARNING: Item ${instNorms.instrument} #${itemNorm.itemNumber} not found`);
        normSkipCount++;
        continue;
      }

      await prisma.item.update({
        where: { id: dbItem.id },
        data: {
          normativeResponseDist: itemNorm.dist,
        },
      });
      normUpdateCount++;
    }
  }
  console.log(`  Updated ${normUpdateCount} items with normative response distributions.`);
  if (normSkipCount > 0) {
    console.log(`  WARNING: ${normSkipCount} items skipped due to unresolved references.`);
  }

  console.log("\nDone!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => { prisma.$disconnect(); });
