# Data Collection Plan

This document is a step-by-step guide for Claude to collect, structure, and populate the psychometric data required by the Bayesian Adaptive Psychiatric Screening Model. All data comes from published literature and open psychometric resources.

**Scope note:** Tier 3 / Extended instruments are out of scope. Do not collect data for BDI-II, BAI, DASS-21, K10/K6, LSAS, OCI-R, IES-R, DARS, DERS, etc. Focus only on Tier 1 (broad screening) and Tier 2 (targeted disambiguation) instruments.

---

## How the Two Stages Work

Understanding this is critical for all data collection decisions.

**Stage 1 (Broad Screening):** Common, nonspecific items ("trouble sleeping," "worrying a lot," "difficulty concentrating") are administered. These items load on multiple spectra. The model operates over **8 spectra** and updates an 8×8 covariance matrix. The output is a posterior over spectra — a rough shape of where in the psychiatric space the patient sits.

**Stage 2 (Targeted Disambiguation):** The spectrum posteriors from stage 1 are projected down to condition-level priors via the L matrix. Then condition-specific items are selected to disambiguate which conditions within the flagged spectra are most likely. Conditions are treated as **independent given their spectrum** — no within-spectrum correlation matrix is needed.

**The stage transition (spectrum → condition):**
1. Take the spectrum-level posterior from stage 1: μ_spectrum, Σ_spectrum (8-dimensional).
2. Derive condition-level priors by combining per-population condition base rates with spectrum posteriors via the L matrix: μ_condition = μ_condition_base + L_row × μ_spectrum_posterior. Conditions whose parent spectra scored high get their priors shifted up.
3. Conditions within a spectrum are treated as independent (no D matrix). Each condition gets unit prior variance.
4. Run the Kalman filter over condition-level items within each flagged spectrum.

**One covariance matrix for all populations:** The correlation structure (Σ₀) is the same regardless of population type. Different populations (general, clinical, college, primary care) differ only in their prior means (μ₀). The covariance matrix captures the *structure* of psychiatric comorbidity, which is stable across populations. Prior means capture the *level*, which varies.

**Spectrum-level priors are normed:** All spectrum priors are μ₀ = 0 with unit variance for all populations. This is definitional — no spectrum-level base rates to collect or store. Population differences are captured at the condition level via per-population condition base rates, which feed into condition-level priors at the stage transition.

---

## 1. Define the Dimensional Framework

**Goal:** Establish the set of psychiatric dimensions the model operates over.

**Source:** `SPECTRA_AND_CONDITIONS.md` (already defined).

**Action:**
- Use the 8 spectra defined in SPECTRA_AND_CONDITIONS.md:
  1. Distress
  2. Fear
  3. Disinhibited Externalizing
  4. Antagonistic Externalizing
  5. Thought Disorder
  6. Detachment
  7. Somatoform
  8. Compulsivity
- Use the 35 conditions listed under each spectrum.
- Record cross-loading notes (e.g., PTSD: Distress primary + Fear secondary).

**Output:** `Dimension` table — 8 rows at SPECTRUM level, 35 rows at CONDITION level, each condition pointing to its primary parent spectrum via `parentId`.

---

## 2. Collect Correlation Matrices

**Goal:** Build the prior covariance structures for both stages of the model.

**Important:** One correlation structure is used across all populations. Different populations use different base rates but the same covariance matrix.

### 2a. Spectrum-Level Correlations (Stage 1: 8×8 matrix)

**Primary Source:** Ringwald et al. meta-analysis (120,596 participants, 35 studies, 23 DSM diagnoses).

**Secondary Sources:**
- Kotov et al. (2017) — HiTOP structural paper
- Caspi et al. (2014) — p-factor and general psychopathology
- Forbes et al. (2021) — HiTOP utility paper with inter-spectrum correlations

**Action:**
1. Extract or reconstruct the 8×8 inter-spectrum correlation matrix. This is 28 unique off-diagonal correlations.
2. Note: our 8 spectra split the traditional HiTOP "Internalizing" into Distress and Fear, and add Compulsivity as a separate spectrum. May need to derive some correlations from subfactor-level data.
3. Verify positive semidefiniteness. Apply nearest-PSD projection if needed and document adjustments.

