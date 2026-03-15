# Screening UI Skeleton & Flow

Visual structure and user flow for the Bayesian adaptive screening interface.

For project folder structure (where files live on disk), see `SCREENING_PLAN.md` → Project Structure.

All tunable thresholds (stage transition, classification, item selection K, LLM limits) live in `src/lib/screening/config.ts`. See `SCREENING_PLAN.md` Step 1a.

---

## Route Map

```
/patient/screening                    → Entry point (start screening)
/patient/screening/intake             → Phase 0: Free-text intake
/patient/screening/chat               → Phase 1 & 2: Conversational screening
/patient/screening/report             → Phase 3: Diagnostic report
/patient/screening/followup           → Phase 4: Ask questions about report

/doctor/patients/[id]                 → (existing) Add screening sessions section
/doctor/patients/[id]/screening/[sid] → Screening detail + audit trail
```

---

## Flow Diagram

```
Patient Dashboard
    │
    ▼
┌─────────────────────────────────┐
│  /patient/screening             │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Badge: "Adaptive screening"│  │
│  │ Title: "Personalized      │  │
│  │  mental health screening" │  │
│  │                           │  │
│  │ Description text:         │  │
│  │ ~25 questions, adaptive,  │  │
│  │ not a diagnosis, etc.     │  │
│  │                           │  │
│  │ Population selector:      │  │
│  │ [General ▼]               │  │
│  │                           │  │
│  │ [ Begin screening → ]     │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Past screenings           │  │
│  │ ┌─────┐ ┌─────┐ ┌─────┐  │  │
│  │ │ 3/12│ │ 2/28│ │ 1/15│  │  │
│  │ │Done │ │Done │ │Done │  │  │
│  │ └─────┘ └─────┘ └─────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
    │
    ▼ POST /api/screening/start → sessionId
    │
┌─────────────────────────────────┐
│  /patient/screening/intake      │
│                                 │
│  Badge: "Step 1 of 3"          │
│  Title: "Tell us what's been   │
│   going on"                     │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │  Large textarea           │  │
│  │  "Share what feels        │  │
│  │   important to you..."    │  │
│  │                           │  │
│  │                           │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  Helper text: "There are no    │
│  wrong answers. You can share  │
│  as much or as little as you   │
│  like."                         │
│                                 │
│  [ Continue → ]                 │
│                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  Loading state after submit:    │
│  Spinner + "Understanding       │
│  your response..."              │
│                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  Transition screen:             │
│  "We've noted what you shared.  │
│  Now we'll ask a few specific   │
│  questions."                    │
│  [ Continue to questions → ]    │
└─────────────────────────────────┘
    │
    ▼ POST /api/screening/{id}/intake
    │ Returns: auto-scored items, updated state
    │
┌──────────────────────────────────────────────────────┐
│  /patient/screening/chat                             │
│                                                      │
│  ┌──────────────────────────┬──────────────────────┐ │
│  │  MAIN CHAT AREA          │  SIDEBAR             │ │
│  │                          │                      │ │
│  │  Progress: Q 3 of ~25    │  ┌──────────────────┐│ │
│  │  ░░░░░░░░░░░▓▓▓▓▓▓░░░░  │  │ How this works   ││ │
│  │                          │  │                  ││ │
│  │  ┌────────────────────┐  │  │ Questions adapt  ││ │
│  │  │ 🤖 Assistant       │  │  │ based on your    ││ │
│  │  │                    │  │  │ answers. ~25     ││ │
│  │  │ "Thank you for     │  │  │ total. You can   ││ │
│  │  │  sharing that. I'd │  │  │ stop anytime.    ││ │
│  │  │  like to ask about │  │  └──────────────────┘│ │
│  │  │  your sleep..."    │  │                      │ │
│  │  └────────────────────┘  │  ┌──────────────────┐│ │
│  │                          │  │ Current focus    ││ │
│  │  ┌────────────────────┐  │  │                  ││ │
│  │  │ 👤 You             │  │  │ Badge: Distress  ││ │
│  │  │                    │  │  │ Badge: Fear      ││ │
│  │  │ "I've been having  │  │  │                  ││ │
│  │  │  trouble sleeping  │  │  │ (spectra being   ││ │
│  │  │  for weeks..."     │  │  │  explored, shown ││ │
│  │  └────────────────────┘  │  │  as gentle labels││ │
│  │                          │  │  not clinical     ││ │
│  │  ┌────────────────────┐  │  │  jargon)         ││ │
│  │  │ 🤖 Assistant       │  │  └──────────────────┘│ │
│  │  │                    │  │                      │ │
│  │  │ "When you say you  │  │  ┌──────────────────┐│ │
│  │  │  can't sleep, is   │  │  │ [ Stop early ]   ││ │
│  │  │  that trouble      │  │  │                  ││ │
│  │  │  falling asleep,   │  │  │ You can end the  ││ │
│  │  │  staying asleep,   │  │  │ screening at any ││ │
│  │  │  or sleeping too   │  │  │ point. Results   ││ │
│  │  │  much?"            │  │  │ will reflect     ││ │
│  │  └────────────────────┘  │  │ what we covered. ││ │
│  │                          │  └──────────────────┘│ │
│  │  ┌────────────────────┐  │                      │ │
│  │  │  Type your         │  │                      │ │
│  │  │  response...       │  │                      │ │
│  │  │                    │  │                      │ │
│  │  └────────────────────┘  │                      │ │
│  │  [ Send ]                │                      │ │
│  │                          │                      │ │
│  └──────────────────────────┴──────────────────────┘ │
│                                                      │
│  ═══════════════════════════════════════════════════  │
│  CRISIS OVERLAY (Step 10 — added last):              │
│  Non-dismissable modal with 988/crisis resources.    │
│  See SCREENING_PLAN.md Step 10d for full spec.       │
└──────────────────────────────────────────────────────┘
    │
    ▼ Loop: POST respond → Kalman update → check termination
    │ Stage transition happens silently mid-conversation
    │
    ▼ When terminated:
    │
┌──────────────────────────────────────────────────────┐
│  /patient/screening/report                           │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ ⓘ This is a screening tool, not a diagnosis. │    │
│  │ Results should be discussed with a provider.  │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  Badge: "Screening report"                           │
│  Title: "Your results"                               │
│  Subtitle: "Based on 23 questions · March 14, 2026"  │
│                                                      │
│  ── Flagged areas ──────────────────────────────────  │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ Major Depressive Disorder           [LIKELY] │    │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░  P = 0.74 ± 0.12   │    │
│  │                                              │    │
│  │ Talking points for your provider:            │    │
│  │ • You described persistent low mood and      │    │
│  │   difficulty finding pleasure in activities   │    │
│  │ • Sleep disruption has been ongoing for       │    │
│  │   several weeks                               │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ Generalized Anxiety Disorder      [FLAGGED]  │    │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░  P = 0.38 ± 0.18     │    │
│  │                                              │    │
│  │ Talking points for your provider:            │    │
│  │ • You mentioned persistent worry that feels  │    │
│  │   difficult to control                        │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ── Not flagged ────────────────────────────────────  │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ Social Anxiety        P = 0.08  [RULED OUT]  │    │
│  │ Panic Disorder        P = 0.05  [RULED OUT]  │    │
│  │ OCD                   P = 0.12  [UNCERTAIN]  │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ── Not assessed ───────────────────────────────────  │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ The following areas were not explored in      │    │
│  │ depth because your initial responses did not  │    │
│  │ suggest concern:                              │    │
│  │                                              │    │
│  │ • Thought disorder spectrum                   │    │
│  │ • Antagonistic externalizing spectrum          │    │
│  │                                              │    │
│  │ If you have concerns about these areas,       │    │
│  │ mention them to your provider.                │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ Ask a      │ │ Share with   │ │ Save & return  │  │
│  │ question   │ │ clinician    │ │ to dashboard   │  │
│  └────────────┘ └──────────────┘ └────────────────┘  │
└──────────────────────────────────────────────────────┘
    │                    │
    ▼                    ▼
┌────────────────┐   Shares report with
│ /patient/      │   assigned doctor via
│ screening/     │   doctor dashboard
│ followup       │
│                │
│ Chat interface │
│ for Q&A about  │
│ the report.    │
│                │
│ "What does     │
│  moderate      │
│  distress      │
│  mean?"        │
│                │
│ LLM explains   │
│ using audit    │
│ trail data.    │
│                │
│ [Back to       │
│  report]       │
└────────────────┘
```

