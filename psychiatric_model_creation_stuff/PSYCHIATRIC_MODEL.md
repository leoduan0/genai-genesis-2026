# Bayesian Adaptive Psychiatric Screening Model

## Overview

A Bayesian model for adaptive psychiatric screening that uses validated questionnaire items to update beliefs about a patient's position across multiple psychiatric dimensions simultaneously. The model exploits the high correlation structure of psychiatric conditions — rather than treating each condition independently, it propagates information through a correlation web so that every item response informs every condition estimate.

The system administers items in two stages: broad screening items first (which load on many dimensions and have extensive published psychometric data), then narrow diagnostic items (which disambiguate between specific conditions the patient is most likely to have).

An LLM handles conversational administration of items, deduplication of overlapping items across instruments, and gap-filling for sparsely studied item loadings. The statistical backbone is deterministic linear algebra applied to parameters derived from published psychometric literature.

---

## Prior Work

The closest existing system is CAT-MH (Computerized Adaptive Test for Mental Health), a proprietary suite of adaptive tests covering depression, anxiety, mania, PTSD, substance use, psychosis, ADHD, and suicidality. CAT-MH is based on multidimensional item response theory (MIRT) and has been validated against structured clinical diagnostic interviews (SCID DSM-5). For depression, its diagnostic screener achieves sensitivity of 0.95 and specificity of 0.87 using an average of 4 questions in under a minute. It draws from a calibrated bank of ~1,500 items.

CAT-MH is distributed through Pearson at ~$5/session, requires clinical credentials to access, and its item banks and algorithms are completely closed. Its modules are condition-siloed (separate tests for depression, anxiety, etc.) rather than operating in a unified cross-diagnostic framework.

Other relevant systems: ADAPQUEST (Bayesian-network-based adaptive questionnaires applied to mental disorder diagnosis), ATS-PD (adaptive testing of psychological disorders with step-by-step Bayesian updates), and Bayesian network models for personality disorders built via expert consensus.

This model differs from all of the above in three ways: (1) open and inspectable parameters derived from published literature, (2) a unified cross-diagnostic framework where all conditions are updated simultaneously via shared correlation structure, and (3) an LLM-based conversational interface for item administration.

---

## Model Definition

### State Space

Prior: **z** ~ N(**μ₀**, **Σ₀**)

| Symbol | What it represents |
|--------|-------------------|
| **z** | Liability scores across all psychiatric dimensions — the thing we're trying to estimate |
| **μ₀** | Prior mean liability for each dimension, encoding base rates for the target clinical population (not general population — psychiatric clinic base rates are much higher than community prevalence, and this matters enormously) |
| **Σ₀** | Prior covariance matrix encoding all pairwise correlations between dimensions. Diagonal entries are prior uncertainty per dimension; off-diagonal entries are how correlated each pair of dimensions is |
| N(·,·) | Multivariate normal distribution — a probability cloud in n-dimensional space centered at **μ₀** with shape and orientation determined by **Σ₀** |

**Σ₀** must be positive semidefinite — meaning all the pairwise correlations must be mutually consistent. If A correlates with B at 0.9 and B correlates with C at 0.9, then A must correlate with C fairly strongly too — you can't set it to 0. If correlations are assembled from separate studies they may violate this, so project to the nearest consistent matrix (a standard matrix operation).

### Observation Model

yᵢ = **h**ᵢᵀ**z** + εᵢ, where εᵢ ~ N(0, σᵢ²)

| Symbol | What it represents |
|--------|-------------------|
| yᵢ | Observed response to item i (normalized to a common scale across instruments) |
| **h**ᵢ | Loading vector for item i — how strongly item i indexes each dimension. Mostly zeros: a sleep disturbance item loads on internalizing and maybe somatoform, zeros elsewhere |
| **h**ᵢᵀ**z** | Dot product of loadings and true liabilities — the model's prediction of how this person would respond to item i if there were no noise. Each entry of **h**ᵢ gets multiplied by the corresponding entry of **z** and summed |
| εᵢ | Random noise in the response |
| σᵢ² | Noise variance for item i. Floor is 1 − rᵢ where rᵢ is the item's test-retest reliability. Inflated upward (1.5–2×) to hedge against unmodeled residual correlations with previously administered items |

### Update Rule

Upon observing response yᵢ:

**K** = **Σh**ᵢ / (**h**ᵢᵀ**Σh**ᵢ + σᵢ²)

