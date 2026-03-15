# Data Collection Progress

Tracks implementation progress for the Bayesian Adaptive Psychiatric Screening Model data pipeline.

---

## Step 1: Define Dimensional Framework
**Status:** DONE
- [x] Prisma schema created with all psychometric reference data models and enums
- [x] Tables created in Supabase (via direct SQL, coexisting with friend's tables)
- [x] Seed 8 spectra into Dimension table
- [x] Seed 35 conditions into Dimension table (with parentId references)

**Note:** Session/Patient/dynamic models removed from schema — this repo covers psychometric reference data only. Session models will be added during implementation phase.

## Step 4b: Condition-to-Spectrum Loadings (L matrix)
**Status:** DONE
- [x] Build 35×8 L matrix from SPECTRA_AND_CONDITIONS.md cross-loading notes
- [x] Seed into ConditionSpectrumLoading table (48 nonzero entries)

## Step 2: Collect Correlation Matrices (8×8 spectrum-level)
**Status:** DONE
- [x] Research and compile 28 spectrum-spectrum correlations
- [x] Verify positive semidefiniteness (Cholesky decomposition check passes)
- [x] Seed into DimensionCorrelation table (28 rows)

**Sources:** Ringwald et al. (2021) meta-analysis (N=120,596), Krueger (1999, NCS N=8,098), Eaton et al. (2013, N=59,979), Slade & Watson (2006, N=5,878), Kotov et al. (2017, 2021), Forbes et al. (2021), Forbush & Kotov (2021), Pallanti et al. (2011, N=3,021), Ruscio et al. (2010, N=9,282), Poyurovsky et al. (2004, N=200). Distress-Fear and Disinhib-Antag subfactor correlations derived from Krueger's internalizing/externalizing subfactor structure. Compulsivity correlations derived from Kotov et al. (2021) proposal. Final values are sample-size-weighted averages per the averaging protocol in DATA_COLLECTION_PLAN.md.

## Step 3: Collect Condition-Level Base Rates
**Status:** DONE
- [x] Collect 12-month prevalence for 35 conditions × 4 populations
- [x] Convert to liability scores via Φ⁻¹(prevalence) (Acklam's probit approximation)
- [x] Seed into BaseRate table (140 rows)

**Sources:** NCS-R (Kessler et al. 2005, N=9,282), NESARC-III (Grant et al. 2015, N=36,309), NSDUH 2019 (N=67,500), WHO WMH Surveys (N=85,052+), CDC ADDM Network, Zimmerman et al. 2008 psychiatric outpatient survey (N=2,300), ACHA-NCHA 2019 (N=67,972), Blanco et al. 2008 NCS-R college subsample (N=2,188), Kroenke et al. 2007 (N=3,000), Serrano-Blanco et al. 2010 (N=3,815), and condition-specific meta-analyses. General population rates from NCS-R/NSDUH; clinical rates from Zimmerman et al. psychiatric outpatient data; college from ACHA-NCHA/Blanco/Eisenberg; primary care from Kroenke/Serrano-Blanco. Median estimates used when range >2×. Derived/estimated rates flagged with appropriate sourceQuality.

## Step 4a: Build Item Bank
**Status:** DONE
- [x] Collect Tier 1 instruments (PHQ-9, GAD-7, PHQ-15, PC-PTSD-5, AUDIT-C, WHO-5)
- [x] Collect Tier 2 instruments (PCL-5, Y-BOCS, CAPE-42, AUDIT, DAST-10, MDQ, ASRS v1.1, SPIN, PQ-16, PHQ-Panic)
- [x] Add gap-filling instruments: SPQ-B (22), AQ-10 (10), CDS-2 (2), PID-5-BF (25), WI-7 (7), HRS-SR (5), BDDQ (4), SCOFF (5), BEDS-7 (7), PGSI (9), HCL-32 (32)
- [x] Seed Instrument + Item tables (27 instruments, 332 items)
- [x] All items tagged with ContentTag semantic tags from controlled vocabulary
- [x] Removed `license` field from Instrument schema (licensing handled independently)
- [x] Added new ContentTag values: MAGICAL_THINKING, ECCENTRIC_BEHAVIOR, HEALTH_ANXIETY, PURGING, RISK_TAKING, TALKATIVENESS, EMOTIONAL_LABILITY, HOSTILITY, IRRESPONSIBILITY, WITHDRAWAL

**Instruments seeded:**
- Tier 1 (Broad Screening, 6 instruments, 44 items): PHQ-9 (9), GAD-7 (7), PHQ-15 (15), PC-PTSD-5 (5), AUDIT-C (3), WHO-5 (5)
- Tier 2 (Targeted, 21 instruments, 288 items): PCL-5 (20), Y-BOCS (10), CAPE-42 (42), AUDIT (10), DAST-10 (10), MDQ (13), ASRS v1.1 (6), SPIN (17), PQ-16 (16), PHQ-Panic (15), SPQ-B (22), AQ-10 (10), CDS-2 (2), PID-5-BF (25), WI-7 (7), HRS-SR (5), BDDQ (4), SCOFF (5), BEDS-7 (7), PGSI (9), HCL-32 (32)

**Gap coverage:**
- Detachment: SPQ-B (schizotypal), AQ-10 (autism), CDS-2 (depersonalization)
- Antagonistic/personality: PID-5-BF (covers all 5 DSM-5 maladaptive trait domains — also fills detachment gap)
- Somatoform: WI-7 (illness anxiety)
- Compulsivity: HRS-SR (hoarding), BDDQ (body dysmorphia), SCOFF (eating disorders)
- Disinhibited externalizing: BEDS-7 (binge eating), PGSI (gambling)
- Thought disorder: HCL-32 (hypomania — superior to MDQ for bipolar II detection)

**Data file:** `prisma/seed-instruments.ts` — all item text, response scales, reverse-coding flags, and content tags.
**Migration:** `prisma/migrations/step4a_instruments.sql` — creates all enums, tables (Dimension, DimensionCorrelation, ConditionSpectrumLoading, BaseRate, Instrument, Item, ItemLoading, ItemOverlap, ClinicalThreshold) with proper FK constraints.

## Step 4c: Precompute Item Overlaps
**Status:** DONE
- [x] Identify content-overlapping item pairs
- [x] Seed into ItemOverlap table (98 overlapping pairs, updated with gap-filling instruments)

**Overlap breakdown:**
- HIGH (identical content, multiplier 3.0): 16+ pairs — AUDIT-C ↔ AUDIT (3 identical items), PHQ-9 ↔ PHQ-15 (fatigue, sleep), MDQ ↔ HCL-32 (11 near-identical hypomania items), SCOFF ↔ BEDS-7 (loss of control over eating)
- MODERATE (same construct, different framing, multiplier 2.0): 39+ pairs — anhedonia cluster (PHQ-9 ↔ WHO-5/PCL-5/CAPE-42/PQ-16), depressed mood (PHQ-9 ↔ WHO-5/CAPE-42), sleep (PHQ-9/PHQ-15 ↔ PCL-5), fatigue (PHQ-9/PHQ-15 ↔ WHO-5/CAPE-42), worthlessness (PHQ-9 ↔ PC-PTSD-5/PCL-5/CAPE-42), concentration (PHQ-9 ↔ PCL-5/CAPE-42), suicidality (PHQ-9 ↔ CAPE-42), irritability (GAD-7 ↔ PCL-5/MDQ/HCL-32), PTSD screener ↔ full scale (PC-PTSD-5 ↔ PCL-5), somatic/panic (PHQ-15 ↔ PHQ-Panic), psychotic experiences (CAPE-42 ↔ PQ-16 ↔ SPQ-B ↔ PID-5-BF), detachment/withdrawal (PID-5-BF ↔ SPQ-B ↔ AQ-10), depersonalization (CDS-2 ↔ CAPE-42 ↔ PQ-16 ↔ PID-5-BF), hoarding (HRS-SR ↔ Y-BOCS), body image (BDDQ ↔ SCOFF), eating (SCOFF ↔ BEDS-7), gambling (PGSI items), hypomania (HCL-32 ↔ MDQ)
- LOW (thematically related, multiplier 1.5): 20+ pairs — psychomotor, tension, cross-domain concentration (PHQ-9/CAPE-42/ASRS/HCL-32), paranoia, trembling, derealization, emotional detachment, social withdrawal (SPQ-B/AQ-10/PID-5-BF), impulsivity/risk-taking (PGSI/HCL-32/PID-5-BF), health anxiety (WI-7/GAD-7), grandiosity (CAPE-42/PID-5-BF), sleep context differences (PHQ-9/HCL-32)

**Data file:** `prisma/seed-overlaps.ts`
**Identification method:** Systematic matching on shared ContentTag values across instruments, verified by semantic comparison of item text.

## Step 5: Item-Level Factor Loadings (h vectors)
**Status:** DONE
- [x] Collect within-instrument factor loadings (Step 5a)
- [x] Collect instrument-to-dimension mappings (Step 5b)
- [x] Chain the loadings (Step 5c)
- [x] Seed into ItemLoading table

**Methodology:**
- **Step 5a (within-instrument loadings):** CFA item-level loadings extracted from published validation studies. Sample-size-weighted averages used when multiple studies available. Unidimensional model preferred unless instrument has established multi-factor structure (PCL-5: 4-factor DSM-5; CAPE-42: 3-factor; PID-5-BF: 5-factor; SPQ-B: 3-factor; Y-BOCS: 2-factor obs/comp; HCL-32: 2-factor active/risk).
- **Step 5b (instrument→dimension mappings):** Primary source: Wendt et al. (2023, N=909) HiTOP alignment study. Supplemented by Kotov et al. (2017, 2021) HiTOP structural papers. Tier 1 instruments map to spectra; Tier 2 instruments map to conditions.
- **Step 5c (chaining):** h_ij = λ_within × γ_inst→dim. Both component values stored in ItemLoading table for transparency.
- Tier 1 (6 instruments, 44 items) → spectra with content-based cross-loadings (e.g., PHQ-9 somatic items → SOM, anhedonia → DET)
- Tier 2 (21 instruments, 288 items) → conditions. Most simple 1-to-1; complex instruments (CAPE-42, PID-5-BF, SPQ-B) mapped per subscale to relevant conditions.

**Output:** 395 ItemLoading entries across 30 dimensions (8 spectra + 22 conditions). 323 primary, 72 secondary/cross-loading. Loading range [0.14, 0.82].

**Sources:** Huang et al. 2006 (PHQ-9, N=2,615), Löwe et al. 2008 (GAD-7, N=5,030), Körber et al. 2011 (PHQ-15, N=2,091), Blevins et al. 2015 (PCL-5), Stefanis et al. 2002 (CAPE-42), Shields et al. 2004 (AUDIT, N=14,001), Angst et al. 2005 (HCL-32, N=1,565), Bach et al. 2016 (PID-5-BF, N=1,132), Connor et al. 2000 (SPIN), Ising et al. 2012 (PQ-16, N=2,518), Raine & Benishay 1995 (SPQ-B), Allison et al. 2012 (AQ-10, N=4,000), and instrument-specific validation papers for remaining instruments.

**Data file:** `prisma/seed-loadings.ts` — compact instrument-dimension mapping definitions with expand() helper for chained loading computation.

## Step 6: Noise Variances (σi²)
**Status:** DONE
- [x] Collect test-retest reliability data
- [x] Compute σi² = (1 − ri) × inflation_factor
- [x] Update Item table with noiseVariance, testRetestR

**Methodology:**
- Formula: σi² = (1 − ri) × 1.5 (default inflation factor)
- Item-level test-retest used for 5 instruments where published data exists: PHQ-9 (Huang et al. 2006), PCL-5 (Blevins et al. 2015), Y-BOCS (Goodman et al. 1989), AUDIT (Shields et al. 2004), AUDIT-C (from AUDIT items 1-3)
- Scale-level ICC applied uniformly for remaining 22 instruments
- Reliability range: 0.74 (PQ-16) – 0.87 (AUDIT, BEDS-7)
- Noise variance range: 0.195 – 0.39
- BDDQ marked as ESTIMATED (no published test-retest data)
- All retest intervals are 1-2 weeks (standard for psychiatric instruments)

**Sources:** Huang et al. 2006 (N=2,615), Blevins et al. 2015, Bovin et al. 2016 (N=677), Goodman et al. 1989, Shields et al. 2004 (N=14,001), Spitzer et al. 2006, Löwe et al. 2008 (N=5,030), Kroenke et al. 2002, Prins et al. 2016, Topp et al. 2015, Connor et al. 2000, Ising et al. 2012 (N=2,518), Raine & Benishay 1995, Allison et al. 2012 (N=4,000), Bach et al. 2016 (N=1,132), Angst et al. 2005 (N=1,565), and instrument-specific validation papers.

**Data file:** `prisma/seed-noise.ts` — reliability coefficients with per-item overrides where available, plus `computeNoiseVariance()` and `getItemNoise()` helpers.

## Step 7: Clinical Thresholds (τj)
**Status:** DONE
- [x] Collect cutoff scores for 35 conditions
- [x] Convert to liability scale
- [x] Seed into ClinicalThreshold table (35 rows, one per condition)

**Methodology:**
- For each condition, identified the primary screening instrument and its established clinical cutoff score.
- Converted cutoffs to liability scale (standard normal τ) using proportion scoring above cutoff in normative samples and specificity-based mapping: τ ≈ Φ⁻¹(specificity) or prevalence-severity calibration.
- Sensitivity and specificity recorded at each threshold from validation studies.
- Liability thresholds range from 0.84 (ADJ, subthreshold) to 1.88 (SCZ, very stringent).

**Instrument coverage:**
- 22 conditions have thresholds derived from dedicated screening instruments with published cutoff validation (META_ANALYSIS or LARGE_STUDY quality).
- 8 conditions use DERIVED thresholds (instrument exists but cutoff is composite/indirect, e.g., PID-5-BF domain combinations for personality disorders).
- 5 conditions use ESTIMATED thresholds (no dedicated screener: ADJ, AGO, SPH, SEP, TIC).

**Sources:** Kroenke et al. 2001 (PHQ-9, N=6,000), Levis et al. 2019 (PHQ-9 IPD meta-analysis, N=58,000), Spitzer et al. 2006 (GAD-7, N=2,740), Blevins et al. 2015 (PCL-5), Ising et al. 2012 (PQ-16, N=2,518), Connor et al. 2000 (SPIN), Saunders et al. 1993 (AUDIT), Angst et al. 2005 (HCL-32, N=1,565), Hirschfeld et al. 2000 (MDQ), Allison et al. 2012 (AQ-10, N=4,000), Goodman et al. 1989 (Y-BOCS), Tolin et al. 2010 (HRS), Bach et al. 2016 (PID-5-BF, N=1,132), and instrument-specific validation papers.

**Data file:** `prisma/seed-thresholds.ts` — all 35 threshold entries with sources, sensitivity/specificity, and instrument cutoffs.

## Step 8: Validate and Reconcile
**Status:** DONE
- [x] Verify Σ₀ is positive semidefinite
- [x] Verify L matrix produces sensible condition priors
- [x] Verify loading vector sparsity
- [x] Cross-check base rates
- [x] Run simulated screening

**Results (31 passed, 0 failed, 8 warnings):**

**Check 1 — Σ₀ PSD:** Cholesky succeeds. Eigenvalues [0.299, 3.145], condition number 10.52. Matrix is symmetric with all diagonal entries = 1.0 and all 28 unique correlation pairs present. Well-conditioned.

**Check 2 — L Matrix Priors:** All 35 conditions have L-matrix loadings. Primary loadings range [0.60, 0.90], secondary [0.25, 0.45] with no overlap. Stage transition produces sensible condition prior updates — e.g., when Distress is elevated 1.5 SD, MDD gets the largest prior shift (+1.275) among Distress conditions, and cross-loading conditions (BPD, BP2) get smaller appropriate shifts. No condition exceeds 50% probability at 1.5 SD elevation.

**Check 3 — Loading Sparsity:** 331 items with 395 loading entries (1.19 avg per item). 100% of items have ≤3 loadings. Loading range [0.142, 0.817]. All Tier 1 items load onto spectra; all Tier 2 items load onto conditions. 8 warnings for CAPE-42 depressive subscale items (35-42) lacking `isPrimary=true` — expected since these are secondary cross-loadings onto BP2.

**Check 4 — Base Rates:** All 35 conditions have general population rates in (0, 1). No condition exceeds 15%. All liability means are negative (prevalence < 50%). Common conditions (MDD 7.1%, SAD 7.3%, SPH 8.7%) have appropriately higher rates than rare conditions (SCZ 0.5%, AN 0.3%, GAMB 0.5%).

**Check 5 — Simulated Screening:**
- *Stage 1:* PHQ-9 with high severity → Distress posterior 1.298 (highest), with appropriate cross-loading elevation in SOM (0.693), DET (0.874), FEA (0.847). Uncertainty reduced 29.4% (trace 8.0 → 5.649).
- *Stage transition:* MDD has highest updated prior among Distress conditions (expected). Condition probabilities range from 1.2% (GAMB) to 35.8% (MDD).
- *Stage 2:* PCL-5 items with 0 responses → PTSD posterior decreased from -0.616 to -2.048 (P(present) → 0.0%), while MDD unchanged (expected — PCL-5 targets PTSD, not MDD).
- All 35 thresholds present, range [0.84, 1.88]. All 27 instruments have noise variance data, σ² range [0.195, 0.390].

**Validation script:** `prisma/validate.ts` — standalone, no database connection required.

## Step 9: Classification & Flagging Tuning
**Status:** DONE

Three changes to the screening config and logic:

**1. Removed `spectrumFlagUncertaintyRatio` — mean-only spectrum flagging.**
- Previously, spectra were flagged for stage 2 if mean exceeded threshold OR posterior std was still high relative to prior. The uncertainty criterion caused the system to chase low-mean, high-uncertainty spectra — wasting stage 2 items on conditions with low priors. Mean-only flagging focuses stage 2 on spectra with actual signal.
- Config field renamed: `spectrumFlagMeanPercentile` → `spectrumFlagMeanZ` (was never a percentile — it's a z-score threshold; 0.40 ≈ 66th percentile of N(0,1)).

**2. Asymmetric uncertainty gates for classification.**
- `ruledOutMaxUncertainty` raised from 0.4 to 0.5. Ruling out at P < 0.10 is lower stakes — a slightly wider uncertainty band is acceptable since the probability is already very low.

**3. Added uncertainty gate to "flagged" classification.**
- Previously, any condition with P > 0.25 was classified "flagged" regardless of uncertainty. A condition with P=0.26 and std=0.95 (uninformative posterior) would be "flagged" — implying a clinical signal when there was none.
- Added `flaggedMaxUncertainty: 0.7` — conditions with very high uncertainty now correctly classify as "uncertain" instead of "flagged."

**Files changed:** `src/lib/screening/config.ts`, `src/lib/screening/transition.ts`, `src/lib/screening/diagnosis.ts`, `SCREENING_PLAN.md`.
