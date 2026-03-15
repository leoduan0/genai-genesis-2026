# Data Schema

Schema design for the Bayesian Adaptive Psychiatric Screening Model. This covers both the **psychometric reference data** (static, populated from literature) and the **session data** (dynamic, generated during patient screenings).

Tech stack: Next.js + Prisma + PostgreSQL (Supabase).

---

## Two-Stage Architecture and Schema Implications

The model operates at two different dimensionalities:

- **Stage 1 (Broad Screening):** 8 spectra. Covariance matrix is 8×8. Items load onto spectra. Output: spectrum-level posterior.
- **Stage 2 (Targeted Disambiguation):** 35 conditions (grouped by spectrum). Items load onto conditions. Conditions within a spectrum are independent — no condition-level covariance matrix, just per-condition variances.

**Stage transition:** Condition priors are built by combining per-population condition base rates (`BaseRate`) with spectrum posteriors via the `ConditionSpectrumLoading` (L matrix): μ_condition = μ_condition_base + L_row × μ_spectrum_posterior. Conditions within a spectrum are treated as independent (no within-spectrum correlation matrix). Then stage 2 runs within each flagged spectrum.

**One covariance matrix for all populations.** Different populations (general, clinical, college, primary care) share the same spectrum-level correlation structure. Only spectrum prior means (μ₀) differ by population. General population is the norm: μ₀ = 0, unit variance. Non-base populations have shifted means.

---

## Entity Relationship Overview

```
Dimension ─┬─── DimensionCorrelation (spectrum-spectrum pairs only)
            ├─── BaseRate (condition-level, per population)
            ├─── ClinicalThreshold (condition-level)
            ├─── ConditionSpectrumLoading (condition→spectrum, the L matrix)
            └─── ItemLoading ──── Item ──┬── Instrument
                 (FK to spectrum         └── ItemOverlap (pairwise)
                  or condition)     │
                                    └─── SessionResponse ──── Session ──── Patient
```

---

## Psychometric Reference Data (Static)

### `Dimension`

The psychiatric dimensions the model operates over: 8 spectra + 35 conditions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `name` | `String` | e.g., "Distress", "Major Depressive Disorder" |
| `shortCode` | `String` | e.g., "DIS", "MDD" — used in matrix indexing |
| `level` | `Enum` | `SPECTRUM` or `CONDITION` |
| `parentId` | `String?` | Self-referential FK — conditions point to their primary parent spectrum |
| `description` | `String?` | Brief description of what the dimension captures |
| `sortOrder` | `Int` | Display/matrix ordering (0–7 for spectra, 0–N within each spectrum for conditions) |

### `DimensionCorrelation`

Pairwise correlations between spectra (8×8 upper triangle = 28 pairs). Used to build the stage 1 Σ₀. Conditions within a spectrum are treated as independent — no condition-level correlations are stored.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `dimensionAId` | `String` | FK → Dimension (must be level=SPECTRUM) |
| `dimensionBId` | `String` | FK → Dimension (must be level=SPECTRUM, enforced: A < B by sortOrder to avoid duplicates) |
| `correlation` | `Float` | Pearson r, range [-1, 1] |
| `sourceQuality` | `Enum` | `META_ANALYSIS`, `LARGE_STUDY`, `SMALL_STUDY`, `DERIVED`, `ESTIMATED` |
| `sources` | `Json` | Array of `{ citation, year, n, value }` — all source estimates before averaging |
| `notes` | `String?` | Disagreement flags, PSD adjustments, etc. |

### `ConditionSpectrumLoading`

The L matrix: structural loadings of conditions onto spectra. This is NOT item loadings — it's the structural relationship between the two dimension levels, used for the stage transition (projecting spectrum posteriors → condition prior updates).

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `conditionId` | `String` | FK → Dimension (must be level=CONDITION) |
| `spectrumId` | `String` | FK → Dimension (must be level=SPECTRUM) |
| `loading` | `Float` | How strongly the condition loads onto this spectrum (typically 0.7–0.9 for primary, 0.2–0.5 for secondary) |
| `isPrimary` | `Boolean` | Whether this is the condition's primary spectrum |
| `sourceQuality` | `Enum` | Quality rating |
| `sources` | `Json` | Source studies |
| `notes` | `String?` | |

