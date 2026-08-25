import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity, BarChart3, Bell, Clock3, HeartPulse, LayoutDashboard, Menu, Moon, Plus, Sun, X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { nowLabel } from '@/lib/triage';
import { usePatients } from '@/lib/store';
import { springy } from '@/components/primitives';
import { GuidedOverlay } from '@/components/guided-overlay';
import { Landing } from '@/pages/landing';
import { Intake } from '@/pages/intake';
import { Dashboard } from '@/pages/dashboard';
import { Analytics } from '@/pages/analytics';

const NAV = [
  { href: '/', label: 'Overview', icon: Activity },
  { href: '/intake', label: 'Nurse intake', icon: Plus },
  { href: '/dashboard', label: 'Command center', icon: LayoutDashboard },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('patient-triage-theme') === 'dark');
  const [clock, setClock] = useState(nowLabel());
  const patients = usePatients();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('patient-triage-theme', dark ? 'dark' : 'light');
  }, [dark]);
  useEffect(() => {
    const timer = setInterval(() => setClock(nowLabel()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => setMobileOpen(false), [location]);

  return (
    <div className="noise min-h-[100dvh] bg-[hsl(var(--background))]">
      <header className="sticky top-0 z-40 px-3 pt-3 md:px-6 md:pt-4">
        <nav
          aria-label="Primary navigation"
          className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-3 rounded-[1.75rem] border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar)/.97)] px-3 text-[hsl(var(--sidebar-foreground))] shadow-[0_14px_30px_-14px_hsl(211_48%_10%/.6),inset_0_1.5px_2px_hsl(201_60%_70%/.16),inset_0_-4px_8px_hsl(0_0%_0%/.3)] backdrop-blur md:px-4"
        >
          <Link href="/" className="flex shrink-0 items-center gap-3 pl-1" data-testid="link-brand">
            <motion.span
              aria-hidden
              animate={{ scale: [1, 1.09, 1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
              className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] shadow-[0_6px_14px_-6px_hsl(var(--sidebar-primary)/.8),inset_0_1.5px_2px_hsl(0_0%_100%/.4)]"
            >
              <HeartPulse size={21} strokeWidth={2.5} />
            </motion.span>
            <span className="hidden sm:block">
              <span className="block text-sm font-bold tracking-tight text-white">
                PatientTriage<span className="text-[hsl(var(--sidebar-primary))]">.ai</span>
              </span>
              <span className="eyebrow mt-0.5 block text-[hsl(var(--sidebar-foreground)/.55)]">Team Eclipse · demo</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 rounded-full bg-[hsl(var(--sidebar-accent)/.55)] p-1.5 shadow-[inset_0_2px_5px_hsl(0_0%_0%/.3)] md:flex">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors lg:text-sm ${active ? 'text-[hsl(var(--sidebar-primary-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.7)] hover:text-white'}`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={springy}
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-[hsl(var(--sidebar-primary))] shadow-[0_4px_12px_-4px_hsl(var(--sidebar-primary)/.8),inset_0_1.5px_2px_hsl(0_0%_100%/.35)]"
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <Icon size={15} aria-hidden />
                    {label}
                    {label === 'Command center' && (
                      <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${active ? 'bg-[hsl(var(--sidebar-primary-foreground))] text-[hsl(var(--sidebar-primary))]' : 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'}`}>
                        {patients.length}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 pr-1">
            <span className="hidden items-center gap-2 rounded-full bg-[hsl(var(--sidebar-accent)/.55)] px-3 py-2 text-xs text-[hsl(var(--sidebar-foreground)/.8)] shadow-[inset_0_2px_5px_hsl(0_0%_0%/.3)] lg:flex">
              <span aria-hidden className="h-2 w-2 rounded-full bg-[hsl(var(--accent))] pulse-dot" />
              DEMO
              <span aria-hidden className="text-[hsl(var(--sidebar-border))]">/</span>
              <Clock3 size={13} aria-hidden />
              <span className="mono" data-testid="text-live-clock">{clock}</span>
            </span>
            <motion.button
              whileHover={{ rotate: 18, scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              transition={springy}
              className="grid h-9 w-9 place-items-center rounded-full text-[hsl(var(--sidebar-foreground)/.75)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white"
              onClick={() => setDark(!dark)}
              aria-pressed={dark}
              aria-label={dark ? 'Use light mode' : 'Use dark mode'}
              data-testid="button-toggle-theme"
            >
              {dark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
            </motion.button>
            <motion.button
              whileHover={{ rotate: -12, scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              transition={springy}
              className="relative hidden h-9 w-9 place-items-center rounded-full text-[hsl(var(--sidebar-foreground)/.75)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white sm:grid"
              aria-label="Notifications (demo)"
              data-testid="button-notifications"
            >
              <Bell size={16} aria-hidden />
              <span aria-hidden className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
            </motion.button>
            <span className="hidden h-9 w-9 place-items-center rounded-full bg-[hsl(var(--sidebar-accent))] text-xs font-bold text-[hsl(var(--sidebar-primary))] shadow-[inset_0_1.5px_2px_hsl(201_60%_70%/.15)] sm:grid">
              DR
            </span>
            <button
              className="grid h-9 w-9 place-items-center rounded-full text-[hsl(var(--sidebar-foreground)/.8)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              data-testid="button-open-menu"
            >
              {mobileOpen ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={springy}
              className="mx-auto mt-2 max-w-[1500px] rounded-3xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar)/.98)] p-2 text-[hsl(var(--sidebar-foreground))] shadow-[0_14px_30px_-14px_hsl(211_48%_10%/.6)] backdrop-blur md:hidden"
            >
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  data-testid={`link-mobilenav-${label.toLowerCase().replace(' ', '-')}`}
                  aria-current={location === href ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${location === href ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.75)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white'}`}
                >
                  <Icon size={16} aria-hidden />
                  {label}
                  {label === 'Command center' && (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--accent))] px-1.5 text-[10px] font-bold text-[hsl(var(--accent-foreground))]">
                      {patients.length}
                    </span>
                  )}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <motion.main
        key={location}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        className="mx-auto max-w-[1500px] p-4 md:p-8"
      >
        {children}
      </motion.main>
      <GuidedOverlay />
    </div>
  );
}

function Router() {
  const [route] = useLocation();
  return (
    <ErrorBoundary resetKey={route}>
      <Shell>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/intake" component={Intake} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/analytics" component={Analytics} />
          <Route component={NotFound} />
        </Switch>
      </Shell>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <MotionConfig reducedMotion="user">
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        </MotionConfig>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