| Symbol | What it represents |
|--------|-------------------|
| **K** | Kalman gain vector — how much to shift each dimension's estimate per unit of surprise |
| **Σh**ᵢ (numerator) | Current uncertainty projected through the item's relevance profile. Large for dimensions you're uncertain about *and* the item loads on |
| **h**ᵢᵀ**Σh**ᵢ + σᵢ² (denominator) | Total predicted variance of this item's response — how spread out you expect yᵢ to be given current uncertainty plus item noise. Normalizes the update so noisy items get downweighted |

**μ** ← **μ** + **K**(yᵢ − **h**ᵢᵀ**μ**)

| Symbol | What it represents |
|--------|-------------------|
| yᵢ − **h**ᵢᵀ**μ** | Surprise — difference between observed response and predicted response given current beliefs |
| **K** × surprise | The surprise distributed across all dimensions, proportional to both the item's loading profile and the current correlation structure. Correlated dimensions get dragged along |

**Σ** ← **Σ** − **K**(**h**ᵢᵀ**Σ**)

| Symbol | What it represents |
|--------|-------------------|
| **K**(**h**ᵢᵀ**Σ**) | The uncertainty removed by this observation. Largest for dimensions the item loads on heavily |

This covariance update doesn't depend on yᵢ — uncertainty shrinks the same amount regardless of the actual response. Only **μ** depends on the answer.

### Two-Stage Item Selection

**Stage one (broad screening):** Select item i that maximizes tr(**Σ**) − tr(**Σ_new**(i)).

| Symbol | What it represents |
|--------|-------------------|
| tr(**Σ**) | Trace — sum of all diagonal entries of **Σ**, i.e., total uncertainty across all dimensions |
| tr(**Σ**) − tr(**Σ_new**(i)) | Total uncertainty removed by item i. Computable before administering because the **Σ** update doesn't depend on the response |

Stage-one items have high loadings across multiple dimensions (high general psychopathology / p-factor loading). They are diagnostically nonspecific — they tell you *that* something is wrong and roughly where in the space of conditions it lives, but not precisely what. These items appear on many instruments and have the most extensive published cross-loading data.

**Stage two (targeted disambiguation):** Select items that maximize probability-weighted expected variance reduction across conditions.

For each candidate item, compute the per-condition variance reduction (h²σ⁴ / (h²σ² + σ²_noise)) and weight it by the condition's current probability P(zⱼ > τⱼ). Sum across all conditions to get the item's score.

| Symbol | What it represents |
|--------|-------------------|
| h²σ⁴ / (h²σ² + σ²_noise) | Raw variance reduction for one condition — how much this item would shrink that condition's uncertainty |
| P(zⱼ > τⱼ) | Current probability that the condition exceeds its clinical threshold — used as a weight so that items targeting likely conditions are prioritized |
| Σⱼ Pⱼ × reductionⱼ | Total score — the item's expected utility, balancing informativeness against clinical relevance |

This weighting prevents the system from spending items on rare, high-variance conditions (e.g., schizophrenia at P=0.8%) when common conditions (e.g., MDD at P=30%) still need disambiguation. Without it, pure variance reduction favors rare conditions because their prior variance is larger.

Stage-two items have narrow, strong loadings on one or two dimensions. They come from specialized instruments targeting specific conditions. They're the ones that disambiguate.

**Stage transition criterion:** Switch from stage one to stage two when the ratio of the largest to smallest eigenvalue of **Σ** exceeds a threshold.

- Ratio ≈ 1: equally uncertain about everything → keep asking broad questions
- Ratio >> 1: uncertainty concentrated in one direction → switch to targeted items

Or when broad-spectrum items' expected information gain drops below a floor.

**Termination criterion:** Stop when all Σⱼⱼ (diagonal entries — per-dimension uncertainty) fall below a confidence threshold, or no remaining item offers meaningful variance reduction, or maximum items reached.

### Output

Dimensional profile: **μ** (liability estimate per dimension) and diag(**Σ**) (remaining uncertainty per dimension).

Categorical diagnostic mapping: P(zⱼ > τⱼ) = 1 − Φ((τⱼ − μⱼ) / √Σⱼⱼ)

