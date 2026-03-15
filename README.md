# GenAI Genesis 2026

An adaptive psychiatric screening platform that uses Bayesian inference to efficiently assess patients across 35 psychiatric conditions using as few questions as possible. Built for the GenAI Genesis 2026 hackathon.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, DATABASE_URL, DIRECT_URL

# Push database schema to Supabase
npx prisma db push

# Seed reference data
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

**Other commands:**

```bash
npm run test          # Run tests (vitest)
npm run build         # Production build
npm run lint          # Lint with Biome
npm run format        # Auto-format with Biome
```

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Database:** PostgreSQL via Supabase
- **ORM:** Prisma 7
- **Styling:** Tailwind CSS 4, shadcn components
- **Testing:** Vitest
- **Linting:** Biome

---

## Description

### The Problem

Standard psychiatric screening relies on administering full questionnaires one condition at a time — PHQ-9 for depression, GAD-7 for anxiety, PCL-5 for PTSD, and so on. A thorough screen across the major diagnostic categories can take 100+ items. Most of those items are wasted: if a patient clearly doesn't have externalizing problems, the 30 substance use and conduct items contribute nothing. Meanwhile, conditions share massive amounts of variance — sleep problems, fatigue, and concentration difficulties appear in depression, anxiety, PTSD, and a dozen other conditions — but siloed instruments can't exploit that overlap.

### The Approach