---

## Component Hierarchy

```
/patient/screening (ScreeningEntry)
├── PopulationSelector          — dropdown for population type
├── PastScreeningsList          — grid of previous session cards
│   └── ScreeningSessionCard    — date, status, flagged count
└── BeginButton

/patient/screening/intake (ScreeningIntake)
├── StepBadge                   — "Step 1 of 3"
├── IntakeTextarea              — large free-text input
├── SubmitButton
├── LoadingOverlay              — spinner + "Understanding..."
└── TransitionScreen            — "Now we'll ask specific questions"

/patient/screening/chat (ScreeningChat)
├── ChatArea
│   ├── ProgressBar             — "Q X of ~25" with fill bar
│   ├── MessageThread
│   │   ├── AssistantMessage    — LLM's conversational question
│   │   ├── PatientMessage      — patient's typed response
│   │   └── ClarificationMessage — follow-up from LLM (up to config.maxClarificationsPerItem)
│   ├── ResponseInput           — textarea + send button
│   └── TypingIndicator         — shown while LLM processes
├── Sidebar
│   ├── HowThisWorks           — static info card
│   ├── CurrentFocus            — spectrum badges (non-clinical labels)
│   └── StopEarlyCard          — explanation + stop button
└── CrisisOverlay               — (Step 10) 988/crisis resources, added last

/patient/screening/report (ScreeningReport)
├── DisclaimerBanner            — "not a diagnosis" notice
├── ReportHeader                — title, date, question count
├── FlaggedConditions
│   └── ConditionCard           — bar chart, P ± uncertainty, talking points
│       ├── LikelihoodBar       — colored horizontal bar
│       └── TalkingPoints       — bulleted list
├── UnflaggedConditions         — compact list with status badges
├── NotAssessedSection          — skipped spectra explanation
└── ActionButtons               — ask question / share / save

/patient/screening/followup (ScreeningFollowup)
├── ReportSummaryBar            — collapsed version of report for reference
├── FollowupChat
│   ├── MessageThread           — Q&A messages
│   └── QuestionInput           — textarea
└── BackToReportButton

/doctor/patients/[id]/screening/[sid] (ScreeningDetail)
├── DiagnosticProfile           — same as patient report but detailed
├── AuditTrail
│   └── ResponseRow             — item text, response, score, K, ΔΣ
├── PosteriorEvolutionChart     — line chart of μ over time per dimension
├── AutoScoredItems             — highlighted with reasoning
└── ClinicalNotesTextarea       — doctor annotation
```

