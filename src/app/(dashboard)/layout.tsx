"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Settings, LogOut, Plus, Globe, List, BookOpen, BarChart3, Download, CreditCard, Mic, Users, Activity, SlidersHorizontal, Receipt, BrainCircuit, GraduationCap, Target, PiggyBank, Sparkles, Flame, Repeat, ArrowLeftRight, CalendarDays } from "lucide-react";
import { useLazyCatchUpSync } from "@/core/store/CatchUpSync";
import { clearFinancialData, clearLocalCache } from "@/core/store/dataStore";
import { auth } from "@/config/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import AddTransactionModal from "@/components/modals/AddTransactionModal";
import CurrencyPickerSheet from "@/components/modals/CurrencyPickerSheet";
import VoiceLoggingModal from "@/components/voice/VoiceLoggingModal";
import { refreshExchangeRates } from "@/core/utils/currencyManager";
import { useTranslation } from "@/i18n/i18nContext";

interface NavigationItem {
  nameKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavigationItem[] = [
  { nameKey: "nav.workspace", href: "/home", icon: Home },
  { nameKey: "nav.transactions", href: "/transactions", icon: List },
  { nameKey: "nav.calendar", href: "/calendar", icon: CalendarDays },
  { nameKey: "nav.budgets", href: "/budgets", icon: Target },
  { nameKey: "nav.savingsGoals", href: "/savings", icon: PiggyBank },
  { nameKey: "nav.notebooks", href: "/ledger", icon: BookOpen },
  { nameKey: "nav.billSplitter", href: "/bill-splitter", icon: Receipt },
  { nameKey: "nav.familyWallet", href: "/family-wallet", icon: Users },
  { nameKey: "nav.moodInsights", href: "/mood-insights", icon: BrainCircuit },
  { nameKey: "nav.healthScore", href: "/health-score", icon: Activity },
  { nameKey: "nav.cibilSim", href: "/cibil-simulator", icon: SlidersHorizontal },
  { nameKey: "nav.academy", href: "/academy", icon: GraduationCap },
  { nameKey: "nav.analytics", href: "/analytics", icon: BarChart3 },
  { nameKey: "nav.compareMonths", href: "/comparison", icon: ArrowLeftRight },
  { nameKey: "nav.subscriptions", href: "/subscriptions", icon: Repeat },
  { nameKey: "nav.whatIfSim", href: "/what-if", icon: Sparkles },
  { nameKey: "nav.streaks", href: "/streaks", icon: Flame },
  { nameKey: "nav.emiTracker", href: "/emi-tracker", icon: CreditCard },
  { nameKey: "nav.export", href: "/export", icon: Download },
  { nameKey: "nav.settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  // ─── Auth guard ───────────────────────────────────────────────────────────
  // The dashboard must only render for a genuinely signed-in Firebase user.
  // We trust Firebase's own session (onAuthStateChanged), NOT a localStorage
  // flag — a localStorage value can be forged in devtools, a real session can't.
  // `authChecked` stays false until Firebase resolves the restored session, so
  // we show a spinner instead of flashing the app or a wrong redirect.
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthed(true);
      } else {
        setIsAuthed(false);
        router.replace("/login");
      }
      setAuthChecked(true);
    });
    return unsub;
  }, [router]);

  // One-time purge of legacy seeded/demo data (the old fabricated balances).
  // Runs exactly once per device, then never touches real data the user adds.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const CLEARED_FLAG = "legacy_seed_cleared_v1";
    if (!localStorage.getItem(CLEARED_FLAG)) {
      clearFinancialData();
      localStorage.setItem(CLEARED_FLAG, "true");
    }
  }, []);

  // Trigger client-side Lazy CatchUp synchronization task
  useLazyCatchUpSync();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isCurrencySheetOpen, setIsCurrencySheetOpen] = useState(false);
  const [activeCurrency, setActiveCurrency] = useState("INR");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cur = localStorage.getItem("active_currency");
      if (cur) {
        setActiveCurrency(cur);
      }
      // Keep live FX rates fresh so currency display converts, not just relabels.
      refreshExchangeRates();
    }
  }, []);

  // Hook up Page Visibility API for security lock (60 seconds idle limit)
  useEffect(() => {
    let backgroundTime: number | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        backgroundTime = Date.now();
      } else if (document.visibilityState === "visible" && backgroundTime !== null) {
        const elapsed = Date.now() - backgroundTime;
        // Check if user has been away from tab/workspace for >60 seconds
        if (elapsed > 60000) {
          const storedHash = localStorage.getItem("pin_hash");
          if (storedHash) {
            router.push("/pin-lock");
          }
        }
        backgroundTime = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  const handleLogout = async () => {
    // End the REAL Firebase session (not just a localStorage key), then purge
    // the local cache so leftover financial data can't be read by the next
    // person on a shared device. The cloud copy is preserved and re-synced on
    // the user's next login.
    try {
      await signOut(auth);
    } catch {
      /* even if signOut fails (offline), still clear locally and leave */
    }
    clearLocalCache();
    router.replace("/login");
  };

  const handleCurrencySelect = (code: string) => {
    setActiveCurrency(code);
    // Reload active route to re-format values
    window.location.reload();
  };

  // Until Firebase confirms the session, show a spinner rather than flashing the
  // dashboard. If the user isn't authenticated, render nothing while the
  // redirect to /login (fired in the effect above) takes effect.
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-subtle">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!isAuthed) return null;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background-subtle">
      {/* ────────────────── DESKTOP SIDEBAR ────────────────── */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-card border-r border-border z-20">
        {/* Brand Header */}
        <div className="flex items-center px-6 pt-8 pb-4 border-b border-border">
          <svg
            className="w-8 h-8 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="ml-3 font-extrabold text-xl text-foreground tracking-tight">
            {t('common.appName')}
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.nameKey}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive
                    ? "bg-primary-lighter text-primary"
                    : "text-foreground-secondary hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="mr-3 h-5 w-5 shrink-0" />
                {t(item.nameKey)}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Footer Actions */}
        <div className="p-4 border-t border-border space-y-2">
          {/* Currency Trigger Option */}
          <button
            onClick={() => setIsCurrencySheetOpen(true)}
            className="w-full flex items-center px-4 py-2.5 text-sm font-semibold text-foreground-secondary hover:bg-secondary rounded-xl transition-colors cursor-pointer"
          >
            <Globe className="mr-3 h-5 w-5 shrink-0 text-icon-default" />
            {t('common.currency')}: <span className="ml-1 text-primary font-bold">{activeCurrency}</span>
          </button>

          {/* Central Add Transaction Trigger on Desktop */}
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {t('common.add')}
            </button>
            <button
              onClick={() => setIsVoiceOpen(true)}
              className="btn-secondary px-3 flex items-center justify-center shrink-0 border-primary text-primary hover:bg-primary-lighter"
              aria-label="Voice Logging"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive-light rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="mr-3 h-5 w-5 shrink-0" />
            {t('common.signOut')}
          </button>
        </div>
      </aside>

      {/* ────────────────── MOBILE MAIN NAVIGATION TRAY ────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t border-border z-30 h-16 flex items-center justify-around px-4">
        <Link
          href="/home"
          className={`flex flex-col items-center justify-center flex-1 h-full text-xs font-bold transition-colors ${
            pathname === "/home" ? "text-primary" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <Home className="h-5 w-5 mb-0.5" />
          {t('nav.workspace')}
        </Link>

        <Link
          href="/transactions"
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold transition-colors ${
            pathname === "/transactions" ? "text-primary" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <List className="h-5 w-5 mb-0.5" />
          {t('nav.transactions')}
        </Link>

        <Link
          href="/ledger"
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold transition-colors ${
            pathname === "/ledger" ? "text-primary" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <BookOpen className="h-5 w-5 mb-0.5" />
          {t('nav.notebooks')}
        </Link>

        {/* Central Prominent Mobile Floating Action Button (FAB) */}
        <div className="relative -top-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-14 h-14 rounded-full bg-brand text-brand-foreground shadow-lg flex items-center justify-center hover:bg-brand-hover hover:scale-105 active:scale-95 transition-all focus:outline-none border-[3px] border-background cursor-pointer"
            aria-label="Add Transaction"
          >
            <Plus className="w-7 h-7" />
          </button>
          <button
            onClick={() => setIsVoiceOpen(true)}
            className="absolute -right-12 bottom-1 w-10 h-10 rounded-full bg-primary-lighter text-primary shadow-md flex items-center justify-center hover:bg-primary hover:text-white transition-all focus:outline-none border-2 border-background cursor-pointer"
            aria-label="Voice Logging"
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>

        <Link
          href="/analytics"
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold transition-colors ${
            pathname === "/analytics" ? "text-primary" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <BarChart3 className="h-5 w-5 mb-0.5" />
          {t('nav.analytics')}
        </Link>

        <Link
          href="/settings"
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold transition-colors ${
            pathname === "/settings" ? "text-primary" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <Settings className="h-5 w-5 mb-0.5" />
          {t('nav.settings')}
        </Link>
      </nav>

      {/* ────────────────── CONTENT LAYOUT AREA ────────────────── */}
      <div className="flex flex-1 flex-col md:pl-64 pb-20 md:pb-0">
        <main className="flex-1 flex flex-col">{children}</main>
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          // Trigger hot reloading on workspace page if open
          if (pathname === "/home" || pathname === "/transactions") {
            window.location.reload();
          }
        }}
      />

      {/* Voice Logging Modal */}
      <VoiceLoggingModal 
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onSuccess={() => {
          if (pathname === "/home" || pathname === "/transactions") {
            window.location.reload();
          }
        }}
      />

      {/* Currency Picker Sheet */}
      <CurrencyPickerSheet 
        isOpen={isCurrencySheetOpen} 
        onClose={() => setIsCurrencySheetOpen(false)}
        activeCurrencyCode={activeCurrency}
        onSelect={handleCurrencySelect}
      />
    </div>
  );
}
