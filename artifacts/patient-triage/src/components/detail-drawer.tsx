import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, ArrowUpRight, BrainCircuit, Check, ChevronDown, CircleHelp, HeartPulse,
  Lightbulb, RotateCcw, ShieldCheck, X,
} from 'lucide-react';
import { type Patient, type TriageLevel, LEVELS } from '@/lib/triage';
import { type Role } from '@/lib/store';
import { useGuided, guided } from '@/lib/guided';
import { Button, LevelBadge, Tip } from '@/components/primitives';

export function DetailDrawer({
  patient,
  role,
  onClose,
  onOverride,
  onUndo,
}: {
  patient: Patient;
  role: Role;
  onClose: () => void;
  onOverride: (id: string, level: TriageLevel, reason: string) => void;
  onUndo: (id: string) => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const [override, setOverride] = useState(false);
  const [level, setLevel] = useState<TriageLevel>(patient.clinicianLevel ?? patient.triageLevel);
  const [reason, setReason] = useState('');
  const asideRef = useRef<HTMLElement>(null);
  const guidedState = useGuided();
  const guidedStep = guided.currentStep();
  const isGuidedTarget = guidedState.active && guidedState.demoPatientId === patient.id;
  const highlightSignals = isGuidedTarget && guidedStep?.id === 'highlight-signals';

  useEffect(() => {
    asideRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Guided demo: expand the explanation, then stage a documented override.
  useEffect(() => {
    if (!isGuidedTarget || !guidedStep) return;
    if (guidedStep.id === 'drawer-open' || guidedStep.id === 'highlight-signals') setShowWhy(true);
    if (guidedStep.id === 'override' && !patient.clinicianLevel) {
      setOverride(true);
      const nextLevel = LEVELS[Math.min(LEVELS.length - 1, LEVELS.findIndex((item) => item.value === patient.triageLevel) + 1)].value;
      setLevel(nextLevel);
      const demoReason = 'Bedside exam: airway stable, monitored bay appropriate.';
      setReason(demoReason);
      const timer = setTimeout(() => onOverride(patient.id, nextLevel, demoReason), 2600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isGuidedTarget, guidedStep?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const trend = [
    patient.heartRate !== null ? patient.heartRate - 9 : 80,
    patient.heartRate !== null ? patient.heartRate - 4 : 84,
    patient.heartRate ?? 88,
    patient.heartRate !== null ? patient.heartRate + 3 : 86,
  ];

  const models = [
    { key: 'text', label: 'Text model', tip: 'Simulated BioClinicalBERT narrative analysis. In this prototype it is a deterministic keyword engine — no real model runs.', value: patient.textScore },
    { key: 'vitals', label: 'Vitals model', tip: 'Simulated XGBoost vitals analysis. In this prototype it is a deterministic rules engine — no real model runs.', value: patient.vitalsScore },
    { key: 'fusion', label: 'Late fusion', tip: 'Simulated late-fusion engine combining both scores with missing-data penalties and waiting-time escalation.', value: patient.fusionScore },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[hsl(var(--sidebar)/.35)]" onClick={onClose}>
      <motion.aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Patient detail for ${patient.name}`}
        tabIndex={-1}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28 }}
        onClick={(event) => event.stopPropagation()}
        className="my-2 mr-2 h-[calc(100%-1rem)] w-full max-w-[540px] overflow-y-auto rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_20px_50px_-20px_hsl(211_48%_10%/.55)] focus:outline-none"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between rounded-t-[1.75rem] border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/.96)] p-5 backdrop-blur">
          <div>
            <div className="eyebrow text-[hsl(var(--primary))]">{patient.id} · patient detail</div>
            <h2 className="mt-1 text-2xl font-bold">{patient.name}</h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              {patient.age ?? '—'} years · {patient.sex || 'Not recorded'} · arrived {patient.arrivalMethod.toLowerCase()} · waiting {patient.waitMinutes}m
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close patient detail"
            className="p-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--primary))]"
            data-testid="button-close-drawer"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="space-y-6 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <LevelBadge level={patient.clinicianLevel ?? patient.triageLevel} />
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                patient.deteriorating
                  ? 'border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] text-[hsl(var(--destructive))]'
                  : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
              }`}
            >
              {patient.deteriorating ? 'Deteriorating signal' : patient.reviewStatus}
            </span>
            {patient.clinicianLevel && (
              <span className="border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.08)] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--primary))]">
                AI suggested {patient.triageLevel}
              </span>
            )}
          </div>

          <div className="rounded-2xl border-l-4 border-[hsl(var(--primary))] bg-[hsl(var(--secondary)/.45)] p-4 shadow-[var(--clay-shadow-sm)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold">
                <BrainCircuit size={16} aria-hidden className="text-[hsl(var(--primary))]" />
                Simulated recommendation
                <Tip text="This score is deterministic local decision support based on intake signals. It is not a diagnosis.">
                  <CircleHelp size={14} aria-hidden className="text-[hsl(var(--muted-foreground))]" />
                </Tip>
              </div>
              <span className="mono text-xl font-bold text-[hsl(var(--primary))]">
                {patient.fusionScore}
                <span className="text-xs">/100</span>
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[hsl(var(--background))]">
              <motion.div initial={{ width: 0 }} animate={{ width: `${patient.fusionScore}%` }} transition={{ type: 'spring', stiffness: 90, damping: 20 }} className="h-full rounded-full bg-[hsl(var(--primary))]" />
            </div>
            <button
              onClick={() => setShowWhy(!showWhy)}
              aria-expanded={showWhy}
              className="mt-3 flex items-center gap-1 text-xs font-bold text-[hsl(var(--primary))] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--primary))]"
              data-testid="button-why-decision"
            >
              <Lightbulb size={14} aria-hidden />
              Why this decision? <ChevronDown size={14} aria-hidden className={showWhy ? 'rotate-180' : ''} />
            </button>
            {showWhy && (
              <div className="mt-4 space-y-4 border-t border-[hsl(var(--border))] pt-4">
                <div className="grid gap-2 sm:grid-cols-3">
                  {models.map((model) => (
                    <div key={model.key}>
                      <span className="eyebrow flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
                        {model.label}
                        <Tip text={model.tip}>
                          <CircleHelp size={12} aria-hidden />
                        </Tip>
                      </span>
                      <strong className="mono mt-1 block">{model.value}</strong>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[hsl(var(--background))]">
                        <div className="h-full rounded-full bg-[hsl(var(--primary)/.6)]" style={{ width: `${model.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Confidence <strong className="mono text-[hsl(var(--foreground))]">{patient.aiConfidence}%</strong>
                    {patient.missingInfo.length > 0 && (
                      <span className="ml-2 text-[hsl(var(--accent-foreground))]">
                        (uncertainty raised — {patient.missingInfo.length} signal{patient.missingInfo.length > 1 ? 's' : ''} missing)
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                  Labeled honestly: the “text model” simulates BioClinicalBERT narrative analysis, the “vitals model”
                  simulates XGBoost vitals scoring, and a simulated late-fusion engine combines them. No real models
                  run in this prototype.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['HR', `${patient.heartRate ?? '—'}`, 'bpm'],
              ['BP', patient.bloodPressure || '—', 'mmHg'],
              ['RR', `${patient.respiratoryRate ?? '—'}`, '/min'],
              ['SpO₂', `${patient.oxygenSaturation ?? '—'}`, '%'],
            ].map(([key, value, unit]) => (
              <div className="rounded-2xl border border-[hsl(var(--border))] p-3 shadow-[var(--clay-shadow-sm)]" key={key}>
                <div className="eyebrow text-[hsl(var(--muted-foreground))]">{key}</div>
                <div className="mono mt-2 text-lg font-bold">{value}</div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{unit}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold">Heart rate trend</h3>
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">simulated · last 4 observations</span>
            </div>
            <div className="flex h-16 items-end gap-2 border-b border-[hsl(var(--border))] px-2">
              {trend.map((value, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full max-w-12 rounded-t-lg bg-[hsl(var(--primary)/.65)]" style={{ height: `${Math.max(15, value - 50)}%` }} />
                  <span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold">Signals and context</h3>
            <div className="space-y-2">
              {patient.reasons.map((reasonItem) => (
                <div
                  className={`flex gap-2 text-xs transition ${highlightSignals ? 'border-l-2 border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.1)] py-1 pl-2' : ''}`}
                  key={reasonItem}
                >
                  <ArrowUpRight size={14} aria-hidden className="shrink-0 text-[hsl(var(--destructive))]" />
                  {reasonItem}
                </div>
              ))}
              {patient.protectiveSignals.map((signal) => (
                <div className="flex gap-2 text-xs text-[hsl(var(--muted-foreground))]" key={signal}>
                  <Check size={14} aria-hidden className="shrink-0 text-[hsl(var(--primary))]" />
                  {signal} <span className="text-[10px]">(protective)</span>
                </div>
              ))}
              {patient.missingInfo.map((item) => (
                <div className="flex gap-2 text-xs text-[hsl(var(--accent-foreground))]" key={item}>
                  <AlertCircle size={14} aria-hidden className="shrink-0 text-[hsl(var(--accent))]" />
                  Missing: {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold">Chief complaint</h3>
            <p className="border-l-2 border-[hsl(var(--border))] pl-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              {patient.complaint || 'Not recorded'}
              {patient.notes ? `. ${patient.notes}` : ''}
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold">Queue timeline</h3>
            <div className="space-y-3 border-l border-[hsl(var(--border))] pl-4">
              {patient.history.map((item) => (
                <div key={`${item.time}-${item.event}`} className="relative">
                  <span aria-hidden className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
                  <div className="mono text-[10px] text-[hsl(var(--primary))]">{item.time}</div>
                  <div className="text-xs font-bold">{item.event}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">{item.detail}</div>
                </div>
              ))}
            </div>
          </div>

          {patient.auditLog.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-bold">Clinician activity log</h3>
              <div className="space-y-3 border-l border-[hsl(var(--accent))] pl-4">
                {patient.auditLog.map((item, index) => (
                  <div key={`${item.time}-${index}`} className="relative">
                    <span aria-hidden className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
                    <div className="mono text-[10px] text-[hsl(var(--accent-foreground))]">{item.time}</div>
                    <div className="text-xs font-bold">{item.event}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-[hsl(var(--border))] pt-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Human override</h3>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">The clinician has final authority.</p>
              </div>
              {role === 'Clinician' ? (
                <Button
                  variant={override ? 'secondary' : 'primary'}
                  onClick={() => setOverride(!override)}
                  testId="button-open-override"
                >
                  {override ? 'Cancel' : 'Review / override'}
                </Button>
              ) : (
                <span className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                  <HeartPulse size={14} aria-hidden className="text-[hsl(var(--primary))]" />
                  Nurse view — read only
                </span>
              )}
            </div>
            {role === 'Clinician' && patient.clinicianLevel && (
              <div className="mt-3 flex items-center justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 text-xs shadow-[var(--clay-inset)]">
                <span>
                  Override active: <strong>{patient.triageLevel}</strong> → <strong>{patient.clinicianLevel}</strong>
                </span>
                <Button variant="ghost" onClick={() => onUndo(patient.id)} testId="button-undo-override">
                  <RotateCcw size={13} aria-hidden />
                  Undo
                </Button>
              </div>
            )}
            {role === 'Clinician' && override && (
              <div className="mt-4 space-y-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 shadow-[var(--clay-inset)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[hsl(var(--muted-foreground))]">Original suggestion</span>
                  <LevelBadge level={patient.triageLevel} compact />
                </div>
                <label className="block text-xs font-bold">
                  Clinician level
                  <select
                    value={level}
                    onChange={(event) => setLevel(event.target.value as TriageLevel)}
                    className="mt-1.5 h-10 w-full clay-input px-2 text-sm"
                    data-testid="select-override-level"
                  >
                    {LEVELS.map((item) => (
                      <option key={item.value}>{item.value}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-bold">
                  Reason for override
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="mt-1.5 min-h-20 w-full clay-input p-2 text-sm"
                    placeholder="Document what changed your decision..."
                    data-testid="textarea-override-reason"
                  />
                </label>
                <Button
                  onClick={() => {
                    if (reason.trim()) onOverride(patient.id, level, reason.trim());
                  }}
                  disabled={!reason.trim()}
                  className="w-full"
                  testId="button-save-override"
                >
                  <ShieldCheck size={15} aria-hidden />
                  Save override + audit
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </div>
  );
}