---

## State Management

```
ScreeningContext (React Context, client-side)
│
├── sessionId: string
├── phase: "intake" | "broad" | "targeted" | "report" | "followup"
├── messages: ChatMessage[]          — full conversation history
├── currentQuestion: string | null   — LLM's current question
├── waitingForResponse: boolean
├── clarificationCount: number       — 0 to config.maxClarificationsPerItem for current item
├── itemsCompleted: number
├── estimatedTotal: number           — ~25, updated as screening progresses
├── crisisFlag: boolean               — (Step 10) added with guardrails
├── psychoticFlag: boolean            — (Step 10) added with guardrails
│
├── diagnosticProfile: {             — populated after screening complete
│     flagged: ConditionResult[]
│     unflagged: ConditionResult[]
│     notAssessed: SpectrumInfo[]
│   }
│
└── actions:
    ├── submitIntakeText(text)
    ├── sendResponse(text)
    ├── stopEarly()
    ├── askFollowup(question)
    └── shareWithDoctor()
```

---

## LLM Integration (how the UI talks to the backend)

The UI doesn't know about the LLM architecture — it just calls API routes and gets responses. But for context:

- **One general LLM function** (`callScreeningLLM`) handles everything: intake analysis, item selection, response interpretation, implied scoring, follow-up Q&A. It's given tools and a system prompt and figures out what to do.
- **One report LLM function** (`callReportLLM`) generates the natural-language report from structured math output.
- Both are **placeholder-ready**: until a real LLM is connected, they return verbatim items and template reports. The UI works identically either way.
- All limits (max tool calls, max clarifications, valid score ranges) are enforced **in code**, not by the LLM.
- System prompts are editable `const string`s — no redeployment needed to change LLM behavior.

