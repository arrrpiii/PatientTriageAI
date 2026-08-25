import { motion } from 'framer-motion';
import {
  AlertCircle, ArrowDownRight, ArrowUpRight, CircleHelp, Clock3, Download, FileText,
  SlidersHorizontal, Timer, Zap,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { deriveAnalytics } from '@/lib/triage';
import { usePatients } from '@/lib/store';
import { Button, DemoNotice, Metric, SectionHeading, Tip } from '@/components/primitives';

export function Analytics() {
  const patients = usePatients();
  const analytics = deriveAnalytics(patients);
  const maxDistribution = Math.max(1, ...analytics.distribution.map((item) => item.value));
  const maxWait = Math.max(30, ...analytics.waitByLevel.map((item) => item.wait));
  const maxPaired = Math.max(1, ...analytics.aiDistribution.flatMap((item) => [item.ai, item.clinician]));
  const maxArrivals = Math.max(1, ...analytics.arrivalsByHour.map((item) => item.count));

  const exportSnapshot = () => {
    const lines = [
      'PatientTriage.ai demo analytics (simulated, derived from the live local queue)',
      `Generated: ${new Date().toISOString()}`,
      `Patients in queue: ${analytics.total}`,
      `Triage distribution: ${analytics.distribution.map((item) => `${item.name} ${item.value}`).join(', ')}`,
      `Average wait by acuity: ${analytics.waitByLevel.map((item) => `${item.name} ${item.wait}m`).join(', ')}`,
      `Override rate: ${analytics.overrideRate}% (${analytics.overrides.length} of ${analytics.total})`,
      `AI/clinician alignment: ${analytics.alignment}%`,
      `Data completeness: ${analytics.completeness}%`,
      `Median processing: ${analytics.medianProcessing}s`,
      `High-risk alerts: ${analytics.deterioratingPatients.length} deteriorating, ${analytics.incomplete.length} incomplete records`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'patient-triage-analytics.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-7">
      <DemoNotice />
      <SectionHeading
        eyebrow="Analytics / simulated shift"
        title="Signals in motion"
        detail="Every number below is derived live from the local demo queue — add a patient or save an override and this page changes."
        action={
          <Button variant="secondary" testId="button-export-analytics" onClick={exportSnapshot}>
            <Download size={15} aria-hidden />
            Export snapshot
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Median processing"
          value={`${analytics.medianProcessing}s`}
          delta="capture to score (simulated)"
          icon={Zap}
          testId="metric-processing"
        />
        <Metric
          label="Override rate"
          value={`${analytics.overrideRate}%`}
          delta={`${analytics.overrides.length} of ${analytics.total} cases`}
          tone="accent"
          icon={SlidersHorizontal}
          testId="metric-override-rate"
        />
        <Metric
          label="Completeness"
          value={`${analytics.completeness}%`}
          delta="required signals present"
          icon={FileText}
          testId="metric-completeness"
        />
        <Metric
          label="High-risk alerts"
          value={String(analytics.needsReview.length).padStart(2, '0')}
          delta="needs review"
          tone="danger"
          icon={AlertCircle}
          testId="metric-alerts"
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="clay-card p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="eyebrow text-[hsl(var(--primary))]">Queue shape</div>
              <h3 className="mt-1 font-bold">Triage distribution</h3>
            </div>
            <Tip text="Counts reflect the effective level: the simulated acuity suggestion, unless a clinician override is recorded.">
              <CircleHelp size={15} aria-hidden className="text-[hsl(var(--muted-foreground))]" />
            </Tip>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.distribution} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(198 23% 86% / .7)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(211 19% 47%)' }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, maxDistribution]} />
                <RechartsTooltip
                  cursor={{ fill: 'hsl(199 42% 91% / .45)' }}
                  contentStyle={{ border: '1px solid hsl(198 23% 86%)', borderRadius: 0, fontSize: 11, background: 'hsl(0 0% 100%)' }}
                />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {analytics.distribution.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-1">
            {analytics.distribution.map((item) => (
              <div key={item.name} className="text-center">
                <span aria-hidden className="mx-auto block h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
                <span className="mt-1 block text-[9px] text-[hsl(var(--muted-foreground))]">
                  {item.name} · {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="clay-card p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="eyebrow text-[hsl(var(--primary))]">Flow</div>
              <h3 className="mt-1 font-bold">Average wait by acuity</h3>
            </div>
            <Timer size={16} aria-hidden className="text-[hsl(var(--accent))]" />
          </div>
          <div className="space-y-3 py-3">
            {analytics.waitByLevel.map((item) => (
              <div className="flex items-center gap-3" key={item.name}>
                <span className="mono w-7 text-xs font-bold">{item.name}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-full bg-[hsl(var(--background))]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.wait / maxWait) * 100}%` }}
                    className="h-full rounded-full bg-[hsl(var(--primary)/.72)]"
                  />
                </div>
                <span className="mono w-16 text-right text-xs">{item.count ? `${item.wait}m` : '—'}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 border-t border-[hsl(var(--border))] pt-4 text-xs text-[hsl(var(--muted-foreground))]">
            Waiting-time escalation feeds the fusion score directly — long waits raise acuity suggestions instead of
            being silently ignored. It never replaces clinical review.
          </p>
        </div>
        <div className="clay-card p-5 lg:col-span-2">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <div className="eyebrow text-[hsl(var(--primary))]">Calibration</div>
              <h3 className="mt-1 font-bold">AI suggestions vs clinician decisions, by level</h3>
            </div>
            <div className="flex gap-4 text-[10px] text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-1">
                <span aria-hidden className="h-2 w-2 bg-[hsl(var(--primary))]" />
                AI suggestion
              </span>
              <span className="flex items-center gap-1">
                <span aria-hidden className="h-2 w-2 bg-[hsl(var(--accent))]" />
                Clinician decision
              </span>
            </div>
          </div>
          <div className="flex h-52 items-end gap-4 border-b border-l border-[hsl(var(--border))] px-3 pt-3">
            {analytics.aiDistribution.map((item) => (
              <div className="flex flex-1 flex-col items-center justify-end gap-1" key={item.name}>
                <div className="flex w-full items-end justify-center gap-1">
                  <div
                    className="w-4 rounded-t-md bg-[hsl(var(--primary))]"
                    style={{ height: `${(item.ai / maxPaired) * 160}px` }}
                    title={`AI suggested ${item.name}: ${item.ai}`}
                  />
                  <div
                    className="w-4 rounded-t-md bg-[hsl(var(--accent))]"
                    style={{ height: `${(item.clinician / maxPaired) * 160}px` }}
                    title={`Clinician decision ${item.name}: ${item.clinician}`}
                  />
                </div>
                <span className="mono text-[9px] text-[hsl(var(--muted-foreground))]">
                  {item.name} · {item.ai}/{item.clinician}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">
            AI/clinician alignment this shift: <strong className="mono">{analytics.alignment}%</strong> — where the bars
            differ, a documented human override changed the queue.
          </p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="clay-card p-5">
          <div className="eyebrow text-[hsl(var(--primary))]">Queue movement</div>
          <div className="mt-4 space-y-3">
            {[
              ['Promoted by override', String(analytics.promoted).padStart(2, '0'), 'text-[hsl(var(--primary))]', ArrowUpRight],
              ['Held for review', String(analytics.needsReview.length).padStart(2, '0'), 'text-[hsl(var(--accent))]', Clock3],
              ['Moved down by override', String(analytics.demoted).padStart(2, '0'), 'text-[hsl(var(--muted-foreground))]', ArrowDownRight],
            ].map(([label, value, tone, Icon]) => (
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-2" key={label as string}>
                <span className="flex items-center gap-2 text-xs">
                  <Icon size={14} aria-hidden className={tone as string} />
                  {label as string}
                </span>
                <strong className={`mono ${tone as string}`}>{value as string}</strong>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="eyebrow mb-2 text-[hsl(var(--muted-foreground))]">Arrivals by hour</div>
            <div className="flex h-16 items-end gap-1">
              {analytics.arrivalsByHour.map((item) => (
                <div key={item.hour} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t-md bg-[hsl(var(--primary)/.55)]" style={{ height: `${(item.count / maxArrivals) * 48}px` }} />
                  <span className="mono text-[8px] text-[hsl(var(--muted-foreground))]">{item.hour}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="clay-card p-5">
          <div className="eyebrow text-[hsl(var(--primary))]">Signals</div>
          <h3 className="mt-1 font-bold">High-risk alerts</h3>
          <div className="mt-4 space-y-3">
            <div className="border-l-2 border-[hsl(var(--destructive))] pl-3">
              <div className="text-xs font-bold">
                {analytics.deterioratingPatients.length} deteriorating signal{analytics.deterioratingPatients.length === 1 ? '' : 's'}
              </div>
              <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                {analytics.deterioratingPatients.map((patient) => patient.name).join(' · ') || 'None right now'}
              </div>
            </div>
            <div className="border-l-2 border-[hsl(var(--accent))] pl-3">
              <div className="text-xs font-bold">
                {analytics.incomplete.length} incomplete record{analytics.incomplete.length === 1 ? '' : 's'}
              </div>
              <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                {analytics.incomplete.length ? 'Review before relying on score' : 'All records complete'}
              </div>
            </div>
          </div>
        </div>
        <div className="clay-card p-5">
          <div className="eyebrow text-[hsl(var(--primary))]">Reliability</div>
          <h3 className="mt-1 font-bold">Processing time</h3>
          <div className="mt-4 flex items-end gap-2">
            <strong className="mono text-4xl">{analytics.medianProcessing}</strong>
            <span className="mb-1 text-xs text-[hsl(var(--muted-foreground))]">seconds median (simulated)</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[hsl(var(--secondary))]">
            <div
              className="h-full rounded-full bg-[hsl(var(--primary))]"
              style={{ width: `${Math.min(100, Math.round((analytics.medianProcessing / 30) * 100))}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">Target: under 30 seconds</p>
        </div>
      </div>
    </div>
  );
}