**No within-spectrum condition correlations (D matrix).** Conditions within a spectrum are treated as independent given their spectrum. This simplification avoids the need for hard-to-find within-spectrum residual correlation data. The spectrum-level correlation structure from stage 1 captures the major comorbidity patterns; condition-level disambiguation relies on item loadings alone.

**Challenges:**
- Different studies report correlations at different levels (diagnosis-level vs. spectrum-level vs. trait-level). Must be careful about what level the numbers represent.
- Correlations from different studies may use different populations, instruments, and methods. When multiple estimates exist for the same pair, average them using sample-size weighting.
- The assembled matrix may not be positive semidefinite. Nearest-PSD projection is required — document which entries shifted and by how much.

**Averaging Disagreeing Data:**
- When multiple sources report different correlations for the same dimension pair, use **inverse-variance weighted averaging** (weight by 1/SE² where SE is available, otherwise weight by sample size).
- Record all source values, the weighted average, and the range of disagreement. If the range exceeds 0.2, flag for manual review.
- For spectrum-level correlations where meta-analytic estimates exist, prefer the meta-analytic estimate over any single study.

**Output:** `DimensionCorrelation` table — spectrum-spectrum pairs only (28 rows).

---

## 3. Collect Condition-Level Base Rates

**Goal:** Establish 12-month prevalence for each of the 35 conditions, per population type.

**Spectrum-level priors are normed:** Stage 1 always starts with μ₀ = 0, unit variance for all 8 spectra, regardless of population. No spectrum base rates to collect or store.

**Condition base rates** are per-population and are used at the stage transition to build condition-level priors. After stage 1 produces spectrum posteriors, the condition base rates are adjusted by the spectrum posteriors via the L matrix:
```
μ_condition_updated = μ_condition_base + L_row × μ_spectrum_posterior
```
where μ_condition_base comes from this table (converted to liability scale) and L_row is the condition's loading vector onto spectra.

**Sources:**
- SAMHSA National Survey on Drug Use and Health (NSDUH) — community prevalence
- Published clinic-based prevalence surveys — psychiatric clinic base rates
- WHO World Mental Health Surveys — international prevalence data
- College counseling center prevalence surveys

**Action:**
1. Collect 12-month prevalence rates for each of the 35 conditions.
2. Provide base rates for each population type: `GENERAL`, `CLINICAL`, `COLLEGE`, `PRIMARY_CARE`.
3. Convert prevalence rates to liability scores using the inverse normal CDF: μ₀ⱼ = Φ⁻¹(prevalence_j).

**Challenges:**
- Prevalence varies significantly by population (age, sex, geography, clinical setting). Must document which population each estimate comes from.
- Some conditions have wide-ranging prevalence estimates (e.g., ADHD: 2–11% depending on diagnostic criteria and population). Use the median estimate from the most recent large-scale meta-analysis.
- Some of the 35 conditions (e.g., schizoid features, schizotypal features) have very sparse epidemiological data.

**Averaging Disagreeing Data:**
- For prevalence rates, use the **median** of available estimates rather than the mean, as prevalence distributions tend to be right-skewed due to methodological outliers.
- Weight toward larger, more recent, more methodologically rigorous studies (structured clinical interviews > self-report surveys).
- When estimates span more than a 2× range, provide the full range and the selected value with justification.

**Output:** `BaseRate` table — one row per (condition, populationType) pair. 35 conditions × 4 populations = 140 rows max.

---

## 4. Build the Item Bank and Structural Loadings

### 4a. Collect Items from Instruments

**Goal:** Collect all questionnaire items from validated instruments, with metadata.

**Instruments to include (priority order):**

#### Tier 1 — Broad screening (Stage 1 items)
These are common, nonspecific items that load on multiple spectra. Think: "trouble sleeping," "worrying a lot," "difficulty concentrating," "feeling tired." They tell you *that* something is wrong and roughly which spectra are involved, but not which specific condition.
- **PHQ-9** (depression) — 9 items
- **GAD-7** (anxiety) — 7 items
- **PHQ-15** (somatic symptoms) — 15 items
- **PC-PTSD-5** (PTSD screen) — 5 items
- **AUDIT-C** (alcohol) — 3 items
- **WHO-5** (well-being) — 5 items

