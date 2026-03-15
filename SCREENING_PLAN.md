# Screening Implementation Plan

Step-by-step plan for building the Bayesian adaptive psychiatric screening flow, from math engine to UI to LLM integration.

---

## Project Structure

```
src/
├── lib/
│   └── screening/
│       ├── config.ts            — all tunable thresholds & sensitivity settings
│       ├── state.ts             — ScreeningState type, initState()
│       ├── update.ts            — kalmanUpdate(), batchUpdate()
│       ├── selection.ts         — rankItems(), computeRuntimeNoise()
│       ├── transition.ts        — checkStageOneTermination(), transitionToStageTwo()
│       ├── diagnosis.ts         — computeProbability(), classifyCondition()
│       ├── data.ts              — Prisma loaders for reference data
│       ├── persistence.ts       — session save/load to DB
│       └── llm/
│           ├── client.ts        — LLM call wrapper (placeholder-ready)
│           ├── screening.ts     — general screening LLM function (tools + prompt)
│           └── report.ts        — report generation LLM function
├── app/
│   ├── api/
│   │   └── screening/
│   │       ├── start/route.ts
│   │       ├── [sessionId]/
│   │       │   ├── route.ts           — GET session state, POST end session
│   │       │   ├── intake/route.ts    — POST free-text intake
│   │       │   ├── respond/route.ts   — POST patient response
│   │       │   ├── report/route.ts    — GET diagnostic report
│   │       │   └── followup/route.ts  — POST follow-up question
│   └── patient/
│       └── screening/
│           ├── page.tsx               — entry point (start screening)
│           ├── intake/page.tsx        — phase 0: free-text
│           ├── chat/page.tsx          — phase 1 & 2: conversational
│           ├── report/page.tsx        — phase 3: results
│           └── followup/page.tsx      — phase 4: Q&A
│   └── doctor/
│       └── patients/
│           └── [patientId]/
│               └── screening/
│                   └── [sessionId]/
│                       └── page.tsx   — audit trail + detail view
```

---

## Step 1: Core Math Engine

Build the Kalman filter and item selection logic as pure functions (no UI, no LLM). All code in `src/lib/screening/`.

### 1a: Configuration (`config.ts`)

All tunable thresholds live here. **Nothing is hardcoded in the math functions.** These values are easy to get catastrophically wrong without empirical testing, so they must be centralized, clearly documented, and trivial to change.

```ts
export const SCREENING_CONFIG = {
  // Stage 1 termination
  eigenvalueRatioThreshold: 5,        // max/min eigenvalue ratio of Σ_spectrum
  minVarianceReductionFraction: 0.05,  // fraction of tr(Σ₀) below which items aren't worth it
  maxStageOneItems: 20,

  // Spectrum flagging for stage 2
  spectrumFlagMeanPercentile: 0.52,    // μⱼ above this → flag (70th percentile of N(0,1))
  spectrumFlagUncertaintyRatio: 0.6,   // √Σⱼⱼ still above this fraction of prior → flag

  // Condition classification
  classification: {
    likelyProbability: 0.60,
    likelyMaxUncertainty: 0.4,
    ruledOutProbability: 0.10,
    ruledOutMaxUncertainty: 0.4,
    flaggedProbability: 0.25,
  },

  // Stage 2 termination
  stageTwoMinVarianceReduction: 0.02,  // fraction of current max Σⱼⱼ
  maxStageTwoItems: 15,
  maxTotalItems: 35,

  // Item selection
  topKItems: 8,                        // how many items to rank and offer to LLM

  // LLM limits
  maxClarificationsPerItem: 3,
  maxLlmToolCalls: 10,                 // per turn
}
```

> **WARNING:** The spectrum flagging and classification thresholds directly control sensitivity vs. specificity. Changing them without validation against known cases can silently break the screening. Always test threshold changes against the validation suite (Step 8).

### 1b: State representation (`state.ts`)

- Define `ScreeningState` type:
  ```
  stage: "INTAKE" | "BROAD_SCREENING" | "TARGETED" | "COMPLETE"
  spectrumMean: Float[numSpectra]
  spectrumCovariance: Float[numSpectra][numSpectra]
  conditionMean: Float[N] | null
  conditionVariances: Float[N] | null
  conditionDimensionOrder: string[] | null
  itemsAdministered: { itemId, response, stage }[]
  autoScoredItems: { itemId, response, source: "free_text" | "implied" }[]
  flaggedSpectra: string[]
  flaggedConditions: string[]
  ```
