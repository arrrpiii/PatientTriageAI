// Deterministic local triage simulation engine.
// Everything here is fictional decision support for a hackathon demo — never a diagnosis.

export type TriageLevel = 'Level 1' | 'Level 2' | 'Level 3' | 'Level 4' | 'Level 5';

export type LogEntry = { time: string; event: string; detail: string };

export type Patient = {
  id: string;
  name: string;
  initials: string;
  age: number | null;
  sex: string;
  arrivalMethod: string;
  arrivalTime: string;
  waitMinutes: number;
  heartRate: number | null;
  bloodPressure: string;
  respiratoryRate: number | null;
  temperature: number | null;
  oxygenSaturation: number | null;
  consciousness: string;
  complaint: string;
  notes: string;
  painScore: number | null;
  riskFactors: string[];
  triageLevel: TriageLevel;
  aiConfidence: number;
  textScore: number;
  vitalsScore: number;
  fusionScore: number;
  reasons: string[];
  protectiveSignals: string[];
  missingInfo: string[];
  reviewStatus: string;
  deteriorating: boolean;
  newlyArrived: boolean;
  processingSeconds: number;
  history: LogEntry[];
  auditLog: LogEntry[];
  clinicianLevel?: TriageLevel;
  overrideReason?: string;
};

export const LEVELS: { value: TriageLevel; label: string; color: string; short: string }[] = [
  { value: 'Level 1', label: 'Immediate', color: '#d9554c', short: 'L1' },
  { value: 'Level 2', label: 'Emergent', color: '#df8a31', short: 'L2' },
  { value: 'Level 3', label: 'Urgent', color: '#c4a238', short: 'L3' },
  { value: 'Level 4', label: 'Less Urgent', color: '#39968a', short: 'L4' },
  { value: 'Level 5', label: 'Non-Urgent', color: '#5c7c99', short: 'L5' },
];

export const levelMeta = (level: TriageLevel) => LEVELS.find((item) => item.value === level) ?? LEVELS[2];
export const levelRank = (level: TriageLevel) => Number(levelMeta(level).short.slice(1));
export const effectiveLevel = (patient: Patient): TriageLevel => patient.clinicianLevel ?? patient.triageLevel;

export const nowLabel = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
export const nowShort = () => nowLabel().slice(0, 5);

export type ScoreResult = Pick<
  Patient,
  | 'triageLevel'
  | 'aiConfidence'
  | 'textScore'
  | 'vitalsScore'
  | 'fusionScore'
  | 'reasons'
  | 'protectiveSignals'
  | 'missingInfo'
  | 'reviewStatus'
>;

const CRITICAL_WORDS = [
  'chest pain', 'stroke', 'facial droop', 'slurred speech', 'unresponsive', 'severe bleeding',
  'difficulty breathing', 'seizure', 'anaphylaxis', 'not breathing',
];
const URGENT_WORDS = [
  'shortness', 'breath', 'abdominal pain', 'fracture', 'fever', 'confusion', 'syncope',
  'head injury', 'allergic', 'reaction', 'weakness',
];