#### Tier 2 — Targeted disambiguation (Stage 2 items)
These have narrow, strong loadings on specific conditions. They disambiguate *within* a spectrum.
- **PCL-5** (PTSD) — 20 items
- **Y-BOCS** (OCD) — 10 items
- **CAPE-42** (psychotic experiences) — 42 items
- **AUDIT** (alcohol, full) — 10 items
- **DAST-10** (drug use) — 10 items
- **MDQ** (bipolar/mania) — 13 items
- **ASRS v1.1** (ADHD) — 6 items (screener)
- **SPIN** (social anxiety) — 17 items
- **PQ-16** (psychosis) — 16 items
- **PHQ-Panic** (panic disorder) — 15 items
- **SPQ-B** (schizotypal personality, brief) — 22 items (interpersonal deficit, constricted affect, cognitive-perceptual) [Detachment gap]
- **AQ-10** (autism spectrum) — 10 items [Detachment gap]
- **CDS-2** (depersonalization) — 2 items [Detachment gap]
- **PID-5-BF** (DSM-5 personality, brief) — 25 items (antagonism, disinhibition, detachment, negative affect, psychoticism) [Antagonistic/personality gap + Detachment double duty]
- **WI-7** (illness anxiety) — 7 items [Somatoform gap]
- **HRS-SR** (hoarding) — 5 items [Compulsivity gap]
- **BDDQ** (body dysmorphic disorder) — 4 items [Compulsivity gap]
- **SCOFF** (eating disorders) — 5 items [Compulsivity gap]
- **BEDS-7** (binge eating disorder) — 7 items [Disinhibited externalizing gap]
- **PGSI** (problem gambling) — 9 items [Disinhibited externalizing gap]
- **HCL-32** (hypomania) — 32 items [Thought disorder gap, superior to MDQ for bipolar II]

**Action for each instrument:**
1. Record each item's text, response scale, and scoring direction.
2. Assign semantic tags from the **controlled vocabulary** (see ContentTag enum in schema). Do NOT use freetext — matching depends on consistent tags.

**Output:** `Instrument` table + `Item` table.

### 4b. Collect Condition-to-Spectrum Loadings (L matrix)

**Goal:** Build the structural loading matrix L that maps conditions onto spectra. This is NOT item loadings — it's the structural relationship between the two dimension levels.

**Source:** SPECTRA_AND_CONDITIONS.md cross-loading notes, HiTOP structural papers.

**Action:**
1. For each of the 35 conditions, record its loading onto each of the 8 spectra.
2. Most conditions load primarily on one spectrum (loading ≈ 0.7–0.9) with zero on the rest.
3. Cross-loading conditions (see SPECTRA_AND_CONDITIONS.md) have secondary loadings on 1–2 other spectra (typically 0.2–0.5).
4. This matrix is 35×8 = 280 entries, but very sparse (~50 nonzero entries).

**Example:**
| Condition | Distress | Fear | DisinhExt | AntagExt | ThoughtDis | Detach | Somat | Compuls |
|-----------|----------|------|-----------|----------|------------|--------|-------|---------|
| MDD | 0.85 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| PTSD | 0.65 | 0.40 | 0 | 0 | 0 | 0 | 0 | 0 |
| GAD | 0.75 | 0.30 | 0 | 0 | 0 | 0 | 0 | 0 |

**Output:** `ConditionSpectrumLoading` table — one row per (condition, spectrum) pair with nonzero loading.

### 4c. Precompute Item Overlaps

**Goal:** Identify content-overlapping item pairs across instruments for deterministic deduplication during sessions.

**Action:**
1. Review all items in the bank and identify pairs that measure the same underlying content (e.g., "PHQ-9 item 3 [sleep] ↔ ISI item 1 [sleep onset difficulty]").
2. Assign an overlap strength: `HIGH` (nearly identical content), `MODERATE` (related but different framing), `LOW` (thematically related).
3. This is a small table — most instruments don't overlap much. Biggest overlaps are between PHQ-9 and GAD-7 (both share somatic items), PHQ-15 and PHQ-9 (overlapping somatic content), and any instrument's sleep/fatigue/concentration items.