- `initState(populationType, referenceData)`: Build initial μ₀ (length = number of spectra from referenceData, not hardcoded), Σ₀ from `DimensionCorrelation` table. The number of spectra and conditions is always derived from the loaded reference data.
- Fetch all reference data at session start: dimensions, correlations, base rates, items, loadings, overlaps, thresholds. Cache in memory for the session.

### 1c: Kalman update (`update.ts`)

- `kalmanUpdate(state, itemId, normalizedResponse, referenceData)`:
  - Look up item's loading vector **h** (from `ItemLoading`).
  - Compute predicted response: ŷ = **h**ᵀ **μ**.
  - Compute innovation: δ = y − ŷ.
  - Compute innovation variance: S = **h**ᵀ **Σ** **h** + σ² (runtime noise).
  - Compute Kalman gain: **K** = **Σ** **h** / S.
  - Update: **μ_new** = **μ** + **K** δ, **Σ_new** = **Σ** − **K** **h**ᵀ **Σ**.
  - Return new state + metadata (K, infoGain = tr(Σ) − tr(Σ_new)).
- `batchUpdate(state, items[])`: Apply multiple updates sequentially (for auto-scored items).
- Runtime noise computation: base σ² from `Item.noiseVariance`, inflated by `ItemOverlap.noiseInflationMultiplier` if overlapping items already administered.

### 1d: Item selection (`selection.ts`)

- `rankItems(state, candidateItems[], config)`:
  - For each candidate item, compute expected variance reduction: tr(Σ) − tr(Σ_new) assuming response at the item's expected value.
  - Return top `config.topKItems` items sorted by expected variance reduction.
  - Filter out already-administered items and auto-scored items.
  - In stage 2, only consider items from instruments targeting flagged conditions.
- `computeRuntimeNoise(itemId, administeredItems[], referenceData)`: Check `ItemOverlap` table, apply multipliers.

### 1e: Stage transition (`transition.ts`)

- `checkStageOneTermination(state, config)`:
  - Criterion 1: eigenvalue ratio of Σ_spectrum > `config.eigenvalueRatioThreshold`.
  - Criterion 2: best item's expected variance reduction < `config.minVarianceReductionFraction` × tr(Σ₀).
  - Criterion 3: items administered >= `config.maxStageOneItems`.
  - Return `{ shouldTransition: boolean, reason: string }`.
- `transitionToStageTwo(state, referenceData, config)`:
  - Project spectrum posterior → condition priors via L matrix (`ConditionSpectrumLoading`).
  - Flag spectra where μⱼ > `config.spectrumFlagMeanPercentile` OR √Σⱼⱼ > `config.spectrumFlagUncertaintyRatio` × prior √Σⱼⱼ.
  - **Condition prior means:** μ_condition = μ_condition_base + L_row × μ_spectrum_posterior (from `BaseRate` + `ConditionSpectrumLoading`).
  - **Condition prior variances:** For each condition with loading λ on its parent spectrum with posterior variance Σ_spectrum:
    ```
    Σ_condition = λ² × Σ_spectrum_posterior + (1 − λ²)
    ```
    This propagates stage 1's uncertainty reduction proportionally. A condition that loads heavily (λ=0.8) on a well-resolved spectrum (Σ_spectrum=0.3) gets variance 0.64×0.3 + 0.36 = 0.552 — much less than 1.0, preserving what stage 1 learned. The `(1 − λ²)` residual is the variance from what the spectrum doesn't explain. For cross-loading conditions, use the primary spectrum's loading and posterior.
  - Set `conditionDimensionOrder` to the IDs of conditions under flagged spectra.
  - Return new state with stage = "TARGETED".

### 1f: Diagnosis computation (`diagnosis.ts`)

- `computeProbability(mean, variance, threshold)`: P = 1 − Φ((τ − μ) / √Σ).
- `classifyCondition(probability, uncertainty, config)`:
  - All thresholds read from `config.classification`:
    - P > `likelyProbability` AND √Σ < `likelyMaxUncertainty` → "likely"
    - P < `ruledOutProbability` AND √Σ < `ruledOutMaxUncertainty` → "ruled_out"
    - P > `flaggedProbability` → "flagged"
    - else → "uncertain"
  - These thresholds are the most sensitive part of the system. Different clinical contexts may need different values (e.g., a more aggressive screener lowers `flaggedProbability`).
- `checkStageTwoTermination(state, config)`:
  - All flagged conditions resolved (likely/ruled_out/no-info-left).
  - Best item reduces max(Σⱼⱼ) by < `config.stageTwoMinVarianceReduction` of current value.
  - Stage 2 items >= `config.maxStageTwoItems`.
- `generateDiagnosticProfile(state, referenceData, config)`: Full report data structure.

---

## Step 2: Data Loading Layer