// Deterministic scoring: complaint keywords + risk factors feed the simulated text model,
// abnormal vitals feed the simulated vitals model, and late fusion combines them with
// missing-data penalties and waiting-time escalation.
export function scorePatient(input: Partial<Patient>): ScoreResult {
  const complaint = (input.complaint ?? '').toLowerCase();
  const risks = (input.riskFactors ?? []).join(' ').toLowerCase();
  const danger = CRITICAL_WORDS.some((word) => complaint.includes(word));
  const urgent = URGENT_WORDS.some((word) => complaint.includes(word));
  const reasons: string[] = [];
  const protective: string[] = [];
  const missing: string[] = [];
  let text = danger ? 92 : urgent ? 66 : 34;
  let vitals = 30;
  const hr = input.heartRate ?? null;
  const rr = input.respiratoryRate ?? null;
  const spo2 = input.oxygenSaturation ?? null;
  const temp = input.temperature ?? null;
  const pain = input.painScore ?? null;
  const age = input.age ?? null;

  if (danger) reasons.push('High-acuity complaint keywords detected');
  if (input.consciousness && input.consciousness !== 'Alert') {
    text += 12;
    reasons.push('Altered consciousness documented');
  } else if (input.consciousness) {
    protective.push('Alert on arrival');
  }
  if (pain !== null && pain >= 7) { text += 10; reasons.push(`Pain score ${pain}/10 reported`); }
  else if (pain !== null && pain >= 4) { text += 5; reasons.push(`Pain score ${pain}/10 reported`); }
  else if (pain !== null && pain <= 1) protective.push('Minimal reported pain');

  if (hr !== null && (hr > 120 || hr < 45)) { vitals += 30; reasons.push(`Heart rate ${hr} bpm outside expected range`); }
  if (rr !== null && rr > 24) { vitals += 24; reasons.push(`Respiratory rate ${rr}/min elevated`); }
  if (spo2 !== null && spo2 < 94) { vitals += 34; reasons.push(`Oxygen saturation ${spo2}% below threshold`); }
  if (temp !== null && (temp > 39 || temp < 35)) { vitals += 15; reasons.push(`Temperature ${temp}°C flagged`); }
  if (input.bloodPressure && /^[0-8]\d\/|^1[6-9]\d\/|\/1[1-9]\d/.test(input.bloodPressure)) {
    vitals += 14;
    reasons.push('Blood pressure needs clinician review');
  }
  if (hr !== null && rr !== null && spo2 !== null && vitals <= 32) protective.push('Vitals within expected range');

  if (risks.includes('pregnan') || risks.includes('anticoag') || risks.includes('immun') || risks.includes('cardiac')) {
    text += 14;
    reasons.push('Risk factor increases acuity signal');
  }
  if (age !== null && (age < 2 || age > 75)) { text += 8; reasons.push('Age band adds uncertainty'); }

  if (age === null) missing.push('Age');
  if (hr === null) missing.push('Heart rate');
  if (!input.bloodPressure) missing.push('Blood pressure');
  if (spo2 === null) missing.push('Oxygen saturation');
  if (!input.consciousness) missing.push('Consciousness');
  if (!input.complaint?.trim()) missing.push('Chief complaint');
  if (pain === null) missing.push('Pain score');

  const penalty = Math.min(missing.length * 8, 24);

  // Waiting-time escalation: long waits deterministically raise the fusion score so
  // stable-but-waiting patients are not silently parked forever.
  const wait = input.waitMinutes ?? 0;
  const waitBoost = Math.min(14, Math.floor(Math.max(0, wait - 40) / 30) * 5);
  if (waitBoost > 0) reasons.push(`Waiting ${wait}m — time escalation applied (+${waitBoost})`);

  // Contradiction safeguard: an alarming narrative with fully reassuring vitals means the
  // record needs a human, not a confident number.
  const contradictory = danger && vitals <= 32 && (input.consciousness ?? 'Alert') === 'Alert';
  if (contradictory) reasons.push('Narrative and vitals disagree — verify at bedside');

  const fusion = Math.max(
    1,
    Math.min(99, Math.round(text * 0.48 + Math.min(100, vitals) * 0.52 - penalty + waitBoost)),
  );
  if (missing.length) reasons.push(`${missing.length} required signal${missing.length > 1 ? 's' : ''} missing`);
  if (!reasons.length) reasons.push('Stable initial signal profile');

  const level: TriageLevel =
    fusion >= 83 ? 'Level 1' : fusion >= 68 ? 'Level 2' : fusion >= 49 ? 'Level 3' : fusion >= 29 ? 'Level 4' : 'Level 5';
  const confidence = Math.max(
    52,
    Math.min(98, 96 - missing.length * 9 - (input.notes?.length ? 0 : 4) - (contradictory ? 10 : 0)),
  );
  const reviewStatus =
    missing.length > 1 || contradictory ? 'Needs clinician review' : 'Pending review';
  return {
    triageLevel: level,
    aiConfidence: confidence,
    textScore: Math.min(text, 99),
    vitalsScore: Math.min(vitals, 99),
    fusionScore: fusion,
    reasons,
    protectiveSignals: protective,
    missingInfo: missing,
    reviewStatus,
  };
}