**Unique constraint:** `(conditionId, spectrumId)` — one loading per condition-spectrum pair.

Most conditions have 1 entry (primary spectrum only). Cross-loading conditions (PTSD, GAD, Bipolar I, etc. — see SPECTRA_AND_CONDITIONS.md) have 2–3 entries.

### `BaseRate`

Per-population base rate for each condition. Used to derive condition-level priors at the stage transition.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `dimensionId` | `String` | FK → Dimension (must be level=CONDITION) |
| `populationType` | `Enum` | `GENERAL`, `CLINICAL`, `COLLEGE`, `PRIMARY_CARE` |
| `prevalence` | `Float` | 12-month prevalence rate (0–1) |
| `liabilityMean` | `Float` | μ₀ = Φ⁻¹(prevalence) — standard normal z-score |
| `sourceQuality` | `Enum` | Quality rating |
| `sources` | `Json` | Array of source estimates |
| `notes` | `String?` | |

**Unique constraint:** `(dimensionId, populationType)` — one base rate per condition per population.

35 conditions × 4 populations = 140 rows max.

**Stage 1 spectrum priors** are normed: μ₀ = 0, unit variance for all spectra in all populations. No spectrum-level base rates are stored. The same correlation matrix is used across all populations.

**Stage 2 condition priors** are derived at the stage transition by combining these condition base rates with the spectrum posteriors via the L matrix.

### `Instrument`

Validated psychiatric questionnaires.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `name` | `String` | e.g., "PHQ-9", "GAD-7" |
| `fullName` | `String` | e.g., "Patient Health Questionnaire-9" |
| `tier` | `Enum` | `BROAD_SCREENING` or `TARGETED` |
| `itemCount` | `Int` | Number of items |
| `responseScale` | `Json` | e.g., `{ min: 0, max: 3, labels: ["Not at all", ..., "Nearly every day"] }` |
| `scaleReliabilityIcc` | `Float?` | Scale-level test-retest ICC |
| `retestIntervalDays` | `Int?` | Test-retest interval used |
| `citation` | `String` | Original validation paper |

### `Item`

Individual questionnaire items.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `instrumentId` | `String` | FK → Instrument |
| `itemNumber` | `Int` | Position within the instrument (1-indexed) |
| `text` | `String` | Full item text as administered |
| `responseMin` | `Int` | Minimum response value |
| `responseMax` | `Int` | Maximum response value |
| `responseLabels` | `Json` | e.g., `["Not at all", "Several days", "More than half the days", "Nearly every day"]` |
| `isReverseCoded` | `Boolean` | Whether the item is reverse-scored |
| `testRetestR` | `Float?` | Item-level test-retest reliability (if available) |
| `noiseVariance` | `Float` | σᵢ² floor = (1 − r) × inflation_factor. **This is a floor, not the runtime value.** During a session, σ² is inflated further based on content overlap with previously administered items (via ItemOverlap). |
| `noiseInflationFactor` | `Float` | Static floor inflation factor. Default 1.5. |
| `sourceQuality` | `Enum` | Quality of the reliability data |
| `tags` | `ContentTag[]` | Semantic tags from controlled vocabulary (see ContentTag enum). Used for deduplication matching. |
| `normativeMean` | `Float?` | Population mean response (legacy, superseded by `normativeResponseDist`) |
| `normativeSD` | `Float?` | Population SD of response (legacy, superseded by `normativeResponseDist`) |
| `normativeResponseDist` | `Float[]` | Proportion of the normative population choosing each response category: `[P(min), P(min+1), ..., P(max)]`. Used for probit normal scores normalization. E.g., PHQ-9 item 9 (suicidality, 0-3 scale): `[0.96, 0.03, 0.007, 0.003]`. See "Response Normalization" section below. |

### `ItemLoading`

How strongly each item indexes each dimension (the h vectors). Sparse — most items only have 1–3 nonzero entries.

