import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle, ArrowDownRight, ArrowUpRight, Clock3, Download,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import { deriveAnalytics } from '@/lib/triage';
import { usePatients } from '@/lib/store';
import { BigStat, Button, Reveal, SectionHeading } from '@/components/primitives';

const grow = { type: 'spring', stiffness: 80, damping: 20 } as const;

// Chart on the left (~60%), a light description column on the right.
function ChartSection({
  kicker,
  title,
  points,
  children,
  flip = false,
}: {
  kicker: string;
  title: string;
  points: string[];
  children: ReactNode;
  flip?: boolean;
}) {
  return (
    <Reveal
      className={`grid min-h-[60dvh] items-center gap-10 py-10 lg:gap-16 ${flip ? 'lg:grid-cols-[.8fr_1.2fr]' : 'lg:grid-cols-[1.2fr_.8fr]'}`}
    >
      <div className={`order-2 ${flip ? 'lg:order-2' : 'lg:order-1'}`}>{children}</div>
      <div className={`order-1 ${flip ? 'lg:order-1' : 'lg:order-2'}`}>
        <div className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--primary))]">{kicker}</div>
        <h3 className="mt-2 text-3xl font-bold leading-tight tracking-tight md:text-4xl">{title}</h3>
        <ul className="mt-8 space-y-4">
          {points.map((point, index) => (
            <motion.li
              key={point}
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, ease: 'easeOut', delay: 0.15 + index * 0.1 }}
              className="flex items-start gap-3 text-base text-[hsl(var(--muted-foreground))]"
            >
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--accent))]" />
              {point}
            </motion.li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

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
    <div className="space-y-12 pb-16">
      <SectionHeading
        title="Signals in motion"
        detail="Every number below is derived live from the local demo queue — add a patient or save an override and this page changes."
        action={
          <Button variant="secondary" testId="button-export-analytics" onClick={exportSnapshot}>
            <Download size={15} aria-hidden />
            Export snapshot
          </Button>
        }
      />

      <div className="grid gap-10 border-y border-[hsl(var(--border))] py-10 sm:grid-cols-2 lg:grid-cols-4">
        <BigStat label="Median processing" value={`${analytics.medianProcessing}s`} delta="capture to score (simulated)" testId="metric-processing" />
        <BigStat
          label="Override rate"
          value={`${analytics.overrideRate}%`}
          delta={`${analytics.overrides.length} of ${analytics.total} cases`}
          tone="accent"
          testId="metric-override-rate"
          delay={0.08}
        />
        <BigStat label="Completeness" value={`${analytics.completeness}%`} delta="required signals present" testId="metric-completeness" delay={0.16} />
        <BigStat
          label="High-risk alerts"
          value={String(analytics.needsReview.length).padStart(2, '0')}
          delta="needs review"
          tone="danger"
          testId="metric-alerts"
          delay={0.24}
        />
      </div>

      <ChartSection
        kicker="Queue shape"
        title="Triage distribution"
        points={[
          'One bar per triage level across the current queue.',
          'Counts follow the effective level — an override moves its patient instantly.',
          `${analytics.total} patients on the board right now.`,
        ]}
      >
        <div className="h-[34dvh] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.distribution} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(198 23% 86% / .7)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(211 19% 47%)' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, maxDistribution]} />
              <RechartsTooltip
                cursor={{ fill: 'hsl(199 42% 91% / .45)' }}
                contentStyle={{ border: '1px solid hsl(198 23% 86%)', borderRadius: 12, fontSize: 12, background: 'hsl(0 0% 100%)' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {analytics.distribution.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {analytics.distribution.map((item) => (
            <div key={item.name} className="text-center">
              <span aria-hidden className="mx-auto block h-2 w-2 rounded-full" style={{ background: item.color }} />
              <span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
                {item.name} · {item.value}
              </span>
            </div>
          ))}
        </div>
      </ChartSection>

      <ChartSection
        flip
        kicker="Flow"
        title="Average wait by acuity"
        points={[
          'Mean waiting time for each level, live.',
          'Long waits feed the score — escalation is an input, not a footnote.',
          `Longest average right now: ${Math.max(...analytics.waitByLevel.map((item) => item.wait))}m.`,
        ]}
      >
        <div className="space-y-4">
          {analytics.waitByLevel.map((item, index) => (
            <div className="flex items-center gap-3" key={item.name}>
              <span className="mono w-8 text-sm font-bold">{item.name}</span>
              <div className="h-7 flex-1 overflow-hidden rounded-full bg-[hsl(var(--background))] shadow-[var(--clay-inset)]">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${Math.max(2, (item.wait / maxWait) * 100)}%` }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ ...grow, delay: index * 0.1 }}
                  className="h-full rounded-full bg-[hsl(var(--primary)/.72)]"
                />
              </div>
              <span className="mono w-14 text-right text-sm">{item.count ? `${item.wait}m` : '—'}</span>
            </div>
          ))}
        </div>
      </ChartSection>

      <ChartSection
        kicker="Calibration"
        title="AI suggestions vs clinician decisions"
        points={[
          'Teal is the model, amber is the human.',
          'Where the bars differ, a documented override changed the queue.',
          `Alignment this shift: ${analytics.alignment}%.`,
        ]}
      >
        <div className="flex h-[30dvh] items-end gap-4 border-b border-l border-[hsl(var(--border))] px-3 pt-3 md:gap-6 md:px-6">
          {analytics.aiDistribution.map((item, index) => (
            <div className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={item.name}>
              <div className="flex h-full w-full items-end justify-center gap-1.5">
                <motion.div
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(item.ai / maxPaired) * 92}%` }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ ...grow, delay: index * 0.08 }}
                  className="w-6 rounded-t-lg bg-[hsl(var(--primary))] md:w-8"
                  title={`AI suggested ${item.name}: ${item.ai}`}
                />
                <motion.div
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(item.clinician / maxPaired) * 92}%` }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ ...grow, delay: index * 0.08 + 0.05 }}
                  className="w-6 rounded-t-lg bg-[hsl(var(--accent))] md:w-8"
                  title={`Clinician decision ${item.name}: ${item.clinician}`}
                />
              </div>
              <span className="mono text-xs text-[hsl(var(--muted-foreground))]">
                {item.name} · {item.ai}/{item.clinician}
              </span>
            </div>
          ))}
        </div>
      </ChartSection>

      <ChartSection
        flip
        kicker="Arrivals"
        title="Queue movement over the shift"
        points={[
          'Arrivals bucketed by hour of registration.',
          `Promoted by override: ${String(analytics.promoted).padStart(2, '0')} · moved down: ${String(analytics.demoted).padStart(2, '0')}.`,
          `Held for review right now: ${String(analytics.needsReview.length).padStart(2, '0')}.`,
        ]}
      >
        <div className="flex h-[28dvh] items-end gap-2.5">
          {analytics.arrivalsByHour.map((item, index) => (
            <div key={item.hour} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <motion.div
                initial={{ height: 0 }}
                whileInView={{ height: `${(item.count / maxArrivals) * 88}%` }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ ...grow, delay: index * 0.06 }}
                className="w-full rounded-t-lg bg-[hsl(var(--primary)/.55)]"
              />
              <span className="mono text-[10px] text-[hsl(var(--muted-foreground))]">{item.hour}</span>
            </div>
          ))}
        </div>
      </ChartSection>

      <ChartSection
        kicker="Reliability"
        title="Alerts and processing health"
        points={[
          `${analytics.deterioratingPatients.length} deteriorating: ${analytics.deterioratingPatients.map((patient) => patient.name).join(' · ') || 'none right now'}.`,
          `${analytics.incomplete.length} incomplete record${analytics.incomplete.length === 1 ? '' : 's'} — review before trusting the score.`,
          'Processing time is simulated; target is under 30 seconds.',
        ]}
      >
        <div>
          <div className="flex items-end gap-3">
            <strong className="mono text-6xl md:text-7xl">{analytics.medianProcessing}</strong>
            <span className="mb-2 text-sm text-[hsl(var(--muted-foreground))]">seconds median (simulated)</span>
          </div>
          <div className="mt-5 h-4 overflow-hidden rounded-full bg-[hsl(var(--secondary))] shadow-[var(--clay-inset)]">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${Math.min(100, Math.round((analytics.medianProcessing / 30) * 100))}%` }}
              viewport={{ once: true, margin: '-60px' }}
              transition={grow}
              className="h-full rounded-full bg-[hsl(var(--primary))]"
            />
          </div>
          <div className="mt-8 space-y-4">
            {[
              ['Promoted by override', String(analytics.promoted).padStart(2, '0'), 'text-[hsl(var(--primary))]', ArrowUpRight],
              ['Held for review', String(analytics.needsReview.length).padStart(2, '0'), 'text-[hsl(var(--accent))]', Clock3],
              ['Moved down by override', String(analytics.demoted).padStart(2, '0'), 'text-[hsl(var(--muted-foreground))]', ArrowDownRight],
              ['Deteriorating signals', String(analytics.deterioratingPatients.length).padStart(2, '0'), 'text-[hsl(var(--destructive))]', AlertCircle],
            ].map(([label, value, tone, Icon]) => (
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3" key={label as string}>
                <span className="flex items-center gap-2.5 text-sm">
                  <Icon size={16} aria-hidden className={tone as string} />
                  {label as string}
                </span>
                <strong className={`mono text-lg ${tone as string}`}>{value as string}</strong>
              </div>
            ))}
          </div>
        </div>
      </ChartSection>

      <Reveal className="mx-auto max-w-5xl py-24 text-center md:py-32">
        <h2 className="text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
          Numbers you can interrogate.<br />
          <span className="text-[hsl(var(--primary))]">Decisions you can defend.</span>
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-[hsl(var(--muted-foreground))] md:text-xl">
          Every chart on this page is computed from the live queue — run the demo, save an override, and watch the
          story change. Nothing here is hard-coded, and nothing outranks the clinician.
        </p>
      </Reveal>
    </div>
  );
}
