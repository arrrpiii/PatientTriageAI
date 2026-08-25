import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, AlertCircle, ChevronRight, Filter, ListFilter, Network, Play, Plus, RotateCcw,
  Search, ShieldCheck, Timer, TrendingDown, Trash2, UsersRound, X,
} from 'lucide-react';
import {
  type Patient, type TriageLevel, LEVELS, deriveAnalytics, effectiveLevel, nowLabel,
  queuePosition, sortPatients,
} from '@/lib/triage';
import { patientStore, takeFocusPatient, usePatients, useRole } from '@/lib/store';
import { guided, useGuided } from '@/lib/guided';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Button, DemoNotice, LevelBadge, Metric, SectionHeading } from '@/components/primitives';
import { DetailDrawer } from '@/components/detail-drawer';
import { ArchitectureModal } from '@/components/architecture-modal';

const CAPACITY = 16;

type WaitFilter = 'any' | '30' | '60' | '120';
type ReviewFilter = 'All' | 'Pending review' | 'Needs clinician review' | 'Clinician override';

export function Dashboard() {
  const patients = usePatients();
  const role = useRole();
  const { toast } = useToast();
  const guidedState = useGuided();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | TriageLevel>('All');
  const [arrivalFilter, setArrivalFilter] = useState('All');
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('All');
  const [waitFilter, setWaitFilter] = useState<WaitFilter>('any');
  const [sort, setSort] = useState<'acuity' | 'wait'>('acuity');
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(nowLabel());

  useEffect(() => {
    const timer = setInterval(() => setClock(nowLabel()), 1000);
    const skeleton = setTimeout(() => setLoading(false), 350);
    return () => {
      clearInterval(timer);
      clearTimeout(skeleton);
    };
  }, []);

  // Waiting-time escalation: advance waits by real elapsed minutes and rescore.
  useEffect(() => {
    patientStore.tick();
    const timer = setInterval(() => patientStore.tick(), 15000);
    return () => clearInterval(timer);
  }, []);

  // Intake handoff: "open this patient in the command center".
  useEffect(() => {
    const focus = takeFocusPatient();
    if (focus) setSelectedId(focus);
  }, []);

  // Guided demo: open the drawer on the demo patient for its explainability steps.
  useEffect(() => {
    if (!guidedState.active) return;
    const stepId = guided.currentStep()?.id;
    if (!stepId) return;
    if (['drawer-open', 'highlight-signals', 'override'].includes(stepId) && guidedState.demoPatientId) {
      setSelectedId(guidedState.demoPatientId);
    }
    if (stepId === 'queue-insert' || stepId === 'finish') setSelectedId(null);
  }, [guidedState.active, guidedState.stepIndex, guidedState.demoPatientId]);

  useEffect(() => {
    if (resetOpen) {
      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setResetOpen(false);
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    return undefined;
  }, [resetOpen]);

  const analytics = deriveAnalytics(patients);
  const selected = selectedId ? patients.find((patient) => patient.id === selectedId) ?? null : null;

  const visible = useMemo(() => {
    const filtered = patients.filter((patient) => {
      const level = effectiveLevel(patient);
      if (filter !== 'All' && level !== filter) return false;
      if (arrivalFilter !== 'All' && patient.arrivalMethod !== arrivalFilter) return false;
      if (reviewFilter !== 'All' && patient.reviewStatus !== reviewFilter) return false;
      if (waitFilter !== 'any' && patient.waitMinutes < Number(waitFilter)) return false;
      return `${patient.name} ${patient.id} ${patient.complaint}`.toLowerCase().includes(search.toLowerCase());
    });
    return sort === 'wait' ? [...filtered].sort((a, b) => b.waitMinutes - a.waitMinutes) : sortPatients(filtered);
  }, [patients, filter, arrivalFilter, reviewFilter, waitFilter, search, sort]);

  const capacityPct = Math.round((patients.length / CAPACITY) * 100);
  const departmentStatus = capacityPct >= 85 ? 'Surge' : capacityPct >= 60 ? 'Busy' : 'Steady';

  const applyOverride = (id: string, level: TriageLevel, reason: string) => {
    const patient = patients.find((item) => item.id === id);
    patientStore.applyOverride(id, level, reason);
    setSelectedId(null);
    toast({
      title: 'Override saved to audit trail',
      description: `${patient?.name ?? id}: ${patient?.triageLevel ?? '—'} → ${level}.`,
      action: (
        <ToastAction
          altText="Undo override"
          onClick={() => {
            patientStore.undoOverride(id);
            toast({ title: 'Override undone', description: 'The AI suggestion is active again — logged to the audit trail.' });
          }}
        >
          Undo
        </ToastAction>
      ),
    });
  };

  const undoOverride = (id: string) => {
    patientStore.undoOverride(id);
    toast({ title: 'Override undone', description: 'The AI suggestion is active again — logged to the audit trail.' });
  };

  const simulateArrival = (count: number) => {
    const arrivals = patientStore.simulateArrivals(count);
    const first = arrivals[0];
    toast({
      title: count === 1 ? 'New arrival in queue' : `${count} new arrivals in queue`,
      description:
        count === 1 && first
          ? `${first.name} — ${first.complaint} (position ${queuePosition(patientStore.getSnapshot().patients, first.id)}).`
          : 'The queue re-ranked by acuity and waiting time.',
    });
  };

  const simulateDeterioration = () => {
    const updated = patientStore.simulateDeterioration();
    toast(
      updated
        ? {
            title: 'Deterioration simulated',
            description: `${updated.name}'s vitals worsened — rescored to ${updated.triageLevel} (${updated.fusionScore}/100).`,
          }
        : { title: 'No eligible patient', description: 'Everyone is already high-acuity, deteriorating, or overridden.' },
    );
  };

  const reset = () => {
    patientStore.reset();
    setSelectedId(null);
    setResetOpen(false);
    toast({ title: 'Demo data reset', description: 'The queue returned to the original seeded shift.' });
  };

  const selectClass = 'h-10 clay-input px-2 text-xs font-bold';

  return (
    <div className="space-y-6">
      <DemoNotice />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Clinician workspace / live simulation"
          title="Command center"
          detail="Acuity is a suggestion. The queue is accountable."
          action={
            <div className="hidden items-center gap-2 clay-chip px-4 py-2 text-xs sm:flex">
              <span aria-hidden className="h-2 w-2 rounded-full bg-[hsl(var(--primary))] pulse-dot" />
              <span className="mono" data-testid="text-dashboard-clock">{clock}</span>
              <span className="text-[hsl(var(--muted-foreground))]">local time</span>
            </div>
          }
        />
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-full bg-[hsl(var(--secondary))] p-1 shadow-[var(--clay-inset)]" role="group" aria-label="Role switch">
            {(['Nurse', 'Clinician'] as const).map((option) => (
              <button
                key={option}
                onClick={() => patientStore.setRole(option)}
                aria-pressed={role === option}
                data-testid={`button-role-${option.toLowerCase()}`}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${role === option ? 'bg-[hsl(var(--primary))] text-white shadow-[0_4px_10px_-4px_hsl(var(--primary)/.7),inset_0_1.5px_2px_hsl(0_0%_100%/.3)]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
              >
                {option}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setShowArchitecture(true)} testId="button-open-architecture">
            <Network size={15} aria-hidden />
            Architecture
          </Button>
          <Button
            onClick={() => (guidedState.active ? guided.exit() : guided.start())}
            variant={guidedState.active ? 'secondary' : 'primary'}
            testId="button-guided-demo"
          >
            <Play size={15} aria-hidden />
            {guidedState.active ? 'Exit guided demo' : 'Run Guided Demo'}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Patients waiting" value={`${patients.length}`} delta="live queue" icon={UsersRound} testId="metric-waiting" />
        <Metric
          label="Critical / needs review"
          value={`${analytics.needsReview.length}`}
          delta="prioritize now"
          tone="danger"
          icon={AlertCircle}
          testId="metric-review"
        />
        <Metric label="Median wait" value={`${analytics.medianWait}m`} delta="across current queue" tone="accent" icon={Timer} testId="metric-median-wait" />
        <Metric
          label="Department status"
          value={departmentStatus}
          delta={`${patients.length}/${CAPACITY} capacity · ${capacityPct}%`}
          tone={departmentStatus === 'Surge' ? 'danger' : departmentStatus === 'Busy' ? 'accent' : 'normal'}
          icon={Activity}
          testId="metric-capacity"
        />
      </div>

      <div className="flex flex-col gap-3 border-y border-[hsl(var(--border))] py-3 xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Search size={16} aria-hidden className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" />
          <input
            data-testid="input-search-patients"
            aria-label="Search patients"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, ID, or complaint"
            className="h-10 w-full clay-input pl-9 pr-3 text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <Filter size={15} aria-hidden />
            Filter
          </span>
          <select data-testid="select-acuity-filter" aria-label="Filter by acuity" value={filter} onChange={(event) => setFilter(event.target.value as 'All' | TriageLevel)} className={selectClass}>
            <option>All</option>
            {LEVELS.map((item) => (
              <option key={item.value}>{item.value}</option>
            ))}
          </select>
          <select data-testid="select-arrival-filter" aria-label="Filter by arrival method" value={arrivalFilter} onChange={(event) => setArrivalFilter(event.target.value)} className={selectClass}>
            <option>All</option>
            <option>Walk-in</option>
            <option>EMS</option>
            <option>Family</option>
            <option>Transfer</option>
          </select>
          <select data-testid="select-review-filter" aria-label="Filter by review status" value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value as ReviewFilter)} className={selectClass}>
            <option value="All">All statuses</option>
            <option>Pending review</option>
            <option>Needs clinician review</option>
            <option>Clinician override</option>
          </select>
          <select data-testid="select-wait-filter" aria-label="Filter by waiting time" value={waitFilter} onChange={(event) => setWaitFilter(event.target.value as WaitFilter)} className={selectClass}>
            <option value="any">Any wait</option>
            <option value="30">Waiting 30m+</option>
            <option value="60">Waiting 60m+</option>
            <option value="120">Waiting 120m+</option>
          </select>
          <select data-testid="select-sort-queue" aria-label="Sort queue" value={sort} onChange={(event) => setSort(event.target.value as 'acuity' | 'wait')} className={selectClass}>
            <option value="acuity">Sort: acuity</option>
            <option value="wait">Sort: wait time</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow text-[hsl(var(--muted-foreground))]">Simulation controls</span>
        <Button variant="secondary" onClick={() => simulateArrival(1)} testId="button-simulate-arrival">
          <Plus size={15} aria-hidden />
          Simulate New Arrival
        </Button>
        <Button variant="secondary" onClick={simulateDeterioration} testId="button-simulate-deterioration">
          <TrendingDown size={15} aria-hidden />
          Simulate Deterioration
        </Button>
        <Button variant="secondary" onClick={() => simulateArrival(5)} testId="button-simulate-five-arrivals">
          <UsersRound size={15} aria-hidden />
          Simulate 5 Arrivals
        </Button>
        <Button variant="ghost" onClick={() => setResetOpen(true)} testId="button-reset-demo">
          <RotateCcw size={15} aria-hidden />
          Reset Demo Data
        </Button>
      </div>

      <div className="overflow-hidden clay-card">
        <div className="hidden grid-cols-[1.5fr_.8fr_.7fr_.65fr_.75fr_1fr] gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] md:grid">
          <span>Patient</span>
          <span>Arrival</span>
          <span>Wait</span>
          <span>Signal</span>
          <span>AI suggestion</span>
          <span>Review</span>
        </div>
        {loading ? (
          <div className="space-y-0" aria-busy="true" aria-label="Loading queue">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 border-b border-[hsl(var(--border))] px-4 py-4 last:border-0">
                <span className="h-8 w-8 animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
                <span className="h-4 w-1/3 animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
                <span className="ml-auto h-4 w-16 animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
              </div>
            ))}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((patient, index) => {
              const isGuidedFocus =
                guidedState.active &&
                guidedState.demoPatientId === patient.id &&
                guided.currentStep()?.id === 'queue-insert';
              return (
                <motion.button
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ scale: 1.004 }}
                  transition={{ duration: 0.22 }}
                  key={patient.id}
                  onClick={() => setSelectedId(patient.id)}
                  data-testid={`row-patient-${patient.id}`}
                  aria-label={`Open details for ${patient.name}, queue position ${index + 1}`}
                  className={`grid w-full gap-3 border-b border-[hsl(var(--border))] px-4 py-4 text-left transition last:border-0 hover:bg-[hsl(var(--secondary)/.38)] focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-[hsl(var(--primary))] md:grid-cols-[1.5fr_.8fr_.7fr_.65fr_.75fr_1fr] md:items-center ${
                    patient.newlyArrived
                      ? 'border-l-4 border-l-[hsl(var(--primary))]'
                      : patient.deteriorating
                        ? 'border-l-4 border-l-[hsl(var(--destructive))]'
                        : ''
                  } ${isGuidedFocus ? 'bg-[hsl(var(--primary)/.08)] ring-2 ring-inset ring-[hsl(var(--primary))]' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="mono w-6 shrink-0 text-xs text-[hsl(var(--muted-foreground))]">{String(index + 1).padStart(2, '0')}</span>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.1)] text-[10px] font-bold text-[hsl(var(--primary))]">
                      {patient.initials}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold">{patient.name}</span>
                        {patient.age !== null && <span className="shrink-0 text-[10px] text-[hsl(var(--muted-foreground))]">{patient.age}y</span>}
                        {patient.newlyArrived && <span className="text-[9px] font-bold uppercase text-[hsl(var(--primary))]">new</span>}
                      </div>
                      <span className="block truncate text-xs text-[hsl(var(--muted-foreground))]">{patient.complaint}</span>
                      <span className="mono block text-[9px] text-[hsl(var(--muted-foreground))]">
                        {patient.id} · HR {patient.heartRate ?? '—'} · SpO₂ {patient.oxygenSaturation ?? '—'}%
                      </span>
                    </div>
                  </div>
                  <div className="hidden text-xs text-[hsl(var(--muted-foreground))] md:block">
                    {patient.arrivalMethod}
                    <br />
                    <span className="mono text-[10px]">{patient.arrivalTime}</span>
                  </div>
                  <div className="text-xs md:text-sm">
                    <span className="mono font-bold">{patient.waitMinutes}m</span>
                    {patient.deteriorating && <span className="ml-2 text-[10px] font-bold text-[hsl(var(--destructive))]">rising</span>}
                  </div>
                  <div>
                    <span className="mono text-sm font-bold text-[hsl(var(--primary))]">{patient.fusionScore}</span>
                    <span className="ml-1 text-[10px] text-[hsl(var(--muted-foreground))]">/100 · {patient.aiConfidence}% conf</span>
                  </div>
                  <div>
                    <LevelBadge level={effectiveLevel(patient)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        patient.reviewStatus === 'Needs clinician review' || patient.deteriorating
                          ? 'text-[hsl(var(--destructive))]'
                          : 'text-[hsl(var(--muted-foreground))]'
                      }`}
                    >
                      {patient.deteriorating ? 'Deteriorating' : patient.reviewStatus}
                    </span>
                    <ChevronRight size={15} aria-hidden className="text-[hsl(var(--muted-foreground))]" />
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
        {!loading && !visible.length && (
          <div className="p-12 text-center">
            <motion.span aria-hidden animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }} className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] shadow-[var(--clay-shadow-sm)]"><ListFilter size={20} /></motion.span>
            <h3 className="mt-3 font-bold">No patients match this view</h3>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Try clearing the search or the filters.</p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => {
                setSearch('');
                setFilter('All');
                setArrivalFilter('All');
                setReviewFilter('All');
                setWaitFilter('any');
              }}
              testId="button-clear-filters"
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[hsl(var(--muted-foreground))]">
        <span>
          Showing {visible.length} of {patients.length} fictional records · all changes persist locally
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheck size={14} aria-hidden className="text-[hsl(var(--primary))]" />
          Every decision remains clinician-owned
        </span>
      </div>

      {selected && (
        <AnimatePresence>
          <DetailDrawer
            patient={selected}
            role={role}
            onClose={() => setSelectedId(null)}
            onOverride={applyOverride}
            onUndo={undoOverride}
          />
        </AnimatePresence>
      )}
      {showArchitecture && <ArchitectureModal onClose={() => setShowArchitecture(false)} />}
      {resetOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[hsl(var(--sidebar)/.48)] p-4">
          <div role="dialog" aria-modal="true" aria-label="Reset demo data" className="w-full max-w-md clay-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="eyebrow text-[hsl(var(--destructive))]">Reset simulation</div>
                <h2 className="mt-1 text-xl font-bold">Return to seeded queue?</h2>
              </div>
              <button onClick={() => setResetOpen(false)} aria-label="Close reset dialog" data-testid="button-close-reset">
                <X size={18} aria-hidden />
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              This removes locally captured demo patients and clinician overrides from this browser.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setResetOpen(false)} testId="button-cancel-reset">
                Cancel
              </Button>
              <Button variant="danger" onClick={reset} testId="button-confirm-reset">
                <Trash2 size={15} aria-hidden />
                Reset queue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