This system models all 35 conditions simultaneously using a Kalman filter over a hierarchical dimensional structure based on the [HiTOP framework](https://psychology.unt.edu/hitop). Every item response updates beliefs about every condition at once through a correlation web derived from published psychiatric comorbidity data.

**Two-stage adaptive screening:**

1. **Broad screening (Stage 1):** Administer ~15-20 nonspecific items (sleep, mood, worry, fatigue) that load across multiple psychiatric spectra. These items come from well-validated instruments like the PHQ-9, GAD-7, and WHO-5. The system tracks an 8-dimensional posterior over psychiatric spectra (Distress, Fear, Disinhibited Externalizing, Antagonistic Externalizing, Thought Disorder, Detachment, Somatoform, Compulsivity) and their 8x8 covariance matrix. Each item is selected to maximize total variance reduction across all spectra.

2. **Targeted disambiguation (Stage 2):** Once the broad shape is established, the system projects spectrum-level posteriors onto condition-level priors via a structural loading matrix (L), then selects narrow diagnostic items to disambiguate between specific conditions within flagged spectra. A patient flagged on Distress gets depression vs. PTSD vs. GAD-specific items; someone flagged on Thought Disorder gets psychosis vs. bipolar items.

The system transitions between stages when uncertainty becomes concentrated (eigenvalue ratio of the covariance matrix exceeds a threshold) or when broad items stop providing meaningful information gain.

### Dimensional Taxonomy

**8 Spectra, 35 Conditions:**

| Spectrum | Conditions |
|----------|-----------|
| Distress | MDD, Persistent Depressive Disorder, GAD, PTSD, Adjustment Disorder |
| Fear | Panic Disorder, Agoraphobia, Social Anxiety, Specific Phobias, Separation Anxiety |
| Disinhibited Externalizing | ADHD, Alcohol Use Disorder, Drug Use Disorder, Gambling Disorder, Antisocial Behavior, Binge Eating Disorder |
| Antagonistic Externalizing | Narcissistic Features, Borderline Features |
| Thought Disorder | Schizophrenia-Spectrum, Bipolar I, Bipolar II, Schizotypal Features, Attenuated Psychosis |
| Detachment | Schizoid Features, Avoidant Features, Depersonalization/Derealization, Autism-Spectrum Features |
| Somatoform | Somatic Symptom Disorder, Illness Anxiety Disorder |
| Compulsivity | OCD, BDD, Hoarding Disorder, Anorexia Nervosa, OCPD Features, Tic Disorders |

Many conditions cross-load on multiple spectra (e.g., PTSD loads on both Distress and Fear; Borderline loads on Antagonistic and Distress). These cross-loadings are modeled explicitly.

### Psychometric Data Pipeline

All model parameters are derived from published psychometric literature — no training data, no black-box calibration:

- **Correlation matrix (Sigma-0):** 8x8 spectrum-level correlations from Ringwald et al. (2021, N=120,596), Krueger (1999), Eaton et al. (2013), and other large-scale comorbidity studies. Verified positive semidefinite.
- **Base rates:** 12-month prevalence for all 35 conditions across 4 populations (general, clinical, college, primary care) from NCS-R, NESARC-III, NSDUH, and WHO World Mental Health Surveys. Converted to liability scale via probit transform.
- **Item bank:** 332 items across 27 validated instruments (PHQ-9, GAD-7, PCL-5, CAPE-42, PID-5-BF, HCL-32, etc.), split into Tier 1 (broad screening, 44 items) and Tier 2 (targeted, 288 items).
- **Factor loadings:** 395 item-to-dimension loading entries, chained from within-instrument CFA loadings and instrument-to-HiTOP-dimension mappings (Wendt et al. 2023).
- **Noise variances:** Derived from published test-retest reliability data (σ² = (1-r) x 1.5 inflation).
- **Clinical thresholds:** Liability-scale cutoffs for all 35 conditions from instrument validation studies (e.g., PHQ-9 >= 10 for MDD, mapped to probit scale).
- **Item overlaps:** 98 precomputed content-overlapping item pairs across instruments for deduplication (prevents double-counting shared content like sleep items appearing on PHQ-9 and PCL-5).

### Math Engine

The core is a Kalman filter with adaptive item selection:

- **Update:** Standard Kalman equations — gain K = Sigma * h / (h'Sigma*h + sigma²), mean update mu += K * (y - h'mu), covariance update Sigma -= K * h'Sigma.
- **Item selection (Stage 1):** Greedy maximization of trace(Sigma) - trace(Sigma_new) — pick the item that removes the most total uncertainty.
- **Item selection (Stage 2):** Probability-weighted expected variance reduction — items targeting likely conditions are prioritized over items targeting rare, high-variance conditions.
- **Stage transition:** Spectrum posteriors projected to condition priors via L matrix: mu_condition = base_rate + L * mu_spectrum. Condition variances initialized as lambda² * Sigma_spectrum + (1-lambda²) to propagate Stage 1's uncertainty reduction.
- **Response normalization:** Probit normal scores using population response distributions, not naive z-scoring (which produces absurd values for skewed items like suicidality).
- **Output:** Per-condition probability P(z > tau) = 1 - Phi((tau - mu) / sqrt(Sigma_jj)), classified as Likely / Flagged / Uncertain / Ruled Out based on configurable probability and uncertainty thresholds.

77 unit tests validate the math engine against known examples.

### Screening Flow

1. **Intake:** Patient provides free-text description of concerns. LLM analyzes and auto-scores implied items.
2. **Broad screening:** Conversational administration of Stage 1 items via LLM. Each response triggers Kalman update across all spectra.
3. **Targeted screening:** Stage 2 items disambiguate conditions within flagged spectra.
4. **Report:** Two-tab view — Conditions tab (flagged conditions with talking points) and Dimensional tab (spectrum magnitudes with nested condition chips).
5. **Follow-up:** Patient can ask questions about their report via chat.

The LLM handles conversational item framing, response interpretation, and implied scoring. The statistical backbone is fully deterministic — the LLM never touches the math.

### Prior Work

The closest existing system is **CAT-MH** (Computerized Adaptive Test for Mental Health), a proprietary MIRT-based adaptive testing suite ($5/session, closed-source, clinician-credentialed access only). CAT-MH achieves 0.95 sensitivity / 0.87 specificity for depression using ~4 questions, but operates in condition-siloed modules rather than a unified cross-diagnostic framework.

This project differs in three ways: (1) open and inspectable parameters from published literature, (2) unified cross-diagnostic framework where all conditions update simultaneously, and (3) LLM-based conversational interface.

### Current Status

- Core math engine: complete (Kalman filter, item selection, stage transition, diagnosis)
- Psychometric data pipeline: complete (all 8 steps validated)
- API routes: complete (start, intake, respond, report, followup)
- Patient screening UI: complete (intake, chat, report, followup)
- Database persistence: complete
- LLM integration: placeholder (swap-ready architecture)
- Doctor review UI: not started
- Crisis intervention / guardrails: not started

See `SCREENING_PROGRESS.md` for detailed status.
