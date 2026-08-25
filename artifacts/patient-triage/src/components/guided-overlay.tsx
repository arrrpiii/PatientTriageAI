// Floating presenter bar for the guided demo: captions, progress, and
// pause / resume / skip / restart / exit controls. Mounted once in the Shell,
// it also keeps the route in sync with the active step.

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, RotateCcw, SkipForward, Sparkles, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { GUIDED_STEPS, guided, useGuided } from '@/lib/guided';

export function GuidedOverlay() {
  const state = useGuided();
  const [location, setLocation] = useLocation();
  const step = state.active ? GUIDED_STEPS[state.stepIndex] : null;

  useEffect(() => {
    if (step && location !== step.path) setLocation(step.path);
  }, [step?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {step && (
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 32, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="fixed bottom-4 left-1/2 z-[60] w-[min(660px,calc(100vw-2rem))] -translate-x-1/2 rounded-[1.75rem] border border-[hsl(var(--primary)/.4)] bg-[hsl(var(--sidebar)/.97)] p-4 text-[hsl(var(--sidebar-foreground))] shadow-[0_20px_44px_-16px_hsl(211_48%_8%/.7),inset_0_1.5px_2px_hsl(201_60%_70%/.15)] backdrop-blur"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <Sparkles size={18} aria-hidden className="mt-0.5 shrink-0 text-[hsl(var(--sidebar-primary))]" />
            <div className="min-w-0 flex-1">
              <div className="eyebrow flex items-center gap-2 text-[hsl(var(--sidebar-foreground)/.6)]">
                Guided demo · step {state.stepIndex + 1} of {GUIDED_STEPS.length}
                {state.paused && <span className="text-[hsl(var(--accent))]">paused</span>}
              </div>
              <p className="mt-1 text-sm leading-snug text-white">{step.caption}</p>
              <div className="mt-3 flex h-1.5 gap-1" aria-hidden>
                {GUIDED_STEPS.map((item, index) => (
                  <span
                    key={item.id}
                    className={`flex-1 rounded-full ${index <= state.stepIndex ? 'bg-[hsl(var(--sidebar-primary))]' : 'bg-[hsl(var(--sidebar-border))]'}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {step.id !== 'finish' && (
                <>
                  <button
                    onClick={() => (state.paused ? guided.resume() : guided.pause())}
                    aria-label={state.paused ? 'Resume guided demo' : 'Pause guided demo'}
                    className="grid h-8 w-8 place-items-center rounded-full hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
                    data-testid="button-guided-pause"
                  >
                    {state.paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
                  </button>
                  <button
                    onClick={() => guided.next()}
                    aria-label="Skip to next step"
                    className="grid h-8 w-8 place-items-center rounded-full hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
                    data-testid="button-guided-skip"
                  >
                    <SkipForward size={16} aria-hidden />
                  </button>
                </>
              )}
              <button
                onClick={() => guided.restart()}
                aria-label="Restart guided demo"
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
                data-testid="button-guided-restart"
              >
                <RotateCcw size={16} aria-hidden />
              </button>
              <button
                onClick={() => guided.exit()}
                aria-label="Exit guided demo"
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
                data-testid="button-guided-exit"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