| Symbol | What it represents |
|--------|-------------------|
| τⱼ | Clinical threshold for dimension j (above which the condition is considered present) |
| μⱼ | Current liability estimate for dimension j |
| Σⱼⱼ | Remaining uncertainty for dimension j |
| (τⱼ − μⱼ) / √Σⱼⱼ | How many standard deviations the threshold sits above the current estimate |
| Φ | Cumulative normal distribution function — converts a z-score to a probability |
| 1 − Φ(·) | Probability that true liability exceeds the threshold, i.e., probability of meeting diagnostic criteria |

---

## Parameter Sourcing

### Correlation matrix Σ₀

The most important parameter and the most available. Meta-analyses of comorbidity structure (especially those feeding into HiTOP validation) publish exactly this. The Ringwald et al. meta-analysis pooled 120,596 participants across 35 studies assessing 23 DSM diagnoses, estimated a meta-analytic correlation matrix, and found that five transdiagnostic dimensions fit well with published factor loadings for each diagnosis onto each spectrum. That correlation matrix and those loadings are the structural skeleton of Σ₀.

If modeling at the HiTOP spectrum level (6 dimensions), Σ₀ is a 6×6 matrix with 15 unique off-diagonal correlations — very manageable. If modeling at the condition level (say 15 conditions), it's a 15×15 matrix with 105 correlations, reconstructable from the published spectrum-level structure plus within-spectrum comorbidity data.

### Base rates μ₀

From epidemiological literature, adjusted for the target population. Community prevalence rates are the wrong prior for a screening tool — psychiatric clinic base rates are much higher and shift the entire model. Published survey data (e.g., SAMHSA national surveys) provide condition-level prevalence for various populations. Base rates are for conditions, not spectra.

### Loading vectors h

Assembled by chaining two types of published data:

1. **Within-instrument item-level factor loadings.** Published for essentially every major instrument (PHQ-9, GAD-7, PCL-5, Y-BOCS, AUDIT, CAPE, etc.) across dozens of studies.

2. **Instrument-to-dimension mappings.** Published at the scale level in HiTOP alignment studies (e.g., Wendt et al. 2023 on mapping established scales onto HiTOP).

Chaining: if PHQ-9 item 1 ("little interest or pleasure") loads 0.8 on anhedonia within the PHQ-9, and the PHQ-9 depression construct loads 0.85 on the internalizing spectrum, multiply through for a crude but defensible item-level loading onto internalizing.

Most entries in each **h** vector are zero by construction. A Y-BOCS ritual item has no meaningful loading on thought disorder or antagonistic externalizing. You only need nonzero values for the 1–3 spectra each item plausibly touches. The sparsity drastically reduces the number of parameters to estimate.

**Loading vectors can also be weighted by how commonly each questionnaire is used for each condition** as a proxy for clinical validity. This captures the fact that the PHQ-9 is the primary instrument for depression (high weight) but is sometimes used to flag anxiety (lower weight) and is never used for psychosis (zero weight).

### Noise variances σᵢ²

The easiest parameters. Item-level test-retest reliability is published for all major instruments. Set σᵢ² = 1 − rᵢ as a floor, then inflate by a factor (1.5–2×) to hedge against unmodeled residual correlations between items.

### Open data sources

- **HiTOP-DAT:** A 405-item battery across existing instruments covering most HiTOP traits and components, with community normative data. All instruments freely available with author permission.
- **HiTOP-friendly measures:** A curated list of instruments consistent with the HiTOP framework, many free to use.
- **Published meta-analyses:** The Ringwald et al. meta-analysis provides the factor structure; individual instrument validation studies provide item-level parameters.
- **Bifactor studies:** PHQ-9 × GAD-7 bifactor analyses (co-administered in thousands of studies) provide the cross-loading data needed for stage-one items.

---

## Two-Stage Logic: Why It Works

### Stage one: broad items first

Items like sleep disturbance, concentration problems, fatigue, and persistent worry are common across instruments *because* they load onto multiple dimensions. They're diagnostically promiscuous. Administering them first gives maximum information per question about the broad shape of someone's profile — is this mostly internalizing? Is there externalizing involvement? Thought disorder?

These items also have the best-studied cross-loadings precisely because they appear everywhere and have been factor-analyzed extensively. The cross-loading data problem is smallest for items where it matters most.

### Stage two: narrow items to disambiguate

Once the broad shape is established (e.g., "mostly internalizing, probably not externalizing or thought disorder"), uncertainty is concentrated rather than diffuse. Specific items — compulsive rituals, flashback intrusions, grandiosity, voice-hearing — have narrow, strong loadings on one or two dimensions and barely touch anything else. Each one has high leverage because it's targeted at exactly where the remaining ambiguity is.

