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
        className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto clay-card p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow text-[hsl(var(--primary))]">System map</div>
            <h2 className="mt-1 text-2xl font-bold">Explainability architecture</h2>
          </div>
          <button onClick={onClose} aria-label="Close architecture map" data-testid="button-close-architecture">
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="my-8 grid gap-2 sm:grid-cols-5">
          {STAGES.map((item, index) => (
            <div className="relative rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 text-center shadow-[var(--clay-shadow-sm)]" key={item}>
              <div className="mx-auto mb-2 grid h-7 w-7 place-items-center rounded-full bg-[hsl(var(--primary)/.12)] text-xs font-bold text-[hsl(var(--primary))]">
                {index + 1}
              </div>
              <div className="text-[11px] font-bold leading-tight">{item}</div>
              {index < 4 && (
                <ArrowRight aria-hidden className="absolute -right-4 top-5 z-10 hidden text-[hsl(var(--accent))] sm:block" size={16} />
              )}
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border-l-2 border-[hsl(var(--primary))] pl-4">
            <h3 className="text-sm font-bold">This prototype: local and deterministic</h3>
            <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
              The demo scores symptom keywords, risk factors, abnormal vitals, age, consciousness, pain,
              missing-data penalties, and waiting-time escalation with a readable local engine. The “text model” and
              “vitals model” panels simulate BioClinicalBERT and XGBoost — no real models or servers run.
            </p>
          </div>
          <div className="border-l-2 border-[hsl(var(--accent))] pl-4">
            <h3 className="text-sm font-bold">Human gate</h3>
            <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
              Incomplete or contradictory inputs surface a “Needs clinician review” safeguard. An override writes to
              the audit trail, can be undone, and is never hidden. AI never silently outranks a clinician.
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 shadow-[var(--clay-inset)]">
          <div className="eyebrow text-[hsl(var(--primary))]">A real deployment would use</div>
          <div className="mt-3 grid gap-2 text-xs text-[hsl(var(--muted-foreground))] sm:grid-cols-2">
            <span><strong className="text-[hsl(var(--foreground))]">React Native</strong> — bedside nurse intake on tablets</span>
            <span><strong className="text-[hsl(var(--foreground))]">Next.js</strong> — clinician command center web app</span>
            <span><strong className="text-[hsl(var(--foreground))]">NestJS</strong> — ingestion, scoring, and audit APIs</span>
            <span><strong className="text-[hsl(var(--foreground))]">PostgreSQL</strong> — durable patient and audit records</span>
            <span><strong className="text-[hsl(var(--foreground))]">WebSockets</strong> — live queue updates to every screen</span>
            <span><strong className="text-[hsl(var(--foreground))]">BioClinicalBERT + XGBoost</strong> — text and vitals inference, late-fused</span>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} testId="button-dismiss-architecture">Close map</Button>
        </div>
      </motion.div>
    </div>
  );
}
