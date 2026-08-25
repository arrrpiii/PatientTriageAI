import { motion } from 'framer-motion';
import { ArrowRight, BrainCircuit, Command, Database, FileText, Lightbulb, Play, ShieldCheck, Sparkles, Timer } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { deriveAnalytics, sortPatients } from '@/lib/triage';
import { usePatients } from '@/lib/store';
import { guided } from '@/lib/guided';
import { DemoNotice, LevelBadge, SectionHeading } from '@/components/primitives';

const PIPELINE = [
  { n: '01', title: 'Capture', detail: 'A one-minute intake, built for the triage desk.', icon: FileText },
  { n: '02', title: 'Ingest', detail: 'Secure local persistence normalizes narrative, vitals, and gaps.', icon: Database },
  { n: '03', title: 'Infer', detail: 'Parallel simulated text and vitals models score every signal.', icon: BrainCircuit },
  { n: '04', title: 'Fuse & explain', detail: 'Late fusion produces one suggestion — with its reasons attached.', icon: Lightbulb },
  { n: '05', title: 'Decide', detail: 'The clinician reviews, overrides, and owns the final queue position.', icon: ShieldCheck },
];

export function Landing() {
  const patients = usePatients();
  const [, setLocation] = useLocation();
  const analytics = deriveAnalytics(patients);
  const topQueue = sortPatients(patients).slice(0, 4);

  const launchDemo = () => {
    guided.start();
    setLocation('/dashboard');
  };

  return (
    <div className="space-y-20 pb-12">
      <DemoNotice />
      <section className="grid items-center gap-10 pt-2 lg:grid-cols-[1.08fr_.92fr]">
        <div className="reveal">
          <div className="eyebrow mb-5 flex items-center gap-2 text-[hsl(var(--primary))]">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
            ED operations / signal over noise
          </div>
          <h1 className="max-w-3xl text-5xl font-bold leading-[.98] tracking-[-.055em] md:text-7xl">
            The next decision<br />
            <span className="text-[hsl(var(--primary))]">should be explainable.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[hsl(var(--muted-foreground))]">
            PatientTriage.ai helps emergency teams move from first signal to confident clinical review — faster triage
            at the door, multimodal analysis of symptoms and vitals, explainable prioritization, and a human in the
            loop at every step.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={launchDemo}
              data-testid="button-launch-live-demo"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-6 text-sm font-bold text-white shadow-[0_8px_20px_-8px_hsl(var(--primary)/.7),inset_0_1.5px_2px_hsl(0_0%_100%/.35),inset_0_-2.5px_5px_hsl(0_0%_0%/.18)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--primary))]"
            >
              <Play size={16} aria-hidden />
              Launch live demo
            </button>
            <Link
              href="/intake"
              data-testid="link-launch-intake"
              className="inline-flex min-h-11 items-center gap-2 clay-chip px-6 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-[hsl(var(--secondary))] active:translate-y-0 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--primary))]"
            >
              Open nurse intake <ArrowRight size={16} aria-hidden />
            </Link>
            <Link
              href="/dashboard"
              data-testid="link-open-command-center"
              className="inline-flex min-h-11 items-center gap-2 clay-chip px-6 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-[hsl(var(--secondary))] active:translate-y-0 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--primary))]"
            >
              Open command center <Command size={16} aria-hidden />
            </Link>
          </div>
        </div>
        <motion.div animate={{ y: [0, -7, 0] }} transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut' }} className="relative min-h-[380px] clay-card p-5">
          <div className="absolute right-5 top-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
            <span aria-hidden className="h-2 w-2 rounded-full bg-[hsl(var(--primary))] pulse-dot" />
            live simulation
          </div>
          <div className="eyebrow text-[hsl(var(--muted-foreground))]">Command center / queue snapshot</div>
          <div className="mt-5 grid grid-cols-3 border-y border-[hsl(var(--border))] py-4">
            <div>
              <span className="block text-3xl font-bold">{analytics.total}</span>
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">in queue</span>
            </div>
            <div>
              <span className="block text-3xl font-bold text-[hsl(var(--destructive))]">
                {String(analytics.needsReview.length).padStart(2, '0')}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">review now</span>
            </div>
            <div>
              <span className="block text-3xl font-bold text-[hsl(var(--accent))]">{analytics.medianWait}m</span>
              <span className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">median wait</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {topQueue.map((patient, index) => (
              <div
                key={patient.id}
                className={`flex items-center gap-3 rounded-2xl border-l-4 bg-[hsl(var(--background))] px-3 py-3 shadow-[var(--clay-inset)] ${index === 0 ? 'border-[hsl(var(--destructive))]' : 'border-[hsl(var(--border))]'}`}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[hsl(var(--primary)/.1)] text-[10px] font-bold text-[hsl(var(--primary))]">
                  {patient.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold">{patient.name}</span>
                    <LevelBadge level={patient.clinicianLevel ?? patient.triageLevel} compact />
                  </div>
                  <div className="mt-1 flex gap-3 text-[10px] text-[hsl(var(--muted-foreground))]">
                    <span className="truncate">{patient.complaint}</span>
                    <span className="mono shrink-0">{patient.waitMinutes}m wait</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">
            <Sparkles size={14} aria-hidden className="text-[hsl(var(--accent))]" />
            Scored locally · no patient data leaves this demo
          </div>
        </motion.div>
      </section>
      <section>
        <SectionHeading
          eyebrow="One continuous handoff"
          title="Five stages. One accountable decision."
          detail="A focused path from intake capture to clinician-owned disposition."
        />
        <div className="grid border-y border-[hsl(var(--border))] md:grid-cols-5">
          {PIPELINE.map(({ n, title, detail, icon: Icon }, index) => (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07 }}
              key={n}
              className="group border-b border-[hsl(var(--border))] p-5 last:border-0 md:border-b-0 md:border-r md:last:border-r-0"
            >
              <div className="mb-10 flex items-center justify-between">
                <span className="mono text-xs text-[hsl(var(--muted-foreground))]">{n}</span>
                <Icon size={19} aria-hidden className="text-[hsl(var(--primary))] transition group-hover:scale-110" />
              </div>
              <h3 className="font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{detail}</p>
            </motion.div>
          ))}
        </div>
      </section>
      <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <div className="border-l-4 border-[hsl(var(--accent))] bg-[hsl(var(--secondary)/.55)] p-6">
          <div className="eyebrow mb-4 text-[hsl(var(--primary))]">Designed for humans</div>
          <h2 className="text-3xl font-bold tracking-tight">
            AI can surface a signal.<br />Only a clinician can own it.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            Every suggestion comes with the contributing signals, missing information, and a clean override path. The
            system is built to be questioned.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="clay-card p-5">
            <ShieldCheck aria-hidden className="mb-8 text-[hsl(var(--primary))]" size={22} />
            <h3 className="font-bold">Audit-ready by default</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              Overrides, rationale, and queue movement become a readable timeline.
            </p>
          </div>
          <div className="clay-card p-5">
            <Timer aria-hidden className="mb-8 text-[hsl(var(--accent))]" size={22} />
            <h3 className="font-bold">Built for the first minute</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              Mobile-first intake keeps the nurse moving without losing context.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