Server-side functions to load reference data from Prisma. All in `src/lib/screening/data.ts`.

- `loadSpectra()`: All dimensions where level = SPECTRUM, ordered by sortOrder. Count is derived, never assumed.
- `loadConditions(spectrumIds?)`: Conditions, optionally filtered to specific spectra.
- `loadCorrelationMatrix()`: Build N×N Σ₀ from DimensionCorrelation rows (N = number of spectra loaded).
- `loadBaseRates(populationType)`: Condition base rates for a population.
- `loadItems(tier?)`: Items with their loadings, optionally filtered by instrument tier.
- `loadItemLoadings(itemIds)`: Loading vectors for specific items.
- `loadItemOverlaps(itemIds)`: Overlap pairs involving given items.
- `loadThresholds()`: All clinical thresholds.
- `loadFullReferenceData(populationType)`: Single call that loads everything, returns a `ReferenceData` bundle. All dimension counts are properties of this bundle.

---

## Step 3: LLM Integration Layer

The LLM layer is **not** a collection of hardcoded functions for each use case. Instead, there are **two core LLM functions** — a general screening function and a report function — each with an editable system prompt and a set of tools the LLM can call. The LLM decides how to use the tools based on context.

All code in `src/lib/screening/llm/`.

### 3a: LLM client (`client.ts`)

- Placeholder-ready LLM call wrapper. Right now returns mock responses; later swaps to real API.
- Must look and behave like a real LLM function — accepts messages array, tools, system prompt; returns structured response.
- **Two instances:**

```ts
// General screening LLM — handles intake analysis, item selection,
// response interpretation, implied scoring, follow-up questions
export async function callScreeningLLM(options: {
  systemPrompt: string,      // editable, stored as a constant you can change
  messages: Message[],
  tools: Tool[],
  maxToolCalls: number,       // from config
  context: {                  // math engine state, reference data, etc.
    screeningState: ScreeningState,
    rankedItems?: RankedItem[],
    conversationHistory: Message[],
    referenceData: ReferenceData,
  }
}): Promise<LLMResponse>

// Report LLM — generates natural language report from diagnostic profile
export async function callReportLLM(options: {
  systemPrompt: string,
  diagnosticProfile: DiagnosticProfile,
  conversationHistory: Message[],
  referenceData: ReferenceData,
}): Promise<ReportResponse>
```

### 3b: General screening function (`screening.ts`)

One function, one prompt, multiple tools. The LLM is given tools and instructions and figures out what to do based on the conversation phase.

**Tools available to the LLM:**
- `score_item(itemId, score, reasoning)` — score an item from patient speech
- `select_item(itemId, reasoning)` — pick an item from the ranked list to ask next
- `ask_clarification(question)` — ask a follow-up (capped at `config.maxClarificationsPerItem`)
- `frame_question(text)` — generate the conversational version of the selected item
- `interpret_response(itemId, score, confidence)` — map patient's natural language to numeric score
- `flag_implied_scores(scores: {itemId, score, reasoning}[])` — auto-score items implied by response

**System prompt** (editable, stored in `screening.ts`):
- Explains the screening flow phases
- Instructs the LLM on tone calibration, topic transitions, item selection preferences
- Explains that it should pick from the top 3 ranked items most of the time
- Gives context on what each tool does
- Prompt is a `const string` that can be edited directly

**Limits enforced in code** (not by the LLM):
- Max `config.maxLlmToolCalls` tool calls per turn
- Max `config.maxClarificationsPerItem` clarifications per item
- Item scores validated against response range
- Selected item must be from the ranked list

### 3c: Report generation (`report.ts`)

Separate function because it has a different prompt and output structure.

- Takes the diagnostic profile (structured math output) and conversation history.
- LLM generates natural-language sections: dimensional profile, flagged conditions, talking points, what was not assessed, uncertainty disclosure.
- System prompt is editable.
- Output is validated against required sections.

### 3d: Placeholder behavior

Until a real LLM is connected:
- `callScreeningLLM` returns the top-ranked item framed verbatim (no conversational polish), interprets responses as direct numeric scores, no implied scoring.
- `callReportLLM` returns a template-filled report using the structured data directly.
- Both functions have the same interface as the real versions — swapping in a real LLM is a one-line change in `client.ts`.

---

## Step 4: API Routes

Server-side endpoints for the screening flow. All in `src/app/api/screening/`.

### 4a: Session management

- `POST /api/screening/start`: Create new session, load reference data, return initial state + session ID.
- `GET /api/screening/[sessionId]`: Get current session state.
- `POST /api/screening/[sessionId]/end`: Manually end session.

### 4b: Phase 0 — Intake

