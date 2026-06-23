"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Inbox,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatAmount } from "@/core/utils/currencyManager";
import {
  useTransactions,
  getMonthTotals,
  getCategoryBreakdown,
} from "@/core/store/dataStore";

interface CategoryComparison {
  category: string;
  current: number;
  previous: number;
  delta: number;
  /** Percentage change vs previous month (null when previous was 0). */
  pctChange: number | null;
}

export default function ComparisonPage() {
  const [activeCurrency, setActiveCurrency] = useState("INR");
  const transactions = useTransactions();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cur = localStorage.getItem("active_currency");
    if (cur) setActiveCurrency(cur);
  }, []);

  const thisMonth = useMemo(() => getMonthTotals(0, transactions), [transactions]);
  const lastMonth = useMemo(() => getMonthTotals(-1, transactions), [transactions]);

  const comparisons = useMemo<CategoryComparison[]>(() => {
    const current = getCategoryBreakdown("expense", 0, transactions);
    const previous = getCategoryBreakdown("expense", -1, transactions);

    const map = new Map<string, { current: number; previous: number }>();
    for (const c of current) {
      map.set(c.name, { current: c.value, previous: 0 });
    }
    for (const p of previous) {
      const existing = map.get(p.name) ?? { current: 0, previous: 0 };
      existing.previous = p.value;
      map.set(p.name, existing);
    }

    return [...map.entries()]
      .map(([category, { current: cur, previous: prev }]) => ({
        category,
        current: cur,
        previous: prev,
        delta: cur - prev,
        pctChange: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null,
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [transactions]);

  const chartData = useMemo(
    () =>
      comparisons.slice(0, 8).map((c) => ({
        category: c.category,
        "Last Month": c.previous,
        "This Month": c.current,
      })),
    [comparisons]
  );

  const totalDelta = thisMonth.expense - lastMonth.expense;
  const totalPct =
    lastMonth.expense > 0
      ? Math.round((totalDelta / lastMonth.expense) * 100)
      : null;

  const hasData = comparisons.length > 0;

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl flex items-center gap-2">
          <ArrowLeftRight className="w-8 h-8 text-brand" />
          Month vs Month
        </h1>
        <p className="text-sm font-medium text-foreground-muted">
          Compare this month&apos;s spending against last month, category by category.
        </p>
      </div>

      {/* ── Headline totals ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TotalCard
          label="Last Month"
          value={formatAmount(lastMonth.expense, activeCurrency, { decimalPlaces: 0 })}
        />
        <TotalCard
          label="This Month"
          value={formatAmount(thisMonth.expense, activeCurrency, { decimalPlaces: 0 })}
        />
        <div className="bg-card border border-border rounded-2xl shadow-sm p-5 space-y-2">
          <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">
            Change
          </span>
          <div className="flex items-center gap-2">
            <TrendBadge delta={totalDelta} pct={totalPct} large />
          </div>
          <p className="text-[11px] font-semibold text-foreground-muted">
            {totalDelta > 0
              ? "You're spending more than last month."
              : totalDelta < 0
              ? "Nice — you're spending less than last month."
              : "Spending is flat vs last month."}
          </p>
        </div>
      </section>

      {!hasData ? (
        <section className="bg-card border border-border rounded-2xl shadow-sm p-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-icon-muted">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-foreground-muted max-w-md">
            Not enough data to compare yet. Log expenses across this month and last
            month to unlock side-by-side insights.
          </p>
        </section>
      ) : (
        <>
          {/* ── Grouped bar chart ── */}
          <section className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-foreground text-lg">Category Breakdown</h3>
              <p className="text-xs text-foreground-muted">
                Top categories by change, side by side
              </p>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                    }}
                    formatter={(value: number) =>
                      formatAmount(value, activeCurrency, { decimalPlaces: 0 })
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                  <Bar dataKey="Last Month" fill="#94a3b8" radius={[6, 6, 0, 0]} barSize={18} />
                  <Bar dataKey="This Month" fill="#ea580c" radius={[6, 6, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Per-category rows ── */}
          <section className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden divide-y divide-border">
            {comparisons.map((c) => (
              <div
                key={c.category}
                className="flex items-center gap-4 p-4 sm:p-5 hover:bg-background-subtle transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm text-foreground capitalize truncate">
                    {c.category}
                  </h3>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    {formatAmount(c.previous, activeCurrency, { decimalPlaces: 0 })} →{" "}
                    {formatAmount(c.current, activeCurrency, { decimalPlaces: 0 })}
                  </p>
                </div>
                <TrendBadge delta={c.delta} pct={c.pctChange} />
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function TotalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-5 space-y-2">
      <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">
        {label}
      </span>
      <p className="text-2xl font-black text-foreground tracking-tight">{value}</p>
    </div>
  );
}

/**
 * For expenses, a decrease is "good" (green) and an increase is "bad" (red).
 */
function TrendBadge({
  delta,
  pct,
  large = false,
}: {
  delta: number;
  pct: number | null;
  large?: boolean;
}) {
  const isUp = delta > 0;
  const isDown = delta < 0;
  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
  const tone = isUp
    ? "text-error bg-error-light"
    : isDown
    ? "text-success bg-success-light"
    : "text-foreground-muted bg-secondary";

  const label =
    pct === null ? (isUp ? "New" : "—") : `${isUp ? "+" : ""}${pct}%`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-extrabold ${tone} ${
        large ? "text-lg px-4 py-2" : "text-xs px-2.5 py-1"
      }`}
    >
      <Icon className={large ? "w-5 h-5" : "w-3.5 h-3.5"} />
      {label}
    </span>
  );
}
