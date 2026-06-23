"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Info } from "lucide-react";
import { formatAmount } from "@/core/utils/currencyManager";
import {
  useTransactions,
  getBudgets,
  getSavingsGoals,
} from "@/core/store/dataStore";
import { computeSafeToSpend } from "@/core/insights/safeToSpend";

/**
 * "Safe-to-Spend" — the anti-budget hero card. Surfaces a single number: how
 * much the user can spend today after this month's outflow and savings reserve.
 * Purely additive; derives everything from the existing data store.
 */
export default function SafeToSpendCard() {
  const [activeCurrency, setActiveCurrency] = useState("INR");
  const [isMounted, setIsMounted] = useState(false);
  const transactions = useTransactions();

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === "undefined") return;
    const cur = localStorage.getItem("active_currency");
    if (cur) setActiveCurrency(cur);
  }, []);

  const safe = useMemo(
    () => computeSafeToSpend(transactions, getBudgets(), getSavingsGoals()),
    [transactions]
  );

  return (
    <section className="bg-primary text-white p-6 md:p-7 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/90">
            Safe to Spend Today
          </span>
        </div>
        <h2 className="text-4xl font-black tracking-tight md:text-5xl">
          {!isMounted
            ? "—"
            : safe.insufficientData
            ? "Set a budget"
            : formatAmount(safe.perDay, activeCurrency, { decimalPlaces: 0 })}
        </h2>
        <p className="text-xs font-medium text-white/80 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0" />
          {safe.insufficientData
            ? "Add income or a budget this month to get your daily number."
            : `After this month's spending & savings, across ${safe.daysLeft} day${
                safe.daysLeft === 1 ? "" : "s"
              } left.`}
        </p>
      </div>

      {!safe.insufficientData && isMounted && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <MiniStat
            label="Left this month"
            value={formatAmount(safe.remainingForMonth, activeCurrency, { decimalPlaces: 0 })}
          />
          <MiniStat
            label="Reserved to save"
            value={formatAmount(safe.reservedForSavings, activeCurrency, { decimalPlaces: 0 })}
          />
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/15 backdrop-blur-sm px-4 py-3 rounded-xl">
      <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider block">
        {label}
      </span>
      <span className="text-sm font-extrabold text-white">{value}</span>
    </div>
  );
}