- `POST /api/screening/[sessionId]/intake`: Accept free-text, run LLM analysis (via `callScreeningLLM` with intake context), auto-score items, update state, return updated state + auto-scored items.

### 4c: Phase 1 & 2 — Item administration

- `POST /api/screening/[sessionId]/respond`: Accept patient response. Pipeline:
  1. Call `callScreeningLLM` with response + ranked items + conversation history.
  2. LLM uses tools to interpret response, score item, check implied scores, select next item, frame next question.
  3. Run Kalman updates for all scored items.
  4. Check termination criteria.
  5. Return: `{ nextQuestion, score, impliedScores[], terminated, updatedProgress }`.

### 4d: Phase 3 — Report

- `GET /api/screening/[sessionId]/report`: Run `generateDiagnosticProfile()` then `callReportLLM()`. Return structured + natural language report.

### 4e: Phase 4 — Follow-up

- `POST /api/screening/[sessionId]/followup`: Pass question to `callScreeningLLM` with report context. Return explanation.

---

## Step 5: Database Session Persistence

Save screening session state to Prisma. Uses the `Session`, `SessionResponse`, `SessionDiagnosis` models from DATA_SCHEMA.md (need to be added to the actual Prisma schema).

### 5a: Add screening models to Prisma schema

- `Session` model (matches DATA_SCHEMA.md).
- `SessionResponse` model.
- `SessionDiagnosis` model.
- Run `prisma migrate dev`.

### 5b: Session persistence functions (`src/lib/screening/persistence.ts`)

- `createSession(patientId, populationType)`: Create Session row with initial priors.
- `saveResponse(sessionId, itemId, response, kalmanGain, posteriorAfter, infoGain)`: Create SessionResponse row.
- `updateSessionState(sessionId, state)`: Update posterior mean/covariance on Session.
- `saveDiagnoses(sessionId, diagnoses[])`: Create SessionDiagnosis rows.
- `getSession(sessionId)`: Load full session with responses.

---

## Step 6: Patient Screening UI

All new pages under `/patient/screening/`.

### 6a: Entry point (`/patient/screening/page.tsx`)

- "Begin screening" button.
- Population type selector (general/clinical/college/primary care) — or auto-detect from patient profile.
- Brief explanation of what the screening involves (under 30 questions, not a diagnosis, etc.).
- Past screening sessions list.
- Creates session and redirects to phase 0.

### 6b: Phase 0 — Free-text intake (`/patient/screening/intake/page.tsx`)

- Large textarea: "Tell us what's been going on in your own words."
- Gentle prompts: "There are no wrong answers. Share as much or as little as feels comfortable."
- Submit → sends to API, shows brief loading state ("Understanding your response...").
- After analysis: transition screen showing "We've noted some of what you shared. Now we'll ask a few specific questions to understand better."
- Auto-advance to phase 1.

### 6c: Phase 1 & 2 — Conversational screening (`/patient/screening/chat/page.tsx`)

- Chat-style interface (reuse existing chat component patterns).
- Each "turn":
  1. System shows conversational question (from LLM).
  2. Patient types natural language response.
  3. If clarification needed, system asks follow-up (up to `config.maxClarificationsPerItem`).
  4. Brief acknowledgment from system, then next question.
- Progress indicator: "Question X of ~25" (approximate, since total varies).
- Stage transition is invisible to patient — just a subtle shift in question topics.
- **Session state**: Stored in React state + persisted to DB after each response.

### 6d: Phase 3 — Report (`/patient/screening/report/page.tsx`)

- Dimensional profile visualization:
  - Grouped by spectrum.
  - Each condition: horizontal bar showing likelihood (low/moderate/high) with uncertainty range.
  - Color coding: green (ruled out), yellow (uncertain), orange (flagged), red (likely).
- Flagged conditions section with talking points.
- "What was not assessed" section.
- Uncertainty disclosure banner at top.
- "Ask a question" button → opens follow-up chat.
- "Save & return to dashboard" button.
- "Share with your clinician" button (if doctor assigned).

### 6e: Phase 4 — Follow-up (`/patient/screening/followup/page.tsx`)

- Simple chat interface.
- Patient asks questions about the report.
- LLM answers using audit trail.
- "Return to report" button.

---

## Step 7: Doctor Screening Review UI

### 7a: Patient detail page updates (`/doctor/patients/[patientId]`)

- Add "Screening Sessions" section alongside existing chat transcripts and therapy notes.
- Each session card shows: date, status (in-progress/complete), population type, number of items, flagged conditions count.

### 7b: Screening detail view (`/doctor/patients/[patientId]/screening/[sessionId]/page.tsx`)

