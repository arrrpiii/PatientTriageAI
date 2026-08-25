// Guided demo controller: a scripted ~75 second tour that drives intake, the
// pipeline animation, the live queue, explainability, and a clinician override.
// Pages subscribe to the current step and perform their part; this module owns
// pacing, pause/resume/skip/restart, and presenter captions.

import { useSyncExternalStore } from 'react';

export type GuidedStepId =
  | 'intro'
  | 'intake-populate'
  | 'intake-review'
  | 'intake-submit'
  | 'queue-insert'
  | 'drawer-open'
  | 'highlight-signals'
  | 'override'
  | 'finish';

export type GuidedStep = { id: GuidedStepId; path: string; caption: string; ms: number };

export const GUIDED_STEPS: GuidedStep[] = [
  { id: 'intro', path: '/dashboard', ms: 5000, caption: 'Guided demo — the full loop in about a minute: intake, scoring, live queue, and a human override.' },
  { id: 'intake-populate', path: '/intake', ms: 8000, caption: 'A high-risk arrival is captured at the desk: chest pain, low oxygen saturation, cardiac history.' },
  { id: 'intake-review', path: '/intake', ms: 7000, caption: 'The review stage surfaces missing signals before submission — nothing is hidden from the nurse.' },
  { id: 'intake-submit', path: '/intake', ms: 9000, caption: 'Submission runs the five-stage pipeline: capture, secure ingestion, parallel inference, late fusion, clinician review.' },
  { id: 'queue-insert', path: '/dashboard', ms: 8000, caption: 'The patient enters the live queue and moves to a high-priority position, ranked by acuity then waiting time.' },
  { id: 'drawer-open', path: '/dashboard', ms: 8000, caption: 'Opening the case: separate simulated text-model and vitals-model scores fuse into one explainable suggestion.' },
  { id: 'highlight-signals', path: '/dashboard', ms: 8000, caption: 'Top contributing signals are listed in plain language — and missing data is called out honestly.' },
  { id: 'override', path: '/dashboard', ms: 10000, caption: 'A clinician disagrees and overrides the level with a documented reason. The audit trail records everything.' },
  { id: 'finish', path: '/dashboard', ms: 0, caption: 'Demo complete. Every score stayed explainable — and every decision stayed clinician-owned.' },
];

type GuidedState = {
  active: boolean;
  paused: boolean;
  stepIndex: number;
  demoPatientId: string | null;
};

let state: GuidedState = { active: false, paused: false, stepIndex: 0, demoPatientId: null };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
// Wall-clock pacing (not tick counting) so throttled background tabs stay on schedule.
let deadline = 0;
let remainingOnPause = 0;

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(patch: Partial<GuidedState>) {
  state = { ...state, ...patch };
  emit();
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

function armStep(index: number) {
  stopTimer();
  const step = GUIDED_STEPS[index];
  setState({ stepIndex: index });
  if (!step || step.ms === 0) return;
  deadline = Date.now() + step.ms;
  timer = setInterval(() => {
    if (state.paused || !state.active) return;
    if (Date.now() >= deadline) guided.next();
  }, 250);
}

export const guided = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,
  currentStep: (): GuidedStep | null => (state.active ? GUIDED_STEPS[state.stepIndex] ?? null : null),

  start() {
    setState({ active: true, paused: false, demoPatientId: null });
    armStep(0);
  },
  pause() {
    remainingOnPause = Math.max(0, deadline - Date.now());
    setState({ paused: true });
  },
  resume() {
    deadline = Date.now() + remainingOnPause;
    setState({ paused: false });
  },
  next() {
    if (!state.active) return;
    const nextIndex = Math.min(state.stepIndex + 1, GUIDED_STEPS.length - 1);
    armStep(nextIndex);
  },
  restart() {
    guided.start();
  },
  exit() {
    stopTimer();
    setState({ active: false, paused: false, stepIndex: 0, demoPatientId: null });
  },
  setDemoPatientId(id: string) {
    setState({ demoPatientId: id });
  },
};

export function useGuided(): GuidedState {
  return useSyncExternalStore(guided.subscribe, guided.getSnapshot);
}
