# PatientTriage.ai

Team Eclipse's hackathon prototype: an explainable AI-assisted emergency-department
triage cockpit where nurses capture intake in under a minute, a deterministic local
engine produces transparent acuity suggestions, and clinicians review, override, and
own every decision. Frontend-only simulation — fictional data, no real models.

## Run & Operate

- `pnpm --filter @workspace/patient-triage run dev` — run the triage app (Vite; Replit provides PORT/BASE_PATH, local default is 5173)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000; currently unused template scaffolding)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: none for the triage app. `DATABASE_URL` only if the (unused) db package is ever wired up.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- App: Vite + React 19, wouter routing, Tailwind 4, Framer Motion, Recharts, lucide icons
- API scaffolding (unused by the app): Express 5, PostgreSQL + Drizzle, Zod, Orval

## Where things live

- `artifacts/patient-triage/` — the entire product. See its README for the module map.
  - `src/lib/triage.ts` — source of truth for the data model, scoring engine, and seeds
  - `src/lib/store.ts` — shared localStorage-backed queue store + simulation actions
  - `src/lib/guided.ts` — guided-demo step script and pacing controller
- `artifacts/api-server/`, `lib/db`, `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` —
  untouched workspace template scaffolding, kept for potential future backend work
- `artifacts/mockup-sandbox/` — Replit's internal component preview harness, not product code

## Architecture decisions

- Frontend-only by design: the hackathon spec forbids real databases/auth/AI services.
  Everything persists in localStorage and scores deterministically in `scorePatient`.
- Seed patients are **scored by the engine at module load**, never hand-written, so seed
  data and engine output cannot drift apart.
- Waiting-time escalation is a real engine input: a store "tick" advances waits by
  elapsed wall-clock minutes and rescores, so the queue reorders over time.
- The guided demo is a cross-page scripted tour driven by a module store; pages subscribe
  and perform their own step actions. Pacing uses wall-clock deadlines (not timer ticks)
  so background-tab throttling cannot stall it.
- Analytics are 100% derived from the live queue — no hard-coded metrics.
- `pnpm-workspace.yaml` intentionally does NOT exclude non-linux platform binaries
  (esbuild/rollup/etc.) so the repo builds on macOS/Windows dev machines, not only Replit.

## Gotchas

- Install with pnpm from the repo root only — package.json uses `catalog:` versions npm
  cannot resolve, and a preinstall hook rejects npm/yarn.
- `vite.config.ts` requires PORT/BASE_PATH on Replit but falls back to 5173 + `/` locally.
  Keep that fallback when editing.
- The simulated model panels must stay honestly labeled ("simulated BioClinicalBERT /
  XGBoost / late fusion — no real models run"); never present them as real inference.
- Clinician overrides must always survive a rescore (`rescore()` preserves
  clinicianLevel/reason and sets reviewStatus back to "Clinician override").

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Original build brief: `.conversation/attached_assets/`
