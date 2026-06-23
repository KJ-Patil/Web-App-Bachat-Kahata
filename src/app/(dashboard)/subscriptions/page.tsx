"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Repeat,
  CalendarClock,
  AlertTriangle,
  TrendingDown,
  Layers,
  Inbox,
} from "lucide-react";
import { formatAmount } from "@/core/utils/currencyManager";
import { useTransactions } from "@/core/store/dataStore";
import {
  detectSubscriptions,
  summarizeSubscriptions,
} from "@/core/insights/subscriptions";

export default function SubscriptionsPage() {
  const [activeCurrency, setActiveCurrency] = useState("INR");
  const transactions = useTransactions();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cur = localStorage.getItem("active_currency");
    if (cur) setActiveCurrency(cur);
  }, []);

  const subscriptions = useMemo(
    () => detectSubscriptions(transactions),
    [transactions]
  );
  const summary = useMemo(
    () => summarizeSubscriptions(subscriptions),
    [subscriptions]
  );

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 md:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl flex items-center gap-2">
          <Repeat className="w-8 h-8 text-brand" />
          Subscription Tracker
        </h1>
        <p className="text-sm font-medium text-foreground-muted">
          Recurring payments auto-detected from your transactions — spot what&apos;s
          draining your wallet.
        </p>
      </div>

      {/* ── Summary KPIs ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Layers}
          tone="primary"
          label="Detected"
          value={`${summary.count}`}
          hint={summary.count === 1 ? "subscription" : "subscriptions"}
        />
        <SummaryCard
          icon={CalendarClock}
          tone="brand"
          label="Monthly Cost"
          value={formatAmount(summary.monthlyTotal, activeCurrency, { decimalPlaces: 0 })}
          hint="per month"
        />
        <SummaryCard
          icon={TrendingDown}
          tone="error"
          label="Annual Cost"
          value={formatAmount(summary.annualTotal, activeCurrency, { decimalPlaces: 0 })}
          hint="per year"
        />
        <SummaryCard
          icon={AlertTriangle}
          tone="warning"
          label="Possibly Unused"
          value={`${summary.unusedCount}`}
          hint="review these"
        />
      </section>

      {/* ── Subscription list ── */}
      {subscriptions.length === 0 ? (
        <section className="bg-card border border-border rounded-2xl shadow-sm p-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-icon-muted">
            <Inbox className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-foreground-muted max-w-md">
            No recurring payments detected yet. Once the same merchant is charged
            across two or more months, it will show up here automatically.
          </p>
        </section>
      ) : (
        <section className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden divide-y divide-border">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center gap-4 p-4 sm:p-5 hover:bg-background-subtle transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-lighter text-primary flex items-center justify-center shrink-0">
                <Repeat className="w-5 h-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-foreground capitalize truncate">
                    {sub.name}
                  </h3>
                  {sub.possiblyUnused && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-warning bg-warning-light px-2 py-0.5 rounded-full">
                      Possibly unused
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {sub.category} · {sub.occurrences} charges · next ~
                  {new Date(sub.nextEstimatedISO).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="font-extrabold text-sm text-foreground">
                  {formatAmount(sub.monthlyAmount, activeCurrency, { decimalPlaces: 0 })}
                  <span className="text-[10px] font-semibold text-foreground-muted">/mo</span>
                </p>
                <p className="text-[11px] font-semibold text-foreground-muted">
                  {formatAmount(sub.annualCost, activeCurrency, { decimalPlaces: 0 })}/yr
                </p>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "brand" | "error" | "warning";
  label: string;
  value: string;
  hint: string;
}) {
  const toneClasses = {
    primary: "bg-primary-lighter text-primary",
    brand: "bg-brand-light text-brand",
    error: "bg-error-light text-error",
    warning: "bg-warning-light text-warning",
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
      <div>
        <p className="text-xl font-black text-foreground tracking-tight truncate">{value}</p>
        <p className="text-[11px] font-semibold text-foreground-muted">{hint}</p>
      </div>
    </div>
  );
}
