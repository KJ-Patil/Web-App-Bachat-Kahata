"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Bell, ArrowUpRight, ArrowDownRight, Wallet, Target, Activity, Calendar, Inbox, PiggyBank } from "lucide-react";
import { formatAmount } from "@/core/utils/currencyManager";
import SmsPasteZone from "@/components/automation/SmsPasteZone";
import SafeToSpendCard from "@/components/dashboard/SafeToSpendCard";
import { useTranslation } from "@/i18n/i18nContext";
import {
  useTransactions,
  useBudgets,
  getTotals,
  getMonthTotals,
  getCategoryBreakdown,
  getDailyBalanceTrend,
  getSavingsGoals,
  getSavingsRate,
} from "@/core/store/dataStore";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function WorkspacePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [userName, setUserName] = useState("Guest");
  const [activeCurrency, setActiveCurrency] = useState("INR");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [chartView, setChartView] = useState<"both" | "income" | "spent">("both");

  const { t } = useTranslation();

  const transactions = useTransactions();
  const budgets = useBudgets();

  // ── Derived, real-time metrics computed from the user's own transactions ──
  const totals = useMemo(() => getTotals(transactions), [transactions]);
  const monthTotals = useMemo(() => getMonthTotals(0, transactions), [transactions]);
  const lineTrendData = useMemo(() => getDailyBalanceTrend(7, transactions), [transactions]);
  const categoryBarData = useMemo(
    () =>
      getCategoryBreakdown("expense", 0, transactions).map((c) => ({
        category: c.name,
        Amount: c.value,
      })),
    [transactions]
  );

  // Remaining budget %: this month's spend against the sum of configured budgets.
  const budgetRemaining = useMemo(() => {
    const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
    if (totalBudget <= 0) return null;
    const remaining = Math.max(0, totalBudget - monthTotals.expense);
    return Math.round((remaining / totalBudget) * 1000) / 10;
  }, [budgets, monthTotals.expense]);

  // Overall savings-goal progress.
  const goalProgress = useMemo(() => {
    const goals = getSavingsGoals();
    const target = goals.reduce((a, g) => a + g.target, 0);
    const current = goals.reduce((a, g) => a + g.current, 0);
    if (target <= 0) return null;
    return Math.round((Math.min(current, target) / target) * 1000) / 10;
  }, [transactions]);

  // Health index derived from the real savings rate.
  const healthScore = useMemo(() => {
    if (transactions.length === 0) return null;
    const rate = getSavingsRate(transactions);
    return Math.min(Math.max(Math.round(40 + rate * 0.6), 0), 100);
  }, [transactions]);

  // Total saved across all expenses via discounts.
  const totalSaved = useMemo(
    () => transactions.reduce((acc, t) => acc + (t.discountAmount ?? 0), 0),
    [transactions]
  );

  const hasData = transactions.length > 0;

  // Prevent Next.js hydration issues with Recharts + load client-only state.
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const session = localStorage.getItem("user_session");
      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.name) {
            setUserName(parsed.name);
          }
        } catch (e) {
          // Fallback to raw session value or defaults
        }
      }

      const configCurrency = localStorage.getItem("active_currency");
      if (configCurrency) {
        setActiveCurrency(configCurrency);
      }

      const storedNotes = localStorage.getItem("notifications");
      if (storedNotes) {
        try {
          const parsed = JSON.parse(storedNotes);
          // Notifications may be stored as raw strings or as objects with a message.
          setNotifications(
            parsed.map((n: unknown) =>
              typeof n === "string" ? n : (n as { message?: string }).message || String(n)
            )
          );
        } catch (e) {
          // Ignore malformed notification cache
        }
      }
    }
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.goodMorning');
    if (hour < 17) return t('home.goodAfternoon');
    return t('home.goodEvening');
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 md:p-8 max-w-7xl mx-auto w-full">
      {/* ────────────────── HEADER ────────────────── */}
      <header className="flex justify-between items-center bg-card border border-border p-5 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-sm font-medium text-foreground-muted">
            {t('home.financialOverview')}
          </p>
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-3 rounded-xl border border-border bg-background hover:bg-secondary text-icon-default hover:text-icon-active transition-all cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <>
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-error animate-ping"></span>
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-error"></span>
              </>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-card border border-border rounded-xl shadow-lg z-40 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">{t('home.alertCenter')}</span>
                <button 
                  onClick={() => {
                    setNotifications([]);
                    localStorage.setItem("notifications", "[]");
                  }} 
                  className="text-[10px] text-primary hover:underline"
                >
                  {t('home.clearAll')}
                </button>
              </div>
              <div className="space-y-2 divide-y divide-border">
                {notifications.length === 0 ? (
                  <p className="text-xs text-foreground-muted pt-2">{t('home.noAlerts')}</p>
                ) : (
                  notifications.map((note, i) => (
                    <p key={i} className="text-xs text-foreground-secondary pt-2 first:pt-0">{note}</p>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ────────────────── SMS AUTO-PARSER ────────────────── */}
      <SmsPasteZone
        currencyCode={activeCurrency}
        onTransactionSaved={() => {}}
      />

      {/* ────────────────── PRIMARY BALANCE CARD ────────────────── */}
      <section className="bg-primary-lighter text-primary border border-primary-light p-6 md:p-8 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-primary/80">{t('home.availableLiquidity')}</span>
          <h2 className="text-4xl font-black tracking-tight md:text-5xl">
            {formatAmount(totals.balance, activeCurrency)}
          </h2>
          <p className="text-xs font-medium text-primary/70">
            {t('home.computedAcrossVaults')}
          </p>
        </div>

        <div className="flex gap-4">
          <div className="bg-white/60 backdrop-blur-sm px-4 py-3 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider block">{t('home.inflow')}</span>
              <span className="text-sm font-extrabold text-foreground">{formatAmount(monthTotals.income, activeCurrency)}</span>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm px-4 py-3 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider block">{t('home.outflow')}</span>
              <span className="text-sm font-extrabold text-foreground">{formatAmount(monthTotals.expense, activeCurrency)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────── SAFE-TO-SPEND CARD ────────────────── */}
      <SafeToSpendCard />

      {/* ────────────────── STATISTICAL GRID ────────────────── */}
      <section className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-border-strong">

          {/* Col 1: Monthly Budget Remaining */}
          <div className="p-6 space-y-2">
            <div className="flex items-center justify-between text-icon-default">
              <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">{t('home.remainingBudget')}</span>
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">
                {!isMounted || budgetRemaining === null ? "—" : `${budgetRemaining}%`}
              </h3>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: `${isMounted ? budgetRemaining ?? 0 : 0}%` }}></div>
              </div>
            </div>
          </div>

          {/* Col 2: Total Income Target */}
          <div className="p-6 space-y-2">
            <div className="flex items-center justify-between text-icon-default">
              <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">{t('home.goalProgress')}</span>
              <Target className="w-4 h-4 text-brand" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">
                {!isMounted || goalProgress === null ? "—" : `${goalProgress}%`}
              </h3>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div className="bg-brand h-full rounded-full" style={{ width: `${isMounted ? goalProgress ?? 0 : 0}%` }}></div>
              </div>
            </div>
          </div>

          {/* Col 3: Financial Health Score */}
          <div className="p-6 space-y-2">
            <div className="flex items-center justify-between text-icon-default">
              <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">{t('home.healthIndex')}</span>
              <Activity className="w-4 h-4 text-success" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">
                {!isMounted || healthScore === null ? "—" : `${healthScore} / 100`}
              </h3>
              <p className="text-xs text-foreground-muted">
                {healthScore === null ? t('home.addTransactionsToCompute') : t('home.basedOnSavingsRate')}
              </p>
            </div>
          </div>

          {/* Col 4: Ledger Entry Count */}
          <div className="p-6 space-y-2">
            <div className="flex items-center justify-between text-icon-default">
              <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">{t('home.ledgerEntries')}</span>
              <Calendar className="w-4 h-4 text-icon-muted" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">{isMounted ? transactions.length : "—"}</h3>
              <p className="text-xs text-foreground-muted">
                {hasData ? t('home.allTransactionsVerified') : t('home.noTransactionsYet')}
              </p>
            </div>
          </div>

          {/* Col 5: Total Saved via Discounts */}
          <div className="p-6 space-y-2">
            <div className="flex items-center justify-between text-icon-default">
              <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">{t('home.totalSaved')}</span>
              <PiggyBank className="w-4 h-4 text-success" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-success">
                {!isMounted ? "—" : formatAmount(totalSaved, activeCurrency)}
              </h3>
              <p className="text-xs text-foreground-muted">
                {totalSaved > 0 ? t('home.savedThroughDiscounts') : t('home.noDiscountsYet')}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ────────────────── ANALYTICS CHART CANVAS ────────────────── */}
      <section className="space-y-4">

        {/* Chart view toggle */}
        <div className="flex items-center justify-end">
          <div className="inline-flex items-center gap-1 bg-secondary p-1 rounded-xl border border-border">
            {([
              { key: "both", label: t('common.both') },
              { key: "income", label: t('common.income') },
              { key: "spent", label: t('common.spent') },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setChartView(opt.key)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  chartView === opt.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-6 ${chartView === "both" ? "lg:grid-cols-2" : ""}`}>

        {/* Trend line Visualizer (Chart 1 - Blue) */}
        {chartView !== "spent" && (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-foreground text-lg">{t('home.balanceDevelopment')}</h3>
            <p className="text-xs text-foreground-muted">{t('home.balanceTrajectory')}</p>
          </div>
          <div className="h-72 w-full">
            {!isMounted ? (
              <div className="w-full h-full flex items-center justify-center bg-background-subtle rounded-xl animate-pulse text-xs text-foreground-muted">{t('home.loadingChartMetrics')}</div>
            ) : !hasData ? (
              <EmptyChart message={t('home.noBalanceHistory')} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px" }}
                    labelStyle={{ fontWeight: "bold", color: "#0f172a" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Balance"
                    stroke="#1d4ed8"
                    strokeWidth={3}
                    dot={{ r: 4, stroke: "#1d4ed8", strokeWidth: 2, fill: "#ffffff" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        )}

        {/* Categories Bar Visualizer (Chart 2 - Orange) */}
        {chartView !== "income" && (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-foreground text-lg">{t('home.outflowCategories')}</h3>
            <p className="text-xs text-foreground-muted">{t('home.consolidatedMetrics')}</p>
          </div>
          <div className="h-72 w-full">
            {!isMounted ? (
              <div className="w-full h-full flex items-center justify-center bg-background-subtle rounded-xl animate-pulse text-xs text-foreground-muted">{t('home.loadingChartMetrics')}</div>
            ) : categoryBarData.length === 0 ? (
              <EmptyChart message={t('home.noExpensesThisMonth')} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px" }}
                    labelStyle={{ fontWeight: "bold", color: "#0f172a" }}
                  />
                  <Bar dataKey="Amount" fill="#ea580c" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        )}

        </div>
      </section>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-background-subtle rounded-xl text-center px-6">
      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-icon-muted">
        <Inbox className="w-6 h-6" />
      </div>
      <p className="text-xs font-medium text-foreground-muted max-w-xs">{message}</p>
    </div>
  );
}
