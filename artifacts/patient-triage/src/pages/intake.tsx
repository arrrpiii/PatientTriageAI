import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle, ArrowRight, Check, ChevronLeft, ChevronRight, CircleHelp, FileClock,
  ShieldCheck, Zap,
} from 'lucide-react';
import { useLocation } from 'wouter';
import {
  INTAKE_PRESETS, type Patient, makePatient, queuePosition,
} from '@/lib/triage';
import { patientStore, setFocusPatient, usePatients } from '@/lib/store';
import { guided, useGuided } from '@/lib/guided';
import { Button, DemoNotice, LevelBadge, SectionHeading, Tip } from '@/components/primitives';

const EMPTY_FORM = {
  name: '', id: '', age: '', sex: '', arrivalMethod: 'Walk-in', heartRate: '', bloodPressure: '',
  respiratoryRate: '', temperature: '', oxygenSaturation: '', consciousness: 'Alert',
  complaint: '', notes: '', painScore: '', riskFactors: '',
};
type FormState = typeof EMPTY_FORM;

const DRAFT_KEY = 'patient-triage-intake-draft';

// Sensible plausibility ranges for inline validation warnings.
const RANGES: Partial<Record<keyof FormState, { min: number; max: number; unit: string }>> = {
  age: { min: 0, max: 120, unit: 'years' },
  heartRate: { min: 20, max: 250, unit: 'bpm' },
  respiratoryRate: { min: 4, max: 60, unit: '/min' },
  temperature: { min: 30, max: 43, unit: '°C' },
  oxygenSaturation: { min: 50, max: 100, unit: '%' },
  painScore: { min: 0, max: 10, unit: '/10' },
};

const parseNum = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
};

const PIPELINE_STAGES = [
  { title: 'Patient arrival & data capture', detail: 'Intake form normalized into a structured record' },
  { title: 'Secure ingestion & persistence', detail: 'Saved to the local demo store — nothing leaves this browser' },
  { title: 'Parallel AI inference', detail: 'Simulated text model and vitals model score independently' },
  { title: 'Late fusion & explainability', detail: 'Scores fuse with missing-data penalties; reasons attached' },
  { title: 'Clinician review & override', detail: 'Queued for a human decision — AI never has the last word' },
];

const STAGE_MS = 750;

