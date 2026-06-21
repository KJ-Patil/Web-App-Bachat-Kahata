"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Settings, LogOut, Plus, Globe, List, BookOpen, BarChart3, Download, CreditCard, Mic, Users, Activity, SlidersHorizontal, Receipt, BrainCircuit, GraduationCap } from "lucide-react";
import { useLazyCatchUpSync } from "@/core/store/CatchUpSync";
import AddTransactionModal from "@/components/modals/AddTransactionModal";
import CurrencyPickerSheet from "@/components/modals/CurrencyPickerSheet";
import VoiceLoggingModal from "@/components/voice/VoiceLoggingModal";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavigationItem[] = [
  { name: "Workspace", href: "/home", icon: Home },
  { name: "Transactions", href: "/transactions", icon: List },
  { name: "Notebooks", href: "/ledger", icon: BookOpen },
  { name: "Bill Splitter", href: "/bill-splitter", icon: Receipt },
  { name: "Family Wallet", href: "/family-wallet", icon: Users },
  { name: "Mood Insights", href: "/mood-insights", icon: BrainCircuit },
  { name: "Health Score", href: "/health-score", icon: Activity },
  { name: "CIBIL Sim", href: "/cibil-simulator", icon: SlidersHorizontal },
  { name: "Academy", href: "/academy", icon: GraduationCap },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "EMI Tracker", href: "/emi-tracker", icon: CreditCard },
  { name: "Export", href: "/export", icon: Download },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  
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

  const handleLogout = () => {
    localStorage.removeItem("user_session");
    router.push("/login");
  };

  const handleCurrencySelect = (code: string) => {
    setActiveCurrency(code);
    // Reload active route to re-format values
    window.location.reload();
  };

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
            Bachat Khata
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive
                    ? "bg-primary-lighter text-primary"
                    : "text-foreground-secondary hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="mr-3 h-5 w-5 shrink-0" />
                {item.name}
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
            Currency: <span className="ml-1 text-primary font-bold">{activeCurrency}</span>
          </button>

          {/* Central Add Transaction Trigger on Desktop */}
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add
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
            Sign Out
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
          Workspace
        </Link>

        <Link
          href="/transactions"
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold transition-colors ${
            pathname === "/transactions" ? "text-primary" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <List className="h-5 w-5 mb-0.5" />
          Transactions
        </Link>

        <Link
          href="/ledger"
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold transition-colors ${
            pathname === "/ledger" ? "text-primary" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <BookOpen className="h-5 w-5 mb-0.5" />
          Notebooks
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
          Analytics
        </Link>

        <Link
          href="/settings"
          className={`flex flex-col items-center justify-center flex-1 h-full text-[10px] font-bold transition-colors ${
            pathname === "/settings" ? "text-primary" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          <Settings className="h-5 w-5 mb-0.5" />
          Settings
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