See `SCREENING_PLAN.md` Step 3 for full LLM layer spec.

---

## Non-Clinical Language Mapping

The UI never shows clinical jargon to patients. Spectrum labels are translated:

| Internal Name | Patient-Facing Label |
|---|---|
| Distress | Mood & emotional pain |
| Fear | Anxiety & worry |
| Disinhibited Externalizing | Impulse control |
| Antagonistic Externalizing | Interpersonal patterns |
| Thought Disorder | Perception & reality |
| Detachment | Emotional connection |
| Somatoform | Physical symptoms |
| Compulsivity | Repetitive thoughts & behaviors |

Condition names are similarly softened in the report (e.g., "Major Depressive Disorder" → shown as-is but always prefixed with "Your responses suggest patterns consistent with..." never "You have...").

---

## Responsive Breakpoints

| Breakpoint | Layout |
|---|---|
| Mobile (<768px) | Single column. Sidebar collapses to bottom sheet. Chat is full-width. Report cards stack vertically. |
| Tablet (768-1024px) | Chat: main area full width, sidebar as collapsible panel. Report: 1 column for condition cards. |
| Desktop (>1024px) | Chat: 2-column (main + sidebar). Report: condition cards full width with room for bars. |

---

## Key Interactions

### Sending a response
1. Patient types in textarea, clicks Send (or Enter).
2. UI shows typing indicator.
3. `POST /api/screening/{id}/respond` with message text.
4. Server pipeline:
   - LLM interprets response (via `callScreeningLLM` with tools).
   - LLM uses tools: `interpret_response`, `flag_implied_scores`, `select_item`, `frame_question`.
   - Code runs Kalman update for all scored items (direct + implied).
   - Code checks termination criteria (from `config`).
   - Code ranks next items for next turn.
   - Limits enforced in code: max `config.maxLlmToolCalls` tool calls, scores validated against item range.
5. Response returns: `{ score, impliedScores[], nextQuestion, terminated, updatedProgress }`.
6. If `terminated`: redirect to `/patient/screening/report`.
7. Otherwise: append assistant message with next question.
8. (Step 10) If `crisisFlag` returned: show crisis overlay immediately.

### Stage transition (invisible to patient)
1. After a response, server checks stage 1 termination criteria (eigenvalue ratio, marginal info gain, item cap — all from `SCREENING_CONFIG`).
2. Server runs `transitionToStageTwo()` — projects spectrum posterior → condition priors via L matrix, initializes condition variances as λ²Σ_spectrum + (1−λ²).
3. Next question comes from targeted instruments instead of broad ones.
4. Patient sees no difference — conversation continues naturally.
5. Sidebar "Current focus" badges may update to reflect narrower topics.

### Crisis intervention (Step 10 — implemented last)
See `SCREENING_PLAN.md` Step 10 for full spec. This involves crisis item detection, LLM-based crisis language detection, UI overlay, and clinical referral flags. All guardrail components are built together as the final step.

### Stop early
1. Patient clicks "Stop screening" in sidebar.
2. Confirmation dialog: "Results will reflect only what we've covered so far."
3. `POST /api/screening/{id}/end` with reason `USER_STOPPED`.
4. Redirect to report page (which notes incomplete assessment).