export function Intake() {
  const [, setLocation] = useLocation();
  const patients = usePatients();
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(0);
  const [submitted, setSubmitted] = useState<Patient | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guidedState = useGuided();

  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        setForm({ ...EMPTY_FORM, ...JSON.parse(draft) });
        setSaved(true);
      } catch {
        /* ignore malformed local demo draft */
      }
    }
  }, []);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      setSaved(false);
      if (draftTimer.current) clearTimeout(draftTimer.current);
      draftTimer.current = setTimeout(() => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
        setSaved(true);
      }, 450);
      return next;
    });
  };

  const missing = useMemo(
    () =>
      [
        !form.name.trim() && 'Patient name',
        !form.age.trim() && 'Age',
        !form.complaint.trim() && 'Chief complaint',
        !form.heartRate.trim() && 'Heart rate',
        !form.bloodPressure.trim() && 'Blood pressure',
        !form.oxygenSaturation.trim() && 'Oxygen saturation',
        !form.painScore.trim() && 'Pain score',
      ].filter(Boolean) as string[],
    [form],
  );

  const rangeIssue = (key: keyof FormState): string | null => {
    const range = RANGES[key];
    const value = parseNum(form[key]);
    if (!range || value === null) return null;
    if (value < range.min || value > range.max) {
      return `Outside plausible range (${range.min}–${range.max} ${range.unit})`;
    }
    return null;
  };
  const rangeIssues = (Object.keys(RANGES) as (keyof FormState)[]).filter((key) => rangeIssue(key));

  const loadPreset = (preset: keyof typeof INTAKE_PRESETS) => {
    setForm({ ...EMPTY_FORM, ...INTAKE_PRESETS[preset] });
    setSaved(false);
  };

  const submit = () => {
    if (processing || submitted) return;
    const requestedId = form.id.trim();
    const idTaken = requestedId && patientStore.getSnapshot().patients.some((patient) => patient.id === requestedId);
    const startedAt = performance.now();
    setProcessing(true);
    setPipelineStage(0);
    PIPELINE_STAGES.forEach((_, index) => {
      setTimeout(() => setPipelineStage(index + 1), (index + 1) * STAGE_MS);
    });
    setTimeout(() => {
      const patient = makePatient({
        name: form.name,
        id: idTaken ? undefined : requestedId || undefined,
        age: parseNum(form.age),
        sex: form.sex,
        arrivalMethod: form.arrivalMethod,
        heartRate: parseNum(form.heartRate),
        bloodPressure: form.bloodPressure,
        respiratoryRate: parseNum(form.respiratoryRate),
        temperature: parseNum(form.temperature),
        oxygenSaturation: parseNum(form.oxygenSaturation),
        consciousness: form.consciousness,
        complaint: form.complaint,
        notes: form.notes,
        painScore: parseNum(form.painScore),
        riskFactors: form.riskFactors.split(',').map((item) => item.trim()).filter(Boolean),
        processingSeconds: Math.max(1, Math.round((performance.now() - startedAt) / 1000) + 11),
      });
      patientStore.addPatient(patient);
      localStorage.removeItem(DRAFT_KEY);
      setProcessing(false);
      setSubmitted(patient);
      if (guided.getSnapshot().active) guided.setDemoPatientId(patient.id);
    }, PIPELINE_STAGES.length * STAGE_MS + 400);
  };
  const submitRef = useRef(submit);
  submitRef.current = submit;

  // Guided demo participation: populate, jump to review, then submit.
  useEffect(() => {
    if (!guidedState.active) return;
    const stepId = guided.currentStep()?.id;
    if (stepId === 'intake-populate') {
      setSubmitted(null);
      setProcessing(false);
      setForm({ ...EMPTY_FORM, ...INTAKE_PRESETS.emergency, id: '' });
      setStep(1);
    }
    if (stepId === 'intake-review') setStep(3);
    if (stepId === 'intake-submit') submitRef.current();
  }, [guidedState.active, guidedState.stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setSubmitted(null);
    setStep(0);
    setForm(EMPTY_FORM);
  };

  if (submitted) {
    const position = queuePosition(patients, submitted.id) || 1;
    return (
      <div className="mx-auto max-w-3xl py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-md)] md:p-10"
        >
          <div className="mb-6 flex h-14 w-14 items-center justify-center bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]">
            <Check size={28} aria-hidden />
          </div>
          <div className="eyebrow mb-3 text-[hsl(var(--primary))]">Intake accepted · {submitted.id}</div>
          <h1 className="text-3xl font-bold tracking-tight">Added to the review queue.</h1>
          <p className="mt-3 text-[hsl(var(--muted-foreground))]">
            The simulated score is ready for a clinician to understand and challenge. Nothing here is a diagnosis or
            treatment instruction.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="border border-[hsl(var(--border))] p-4">
              <span className="eyebrow text-[hsl(var(--muted-foreground))]">Provisional queue position</span>
              <strong className="mt-2 block text-2xl" data-testid="text-queue-position">
                {String(position).padStart(2, '0')}
                <span className="text-sm text-[hsl(var(--muted-foreground))]"> of {patients.length}</span>
              </strong>
            </div>
            <div className="border border-[hsl(var(--border))] p-4">
              <span className="eyebrow text-[hsl(var(--muted-foreground))]">AI suggestion</span>
              <strong className="mt-2 block text-lg">
                <LevelBadge level={submitted.triageLevel} />
              </strong>
            </div>
            <div className="border border-[hsl(var(--border))] p-4">
              <span className="eyebrow text-[hsl(var(--muted-foreground))]">Confidence</span>
              <strong className="mono mt-2 block text-2xl">{submitted.aiConfidence}%</strong>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setFocusPatient(submitted.id);
                setLocation('/dashboard');
              }}
              testId="button-handoff-dashboard"
            >
              Open this patient in command center <ArrowRight size={16} aria-hidden />
            </Button>
            <Button variant="secondary" onClick={resetForm} testId="button-new-intake">
              Capture another
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <div className="clay-card p-8 md:p-12">
          <div className="eyebrow text-[hsl(var(--primary))]">Processing locally</div>
          <h1 className="mt-3 text-3xl font-bold">Turning signals into a reviewable suggestion.</h1>
          <div className="my-10 space-y-4">
            {PIPELINE_STAGES.map((stage, index) => {
              const state = pipelineStage > index ? 'done' : pipelineStage === index ? 'active' : 'pending';
              return (
                <motion.div
                  key={stage.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: state === 'pending' ? 0.4 : 1, x: 0 }}
                  className="flex items-center gap-3 border-b border-[hsl(var(--border))] pb-4 text-sm"
                >
                  <motion.span
                    key={state}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-white shadow-[inset_0_1.5px_2px_hsl(0_0%_100%/.35),0_4px_10px_-4px_hsl(211_48%_16%/.4)] ${state === 'done' ? 'bg-[hsl(var(--primary))]' : state === 'active' ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--border))]'}`}
                  >
                    {state === 'done' ? <Check size={13} aria-hidden /> : index + 1}
                  </motion.span>
                  <div className="min-w-0">
                    <div className="font-semibold">{stage.title}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{stage.detail}</div>
                  </div>
                  <span className="ml-auto mono shrink-0 text-[10px] text-[hsl(var(--muted-foreground))]">
                    {state === 'done' ? 'complete' : state === 'active' ? 'running…' : 'queued'}
                  </span>
                </motion.div>
              );
            })}
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[hsl(var(--secondary))]">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: (PIPELINE_STAGES.length * STAGE_MS + 400) / 1000, ease: 'linear' }}
              className="h-full rounded-full bg-[hsl(var(--primary))]"
            />
          </div>
        </div>
      </div>
    );
  }

  const titles = ['Identity & arrival', 'Vitals & consciousness', 'Complaint & context', 'Review & submit'];
  const inputClass =
    'mt-1.5 h-11 w-full clay-input px-3 text-sm transition';

  const field = (key: keyof FormState, label: string, placeholder?: string, type = 'text') => {
    const issue = rangeIssue(key);
    return (
      <label className="block text-sm font-semibold">
        {label}
        <input
          data-testid={`input-${key}`}
          type={type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={form[key]}
          onChange={(event) => update(key, event.target.value)}
          placeholder={placeholder}
          aria-invalid={issue ? true : undefined}
          className={`${inputClass} ${issue ? 'border-[hsl(var(--accent))]' : ''}`}
        />
        {issue && (
          <span className="mt-1 flex items-center gap-1 text-[11px] font-normal text-[hsl(var(--accent-foreground))]">
            <AlertTriangle size={12} aria-hidden className="text-[hsl(var(--accent))]" />
            {issue}
          </span>
        )}
      </label>
    );
  };

  return (
    <div className="mx-auto max-w-5xl">
      <DemoNotice />
      <div className="mt-8 grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
        <div>
          <SectionHeading
            eyebrow="Nurse intake / under one minute"
            title="Capture the first signal."
            detail="A focused intake draft is saved locally as you move. Required fields are called out before review."
          />
          <div className="mb-7 flex items-center gap-1" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={4} aria-label={`Intake stage ${step + 1} of 4`}>
            {titles.map((title, index) => (
              <div key={title} className="flex flex-1 items-center gap-1">
                <div className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--border))]'}`} />
                <span className={`hidden text-[10px] font-bold uppercase sm:block ${index === step ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
          <div className="clay-card p-5 md:p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="eyebrow text-[hsl(var(--primary))]">Stage 0{step + 1}</div>
                <h2 className="mt-1 text-xl font-bold">{titles[step]}</h2>
              </div>
              <div className="flex flex-col items-end gap-1">
                <motion.button
                  whileHover={{ scale: 1.06, rotate: -1.5 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => loadPreset('emergency')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--destructive)/.08)] px-3 py-1.5 text-xs font-bold text-[hsl(var(--destructive))] shadow-[var(--clay-shadow-sm)]"
                  data-testid="button-load-demo-emergency"
                >
                  <Zap size={14} aria-hidden />
                  Load Demo Emergency
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.06, rotate: 1.5 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => loadPreset('moderate')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--primary)/.08)] px-3 py-1.5 text-xs font-bold text-[hsl(var(--primary))] shadow-[var(--clay-shadow-sm)]"
                  data-testid="button-load-moderate-case"
                >
                  <Zap size={14} aria-hidden />
                  Load Moderate Case
                </motion.button>
              </div>
            </div>
            {step === 0 && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('name', 'Patient name', 'e.g. Nico Alvarez')}
                  {field('id', 'Patient ID', 'Leave blank to auto-generate')}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('age', 'Age', 'Years', 'number')}
                  <label className="block text-sm font-semibold">
                    Sex
                    <select data-testid="select-sex" value={form.sex} onChange={(event) => update('sex', event.target.value)} className={inputClass}>
                      <option value="">Select</option>
                      <option>Female</option>
                      <option>Male</option>
                      <option>Intersex</option>
                      <option>Unknown / not recorded</option>
                    </select>
                  </label>
                </div>
                <label className="block text-sm font-semibold">
                  Arrival method
                  <select data-testid="select-arrival-method" value={form.arrivalMethod} onChange={(event) => update('arrivalMethod', event.target.value)} className={inputClass}>
                    <option>Walk-in</option>
                    <option>EMS</option>
                    <option>Family</option>
                    <option>Transfer</option>
                  </select>
                </label>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('heartRate', 'Heart rate', 'bpm', 'number')}
                  {field('bloodPressure', 'Blood pressure', 'e.g. 120/80')}
                  {field('respiratoryRate', 'Respiratory rate', '/min', 'number')}
                  {field('temperature', 'Temperature', '°C', 'number')}
                  {field('oxygenSaturation', 'Oxygen saturation', '%', 'number')}
                </div>
                <label className="block text-sm font-semibold">
                  Consciousness
                  <Tip text="A simple observed state used as one signal in the simulated score. It is not a diagnosis.">
                    <CircleHelp size={14} aria-hidden className="ml-1 inline text-[hsl(var(--muted-foreground))]" />
                  </Tip>
                  <select data-testid="select-consciousness" value={form.consciousness} onChange={(event) => update('consciousness', event.target.value)} className={inputClass}>
                    <option>Alert</option>
                    <option>Confused</option>
                    <option>Responds to voice</option>
                    <option>Unresponsive</option>
                  </select>
                </label>
                <div className="rounded-xl border-l-4 border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.08)] p-3 text-xs text-[hsl(var(--muted-foreground))]">
                  Enter what is known, not what is assumed. Missing vital fields lower confidence and trigger clinician review.
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-5">
                {field('complaint', 'Chief complaint', 'What brought the patient in?')}
                <label className="block text-sm font-semibold">
                  Notes
                  <textarea
                    data-testid="textarea-notes"
                    value={form.notes}
                    onChange={(event) => update('notes', event.target.value)}
                    placeholder="Observed context, onset, relevant handoff..."
                    className="mt-1.5 min-h-28 w-full resize-y clay-input p-3 text-sm"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('painScore', 'Pain score', '0–10', 'number')}
                  {field('riskFactors', 'Risk factors', 'Comma separated, if known')}
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 shadow-[var(--clay-inset)]">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="eyebrow text-[hsl(var(--primary))]">Required signal check</span>
                    <span className={`text-xs font-bold ${missing.length ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--primary))]'}`}>
                      {missing.length ? `${missing.length} missing` : 'Complete'}
                    </span>
                  </div>
                  {missing.length ? (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      Still missing: {missing.join(', ')}. You can submit, but the result will be marked for clinician review.
                    </p>
                  ) : (
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                      All core signals are present for this simulated decision support pass.
                    </p>
                  )}
                  {rangeIssues.length > 0 && (
                    <p className="mt-2 flex items-start gap-1.5 text-sm text-[hsl(var(--accent-foreground))]">
                      <AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0 text-[hsl(var(--accent))]" />
                      Check values outside plausible ranges: {rangeIssues.join(', ')}.
                    </p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Patient', form.name || 'Not recorded'],
                    ['ID', form.id || 'Auto-generated'],
                    ['Complaint', form.complaint || 'Not recorded'],
                    ['Arrival', form.arrivalMethod],
                    ['Vitals', `${form.heartRate || '—'} bpm · ${form.bloodPressure || '—'} · ${form.oxygenSaturation || '—'}%`],
                    ['Risk factors', form.riskFactors || 'None recorded'],
                  ].map(([label, value]) => (
                    <div className="border-b border-[hsl(var(--border))] py-2" key={label}>
                      <div className="eyebrow text-[hsl(var(--muted-foreground))]">{label}</div>
                      <div className="mt-1 text-sm font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <ShieldCheck size={15} aria-hidden className="text-[hsl(var(--primary))]" />
                  A clinician must review and may override this simulated suggestion.
                </div>
              </div>
            )}
            <div className="mt-8 flex items-center justify-between border-t border-[hsl(var(--border))] pt-5">
              <span className="text-xs text-[hsl(var(--muted-foreground))]" aria-live="polite">
                {saved ? 'Draft saved locally' : 'Unsaved changes'}
              </span>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="secondary" onClick={() => setStep(step - 1)} testId="button-previous-step">
                    <ChevronLeft size={16} aria-hidden />
                    Back
                  </Button>
                )}
                {step < 3 ? (
                  <Button onClick={() => setStep(step + 1)} testId="button-next-step">
                    Continue <ChevronRight size={16} aria-hidden />
                  </Button>
                ) : (
                  <Button onClick={submit} disabled={!form.name.trim() || !form.complaint.trim()} testId="button-submit-intake">
                    Submit to queue <ArrowRight size={16} aria-hidden />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-24 clay-card p-6">
            <div className="eyebrow text-[hsl(var(--primary))]">At the desk</div>
            <h3 className="mt-2 text-lg font-bold">A calm capture surface for a high-stakes minute.</h3>
            <div className="mt-7 space-y-4">
              {[
                'Name and arrival establish identity.',
                'Vitals stay discrete and scannable.',
                'Narrative gives the model a signal — not a conclusion.',
                'Review makes missing data visible before handoff.',
              ].map((text, index) => (
                <div className="flex gap-3 text-sm" key={text}>
                  <span className="mono text-[hsl(var(--primary))]">0{index + 1}</span>
                  <span className="text-[hsl(var(--muted-foreground))]">{text}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 border-t border-[hsl(var(--border))] pt-5">
              <div className="flex items-center gap-2 text-xs font-bold">
                <FileClock size={15} aria-hidden className="text-[hsl(var(--accent))]" />
                Autosave active
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                The draft stays in this browser only. This prototype does not transmit patient data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
