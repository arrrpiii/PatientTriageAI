import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown, ChevronRight, ListFilter, Network, Play, Plus, RotateCcw,
  Search, ShieldCheck, SlidersHorizontal, TrendingDown, Trash2, UsersRound, X,
} from 'lucide-react';
import {
  type Patient, type TriageLevel, LEVELS, deriveAnalytics, effectiveLevel,
  queuePosition, sortPatients,
} from '@/lib/triage';
import { patientStore, takeFocusPatient, usePatients, useRole } from '@/lib/store';
import { guided, useGuided } from '@/lib/guided';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { BigStat, Button, LevelBadge, SectionHeading } from '@/components/primitives';
import { DetailDrawer } from '@/components/detail-drawer';
import { ArchitectureModal } from '@/components/architecture-modal';

const CAPACITY = 16;

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{label}</span>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      whileHover={{ y: -1.5 }}
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        active
          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white shadow-[0_4px_12px_-4px_hsl(var(--primary)/.7)]'
          : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/.5)] hover:text-[hsl(var(--foreground))]'
      }`}
    >
      {children}
    </motion.button>
  );
}

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const skeleton = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(skeleton);
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

  const activeFilterCount =
    (filter !== 'All' ? 1 : 0) + (arrivalFilter !== 'All' ? 1 : 0) + (reviewFilter !== 'All' ? 1 : 0) + (waitFilter !== 'any' ? 1 : 0);
  const clearFilters = () => {
    setFilter('All');
    setArrivalFilter('All');
    setReviewFilter('All');
    setWaitFilter('any');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          title="Command center"
          detail="Acuity is a suggestion. The queue is accountable."
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

      <div className="grid gap-10 border-y border-[hsl(var(--border))] py-10 sm:grid-cols-2 lg:grid-cols-4">
        <BigStat label="Patients waiting" value={`${patients.length}`} delta="live queue" testId="metric-waiting" />
        <BigStat
          label="Critical / needs review"
          value={`${analytics.needsReview.length}`}
          delta="prioritize now"
          tone="danger"
          testId="metric-review"
          delay={0.08}
        />
        <BigStat label="Median wait" value={`${analytics.medianWait}m`} delta="across current queue" tone="accent" testId="metric-median-wait" delay={0.16} />
        <BigStat
          label="Department status"
          value={departmentStatus}
          delta={`${patients.length}/${CAPACITY} capacity · ${capacityPct}%`}
          tone={departmentStatus === 'Surge' ? 'danger' : departmentStatus === 'Busy' ? 'accent' : 'normal'}
          testId="metric-capacity"
          delay={0.24}
        />
      </div>

      <div className="space-y-4 border-y border-[hsl(var(--border))] py-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search size={16} aria-hidden className="absolute left-3.5 top-3 text-[hsl(var(--muted-foreground))]" />
            <input
              data-testid="input-search-patients"
              aria-label="Search patients"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, ID, or complaint"
              className="h-11 w-full clay-input rounded-full pl-10 pr-4 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-[hsl(var(--secondary))] p-1 shadow-[var(--clay-inset)]" role="group" aria-label="Sort queue">
              {([['acuity', 'By acuity'], ['wait', 'By wait']] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSort(value)}
                  aria-pressed={sort === value}
                  data-testid={`button-sort-${value}`}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${sort === value ? 'bg-[hsl(var(--primary))] text-white shadow-[0_4px_10px_-4px_hsl(var(--primary)/.7),inset_0_1.5px_2px_hsl(0_0%_100%/.3)]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              variant="secondary"
              onClick={() => setFiltersOpen(!filtersOpen)}
              testId="button-toggle-filters"
              ariaPressed={filtersOpen}
            >
              <SlidersHorizontal size={15} aria-hidden />
              Filters
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--primary))] px-1.5 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
              <motion.span aria-hidden animate={{ rotate: filtersOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
                <ChevronDown size={15} />
              </motion.span>
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="ghost" onClick={clearFilters} testId="button-clear-filters-bar">
                <X size={14} aria-hidden />
                Clear
              </Button>
            )}
          </div>
        </div>
        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-1">
                <FilterRow label="Acuity">
                  <FilterChip active={filter === 'All'} onClick={() => setFilter('All')} testId="chip-acuity-all">
                    All
                  </FilterChip>
                  {LEVELS.map((item, index) => {
                    const active = filter === item.value;
                    return (
                      <motion.button
                        key={item.value}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        whileTap={{ scale: 0.92 }}
                              onClick={() => setFilter(active ? 'All' : item.value)}
                        aria-pressed={active}
                        data-testid={`chip-acuity-${item.short}`}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors"
                        style={
                          active
                            ? { backgroundColor: item.color, borderColor: item.color, color: 'white', boxShadow: `0 4px 12px -4px ${item.color}AA` }
                            : { backgroundColor: `${item.color}10`, borderColor: `${item.color}55`, color: item.color }
                        }
                      >
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? 'white' : item.color }} />
                        {item.short} · {item.label}
                      </motion.button>
                    );
                  })}
                </FilterRow>
                <FilterRow label="Arrival">
                  {(['All', 'Walk-in', 'EMS', 'Family', 'Transfer'] as const).map((option) => (
                    <FilterChip key={option} active={arrivalFilter === option} onClick={() => setArrivalFilter(option)} testId={`chip-arrival-${option.toLowerCase()}`}>
                      {option}
                    </FilterChip>
                  ))}
                </FilterRow>
                <FilterRow label="Status">
                  {(['All', 'Pending review', 'Needs clinician review', 'Clinician override'] as ReviewFilter[]).map((option) => (
                    <FilterChip key={option} active={reviewFilter === option} onClick={() => setReviewFilter(option)} testId={`chip-status-${option.split(' ')[0].toLowerCase()}`}>
                      {option === 'All' ? 'All statuses' : option}
                    </FilterChip>
                  ))}
                </FilterRow>
                <FilterRow label="Waiting">
                  {([['any', 'Any wait'], ['30', '30m+'], ['60', '60m+'], ['120', '120m+']] as [WaitFilter, string][]).map(([value, label]) => (
                    <FilterChip key={value} active={waitFilter === value} onClick={() => setWaitFilter(value)} testId={`chip-wait-${value}`}>
                      {label}
                    </FilterChip>
                  ))}
                </FilterRow>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

      <div>
        <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,.7fr)_minmax(0,.55fr)_minmax(0,.85fr)_minmax(0,.85fr)_minmax(0,.85fr)] gap-3 border-b border-[hsl(var(--border))] px-5 pb-3.5 text-sm font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] md:grid">
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
              <div key={index} className="flex items-center gap-3 border-b border-[hsl(var(--border))] px-5 py-6 last:border-b-0">
                <span className="h-5 w-8 animate-pulse rounded-full bg-[hsl(var(--secondary))]" />
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
                  transition={{ duration: 0.22 }}
                  key={patient.id}
                  onClick={() => setSelectedId(patient.id)}
                  data-testid={`row-patient-${patient.id}`}
                  aria-label={`Open details for ${patient.name}, queue position ${index + 1}`}
                  className={`grid w-full gap-3 border-b border-l-4 border-[hsl(var(--border))] border-l-transparent px-5 py-5 text-left transition-[background-color,box-shadow] duration-200 last:border-b-0 hover:bg-[hsl(var(--card))] hover:shadow-[0_6px_16px_-10px_hsl(211_48%_16%/.22)] focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-[hsl(var(--primary))] md:grid-cols-[minmax(0,1.6fr)_minmax(0,.7fr)_minmax(0,.55fr)_minmax(0,.85fr)_minmax(0,.85fr)_minmax(0,.85fr)] md:items-center [&>*]:min-w-0 ${
                    patient.newlyArrived
                      ? 'border-l-[hsl(var(--primary))]'
                      : patient.deteriorating
                        ? 'border-l-[hsl(var(--destructive))]'
                        : ''
                  } ${isGuidedFocus ? 'bg-[hsl(var(--primary)/.08)] ring-2 ring-inset ring-[hsl(var(--primary))]' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="mono w-9 shrink-0 text-base text-[hsl(var(--muted-foreground))]">{String(index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-lg font-bold">{patient.name}</span>
                        {patient.age !== null && <span className="shrink-0 text-sm text-[hsl(var(--muted-foreground))]">{patient.age}y</span>}
                        {patient.newlyArrived && <span className="text-[10px] font-bold uppercase text-[hsl(var(--primary))]">new</span>}
                      </div>
                      <span className="block truncate text-base text-[hsl(var(--muted-foreground))]">{patient.complaint}</span>
                      <span className="mono block truncate text-xs text-[hsl(var(--muted-foreground))]">
                        {patient.id} · HR {patient.heartRate ?? '—'} · SpO₂ {patient.oxygenSaturation ?? '—'}%
                      </span>
                    </div>
                  </div>
                  <div className="hidden text-base text-[hsl(var(--muted-foreground))] md:block">
                    {patient.arrivalMethod}
                    <br />
                    <span className="mono text-sm">{patient.arrivalTime}</span>
                  </div>
                  <div className="text-base md:text-lg">
                    <span className="mono font-bold">{patient.waitMinutes}m</span>
                    {patient.deteriorating && <span className="ml-2 text-sm font-bold text-[hsl(var(--destructive))]">rising</span>}
                  </div>
                  <div>
                    <span className="mono text-lg font-bold text-[hsl(var(--primary))]">{patient.fusionScore}</span>
                    <span className="ml-1 text-sm text-[hsl(var(--muted-foreground))]">/100 · {patient.aiConfidence}% conf</span>
                  </div>
                  <div>
                    <LevelBadge level={effectiveLevel(patient)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`truncate text-sm font-bold uppercase ${
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