// Re-run the engine over an existing record while preserving the clinician's authority:
// an override, its reason, and its audit trail always survive a rescore.
export function rescore(patient: Patient): Patient {
  const scored = scorePatient(patient);
  const next: Patient = { ...patient, ...scored };
  if (patient.clinicianLevel) {
    next.reviewStatus = 'Clinician override';
  }
  if (patient.waitMinutes > 10) next.newlyArrived = false;
  return next;
}

const initialsOf = (name: string) =>
  name.split(' ').map((part) => part[0] ?? '').join('').slice(0, 2).toUpperCase() || '??';

type SeedInput = Omit<
  Patient,
  | 'initials' | 'triageLevel' | 'aiConfidence' | 'textScore' | 'vitalsScore' | 'fusionScore'
  | 'reasons' | 'protectiveSignals' | 'missingInfo' | 'reviewStatus' | 'auditLog'
>;

const seed = (input: SeedInput): Patient =>
  rescore({
    ...input,
    initials: initialsOf(input.name),
    auditLog: [],
    ...scorePatient(input),
  } as Patient);

// 12 fictional seeded records covering the demo scenarios: chest pain with concerning
// vitals, severe breathing difficulty, possible stroke, fever with confusion, stable
// fracture, abdominal pain, minor laceration, migraine, medication reaction, and
// low-acuity follow-ups. All scores below are computed by the engine at load time,
// so seed data and engine can never disagree.
export const seedPatients: Patient[] = [
  seed({ id: 'ED-24091', name: 'Mara Ellison', age: 67, sex: 'Female', arrivalMethod: 'EMS', arrivalTime: '08:41', waitMinutes: 4, heartRate: 128, bloodPressure: '168/96', respiratoryRate: 29, temperature: 37.1, oxygenSaturation: 91, consciousness: 'Confused', complaint: 'Sudden difficulty breathing and chest pain', notes: 'Cool, pale, speaking in short phrases.', painScore: 8, riskFactors: ['Anticoagulant', 'Cardiac history'], deteriorating: true, newlyArrived: true, processingSeconds: 14, history: [{ time: '08:41', event: 'Arrived via EMS', detail: 'Priority handoff received' }, { time: '08:44', event: 'Triage captured', detail: 'High-acuity signals detected' }] }),
  seed({ id: 'ED-24090', name: 'Odette Laurent', age: 71, sex: 'Female', arrivalMethod: 'EMS', arrivalTime: '08:27', waitMinutes: 18, heartRate: 96, bloodPressure: '176/98', respiratoryRate: 20, temperature: 36.8, oxygenSaturation: 96, consciousness: 'Confused', complaint: 'Possible stroke — facial droop and slurred speech since breakfast', notes: 'Right-side weakness observed by family. Onset under one hour.', painScore: 2, riskFactors: ['Hypertension', 'Anticoagulant'], deteriorating: false, newlyArrived: true, processingSeconds: 16, history: [{ time: '08:27', event: 'Arrived via EMS', detail: 'Stroke pathway pre-alert' }] }),
  seed({ id: 'ED-24088', name: 'Theo McKay', age: 34, sex: 'Male', arrivalMethod: 'Walk-in', arrivalTime: '08:12', waitMinutes: 33, heartRate: 116, bloodPressure: '142/88', respiratoryRate: 23, temperature: 38.8, oxygenSaturation: 95, consciousness: 'Alert', complaint: 'Fever, confusion, and worsening shortness of breath', notes: 'Partner reports symptoms since overnight.', painScore: 6, riskFactors: ['Immunocompromised'], deteriorating: true, newlyArrived: false, processingSeconds: 21, history: [{ time: '08:12', event: 'Arrived walk-in', detail: 'Registration complete' }] }),
  seed({ id: 'ED-24086', name: 'Asha Patel', age: 22, sex: 'Female', arrivalMethod: 'Walk-in', arrivalTime: '07:58', waitMinutes: 47, heartRate: 104, bloodPressure: '118/74', respiratoryRate: 21, temperature: 37.4, oxygenSaturation: 98, consciousness: 'Alert', complaint: 'Right lower abdominal pain with nausea', notes: 'Pain increased over six hours.', painScore: 7, riskFactors: [], deteriorating: false, newlyArrived: false, processingSeconds: 17, history: [{ time: '07:58', event: 'Arrived walk-in', detail: 'Registration complete' }] }),
  seed({ id: 'ED-24084', name: 'Jon Bell', age: 51, sex: 'Male', arrivalMethod: 'Walk-in', arrivalTime: '07:36', waitMinutes: 69, heartRate: 88, bloodPressure: '132/82', respiratoryRate: 18, temperature: 36.9, oxygenSaturation: 97, consciousness: 'Alert', complaint: 'Deep laceration to left hand', notes: 'Bleeding controlled with pressure dressing.', painScore: 5, riskFactors: ['Diabetes'], deteriorating: false, newlyArrived: false, processingSeconds: 15, history: [{ time: '07:36', event: 'Arrived walk-in', detail: 'Registration complete' }] }),
  seed({ id: 'ED-24082', name: 'Lena Ortiz', age: 29, sex: 'Female', arrivalMethod: 'Walk-in', arrivalTime: '07:24', waitMinutes: 81, heartRate: 92, bloodPressure: '110/72', respiratoryRate: 18, temperature: 37.8, oxygenSaturation: 99, consciousness: 'Alert', complaint: 'Persistent migraine with light sensitivity', notes: 'No recent head injury reported.', painScore: 6, riskFactors: [], deteriorating: false, newlyArrived: false, processingSeconds: 19, history: [{ time: '07:24', event: 'Arrived walk-in', detail: 'Registration complete' }] }),
  seed({ id: 'ED-24080', name: 'Caleb Wong', age: 76, sex: 'Male', arrivalMethod: 'Family', arrivalTime: '07:18', waitMinutes: 87, heartRate: 82, bloodPressure: '146/80', respiratoryRate: 17, temperature: 36.6, oxygenSaturation: 96, consciousness: 'Alert', complaint: 'Fall at home, suspected hip fracture', notes: 'Unable to bear weight; no loss of consciousness noted. Vitals stable.', painScore: 8, riskFactors: ['Fall risk'], deteriorating: false, newlyArrived: false, processingSeconds: 18, history: [{ time: '07:18', event: 'Arrived with family', detail: 'Registration complete' }] }),
  seed({ id: 'ED-24077', name: 'Nia Carter', age: 41, sex: 'Female', arrivalMethod: 'Walk-in', arrivalTime: '06:52', waitMinutes: 113, heartRate: 78, bloodPressure: '124/76', respiratoryRate: 16, temperature: 36.8, oxygenSaturation: 99, consciousness: 'Alert', complaint: 'Urinary discomfort and low-grade fever', notes: 'Symptoms for two days.', painScore: 3, riskFactors: [], deteriorating: false, newlyArrived: false, processingSeconds: 13, history: [{ time: '06:52', event: 'Arrived walk-in', detail: 'Registration complete' }] }),
  seed({ id: 'ED-24073', name: 'Ravi Shah', age: 45, sex: 'Male', arrivalMethod: 'Walk-in', arrivalTime: '06:44', waitMinutes: 121, heartRate: 74, bloodPressure: '128/78', respiratoryRate: 16, temperature: 36.5, oxygenSaturation: 98, consciousness: 'Alert', complaint: 'Skin reaction after starting new medication', notes: 'Itching and localized rash. No breathing changes reported.', painScore: 2, riskFactors: [], deteriorating: false, newlyArrived: false, processingSeconds: 12, history: [{ time: '06:44', event: 'Arrived walk-in', detail: 'Registration complete' }] }),
  seed({ id: 'ED-24069', name: 'Ivy Brooks', age: 8, sex: 'Female', arrivalMethod: 'Family', arrivalTime: '06:31', waitMinutes: 134, heartRate: 108, bloodPressure: '106/68', respiratoryRate: 20, temperature: 38.1, oxygenSaturation: 98, consciousness: 'Alert', complaint: 'Sore throat and fever', notes: 'Taking fluids.', painScore: 4, riskFactors: [], deteriorating: false, newlyArrived: false, processingSeconds: 22, history: [{ time: '06:31', event: 'Arrived with family', detail: 'Registration complete' }] }),
  seed({ id: 'ED-24064', name: 'Samir Cole', age: 38, sex: 'Male', arrivalMethod: 'Walk-in', arrivalTime: '06:08', waitMinutes: 157, heartRate: 72, bloodPressure: '120/76', respiratoryRate: 15, temperature: 36.7, oxygenSaturation: 99, consciousness: 'Alert', complaint: 'Medication refill request from last visit', notes: 'No acute symptoms stated.', painScore: 0, riskFactors: [], deteriorating: false, newlyArrived: false, processingSeconds: 11, history: [{ time: '06:08', event: 'Arrived walk-in', detail: 'Registration complete' }] }),
  seed({ id: 'ED-24061', name: 'June Park', age: 63, sex: 'Female', arrivalMethod: 'Walk-in', arrivalTime: '05:53', waitMinutes: 172, heartRate: 80, bloodPressure: '134/84', respiratoryRate: 17, temperature: 36.4, oxygenSaturation: 97, consciousness: 'Alert', complaint: 'Bruised ankle after twist', notes: 'Walking with a limp.', painScore: 4, riskFactors: [], deteriorating: false, newlyArrived: false, processingSeconds: 13, history: [{ time: '05:53', event: 'Arrived walk-in', detail: 'Registration complete' }] }),
];