Stage 1 items have loadings onto **spectra** (Dimension.level=SPECTRUM).
Stage 2 items have loadings onto **conditions** (Dimension.level=CONDITION).

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `itemId` | `String` | FK → Item |
| `dimensionId` | `String` | FK → Dimension (can be spectrum or condition depending on stage) |
| `loading` | `Float` | h_ij value (typically 0.3–0.9 for primary loadings) |
| `isPrimary` | `Boolean` | Whether this is the item's primary loading dimension |
| `derivationMethod` | `Enum` | `DIRECT` (published), `CHAINED` (multiplied), `ESTIMATED` (LLM) |
| `withinInstrumentLoading` | `Float?` | Raw loading onto instrument's own factor |
| `instrumentToDimensionLoading` | `Float?` | Instrument factor → dimension loading |
| `sourceQuality` | `Enum` | Quality rating |
| `sources` | `Json` | Source studies with their individual loading values |
| `notes` | `String?` | |

**Unique constraint:** `(itemId, dimensionId)` — one loading per item-dimension pair.

### `ItemOverlap`

Precomputed content-overlapping item pairs across instruments. Enables deterministic deduplication without relying on the LLM during sessions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `itemAId` | `String` | FK → Item |
| `itemBId` | `String` | FK → Item (enforced: A < B to avoid duplicates) |
| `overlapStrength` | `Enum` | `HIGH` (nearly identical content), `MODERATE` (related framing), `LOW` (thematically related) |
| `sharedTags` | `ContentTag[]` | Which content tags they share |
| `description` | `String` | Brief description of the overlap, e.g., "Both assess sleep onset difficulty" |
| `noiseInflationMultiplier` | `Float` | How much to inflate σ² of the second item if the first has been administered. Suggested: HIGH=3.0, MODERATE=2.0, LOW=1.5 |

**Unique constraint:** `(itemAId, itemBId)`.

**Runtime usage:** When selecting the next item, check if any already-administered items overlap with candidates. If so, multiply the candidate's σ² by the `noiseInflationMultiplier`, which reduces its expected information gain and makes it less likely to be selected.

### `ClinicalThreshold`

Liability thresholds for categorical diagnostic mapping.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `dimensionId` | `String` | FK → Dimension (condition-level) |
| `thresholdLiability` | `Float` | τⱼ on the standard normal scale |
| `sensitivity` | `Float` | Sensitivity at this threshold |
| `specificity` | `Float` | Specificity at this threshold |
| `sourceInstrument` | `String?` | Which instrument's cutoff this derives from |
| `sourceCutoff` | `String?` | e.g., "PHQ-9 ≥ 10" |
| `sources` | `Json` | |
| `notes` | `String?` | |

---

## Session Data (Dynamic)

### `Patient`

Anonymized patient record.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `externalId` | `String?` | Optional external identifier |
| `ageRange` | `Enum?` | `CHILD`, `ADOLESCENT`, `ADULT`, `OLDER_ADULT` |
| `createdAt` | `DateTime` | |

### `Session`

A single screening session. Because the state space changes dimensionality at the stage transition (8 spectra → up to 35 conditions), spectrum-level and condition-level posteriors are stored separately.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `patientId` | `String` | FK → Patient |
| `populationType` | `Enum` | Which base rates were used |
| `stage` | `Enum` | `BROAD_SCREENING`, `TARGETED`, `COMPLETE` |
| **Stage 1 state** | | |
| `spectrumPriorMean` | `Float[]` | μ₀ vector for spectra (length 8) |
| `spectrumPriorCovariance` | `Json` | Σ₀ for spectra (8×8 matrix) |
| `spectrumPosteriorMean` | `Float[]?` | Current/final spectrum posterior μ (length 8). Null until first item administered. |
| `spectrumPosteriorCovariance` | `Json?` | Current/final spectrum posterior Σ (8×8). Null until first item administered. |
| **Stage 2 state** | | |
| `conditionPriorMean` | `Float[]?` | μ₀ for conditions, derived from whole-population condition base rates adjusted by spectrum posteriors via L matrix. Null until stage 2 begins. Length = number of conditions being evaluated. |
| `conditionPosteriorMean` | `Float[]?` | Current condition posterior μ. Null until stage 2 items administered. |
| `conditionPosteriorVariances` | `Float[]?` | Current per-condition posterior variances (diagonal only — conditions are independent given spectrum, so no full covariance matrix). All start at 1.0 and shrink as items are administered. |
| `conditionDimensionOrder` | `String[]?` | Ordered list of condition Dimension IDs corresponding to the indices of conditionPrior/PosteriorMean vectors. Needed because the set of conditions evaluated varies per session. |
| **Metadata** | | |
| `itemsAdministered` | `Int` | Count of items given so far |
| `stageTransitionAt` | `DateTime?` | When stage transition occurred |
| `terminated` | `Boolean` | Whether termination criteria were met |
| `terminationReason` | `Enum?` | `CONFIDENCE_MET`, `NO_INFO_GAIN`, `MAX_ITEMS`, `USER_STOPPED` |
| `startedAt` | `DateTime` | |
| `completedAt` | `DateTime?` | |

