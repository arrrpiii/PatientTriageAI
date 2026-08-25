import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { type TriageLevel, levelMeta } from '@/lib/triage';

export const springy = { type: 'spring', stiffness: 420, damping: 24 } as const;

// Count-up number: tweens toward `value` whenever it changes, preserving zero-padding.
export function AnimatedNumber({ value, pad = 0, className }: { value: number; pad?: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const controls = animate(previous.current, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    previous.current = value;
    return () => controls.stop();
  }, [value]);
  return <span className={className}>{String(display).padStart(pad, '0')}</span>;
}

// Scroll-reveal wrapper: fades and rises the first time it enters the viewport.
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Tip({ children, text }: { children: ReactNode; text: string }) {
  return (
    <span className="group relative inline-flex items-center" tabIndex={0} aria-label={text}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-56 -translate-x-1/2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--sidebar))] p-2.5 text-[11px] leading-snug text-[hsl(var(--sidebar-foreground))] shadow-lg group-hover:block group-focus-visible:block"
      >
        {text}
      </span>
    </span>
  );
}

export function LevelBadge({ level, compact = false }: { level: TriageLevel; compact?: boolean }) {
  const meta = levelMeta(level);
  return (
    <motion.span
      initial={{ scale: 0.75, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={springy}
      data-testid={`status-triage-${level}`}
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
      style={{ borderColor: `${meta.color}66`, color: meta.color, backgroundColor: `${meta.color}12`, boxShadow: `inset 0 1px 1.5px ${meta.color}22, 0 2px 6px -2px ${meta.color}44` }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {compact ? meta.short : `${meta.short} · ${meta.label}`}
    </motion.span>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  type = 'button',
  testId,
  ariaLabel,
  ariaPressed,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  testId?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
}) {
  const variants = {
    primary:
      'bg-[hsl(var(--primary))] text-white hover:brightness-110 shadow-[0_6px_16px_-6px_hsl(var(--primary)/.55),inset_0_1.5px_2px_hsl(0_0%_100%/.35),inset_0_-2.5px_5px_hsl(0_0%_0%/.18)]',
    secondary: 'clay-chip hover:bg-[hsl(var(--secondary))]',
    ghost: 'rounded-full text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]',
    danger:
      'rounded-full border border-[hsl(var(--destructive)/.35)] bg-[hsl(var(--destructive)/.08)] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.14)] shadow-[var(--clay-shadow-sm)]',
  };
  return (
    <motion.button
      whileHover={disabled ? undefined : { y: -1.5 }}
      whileTap={disabled ? undefined : { scale: 0.94, y: 0 }}
      transition={springy}
      type={type}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function SectionHeading({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {detail && <p className="mt-1 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

// Large de-carded statistic: big count-up number directly on the page background.
export function BigStat({
  label,
  value,
  delta,
  tone = 'normal',
  testId,
  delay = 0,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: 'normal' | 'danger' | 'accent';
  testId?: string;
  delay?: number;
}) {
  const match = /^(\d+)(.*)$/.exec(value);
  const toneClass =
    tone === 'danger'
      ? 'text-[hsl(var(--destructive))]'
      : tone === 'accent'
        ? 'text-[hsl(var(--accent))]'
        : 'text-[hsl(var(--foreground))]';
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      whileHover={{ y: -4 }}
      data-testid={testId}
    >
      <div className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{label}</div>
      <div className={`mono mt-2 text-5xl font-bold tracking-tight md:text-6xl ${toneClass}`}>
        {match ? (
          <>
            <AnimatedNumber
              value={Number(match[1])}
              pad={match[1].length > 1 && match[1].startsWith('0') ? match[1].length : 0}
            />
            {match[2]}
          </>
        ) : (
          value
        )}
      </div>
      {delta && <div className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{delta}</div>}
      <motion.span
        aria-hidden
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: delay + 0.25 }}
        className={`mt-3 block h-1 w-12 origin-left rounded-full ${tone === 'danger' ? 'bg-[hsl(var(--destructive))]' : tone === 'accent' ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--primary))]'}`}
      />
    </motion.div>
  );
}

export function DemoNotice() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--accent)/.08)] p-3.5 text-xs text-[hsl(var(--foreground))] shadow-[inset_0_1.5px_2px_hsl(0_0%_100%/.5),inset_0_-2px_4px_hsl(var(--accent)/.12)]">
      <Info size={16} aria-hidden className="mt-0.5 shrink-0 text-[hsl(var(--accent))]" />
      <span>
        <strong>Demo Mode — simulated clinical decision support.</strong> All records are fictional. PatientTriage.ai
        provides explainable decision support, never a diagnosis or treatment instruction. Clinicians remain in control.
      </span>
    </div>
  );
}