For these items, you don't need cross-loading data because they essentially load on one thing. Y-BOCS ritual items don't need a schizophrenia loading; you just set it to zero.

### The correlation web reduces total questions needed

You never directly ask about most conditions — you infer them through the correlation structure. A few well-chosen broad questions plus a few well-chosen specific ones triangulate a position in a high-dimensional space.

---

## Double-Counting Protection

The primary defense against double-counting is architectural: the item selection step naturally avoids redundancy. After administering several internalizing items, uncertainty about internalizing is already low. Another internalizing item's expected variance reduction is therefore low — the system won't select it because it wouldn't learn much. It will instead pick something targeting whichever dimension has the highest remaining uncertainty.

For content-overlapping items across instruments (e.g., a sleep item on both PHQ-9 and another instrument), the LLM flags duplicates before administration, and overlapping items are either merged or their σ² is inflated to reflect the shared content.

Within-instrument item correlations beyond what the latent factors explain (shared method variance, response style) are handled by the inflated σ² — the noise floor is set conservatively enough to absorb unmodeled residual dependencies.

The scenario where double-counting could become a problem: forcing the system to administer a redundant instrument (e.g., administering both PHQ-9 and BDI-II in full). The adaptive selection step prevents this by construction, but if overridden, posteriors would become overconfident.

---

## Known Limitations and Where the Model is Wrong

### Gaussian observation model

Questionnaire items are ordinal (0-1-2-3), not continuous. MIRT handles this correctly with logistic response functions. The Gaussian approximation works reasonably for items with 4+ response categories and degrades for binary items. For a prototype this is acceptable; for clinical deployment you'd want a proper ordinal model.

### Linear loading assumption

The model assumes each item's relationship to latent dimensions is linear (response = **h**ᵀ**z** + noise). In reality, some items are only informative at certain severity levels — "I have attempted suicide" is uninformative for mild depression, highly informative for severe. MIRT captures this via nonlinear item characteristic curves. The linear model treats all items as equally informative at all severity levels, which wastes some information but doesn't introduce systematic bias.

### Stitched-together parameters

The key difference from CAT-MH: its parameters are jointly estimated from a single coherent dataset, while this model's parameters are assembled from heterogeneous studies with different samples, methods, and populations. This introduces noise but not systematic bias. Inflated σ² compensates for some of this, and the model's posteriors will be wider (less confident) than a properly calibrated system — which is conservative and arguably appropriate.

### Positive semidefinite enforcement

Assembling a correlation matrix from separate pairwise estimates often produces a matrix that is not positive semidefinite (internally inconsistent). Nearest-PSD projection fixes this but may distort some correlations. With well-sourced parameters from meta-analyses this is usually a minor correction.

---

## Role of the LLM

The LLM serves three functions in this architecture:

1. **Conversational administration:** Items are presented in natural language rather than clipboard format. The LLM adapts phrasing, explains items when asked, and maintains conversational flow.

2. **Parameter gap-filling:** For **h** vector entries where published data is sparse (e.g., cross-loadings for obscure items onto non-primary dimensions), the LLM can estimate loadings. "How strongly does this item relate to thought disorder" is a factual question it can answer with reasonable accuracy. These estimates are marked as lower confidence via wider σ².

3. **Deduplication and overlap detection:** The LLM identifies when items from different instruments are measuring the same thing (e.g., two different phrasings of a sleep question), so one can be skipped or σ² inflated.

The LLM does *not* serve as the statistical backbone. The Bayesian update, item selection, and posterior computation are deterministic linear algebra applied to parameters derived primarily from published psychometric data.

---

## What This Buys Over Existing Systems

Compared to CAT-MH: open and inspectable model, unified cross-diagnostic framework (vs. siloed modules), conversational interface, free, no credentialing requirements.

Compared to standard questionnaires (PHQ-9, GAD-7, etc.): adaptive item selection, cross-diagnostic inference via correlation propagation, fewer total items needed, dimensional output with calibrated uncertainty.

The tradeoff: calibration quality. Stitched parameters from heterogeneous sources produce noisier posteriors and somewhat less efficient item selection than jointly calibrated systems. Whether that matters depends on whether the goal is clinical deployment (it matters a lot) or proof of concept (it matters less).