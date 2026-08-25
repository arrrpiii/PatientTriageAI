import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, MotionConfig, motion, useScroll } from 'framer-motion';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity, BarChart3, Bell, HeartPulse, LayoutDashboard, Menu, Moon, Plus, Sun, X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
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
  const { scrollYProgress } = useScroll();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('patient-triage-theme') === 'dark');
  const patients = usePatients();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('patient-triage-theme', dark ? 'dark' : 'light');
  }, [dark]);
  useEffect(() => setMobileOpen(false), [location]);

  return (
    <div className="noise min-h-[100dvh] bg-[hsl(var(--background))]">
      <motion.div
        aria-hidden
        style={{ scaleX: scrollYProgress }}
        className="fixed inset-x-0 top-0 z-[70] h-1 origin-left bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))]"
      />
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar)/.97)] backdrop-blur">
        <nav
          aria-label="Primary navigation"
          className="mx-auto flex h-20 max-w-[1500px] items-center justify-between gap-3 px-4 text-[hsl(var(--sidebar-foreground))] md:px-8"
        >
          <Link href="/" className="flex shrink-0 items-center gap-3 pl-1" data-testid="link-brand">
            <motion.span
              aria-hidden
              animate={{ scale: [1, 1.09, 1, 1.06, 1] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
              className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]"
            >
              <HeartPulse size={21} strokeWidth={2.5} />
            </motion.span>
            <span className="hidden sm:block">
              <span className="block text-base font-bold tracking-tight text-white">
                PatientTriage<span className="text-[hsl(var(--sidebar-primary))]">.ai</span>
              </span>
              <span className="mt-0.5 block text-xs font-medium tracking-wide text-[hsl(var(--sidebar-foreground)/.6)]">Team BitCrush · Demo</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors lg:text-base ${active ? 'text-white' : 'text-[hsl(var(--sidebar-foreground)/.7)] hover:text-white'}`}
                >
                  {active && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      aria-hidden
                      className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[hsl(var(--sidebar-primary))]"
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    <Icon size={15} aria-hidden />
                    {label}
                    {label === 'Command center' && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--accent))] px-1.5 text-[10px] font-bold text-[hsl(var(--accent-foreground))]">
                        {patients.length}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 pr-1">
            <span className="hidden items-center px-3 py-2 text-sm font-semibold text-[hsl(var(--sidebar-foreground)/.8)] lg:flex">
              DEMO
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
              className="border-t border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar)/.98)] p-2 text-[hsl(var(--sidebar-foreground))] md:hidden"
            >
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  data-testid={`link-mobilenav-${label.toLowerCase().replace(' ', '-')}`}
                  aria-current={location === href ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold transition-colors ${location === href ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.75)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-white'}`}
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