**Why this matters:** When an overlapping item has already been administered, the duplicate item's σ² should be inflated at runtime. Precomputing overlaps means the system doesn't rely on the LLM to detect them in-session.

**Output:** `ItemOverlap` table — one row per overlapping item pair.

---

## 5. Collect Item-Level Factor Loadings (h vectors)

**Goal:** For each item, determine how strongly it loads onto each psychiatric dimension.

This is the most labor-intensive step and requires chaining two types of data.

**Important:** Stage 1 items load onto **spectra** (their h vectors have 8 entries). Stage 2 items load onto **conditions** (their h vectors have entries for the conditions within their target spectrum). The `ItemLoading.dimensionId` field points to either a spectrum or condition Dimension row accordingly.

### Step 5a: Within-Instrument Factor Loadings

**Sources:** Published factor analysis studies for each instrument.

**Action:**
1. For each instrument, find 2–3 published factor analyses (preferably confirmatory factor analyses in large samples).
2. Extract item-level factor loadings onto the instrument's own subscales.
3. When multiple studies report loadings, average them (see averaging protocol below).
4. For second stage instruments, most of the time each item should only load onto the one thing the instrument measures, and this becomes a measure of item power

**Key studies to find:**
- PHQ-9: Kroenke et al. (2001) original validation + subsequent CFA studies
- GAD-7: Spitzer et al. (2006) + CFA replications
- PCL-5: Blevins et al. (2015) + factor structure studies (multiple competing models)
- Y-BOCS: Goodman et al. (1989) + factor analyses
- CAPE-42: Stefanis et al. (2002) + factor structure studies
- AUDIT: Saunders et al. (1993) + CFA studies

### Step 5b: Instrument-to-Dimension Mappings

**Sources:** HiTOP alignment studies.

**Primary source:** Wendt et al. (2023) — mapping established scales onto HiTOP dimensions.

**Action:**
1. For Tier 1 instruments: map onto **spectra**. Determine which of the 8 spectra each instrument/subscale maps to and the strength.
2. For Tier 2 instruments: map onto **conditions**. These instruments target specific conditions (e.g., PCL-5 → PTSD, Y-BOCS → OCD).

### Step 5c: Chain the Loadings

**Action:**
For each item i on instrument X targeting dimension j:
```
h_ij = (item loading on instrument factor) × (instrument factor loading on dimension j)
```

Set h_ij = 0 for dimensions the instrument has no plausible connection to.

**Challenges:**
- Cross-loading data is sparse for many items. Most studies only report loadings on the instrument's primary factor(s), not on external dimensions.
- Different factor analysis studies often disagree on the number of factors and item loadings.
- The chaining multiplication introduces compounding error.

**Averaging Disagreeing Data:**
- For item-level loadings within an instrument, use **sample-size-weighted averaging** across studies.
- When studies disagree on factor structure (e.g., PCL-5 has 4-factor, 6-factor, and 7-factor models), prefer the model with the best fit indices in the largest sample, but note alternatives.
- For cross-loadings, if no published data exists, use LLM estimation with a wider σ² (1.5–2× the base noise variance) to reflect lower confidence. Mark these as "estimated" in the data.
- When factor loadings from different studies differ by more than 0.15, flag for review and document the range.

**Output:** `ItemLoading` table — one row per (item, dimension) pair with nonzero loading.

---

## 6. Collect Noise Variances (σᵢ²)

**Goal:** Determine the measurement noise floor for each item.

**Important:** The stored `noiseVariance` is a **floor**, not the actual value used at runtime. During a session, σ² is inflated dynamically based on content overlap with previously administered items (via the `ItemOverlap` table). The stored value is the minimum.

**Sources:** Test-retest reliability studies for each instrument.

**Action:**
1. For each instrument, find published test-retest reliability data (item-level if available, scale-level otherwise).
2. Set σᵢ² = 1 − rᵢ (where rᵢ is the test-retest reliability coefficient).
3. Apply inflation factor of 1.5× as default (adjustable). This is the static floor inflation.
4. If only scale-level reliability is available, apply it uniformly to all items on that scale.

