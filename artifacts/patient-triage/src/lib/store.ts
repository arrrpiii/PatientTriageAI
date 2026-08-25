// Shared patient queue store: a module singleton backed by localStorage so the
// sidebar, dashboard, intake, and analytics all observe the same live queue.

import { useSyncExternalStore } from 'react';
import {
  type Patient,
  type TriageLevel,
  nextArrival,
  nowShort,
  rescore,
  seedPatients,
} from '@/lib/triage';

const PATIENTS_KEY = 'patient-triage-patients';
const TICK_KEY = 'patient-triage-last-tick';
const ROLE_KEY = 'patient-triage-role';

export type Role = 'Clinician' | 'Nurse';

type Snapshot = { patients: Patient[]; role: Role };

const listeners = new Set<() => void>();

function loadPatients(): Patient[] {
  try {
    const saved = localStorage.getItem(PATIENTS_KEY);
    if (!saved) return seedPatients;
    const parsed = JSON.parse(saved) as Patient[];
    if (!Array.isArray(parsed) || !parsed.length) return seedPatients;
    // De-dupe by id defensively — duplicate keys break React list identity.
    const seen = new Set<string>();
    return parsed.filter((patient) => {
      if (seen.has(patient.id)) return false;
      seen.add(patient.id);
      return true;
    });
  } catch {
    return seedPatients;
  }
}

function loadRole(): Role {
  return localStorage.getItem(ROLE_KEY) === 'Nurse' ? 'Nurse' : 'Clinician';
}

let snapshot: Snapshot = { patients: loadPatients(), role: loadRole() };

function emit() {
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(snapshot.patients));
  listeners.forEach((listener) => listener());
}

function setPatients(next: Patient[]) {
  snapshot = { ...snapshot, patients: next };
  emit();
}

export const patientStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => snapshot,

  addPatient(patient: Patient) {
    setPatients([patient, ...snapshot.patients]);
  },

  applyOverride(id: string, level: TriageLevel, reason: string) {
    setPatients(
      snapshot.patients.map((patient) =>
        patient.id === id
          ? {
              ...patient,
              clinicianLevel: level,
              overrideReason: reason,
              reviewStatus: 'Clinician override',
              auditLog: [
                ...patient.auditLog,
                {
                  time: nowShort(),
                  event: 'Clinician override',
                  detail: `${patient.triageLevel} → ${level} · ${reason}`,
                },
              ],
            }
          : patient,
      ),
    );
  },

  undoOverride(id: string) {
    setPatients(
      snapshot.patients.map((patient) => {
        if (patient.id !== id || !patient.clinicianLevel) return patient;
        const { clinicianLevel: _level, overrideReason: _reason, ...rest } = patient;
        return rescore({
          ...rest,
          auditLog: [
            ...patient.auditLog,
            { time: nowShort(), event: 'Override undone', detail: `Restored AI suggestion ${patient.triageLevel}` },
          ],
        } as Patient);
      }),
    );
  },

  simulateArrivals(count: number): Patient[] {
    const arrivals = Array.from({ length: count }, () => nextArrival());
    setPatients([...arrivals, ...snapshot.patients]);
    return arrivals;
  },

  // Worsen a real patient's vitals so the engine (not a hard-coded flag) drives the
  // score change and queue movement.
  simulateDeterioration(): Patient | null {
    const target = snapshot.patients.find(
      (patient) => !patient.deteriorating && !patient.clinicianLevel && patient.fusionScore < 68,
    );
    if (!target) return null;
    let updated: Patient | null = null;
    setPatients(
      snapshot.patients.map((patient) => {
        if (patient.id !== target.id) return patient;
        updated = rescore({
          ...patient,
          heartRate: patient.heartRate !== null ? patient.heartRate + 28 : 126,
          respiratoryRate: patient.respiratoryRate !== null ? patient.respiratoryRate + 7 : 27,
          oxygenSaturation: patient.oxygenSaturation !== null ? Math.max(84, patient.oxygenSaturation - 5) : 92,
          deteriorating: true,
          newlyArrived: false,
          history: [
            ...patient.history,
            { time: nowShort(), event: 'Repeat observations', detail: 'Vitals worsening — record rescored' },
          ],
        });
        return updated;
      }),
    );
    return updated;
  },

  // Advance waiting times by real elapsed wall-clock minutes and rescore, so
  // waiting-time escalation visibly reorders the queue over a long-running demo.
  tick() {
    const now = Date.now();
    const last = Number(localStorage.getItem(TICK_KEY)) || now;
    const elapsed = Math.min(120, Math.floor((now - last) / 60000));
    if (elapsed < 1) {
      if (!localStorage.getItem(TICK_KEY)) localStorage.setItem(TICK_KEY, String(now));
      return;
    }
    localStorage.setItem(TICK_KEY, String(last + elapsed * 60000));
    setPatients(
      snapshot.patients.map((patient) =>
        rescore({ ...patient, waitMinutes: patient.waitMinutes + elapsed }),
      ),
    );
  },

  reset() {
    localStorage.removeItem('patient-triage-intake-draft');
    localStorage.setItem(TICK_KEY, String(Date.now()));
    setPatients(seedPatients);
  },

  setRole(role: Role) {
    localStorage.setItem(ROLE_KEY, role);
    snapshot = { ...snapshot, role };
    listeners.forEach((listener) => listener());
  },
};

export function usePatients(): Patient[] {
  return useSyncExternalStore(patientStore.subscribe, () => patientStore.getSnapshot().patients).slice();
}

export function useRole(): Role {
  return useSyncExternalStore(patientStore.subscribe, () => patientStore.getSnapshot().role);
}

// One-shot handoff used by intake's "open this patient in the command center".
let focusId: string | null = null;
export const setFocusPatient = (id: string) => {
  focusId = id;
};
export const takeFocusPatient = () => {
  const id = focusId;
  focusId = null;
  return id;
};
