# Screening Implementation Progress

Tracks implementation of the Bayesian adaptive screening flow. See `SCREENING_PLAN.md` for full details and `SCREENING_UI_SKELETON.md` for UI structure.

---

## Step 1: Core Math Engine (`src/lib/screening/`)

- [x] **1a** Configuration — `SCREENING_CONFIG` with all tunable thresholds in `config.ts`
- [x] **1b** State representation — `ScreeningState` type, `initState()` (no hardcoded dimension counts) — types in `types.ts`, init in `state.ts`
- [x] **1c** Kalman update — `kalmanUpdate()`, `batchUpdate()`, runtime noise — `update.ts` (spectrum + condition level)
- [x] **1d** Item selection — `rankItems()`, expected variance reduction — `selection.ts`
- [x] **1e** Stage transition — termination criteria, `transitionToStageTwo()` with correct variance init (Σ = λ²Σ_spectrum + (1−λ²)) — `transition.ts`
- [x] **1f** Diagnosis computation — `computeProbability()`, `classifyCondition()` (thresholds from config), stage 2 termination — `diagnosis.ts`

## Step 2: Data Loading Layer (`src/lib/screening/data.ts`)

- [x] `loadFullReferenceData()` — spectra, conditions, correlations, base rates, items, loadings, overlaps, thresholds — `loadData.ts`

## Step 3: LLM Integration (`src/lib/screening/llm/`)

- [x] **3a** LLM client (`client.ts`) — `callScreeningLLM()`, `callReportLLM()` wrappers delegating to placeholder impls
- [x] **3b** General screening function (`screening.ts`) — editable `SCREENING_SYSTEM_PROMPT`, `SCREENING_TOOLS` definitions, `placeholderScreeningLLM()`
- [x] **3c** Report generation (`report.ts`) — editable `REPORT_SYSTEM_PROMPT`, `placeholderReportLLM()` with template sections
- [x] **3d** Placeholder behavior — verbatim items, direct numeric scoring, template-filled report; swap is one-line change in `client.ts`

## Step 4: API Routes (`src/app/api/screening/`)

- [x] **4a** `POST /start`, `GET /[id]`, `POST /[id]/end` — `start/route.ts`, `[sessionId]/route.ts`
- [x] **4b** `POST /[id]/intake` — free-text processing, auto-scoring, transition to BROAD_SCREENING
- [x] **4c** `POST /[id]/respond` — main screening loop: LLM → Kalman → termination check → next question
- [x] **4d** `GET /[id]/report` — diagnostic profile + LLM report generation + diagnosis persistence
- [x] **4e** `POST /[id]/followup` — Q&A with report context

## Step 5: Database Session Persistence

- [x] **5a** Add `ScreeningSession`, `SessionResponse`, `SessionDiagnosis` to Prisma schema + `db push`
- [x] **5b** Persistence functions — create/save/load session state — `persistence.ts`

## Step 6: Patient Screening UI (`/patient/screening/`)

- [x] **6a** Entry point — population selector, begin button — `screening/page.tsx`
- [x] **6b** Phase 0: Free-text intake — textarea, loading spinner, transition screen — `screening/intake/page.tsx`
- [x] **6c** Phase 1 & 2: Chat — vertical chat, Likert/MCQ items, Q:/A: compression, progress bar — `screening/chat/page.tsx` + `components/screening/`
- [x] **6d** Phase 3: Report — dimensional profile, flagged conditions, talking points, not-assessed — `screening/report/page.tsx`
- [ ] **6e** Phase 4: Follow-up — Q&A chat about the report

## Step 7: Doctor Review UI

- [ ] **7a** Screening sessions on patient detail page
- [ ] **7b** Screening detail view — audit trail, posterior evolution, clinical notes

## Step 8: Testing & Validation

- [ ] **8a** Math engine unit tests (including threshold sensitivity tests)
- [ ] **8b** Integration tests (full flow with mock LLM)
- [ ] **8c** LLM output validation tests

## Step 9: Polish & Edge Cases

- [ ] Session resumption
- [ ] Session timeout + auto-save
- [ ] LLM fallback (show items verbatim if LLM fails)
- [ ] Accessibility (screen reader, keyboard nav)
- [ ] Mobile responsiveness
- [ ] Rate limiting + input sanitization

## Step 10: Guardrails & Crisis Intervention (LAST)

- [ ] **10a** Crisis item detection — configurable item/tag list, response thresholds
- [ ] **10b** Psychotic symptom detection — configurable item list
- [ ] **10c** LLM-based crisis language detection — `flag_crisis` tool
- [ ] **10d** Crisis UI overlay — non-dismissable modal, 988/crisis resources
- [ ] **10e** Clinical referral flags — badges on doctor dashboard
- [ ] **10f** Language guardrails — "your responses suggest" not "you have"
