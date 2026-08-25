// Minimal CSV import for bulk nurse intake. No dependencies: a small
// quote-aware parser plus header aliasing, feeding rows through the same
// makePatient/scorePatient path as the manual form.

import { type Patient, makePatient } from '@/lib/triage';

// Handles quoted fields, escaped quotes ("") and newlines inside quotes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<string, string> = {
  name: 'name', patient: 'name', patientname: 'name', fullname: 'name',
  id: 'id', patientid: 'id',
  age: 'age', years: 'age',
  sex: 'sex', gender: 'sex',
  arrival: 'arrivalMethod', arrivalmethod: 'arrivalMethod', arrivedby: 'arrivalMethod',
  heartrate: 'heartRate', hr: 'heartRate', pulse: 'heartRate',
  bloodpressure: 'bloodPressure', bp: 'bloodPressure',
  respiratoryrate: 'respiratoryRate', rr: 'respiratoryRate', resprate: 'respiratoryRate',
  temperature: 'temperature', temp: 'temperature',
  oxygensaturation: 'oxygenSaturation', spo2: 'oxygenSaturation', oxygen: 'oxygenSaturation', o2sat: 'oxygenSaturation',
  consciousness: 'consciousness', avpu: 'consciousness',
  complaint: 'complaint', chiefcomplaint: 'complaint', presentingcomplaint: 'complaint',
  notes: 'notes', note: 'notes', clinicalnotes: 'notes',
  painscore: 'painScore', pain: 'painScore',
  riskfactors: 'riskFactors', risks: 'riskFactors', riskfactor: 'riskFactors',
};

const normalizeHeader = (header: string) => HEADER_ALIASES[header.toLowerCase().replace(/[^a-z0-9]/g, '')];

const num = (value: string | undefined): number | null => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

export const MAX_BULK_ROWS = 50;

export type BulkImportResult = {
  patients: Patient[];
  skipped: { row: number; reason: string }[];
  truncated: boolean;
};

export function importPatientsCsv(text: string, existingIds: Set<string>): BulkImportResult {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { patients: [], skipped: [{ row: 1, reason: 'Needs a header row plus at least one patient row' }], truncated: false };
  }
  const headers = rows[0].map(normalizeHeader);
  if (!headers.includes('name') || !headers.includes('complaint')) {
    return {
      patients: [],
      skipped: [{ row: 1, reason: 'Header row must include at least "name" and "complaint" columns' }],
      truncated: false,
    };
  }
  const dataRows = rows.slice(1);
  const truncated = dataRows.length > MAX_BULK_ROWS;
  const patients: Patient[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const seenIds = new Set(existingIds);

  dataRows.slice(0, MAX_BULK_ROWS).forEach((cells, index) => {
    const rowNumber = index + 2;
    const record: Record<string, string> = {};
    headers.forEach((key, column) => {
      if (key) record[key] = (cells[column] ?? '').trim();
    });
    if (!record.name) {
      skipped.push({ row: rowNumber, reason: 'Missing patient name' });
      return;
    }
    if (!record.complaint) {
      skipped.push({ row: rowNumber, reason: 'Missing chief complaint' });
      return;
    }
    const requestedId = record.id?.trim();
    let id: string | undefined = requestedId || undefined;
    if (id && seenIds.has(id)) {
      id = undefined; // collision → auto-generate instead of silently duplicating
    }
    const patient = makePatient({
      name: record.name,
      id,
      age: num(record.age),
      sex: record.sex ?? '',
      arrivalMethod: record.arrivalMethod || 'Walk-in',
      heartRate: num(record.heartRate),
      bloodPressure: record.bloodPressure ?? '',
      respiratoryRate: num(record.respiratoryRate),
      temperature: num(record.temperature),
      oxygenSaturation: num(record.oxygenSaturation),
      consciousness: record.consciousness || 'Alert',
      complaint: record.complaint,
      notes: record.notes ?? '',
      painScore: num(record.painScore),
      riskFactors: (record.riskFactors ?? '').split(/[;|]/).map((item) => item.trim()).filter(Boolean),
    });
    seenIds.add(patient.id);
    patients.push(patient);
  });

  return { patients, skipped, truncated };
}

export const CSV_TEMPLATE = [
  'name,age,sex,arrival,heart rate,blood pressure,respiratory rate,temperature,spo2,consciousness,complaint,notes,pain,risk factors',
  'Jordan Reyes,54,Male,EMS,122,158/94,27,37.2,92,Confused,"Crushing chest pain, short of breath","Diaphoretic on arrival",8,Cardiac history; Diabetes',
  'Amara Chen,7,Female,Family,118,102/66,26,38.9,95,Alert,High fever and wheezing,"Known asthma, using inhaler",4,',
  'Liam Novak,33,Male,Walk-in,84,124/78,16,36.8,99,Alert,Sprained wrist after cycling fall,Swelling present; pulses intact,3,',
].join('\n');