// Persist the ID sequence so page reloads can never mint a duplicate patient ID.
const ID_SEQ_KEY = 'patient-triage-id-seq';
export const nextPatientId = () => {
  let seq = Number(localStorage.getItem(ID_SEQ_KEY)) || 0;
  if (!seq) {
    try {
      const saved: { id?: string }[] = JSON.parse(localStorage.getItem('patient-triage-patients') ?? '[]');
      seq = Math.max(24099, ...saved.map((patient) => Number(String(patient.id ?? '').replace(/\D/g, '')) || 0)) + 1;
    } catch {
      seq = 24100;
    }
  }
  localStorage.setItem(ID_SEQ_KEY, String(seq + 1));
  return `ED-${seq}`;
};

export type IntakeData = {
  name: string;
  id?: string;
  age: number | null;
  sex: string;
  arrivalMethod: string;
  heartRate: number | null;
  bloodPressure: string;
  respiratoryRate: number | null;
  temperature: number | null;
  oxygenSaturation: number | null;
  consciousness: string;
  complaint: string;
  notes: string;
  painScore: number | null;
  riskFactors: string[];
  processingSeconds?: number;
};

export function makePatient(data: IntakeData): Patient {
  const base: Patient = {
    id: data.id?.trim() || nextPatientId(),
    name: data.name.trim() || 'Unnamed patient',
    initials: initialsOf(data.name.trim() || 'Unnamed patient'),
    age: data.age,
    sex: data.sex,
    arrivalMethod: data.arrivalMethod,
    arrivalTime: nowShort(),
    waitMinutes: 0,
    heartRate: data.heartRate,
    bloodPressure: data.bloodPressure.trim(),
    respiratoryRate: data.respiratoryRate,
    temperature: data.temperature,
    oxygenSaturation: data.oxygenSaturation,
    consciousness: data.consciousness,
    complaint: data.complaint.trim(),
    notes: data.notes.trim(),
    painScore: data.painScore,
    riskFactors: data.riskFactors,
    triageLevel: 'Level 3',
    aiConfidence: 0,
    textScore: 0,
    vitalsScore: 0,
    fusionScore: 0,
    reasons: [],
    protectiveSignals: [],
    missingInfo: [],
    reviewStatus: 'Pending review',
    deteriorating: false,
    newlyArrived: true,
    processingSeconds: data.processingSeconds ?? 0,
    history: [{ time: nowShort(), event: 'Intake captured', detail: 'Saved to demo queue' }],
    auditLog: [],
  };
  return { ...base, ...scorePatient(base) };
}

