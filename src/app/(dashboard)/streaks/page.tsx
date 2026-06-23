"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Flame,
  Trophy,
  Award,
  Medal,
  Zap,
  Target,
  Layers,
  PiggyBank,
  Footprints,
  CalendarCheck,
  Lock,
  Inbox,
} from "lucide-react";
import {
  useTransactions,
  useSavingsGoals,
  getBudgets,
  type BudgetMap,
} from "@/core/store/dataStore";
import { computeStreaksAndBadges } from "@/core/insights/streaks";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame,
  Trophy,
  Award,
  Medal,
  Zap,
  Target,
  Layers,
  PiggyBank,
  Footprints,
};

export default function StreaksPage() {
  const transactions = useTransactions();
  const goals = useSavingsGoals();
  // Budgets are read into state (not during render) so the first client render
  // matches the server's empty render and avoids a hydration mismatch.
  const [budgets, setBudgets] = useState<BudgetMap>({});

  useEffect(() => {
    const sync = () => setBudgets(getBudgets());
    sync();
    window.addEventListener("datastore:change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("datastore:change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const result = useMemo(
    () => computeStreaksAndBadges(transactions, budgets, goals),
    [transactions, budgets, goals]
  );

  const hasData = transactions.length > 0;

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl flex items-center gap-2">
          <Flame className="w-8 h-8 text-brand" />
          Streaks & Badges
        </h1>
        <p className="text-sm font-medium text-foreground-muted">
          Build healthy money habits — log consistently and unlock achievements.
        </p>
      </div>

      {/* ── Streak summary cards ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StreakStat
          icon={Flame}
          tone="brand"
          label="Current Streak"
          value={result.currentStreak}
          suffix={result.currentStreak === 1 ? "day" : "days"}
          subtitle={
            result.currentStreak > 0
              ? "Keep it going — log something today!"
              : "Log a transaction to start a streak."
          }
        />
        <StreakStat
          icon={Trophy}
          tone="success"
          label="Longest Streak"
          value={result.longestStreak}
          suffix={result.longestStreak === 1 ? "day" : "days"}
          subtitle="Your personal best run."
        />
        <StreakStat
          icon={CalendarCheck}
          tone="primary"
          label="Active Days"
          value={result.activeDays}
          suffix={result.activeDays === 1 ? "day" : "days"}
          subtitle="Total days you've logged activity."
        />
      </section>

      {/* ── Badges ── */}
      <section className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-brand" />
            <h2 className="font-bold text-foreground text-lg">Achievements</h2>
          </div>
          <span className="text-xs font-bold text-foreground-secondary bg-secondary px-3 py-1.5 rounded-full">
            {result.earnedCount} / {result.badges.length} unlocked
          </span>
        </div>

        {!hasData ? (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-10">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-icon-muted">
              <Inbox className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-foreground-muted max-w-sm">
              No activity yet. Add your first transaction to start earning badges.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.badges.map((badge) => {
              const Icon = ICON_MAP[badge.icon] ?? Medal;
              return (
                <div
                  key={badge.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                    badge.earned
                      ? "bg-success-light border-success/30"
                      : "bg-background-subtle border-border"
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      badge.earned
                        ? "bg-success text-white"
                        : "bg-secondary text-icon-muted"
                    }`}
                  >
                    {badge.earned ? (
                      <Icon className="w-5 h-5" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3
                      className={`font-bold text-sm ${
                        badge.earned ? "text-foreground" : "text-foreground-secondary"
                      }`}
                    >
                      {badge.title}
                    </h3>
                    <p className="text-xs text-foreground-muted">{badge.description}</p>
                    {!badge.earned && (
                      <div className="pt-1">
                        <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all"
                            style={{ width: `${badge.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StreakStat({
  icon: Icon,
  tone,
  label,
  value,
  suffix,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "brand" | "success" | "primary";
  label: string;
  value: number;
  suffix: string;
  subtitle: string;
}) {
  const toneClasses = {
    brand: "bg-brand-light text-brand",
    success: "bg-success-light text-success",
    primary: "bg-primary-lighter text-primary",
  }[tone];

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${toneClasses}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-black text-foreground tracking-tight">{value}</span>
        <span className="text-sm font-bold text-foreground-muted">{suffix}</span>
      </div>
      <p className="text-xs text-foreground-muted">{subtitle}</p>
    </div>
  );
}
