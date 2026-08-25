import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import {
  ArrowRight, BrainCircuit, ChevronDown, Command, Database, FileText, Lightbulb, Play,
  ShieldCheck, Timer,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { guided } from '@/lib/guided';
import { DemoNotice, Reveal } from '@/components/primitives';
import heroBanner from '@/assets/hero-banner.jpg';

const PIPELINE = [
  { n: '01', title: 'Capture', detail: 'A one-minute nurse intake, built for the triage desk. Large touch targets, autosave, and missing-data warnings keep the first minute calm.', icon: FileText, tint: '215 75% 42%' },
  { n: '02', title: 'Ingest', detail: 'Secure local persistence normalizes the narrative, vitals, and gaps into one structured record — nothing leaves the browser in this demo.', icon: Database, tint: '213 60% 50%' },
  { n: '03', title: 'Infer', detail: 'Two simulated models score in parallel: a BioClinicalBERT-style read of the narrative, and an XGBoost-style pass over the vitals.', icon: BrainCircuit, tint: '210 80% 52%' },
  { n: '04', title: 'Fuse & explain', detail: 'Late fusion combines both scores with missing-data penalties and waiting-time escalation — and attaches its reasons in plain language.', icon: Lightbulb, tint: '208 50% 46%' },
  { n: '05', title: 'Decide', detail: 'The clinician reviews, overrides with a documented reason, and owns the final queue position. Every decision lands in an audit trail.', icon: ShieldCheck, tint: '222 65% 38%' },
];

const CTA_BUTTON =
  'inline-flex min-h-11 items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-6 text-sm font-bold text-white shadow-[0_8px_20px_-8px_hsl(var(--primary)/.7),inset_0_1.5px_2px_hsl(0_0%_100%/.35),inset_0_-2.5px_5px_hsl(0_0%_0%/.18)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--primary))]';
const CTA_CHIP =
  'inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10 active:translate-y-0 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(213_85%_62%)]';

function StageCard({
  stage,
  index,
  total,
  progress,
}: {
  stage: (typeof PIPELINE)[number];
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = index / total;
  const end = (index + 1) / total;
  const behind = total - 1 - index;
  const y = useTransform(progress, [start, end, 1], ['112%', '0%', `${-behind * 3.2}%`]);
  const scale = useTransform(progress, [end, 1], [1, 1 - behind * 0.05]);
  const rotate = useTransform(progress, [end, 1], [0, behind === 0 ? 0 : index % 2 ? 1.6 : -1.6]);
  const Icon = stage.icon;
  return (
    <motion.div
      style={{ y, scale, rotate, zIndex: index + 1 }}
      className="clay-card absolute inset-0 flex flex-col justify-between overflow-hidden p-7 md:p-12"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-[.09]"
        style={{ background: `hsl(${stage.tint})` }}
      />
      <div className="flex items-start justify-between">
        <span className="mono text-sm text-[hsl(var(--muted-foreground))]">
          {stage.n} <span className="opacity-50">/ 05</span>
        </span>
        <span
          className="grid h-14 w-14 place-items-center rounded-2xl shadow-[var(--clay-shadow-sm)] md:h-16 md:w-16"
          style={{ background: `hsl(${stage.tint} / .12)`, color: `hsl(${stage.tint})` }}
        >
          <Icon size={26} aria-hidden />
        </span>
      </div>
      <div>
        <h3 className="text-4xl font-bold tracking-tight md:text-6xl" style={{ color: `hsl(${stage.tint})` }}>
          {stage.title}
        </h3>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-xl">
          {stage.detail}
        </p>
      </div>
      <div className="flex items-center gap-2" aria-hidden>
        {PIPELINE.map((item, dot) => (
          <span
            key={item.n}
            className={`h-1.5 rounded-full transition-all ${dot === index ? 'w-8' : 'w-1.5 opacity-30'}`}
            style={{ background: `hsl(${stage.tint})` }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function StageStack() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  return (
    <section ref={ref} id="stages" aria-label="The five stages" className="relative" style={{ height: `${PIPELINE.length * 100 + 60}vh` }}>
      <div className="sticky top-0 flex h-[100dvh] flex-col items-center justify-center overflow-hidden px-1 md:px-4">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Five stages. One accountable decision.</h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Keep scrolling — each stage stacks into place.</p>
        </div>
        <div className="relative h-[56dvh] w-full max-w-4xl md:h-[60dvh]">
          {PIPELINE.map((stage, index) => (
            <StageCard key={stage.n} stage={stage} index={index} total={PIPELINE.length} progress={scrollYProgress} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function Landing() {
  const [, setLocation] = useLocation();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroFade = useTransform(heroProgress, [0, 0.9], [1, 0.25]);

  const launchDemo = () => {
    guided.start();
    setLocation('/dashboard');
  };

  const scrollToStages = () => {
    document.getElementById('stages')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="pb-16">
      <section
        ref={heroRef}
        className="relative left-1/2 -mt-4 w-screen -translate-x-1/2 overflow-hidden text-white md:-mt-8"
        style={{ background: 'linear-gradient(160deg, hsl(211 48% 8%), hsl(211 48% 13%) 55%, hsl(196 55% 12%))' }}
      >
        <img
          src={heroBanner}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'linear-gradient(100deg, hsl(211 48% 7% / .94) 0%, hsl(211 48% 9% / .86) 42%, hsl(205 50% 10% / .55) 75%, hsl(196 55% 10% / .45) 100%)' }}
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-40" style={{ background: 'linear-gradient(to top, hsl(211 48% 8% / .85), transparent)' }} />
        <motion.div
          aria-hidden
          animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 16, ease: 'easeInOut' }}
          className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[hsl(213_85%_55%/.25)] blur-3xl"
        />
        <motion.div
          aria-hidden
          animate={{ x: [0, -70, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 19, ease: 'easeInOut', delay: 2 }}
          className="pointer-events-none absolute -bottom-48 right-[8%] h-[30rem] w-[30rem] rounded-full bg-[hsl(208_90%_60%/.16)] blur-3xl"
        />
        <motion.div
          aria-hidden
          animate={{ x: [0, 40, 0], y: [0, 50, 0] }}
          transition={{ repeat: Infinity, duration: 22, ease: 'easeInOut', delay: 4 }}
          className="pointer-events-none absolute right-[30%] top-[10%] h-80 w-80 rounded-full bg-[hsl(213_70%_50%/.16)] blur-3xl"
        />
        <div aria-hidden className="grid-paper absolute inset-0 opacity-30" />
        <div className="relative mx-auto flex min-h-[calc(100dvh-5rem)] max-w-[1500px] flex-col items-center justify-center px-4 py-16 text-center md:px-8">
        <motion.div style={{ opacity: heroFade }} className="reveal">
          <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[.98] tracking-[-.055em] md:text-7xl">
            The next decision<br />
            <span className="text-[hsl(213_90%_68%)]">should be explainable.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[hsl(201_35%_80%)] md:text-xl">
            PatientTriage.ai helps emergency teams move from first signal to confident clinical review — faster triage
            at the door, multimodal analysis of symptoms and vitals, explainable prioritization, and a human in the
            loop at every step.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <button onClick={launchDemo} data-testid="button-launch-live-demo" className={CTA_BUTTON}>
              <Play size={16} aria-hidden />
              Launch live demo
            </button>
            <Link href="/intake" data-testid="link-launch-intake" className={CTA_CHIP}>
              Open nurse intake <ArrowRight size={16} aria-hidden />
            </Link>
            <Link href="/dashboard" data-testid="link-open-command-center" className={CTA_CHIP}>
              Open command center <Command size={16} aria-hidden />
            </Link>
          </div>
        </motion.div>
        </div>
        <motion.button
          onClick={scrollToStages}
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          aria-label="Scroll down to the five stages"
          data-testid="button-scroll-down"
          className="absolute bottom-7 left-1/2 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full border border-white/20 bg-white/5 text-white backdrop-blur transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(213_85%_62%)]"
        >
          <ChevronDown size={20} aria-hidden />
        </motion.button>
      </section>

      <div className="mt-6">
        <DemoNotice />
      </div>

      <StageStack />

      <section className="mx-auto max-w-5xl px-2 py-28 md:py-40">
        <Reveal>
          <h2 className="text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            AI can surface a signal.<br />
            <span className="text-[hsl(var(--primary))]">Only a clinician can own it.</span>
          </h2>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[hsl(var(--muted-foreground))] md:text-xl">
            Every suggestion comes with the contributing signals, missing information, and a clean override path. The
            system is built to be questioned.
          </p>
        </Reveal>
        <div className="mt-24 grid gap-16 md:grid-cols-2 md:gap-20">
          <Reveal delay={0.08}>
            <ShieldCheck aria-hidden className="text-[hsl(var(--primary))]" size={36} />
            <h3 className="mt-6 text-2xl font-bold tracking-tight md:text-3xl">Audit-ready by default</h3>
            <p className="mt-4 text-lg leading-relaxed text-[hsl(var(--muted-foreground))]">
              Overrides, rationale, and queue movement become a readable timeline that anyone can walk back through.
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <Timer aria-hidden className="text-[hsl(var(--accent))]" size={36} />
            <h3 className="mt-6 text-2xl font-bold tracking-tight md:text-3xl">Built for the first minute</h3>
            <p className="mt-4 text-lg leading-relaxed text-[hsl(var(--muted-foreground))]">
              Mobile-first intake keeps the nurse moving without losing context — under a minute from door to score.
            </p>
          </Reveal>
        </div>
      </section>

      <Reveal className="mx-auto max-w-4xl py-10">
        <div className="clay-card relative overflow-hidden p-10 text-center md:p-14">
          <div aria-hidden className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[hsl(var(--primary)/.08)]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[hsl(var(--accent)/.08)]" />
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">See the whole loop run itself.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            The guided demo captures a high-risk arrival, runs the five-stage pipeline, ranks the live queue, opens the
            explainability panel, and records a clinician override — hands-free.
          </p>
          <div className="mt-8 flex justify-center">
            <button onClick={launchDemo} data-testid="button-launch-live-demo-footer" className={CTA_BUTTON}>
              <Play size={16} aria-hidden />
              Launch live demo
            </button>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