- Full diagnostic profile (same visualization as patient report, but with more detail).
- Item-by-item audit trail:
  - Which items were administered, in what order.
  - Patient's response (natural language + numeric score).
  - Kalman gain and posterior update for each item.
  - Information gain per item.
- Posterior evolution chart: how μ and Σ changed over time for each dimension.
- Auto-scored items highlighted with reasoning.
- LLM's item selection reasoning at each step.
- Clinical notes textarea for the doctor to annotate.

---

## Step 8: Testing & Validation

### 8a: Math engine unit tests

- Test Kalman update against known examples.
- Test item selection returns correct rankings.
- Test stage transition triggers at correct thresholds.
- Test probability computation against hand-calculated values.
- Test condition variance initialization: verify Σ_condition = λ² × Σ_spectrum + (1 − λ²).
- Test with edge cases: all-zero responses, all-max responses, single-spectrum signal.
- **Threshold sensitivity tests**: Run the same case with different `SCREENING_CONFIG` values and verify behavior changes as expected.

### 8b: Integration tests

- Full screening flow: intake → stage 1 → transition → stage 2 → report.
- Mock LLM responses to test the pipeline.
- Test auto-scoring propagation.

### 8c: LLM output validation

- Test that LLM-scored items map to valid response ranges.
- Test that LLM item selection stays within top K.
- Test that LLM report follows required format.
- Adversarial inputs: nonsense text, very short responses, refusal to answer.

---

## Step 9: Polish & Edge Cases

- Session resumption: patient can leave and come back.
- Session timeout: auto-save state, allow resume within 24 hours.
- Graceful degradation: if LLM fails, fall back to showing items verbatim.
- Accessibility: screen reader support, keyboard navigation, high contrast.
- Mobile responsiveness for the chat interface.
- Rate limiting on API routes.
- Input sanitization on all patient text.

---

## Step 10: Guardrails & Crisis Intervention

This is the last step because the detection logic, UI overlays, and clinical protocols all need careful design and cannot be half-implemented.

### 10a: Crisis item detection

- Define which items constitute crisis signals (suicidality items like PHQ-9 item 9, self-harm items, etc.) in a configurable list — not hardcoded to specific item IDs.
- Define which content tags trigger crisis detection (e.g., `SUICIDALITY`).
- Define response thresholds (e.g., any endorsement > 0 vs. only high scores).
- `checkCrisisItems(itemId, response, config)`: runs after every scored item.

### 10b: Psychotic symptom detection

- Similar configurable list for psychotic symptom items (CAPE positive items, etc.).
- `checkPsychoticSymptoms(itemId, response, config)`: flags for urgent referral.

### 10c: LLM-based crisis language detection

- The screening LLM has a tool `flag_crisis(reason)` it can call if the patient's free text contains crisis language that doesn't map to a specific scored item.
- This is separate from item-based detection — catches things like "I don't want to be here anymore" in free text.

### 10d: Crisis UI overlay

- Non-dismissable modal shown immediately when crisis flag is set.
- Resources: 988 Suicide & Crisis Lifeline (call/text), Crisis Text Line (text HOME to 741741), 911.
- Two options: "I understand, continue" (records acknowledgment) or "I need help now" (links to 988).
- Crisis flag is permanently recorded on the session regardless of patient's choice.

### 10e: Clinical referral flags

- Psychotic symptom flag → "urgent clinical referral recommended" badge on session.
- Crisis flag → separate "crisis intervention triggered" badge.
- Both visible to the assigned doctor on the patient detail page and screening detail view.

### 10f: Language guardrails

- The system never says "you have X" or "you don't have X."
- Always "your responses suggest" or "it may be worth discussing."
- Enforced in the report LLM's system prompt and validated in output.

---

## Implementation Order

The recommended build sequence (each step is usable/testable before the next):

1. **Step 1** (math engine + config) — pure logic, test with hardcoded data.
2. **Step 2** (data loading) — connect math to real DB data.
3. **Step 5a** (schema migration) — add Session/SessionResponse/SessionDiagnosis models.
4. **Step 5b** (persistence) — save/load session state.
5. **Step 4** (API routes) — wire up endpoints with placeholder LLM.
6. **Step 6a-6c** (patient UI: entry + intake + chat) — functional screening with placeholder LLM.
7. **Step 3** (LLM integration) — swap placeholder for real LLM calls, editable prompts.
8. **Step 6d-6e** (report + follow-up UI).
9. **Step 7** (doctor review UI).
10. **Step 8** (testing).
11. **Step 9** (polish).
12. **Step 10** (guardrails & crisis intervention) — last, done carefully.