// Primary sort is effective acuity (clinician override wins), secondary is waiting time.
export function sortPatients(patients: Patient[]): Patient[] {
  return [...patients].sort((a, b) => {
    const rank = levelRank(effectiveLevel(a)) - levelRank(effectiveLevel(b));
    return rank !== 0 ? rank : b.waitMinutes - a.waitMinutes;
  });
}

export const queuePosition = (patients: Patient[], id: string) =>
  sortPatients(patients).findIndex((patient) => patient.id === id) + 1;

// Rotating pool of fictional arrivals for the "simulate arrival" controls.
const ARRIVAL_POOL: Omit<IntakeData, 'id'>[] = [
  { name: 'Elena Marsh', age: 58, sex: 'Female', arrivalMethod: 'EMS', heartRate: 124, bloodPressure: '150/94', respiratoryRate: 26, temperature: 37.0, oxygenSaturation: 92, consciousness: 'Alert', complaint: 'Crushing chest pain radiating to left arm', notes: 'Diaphoretic on arrival.', painScore: 9, riskFactors: ['Cardiac history'], processingSeconds: 15 },
  { name: 'Milo Andersen', age: 6, sex: 'Male', arrivalMethod: 'Family', heartRate: 132, bloodPressure: '100/64', respiratoryRate: 30, temperature: 38.4, oxygenSaturation: 93, consciousness: 'Alert', complaint: 'Severe difficulty breathing after playground visit', notes: 'Audible wheeze, known asthma.', painScore: 3, riskFactors: [], processingSeconds: 14 },
  { name: 'Priya Nair', age: 49, sex: 'Female', arrivalMethod: 'Walk-in', heartRate: 98, bloodPressure: '128/80', respiratoryRate: 18, temperature: 37.1, oxygenSaturation: 98, consciousness: 'Alert', complaint: 'Allergic reaction to new antibiotic — spreading hives', notes: 'No airway involvement reported.', painScore: 2, riskFactors: [], processingSeconds: 13 },
  { name: 'Harold Weiss', age: 82, sex: 'Male', arrivalMethod: 'EMS', heartRate: 88, bloodPressure: '168/92', respiratoryRate: 19, temperature: 36.7, oxygenSaturation: 95, consciousness: 'Responds to voice', complaint: 'Possible stroke — sudden slurred speech and weakness', notes: 'Symptom onset 40 minutes ago.', painScore: 1, riskFactors: ['Hypertension'], processingSeconds: 17 },
  { name: 'Dana Kowalski', age: 31, sex: 'Female', arrivalMethod: 'Walk-in', heartRate: 84, bloodPressure: '118/76', respiratoryRate: 16, temperature: 36.8, oxygenSaturation: 99, consciousness: 'Alert', complaint: 'Minor laceration on forearm from kitchen knife', notes: 'Bleeding stopped, wound clean.', painScore: 3, riskFactors: [], processingSeconds: 12 },
  { name: 'Omar Haddad', age: 27, sex: 'Male', arrivalMethod: 'Walk-in', heartRate: 90, bloodPressure: '122/78', respiratoryRate: 17, temperature: 36.9, oxygenSaturation: 99, consciousness: 'Alert', complaint: 'Twisted knee at football, suspected fracture, stable', notes: 'Swelling present, distal pulses intact.', painScore: 6, riskFactors: [], processingSeconds: 13 },
  { name: 'Greta Lindqvist', age: 74, sex: 'Female', arrivalMethod: 'Family', heartRate: 102, bloodPressure: '138/84', respiratoryRate: 22, temperature: 39.3, oxygenSaturation: 95, consciousness: 'Confused', complaint: 'High fever with new confusion since this morning', notes: 'Family reports reduced fluid intake.', painScore: 2, riskFactors: ['Immunocompromised'], processingSeconds: 16 },
  { name: 'Felix Duran', age: 36, sex: 'Male', arrivalMethod: 'Walk-in', heartRate: 76, bloodPressure: '120/74', respiratoryRate: 15, temperature: 36.6, oxygenSaturation: 99, consciousness: 'Alert', complaint: 'Follow-up concern about healing stitches', notes: 'No redness or discharge described.', painScore: 1, riskFactors: [], processingSeconds: 11 },
];

