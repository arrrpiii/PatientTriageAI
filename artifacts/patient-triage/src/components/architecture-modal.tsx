import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/primitives';

const STAGES = [
  'Patient arrival & data capture',
  'Secure ingestion & persistence',
  'Parallel AI inference',
  'Late fusion & explainability',
  'Clinician review & override',
];

const REAL_STACK = [
  ['React Native', 'bedside nurse intake on tablets'],
  ['Next.js', 'clinician command center web app'],
  ['NestJS', 'ingestion, scoring, and audit APIs'],
  ['PostgreSQL', 'durable patient and audit records'],
  ['WebSockets', 'live queue updates to every screen'],
  ['BioClinicalBERT + XGBoost', 'text and vitals inference, late-fused'],
];

export function ArchitectureModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[hsl(var(--sidebar)/.48)] p-4" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Architecture and pipeline"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto clay-card p-8 md:p-12"
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--primary))]">System map</div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Explainability architecture</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close architecture map"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
            data-testid="button-close-architecture"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="my-12 grid gap-4 sm:grid-cols-5">
          {STAGES.map((item, index) => (
            <div
              className="relative rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-5 text-center shadow-[var(--clay-shadow-sm)]"
              key={item}
            >
              <div className="mx-auto mb-4 grid h-10 w-10 place-items-center rounded-full bg-[hsl(var(--primary)/.12)] text-base font-bold text-[hsl(var(--primary))]">
                {index + 1}
              </div>
              <div className="text-sm font-bold leading-snug">{item}</div>
              {index < 4 && (
                <ArrowRight
                  aria-hidden
                  className="absolute -right-5 top-8 z-10 hidden text-[hsl(var(--accent))] sm:block"
                  size={18}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-10 md:grid-cols-2">
          <div className="border-l-4 border-[hsl(var(--primary))] pl-6">
            <h3 className="text-lg font-bold">This prototype: local and deterministic</h3>
            <p className="mt-3 text-base leading-relaxed text-[hsl(var(--muted-foreground))]">
              The demo scores symptom keywords, risk factors, abnormal vitals, age, consciousness, pain,
              missing-data penalties, and waiting-time escalation with a readable local engine. The “text model” and
              “vitals model” panels simulate BioClinicalBERT and XGBoost — no real models or servers run.
            </p>
          </div>
          <div className="border-l-4 border-[hsl(var(--accent))] pl-6">
            <h3 className="text-lg font-bold">Human gate</h3>
            <p className="mt-3 text-base leading-relaxed text-[hsl(var(--muted-foreground))]">
              Incomplete or contradictory inputs surface a “Needs clinician review” safeguard. An override writes to
              the audit trail, can be undone, and is never hidden. AI never silently outranks a clinician.
            </p>
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 shadow-[var(--clay-inset)] md:p-8">
          <div className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
            A real deployment would use
          </div>
          <div className="mt-5 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {REAL_STACK.map(([name, detail]) => (
              <div key={name} className="flex items-baseline gap-3 border-b border-[hsl(var(--border))] pb-3">
                <strong className="shrink-0 text-base text-[hsl(var(--foreground))]">{name}</strong>
                <span className="text-sm text-[hsl(var(--muted-foreground))]">{detail}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <Button onClick={onClose} testId="button-dismiss-architecture">
            Close map
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