**Challenges:**
- Item-level test-retest reliability is rarely published — usually only scale-level ICC or Pearson r.
- Test-retest interval varies across studies (1 week vs. 1 month vs. 3 months). Shorter intervals yield higher reliability.

**Averaging Disagreeing Data:**
- Prefer test-retest data from 1–2 week intervals (standard for psychiatric instruments).
- When multiple reliability estimates exist, use the **median** (reliability estimates are bounded [0,1] and can be inflated by short retest intervals).
- If only internal consistency (Cronbach's α) is available and no test-retest data exists, use α as an upper bound on reliability and note the substitution.

**Output:** `noiseVariance` and `testRetestR` fields on the `Item` table.

---

## 7. Collect Clinical Thresholds (τⱼ)

**Goal:** Establish the liability thresholds above which a condition is considered present.

**Sources:** Published cutoff scores and their corresponding sensitivity/specificity from validation studies.

**Action:**
1. For each of the 35 conditions, find the established clinical cutoff on the primary instrument (e.g., PHQ-9 ≥ 10 for moderate depression).
2. Convert to the liability scale using the instrument's normative data.
3. Record sensitivity and specificity at the selected threshold.

**Output:** `ClinicalThreshold` table — one row per condition.

---

## 8. Validate and Reconcile

**Goal:** Ensure all collected data is internally consistent.

**Action:**
1. Assemble the 8×8 spectrum correlation matrix and verify positive semidefiniteness. Apply nearest-PSD projection if needed and document adjustments.
2. Verify that the L matrix (condition-to-spectrum loadings) produces sensible condition priors when applied to spectrum posteriors.
3. Verify that all loading vectors have the expected sparsity pattern (most entries zero).
4. Cross-check that condition base rates produce sensible liability priors (e.g., MDD prevalence should not imply > 50% in general population).
5. Run a simulated screening with synthetic responses to verify:
   - Stage 1 updates produce sensible spectrum posteriors.
   - Stage transition correctly derives condition-level priors via L matrix.
   - Stage 2 updates produce sensible condition posteriors.

---

## Execution Order

1. **Dimensions** (Step 1) — foundation, everything else references this
2. **Correlation matrix** (Step 2) — spectrum-level correlations (8×8)
3. **Base rates** (Step 3) — condition-level prevalence per population
4. **Item bank + L matrix + overlaps** (Step 4a, 4b, 4c) — items, structural loadings, deduplication
5. **Factor loadings** (Step 5) — depends on items and dimensions
6. **Noise variances** (Step 6) — depends on items
7. **Clinical thresholds** (Step 7) — depends on conditions
8. **Validation** (Step 8) — depends on everything

Steps 2, 3, and 4 can be done in parallel. Steps 5 and 6 can be done in parallel after Step 4 is complete.

---

## Data Quality Flags

Every collected value should have a `source_quality` rating:

| Rating | Meaning |
|--------|---------|
| `meta_analysis` | From a published meta-analysis — highest confidence |
| `large_study` | From a single study with N > 1000 |
| `small_study` | From a single study with N < 1000 |
| `derived` | Computed by chaining/multiplying other values |
| `estimated` | LLM-estimated where no published data exists — lowest confidence, σ² inflated |

---

## Summary of Averaging / Reconciliation Strategies

| Data Type | Averaging Method | Disagreement Threshold | Action on Disagreement |
|-----------|-----------------|----------------------|----------------------|
| Spectrum correlations | Inverse-variance weighted mean | Range > 0.2 | Flag for review, prefer meta-analytic estimate |
| Prevalence rates | Median of estimates | Range > 2× | Provide full range + justification |
| Factor loadings | Sample-size weighted mean | Difference > 0.15 | Flag for review, document range |
| Test-retest reliability | Median | — | Prefer 1–2 week retest intervals |
| Cross-loadings (sparse) | LLM estimation | — | Mark as "estimated", inflate σ² by 1.5–2× |
| Condition-spectrum loadings (L) | Prefer HiTOP structural papers | — | Use SPECTRA_AND_CONDITIONS.md as ground truth for primary/secondary assignments |
