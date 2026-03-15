# Project Structure

Keep this file up to date whenever files are added/removed/moved.

---

## Root

```
.env                          — environment variables (DB connection, etc.)
.gitignore
biome.json                    — linter/formatter config
bun.lock
components.json               — shadcn/ui config
next.config.ts
next-env.d.ts
package.json
package-lock.json
postcss.config.mjs
prisma.config.ts              — Prisma generator output config
tsconfig.json
README.md
SCREENING_PLAN.md             — full implementation plan for Bayesian screening
SCREENING_PROGRESS.md         — step-by-step progress tracker
SCREENING_UI_SKELETON.md      — UI wireframes, component hierarchy, flow
PROJECT_STRUCTURE.md           — this file
```

## prisma/

```
schema.prisma                 — full DB schema (dimensions, instruments, items, loadings, overlaps, thresholds, screening sessions, users, doctors, patients)
seed.ts                       — main seed script (dimensions, correlations, base rates, condition-spectrum loadings)
seed-instruments.ts           — seeds instruments and items
seed-loadings.ts              — seeds item loadings
seed-noise.ts                 — seeds noise variance values
seed-overlaps.ts              — seeds item overlap pairs
seed-thresholds.ts            — seeds clinical thresholds
validate.ts                   — post-seed validation checks
```

## src/app/ — Next.js App Router (pages & API routes)

```
layout.tsx                    — root layout (fonts, Toaster)
page.tsx                      — home page
globals.css

sign-in/page.tsx              — sign-in page
sign-up/page.tsx              — sign-up page

patient/
  page.tsx                    — patient dashboard
  chat/page.tsx               — redirects to /patient/screening
  intake/page.tsx             — patient intake form (existing, non-screening)
  screening/
    page.tsx                  — screening entry: population selector, begin button
    intake/page.tsx           — phase 0: free-text intake, loading, transition
    chat/page.tsx             — phase 1&2: vertical chat with Likert/MCQ items, Q:/A: compression
    report/page.tsx           — phase 3: diagnostic report with flagged conditions, talking points

doctor/
  page.tsx                    — doctor dashboard
  patients/[patientId]/page.tsx — patient detail view
  therapy-session/page.tsx    — therapy session page

api/screening/
  start/route.ts              — POST: create new screening session
  [sessionId]/
    route.ts                  — GET: session state | POST: end session
    intake/route.ts           — POST: phase 0 free-text intake processing
    respond/route.ts          — POST: phase 1&2 response → Kalman → next question
    report/route.ts           — GET: phase 3 diagnostic profile + report
    followup/route.ts         — POST: phase 4 Q&A about report
```

## src/lib/screening/ — Bayesian screening engine

```
index.ts                      — barrel exports
config.ts                     — SCREENING_CONFIG (all tunable thresholds)
types.ts                      — ScreeningState, ReferenceData, RankedItem, DiagnosticProfile, etc.
state.ts                      — initState(), buildPriorCovariance()
update.ts                     — kalmanUpdate(), batchUpdate(), normalizeResponse()
selection.ts                  — rankItems(), computeRuntimeNoise()
transition.ts                 — checkStageOneTermination(), transitionToStageTwo(), eigenvalues()
diagnosis.ts                  — computeProbability(), classifyCondition(), checkStageTwoTermination(), generateDiagnosticProfile()
loadData.ts                   — Prisma loaders: loadSpectra(), loadItems(), loadFullReferenceData(), etc.
persistence.ts                — createSession(), saveResponse(), updateSessionState(), endSession(), saveDiagnoses(), getSession(), loadSessionState(), listPatientSessions()

llm/
  index.ts                    — barrel exports
  types.ts                    — Message, ToolCall, LLMResponse, ReportResponse, etc.
  client.ts                   — callScreeningLLM(), callReportLLM() (delegates to placeholder, swap for real LLM here)
  screening.ts                — SCREENING_SYSTEM_PROMPT, SCREENING_TOOLS, placeholderScreeningLLM()
  report.ts                   — REPORT_SYSTEM_PROMPT, placeholderReportLLM()
```

## src/lib/ — shared utilities

```
prisma.ts                     — PrismaClient singleton (PrismaPg adapter)
constants.ts
utils.ts                      — shadcn cn() utility
supabase/
  client.ts                   — Supabase browser client
  server.ts                   — Supabase server client
  proxy.ts
```

## src/actions/ — server actions

```
patient.ts
profile.ts
sign-in.ts
sign-out.ts
sign-up.ts
```

## src/schemas/ — Zod validation schemas

```
chat.ts
intake.ts
profile.ts
role-lookup.ts
sign-in.ts
sign-up.ts
therapy.ts
```

## src/components/

```
site-nav.tsx                  — navigation bar
ui/                           — shadcn/ui components (badge, button, card, field, form, input, label, link-button, select, separator, sonner, spinner, textarea)
screening/
  screening-item.tsx          — interactive Likert scale / MCQ choice component
  message-thread.tsx          — chat message list with compression (Q:/A: pairs)
  progress-bar.tsx            — "Q X of ~25" progress indicator
```

## src/types/

```
server-action.ts              — server action result type
```

## generated/prisma/ — auto-generated Prisma client (do not edit)

Models, enums, browser/client entry points. Regenerated by `prisma generate`.