let arrivalCursor = 0;
export function nextArrival(): Patient {
  const template = ARRIVAL_POOL[arrivalCursor % ARRIVAL_POOL.length];
  arrivalCursor += 1;
  return makePatient({ ...template, id: nextPatientId() });
}

export const INTAKE_PRESETS = {
  emergency: {
    name: 'Nico Alvarez', id: 'DEMO-1042', age: '42', sex: 'Male', arrivalMethod: 'EMS',
    heartRate: '118', bloodPressure: '154/92', respiratoryRate: '26', temperature: '37.6',
    oxygenSaturation: '93', consciousness: 'Confused',
    complaint: 'Chest pain and difficulty breathing',
    notes: 'Demo emergency loaded. Patient is speaking in short phrases.',
    painScore: '7', riskFactors: 'Cardiac history',
  },
  moderate: {
    name: 'Sofia Reyes', id: 'DEMO-1043', age: '35', sex: 'Female', arrivalMethod: 'Walk-in',
    heartRate: '96', bloodPressure: '126/82', respiratoryRate: '18', temperature: '37.9',
    oxygenSaturation: '98', consciousness: 'Alert',
    complaint: 'Abdominal pain since last night with nausea',
    notes: 'Demo moderate case loaded. Ate normally yesterday, pain localized.',
    painScore: '5', riskFactors: '',
  },
} as const;

