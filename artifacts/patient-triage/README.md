# PatientTriage.ai

PatientTriage.ai is Team BitCrush's hackathon prototype for an explainable,
AI-assisted emergency-department triage cockpit. It is a frontend-only
simulation: all patients are fictional, all scoring runs locally in a
deterministic engine, and a clinician remains responsible for the final queue
decision. No real models, servers, or patient data are involved.

## Setup

This package lives in a pnpm workspace and uses pnpm-only `catalog:` versions,
so always install from the repository root with pnpm (npm will not work):

```bash
pnpm install
pnpm --filter @workspace/patient-triage run dev      # dev server (default port 5173)
pnpm --filter @workspace/patient-triage run build    # production build
pnpm --filter @workspace/patient-triage run typecheck
```

On Replit, `PORT` and `BASE_PATH` are provided by the environment; locally the
Vite config falls back to port 5173 and base `/`.

## Architecture

- `src/lib/triage.ts` — the deterministic scoring engine, patient data model,
  12 seeded scenario records, arrival pool, and derived-analytics helpers.
  Seed records are scored **by the engine at load time**, so seed data and
  engine output can never disagree. The engine scores complaint keywords, risk
  factors, abnormal vitals, age, consciousness, pain score, missing-data
  penalties, and waiting-time escalation, and flags contradictory records as
  “Needs clinician review”.
- `src/lib/store.ts` — a shared localStorage-backed queue store observed by
  every page (sidebar badge, dashboard, intake, analytics). Owns overrides
  with undo, simulated arrivals/deterioration, reset, the nurse/clinician
  role, and a wall-clock tick that advances waiting times and rescores so the
  queue reorders over a long-running demo.
- `src/lib/guided.ts` + `src/components/guided-overlay.tsx` — the scripted
  guided demo: nine steps with presenter captions and pause / resume / skip /
  restart / exit controls, paced by wall-clock deadlines so background-tab
  throttling cannot stall it.
- `src/pages/` — landing, intake (four-stage flow with autosave, inline range
  validation, demo presets, and the five-stage processing pipeline), the
  command-center dashboard, and analytics.
- `src/components/` — the patient detail drawer (honestly labeled simulated
  BioClinicalBERT / XGBoost / late-fusion panels, override + audit + undo),
  the architecture modal, and shared primitives.
- `localStorage` keys: `patient-triage-patients` (queue),
  `patient-triage-intake-draft` (autosave), `patient-triage-theme`,
  `patient-triage-role`, `patient-triage-last-tick`.

Every number on the analytics page is derived live from the queue — overrides,
arrivals, and waiting time visibly change it.

## 90-second presentation script

**0:00–0:10 — One click.** On the landing page press **Launch live demo**. The
guided tour drives everything that follows; you narrate over its captions.

**0:10–0:35 — Intake.** The tour opens nurse intake and loads a high-risk
arrival (chest pain, low SpO₂, cardiac history), shows the review stage
calling out data quality, then submits through the five-stage pipeline:
capture, secure ingestion, parallel inference, late fusion, clinician review.

**0:35–0:55 — The live queue.** The patient enters the command center and
ranks by acuity and waiting time. Point out the department status, the
deteriorating flags, and that waiting-time escalation is a real scoring input.

**0:55–1:15 — Explainability and the human gate.** The drawer opens itself:
separate simulated text-model and vitals-model scores, fused with reasons in
plain language. The tour then performs a clinician override with a documented
reason — show the toast, the audit trail, and Undo.

**1:15–1:30 — Close with trust.** Exit the tour, open **Architecture**, and
finish on **Analytics**: “Every number here is derived from the queue you just
watched. Nothing is hard-coded, and nothing outranks the clinician.”

Do not use this interface for real clinical decisions.