### `SessionResponse`

Individual item responses within a session.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `sessionId` | `String` | FK → Session |
| `itemId` | `String` | FK → Item |
| `responseRaw` | `Int` | Raw response value (0, 1, 2, 3, etc.) |
| `responseNormalized` | `Float` | Normalized to common scale |
| `administrationOrder` | `Int` | Which question number this was in the session |
| `stage` | `Enum` | `BROAD_SCREENING` or `TARGETED` |
| `kalmanGain` | `Float[]` | K vector at time of this response (length matches current stage's dimensionality) |
| `posteriorMeanAfter` | `Float[]` | μ after this update |
| `posteriorDiagAfter` | `Float[]` | diag(Σ) after this update (uncertainty per dimension) |
| `runtimeNoiseVariance` | `Float` | The actual σ² used for this item (floor + any dynamic inflation from overlaps) |
| `infoGain` | `Float` | tr(Σ_before) − tr(Σ_after) |
| `respondedAt` | `DateTime` | |

### `SessionDiagnosis`

Categorical diagnostic output after screening. Only produced for condition-level dimensions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `String` (cuid) | Primary key |
| `sessionId` | `String` | FK → Session |
| `dimensionId` | `String` | FK → Dimension (condition-level) |
| `liability` | `Float` | Posterior mean μⱼ |
| `uncertainty` | `Float` | Posterior √Σⱼⱼ |
| `threshold` | `Float` | τⱼ used |
| `probability` | `Float` | P(zⱼ > τⱼ) — probability of meeting criteria |
| `flagged` | `Boolean` | Whether probability exceeds a clinical attention threshold |

---

## Prisma Enum Definitions

```
enum DimensionLevel {
  SPECTRUM
  CONDITION
}

enum SourceQuality {
  META_ANALYSIS
  LARGE_STUDY
  SMALL_STUDY
  DERIVED
  ESTIMATED
}

enum PopulationType {
  GENERAL
  CLINICAL
  COLLEGE
  PRIMARY_CARE
}

enum InstrumentTier {
  BROAD_SCREENING
  TARGETED
}

enum TerminationReason {
  CONFIDENCE_MET
  NO_INFO_GAIN
  MAX_ITEMS
  USER_STOPPED
}

enum DerivationMethod {
  DIRECT
  CHAINED
  ESTIMATED
}

enum OverlapStrength {
  HIGH
  MODERATE
  LOW
}

enum AgeRange {
  CHILD
  ADOLESCENT
  ADULT
  OLDER_ADULT
}

enum ContentTag {
  SLEEP
  APPETITE
  WEIGHT
  FATIGUE
  CONCENTRATION
  PSYCHOMOTOR
  ANHEDONIA
  DEPRESSED_MOOD
  WORTHLESSNESS
  SUICIDALITY
  WORRY
  RESTLESSNESS
  IRRITABILITY
  MUSCLE_TENSION
  PANIC
  AVOIDANCE
  HYPERAROUSAL
  INTRUSIONS
  NUMBING
  DISSOCIATION
  FLASHBACKS
  SOMATIC_PAIN
  SOMATIC_GI
  SOMATIC_CARDIO
  SOMATIC_NEURO
  ALCOHOL_USE
  DRUG_USE
  GAMBLING
  IMPULSIVITY
  AGGRESSION
  RULE_BREAKING
  GRANDIOSITY
  MANIPULATIVENESS
  CALLOUSNESS
  HALLUCINATIONS
  DELUSIONS
  PARANOIA
  DISORGANIZED_THOUGHT
  MANIA
  HYPOMANIA
  SOCIAL_WITHDRAWAL
  EMOTIONAL_DETACHMENT
  DEPERSONALIZATION
  DEREALIZATION
  OBSESSIONS
  COMPULSIONS
  HOARDING
  BODY_IMAGE
  RESTRICTED_EATING
  BINGE_EATING
  TICS
  PERFECTIONISM
  RIGIDITY
  SENSORY_SENSITIVITY
  INATTENTION
  HYPERACTIVITY
  MAGICAL_THINKING
  ECCENTRIC_BEHAVIOR
  HEALTH_ANXIETY
  PURGING
  RISK_TAKING
  TALKATIVENESS
  EMOTIONAL_LABILITY
  HOSTILITY
  IRRESPONSIBILITY
  WITHDRAWAL
}
```

---

## Response Normalization

Raw Likert responses must be converted to the latent scale before the Kalman update. The observation model is `y = hᵀz + ε` where `z ~ N(0,1)` at the population mean, so the normalized response must be on a standard normal scale.

### Probit Normal Scores (preferred)

Given the normative response distribution `[P(0), P(1), ..., P(K)]`, each response category `k` is mapped to a standard normal score:

```
normalScore(k) = Φ⁻¹((F(k-1) + F(k)) / 2)
```

where `F(k) = P(0) + P(1) + ... + P(k)` is the cumulative proportion, and `F(-1) = 0`.

**Why not mean/SD z-scoring?** Psychiatric items are heavily skewed — suicidality items have ~96% at floor. Z-scoring `(response - mean) / SD` would map a response of 3 on a 0-3 scale to ~9 SD, which is absurd and would massively over-update the posterior. The probit transform correctly maps each response to where it falls in the normal distribution of the population:

| Item | Response 0 | Response 3 | Method |
|------|-----------|-----------|--------|
| PHQ-9 #9 (suicidality) | -0.05 | +2.97 | Probit |
| PHQ-9 #9 (suicidality) | -0.24 | +8.85 | Mean/SD z-score (WRONG) |
| PHQ-9 #3 (sleep) | -0.64 | +1.55 | Probit |
| PHQ-9 #3 (sleep) | -0.73 | +2.93 | Mean/SD z-score |

**Fallback:** When no response distribution is available, center on scale midpoint and scale to `[-0.5, +0.5]`. This is wrong for skewed items but preserves basic functionality.

### Data sources for response distributions

- **PHQ-9, GAD-7, PHQ-15**: Kocalevent et al. 2013 (N=5,018); Löwe et al. 2008 (N=5,030) — German general population norms
- **AUDIT/AUDIT-C**: Shields et al. 2004 (N=14,001); WHO AUDIT manual; NESARC-III
- **PCL-5**: Blevins et al. 2015; community trauma-exposed samples
- **Binary instruments** (PC-PTSD-5, DAST-10, MDQ, PQ-16, etc.): endorsement rates from validation studies; `dist = [1-p, p]` where `p` is the endorsement rate
- **Other instruments**: Estimated from scale-level means and item content similarity with well-normed instruments. Marked in `seed-norms.ts` comments.

**Data file:** `prisma/seed-norms.ts` — all 331 items with response distributions.

---

## Storage Notes

- **Matrices (Σ₀, Σ):** Stored as `Json` (2D arrays). Stage 1: 8×8 = 64 floats. Stage 2 sub-matrices are smaller (e.g., Distress: 5×5 = 25 floats). Trivially small.
- **Vectors (μ, K, diag(Σ)):** Stored as `Float[]` (Prisma native array type for PostgreSQL). Length varies by stage (8 for stage 1, variable for stage 2).
- **`conditionDimensionOrder`:** Stored as `String[]` on Session to map vector indices to Dimension IDs, since the set of conditions evaluated varies per session.
- **Source citations:** Stored as `Json` arrays with structured objects `{ citation, year, n, value }` to preserve provenance without needing a separate `Source` table.
- **Item text:** Stored verbatim.

---

## Indexes

- `ItemLoading`: index on `(itemId)` and `(dimensionId)` for fast h-vector assembly
- `SessionResponse`: index on `(sessionId, administrationOrder)` for ordered retrieval
- `DimensionCorrelation`: unique constraint on `(dimensionAId, dimensionBId)`
- `BaseRate`: unique constraint on `(dimensionId, populationType)`
- `ConditionSpectrumLoading`: unique constraint on `(conditionId, spectrumId)`
- `ItemOverlap`: unique constraint on `(itemAId, itemBId)`
- `Dimension`: index on `(level)` for quick spectrum vs. condition filtering