// ---------------------------------------------------------------------------
// Derived analytics — every number on the analytics page comes from these.
// ---------------------------------------------------------------------------

export const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

const REQUIRED_SIGNALS = 7;

export function deriveAnalytics(patients: Patient[]) {
  const total = patients.length;
  const distribution = LEVELS.map((level) => ({
    name: level.short,
    value: patients.filter((patient) => effectiveLevel(patient) === level.value).length,
    color: level.color,
  }));
  const aiDistribution = LEVELS.map((level) => ({
    name: level.short,
    ai: patients.filter((patient) => patient.triageLevel === level.value).length,
    clinician: patients.filter((patient) => effectiveLevel(patient) === level.value).length,
  }));
  const waitByLevel = LEVELS.map((level) => {
    const group = patients.filter((patient) => effectiveLevel(patient) === level.value);
    return {
      name: level.short,
      wait: group.length ? Math.round(group.reduce((sum, patient) => sum + patient.waitMinutes, 0) / group.length) : 0,
      count: group.length,
    };
  });
  const overrides = patients.filter((patient) => patient.clinicianLevel);
  const overrideRate = total ? Math.round((overrides.length / total) * 1000) / 10 : 0;
  const completeness = total
    ? Math.round(
        (patients.reduce((sum, patient) => sum + (REQUIRED_SIGNALS - Math.min(patient.missingInfo.length, REQUIRED_SIGNALS)), 0) /
          (total * REQUIRED_SIGNALS)) * 1000,
      ) / 10
    : 0;
  const deterioratingPatients = patients.filter((patient) => patient.deteriorating);
  const incomplete = patients.filter((patient) => patient.missingInfo.length > 0);
  const needsReview = patients.filter(
    (patient) => patient.reviewStatus === 'Needs clinician review' || patient.deteriorating,
  );
  const promoted = overrides.filter(
    (patient) => levelRank(patient.clinicianLevel as TriageLevel) < levelRank(patient.triageLevel),
  ).length;
  const demoted = overrides.filter(
    (patient) => levelRank(patient.clinicianLevel as TriageLevel) > levelRank(patient.triageLevel),
  ).length;
  const medianWait = median(patients.map((patient) => patient.waitMinutes));
  const medianProcessing = median(patients.map((patient) => patient.processingSeconds).filter((value) => value > 0));
  const alignment = total ? Math.round(((total - overrides.length) / total) * 100) : 100;
  const arrivalsByHour = patients.reduce<Record<string, number>>((acc, patient) => {
    const hour = `${patient.arrivalTime.slice(0, 2)}:00`;
    acc[hour] = (acc[hour] ?? 0) + 1;
    return acc;
  }, {});
  return {
    total,
    distribution,
    aiDistribution,
    waitByLevel,
    overrides,
    overrideRate,
    completeness,
    deterioratingPatients,
    incomplete,
    needsReview,
    promoted,
    demoted,
    medianWait,
    medianProcessing,
    alignment,
    arrivalsByHour: Object.entries(arrivalsByHour)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => ({ hour, count })),
  };
}

export type Analytics = ReturnType<typeof deriveAnalytics>;
