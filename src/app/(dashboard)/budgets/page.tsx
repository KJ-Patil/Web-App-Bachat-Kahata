"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Edit3, Home, ShoppingBag, Tv, Layers, ShieldCheck, AlertTriangle, Play } from "lucide-react";
import { formatAmount } from "@/core/utils/currencyManager";
import SetBudgetModal from "@/components/modals/SetBudgetModal";

interface CategorySummary {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  spent: number;
  limit: number;
}

const DEFAULT_BUDGETS: Record<string, number> = {
  Housing: 25000,
  Groceries: 12000,
  Entertainment: 6000,
  Investment: 20000,
};

const CATEGORIES_META = [
  { id: "Housing", name: "Housing", icon: Home },
  { id: "Groceries", name: "Groceries", icon: ShoppingBag },
  { id: "Entertainment", name: "Entertainment", icon: Tv },
  { id: "Investment", name: "Investment", icon: Layers },
];

export default function BudgetsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [budgets, setBudgets] = useState<Record<string, number>>(DEFAULT_BUDGETS);
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [activeCurrency, setActiveCurrency] = useState("INR");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadBudgetData();
  }, [selectedDate]);

  const loadBudgetData = () => {
    if (typeof window === "undefined") return;

    // Load active currency
    const cur = localStorage.getItem("active_currency");
    if (cur) setActiveCurrency(cur);

    // Load budgets
    const storedBudgets = localStorage.getItem("budgets");
    const activeBudgets = storedBudgets ? JSON.parse(storedBudgets) : DEFAULT_BUDGETS;
    setBudgets(activeBudgets);

    // Load transactions
    const storedTxs = localStorage.getItem("transactions");
    const transactions = storedTxs ? JSON.parse(storedTxs) : [];

    const targetMonth = selectedDate.getMonth();
    const targetYear = selectedDate.getFullYear();

    // Map summaries
    const summaries = CATEGORIES_META.map((meta) => {
      const limit = activeBudgets[meta.id] || DEFAULT_BUDGETS[meta.id] || 10000;
      
      const spent = transactions
        .filter((tx: any) => {
          const txDate = new Date(tx.date);
          return (
            tx.type === "expense" &&
            tx.category === meta.id &&
            txDate.getMonth() === targetMonth &&
            txDate.getFullYear() === targetYear
          );
        })
        .reduce((sum: number, tx: any) => sum + tx.amount, 0);

      return {
        id: meta.id,
        name: meta.name,
        icon: meta.icon,
        spent,
        limit,
      };
    });

    setCategorySummaries(summaries);
  };

  const handlePrevMonth = () => {
    setSelectedDate((prev) => {
      const copy = new Date(prev);
      copy.setMonth(copy.getMonth() - 1);
      return copy;
    });
  };

  const handleNextMonth = () => {
    setSelectedDate((prev) => {
      const copy = new Date(prev);
      copy.setMonth(copy.getMonth() + 1);
      return copy;
    });
  };

  const formatMonthLabel = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const getProgressColor = (spent: number, limit: number) => {
    const ratio = spent / limit;
    if (ratio >= 1.0) {
      return "bg-error"; // Exceeded limit
    }
    if (ratio >= 0.8) {
      return "bg-warning"; // Approaching warning limit (80% capacity)
    }
    return "bg-success"; // Under limit
  };

  const getCardBorderColor = (spent: number, limit: number) => {
    const ratio = spent / limit;
    if (ratio >= 1.0) return "border-error-light";
    if (ratio >= 0.8) return "border-warning-light";
    return "border-border";
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 md:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight sm:text-3xl">
            Category Budgets
          </h1>
          <p className="text-sm font-medium text-foreground-muted">
            Establish active spending boundaries to track cash flows.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary shrink-0 flex items-center justify-center gap-2"
        >
          <Edit3 className="w-4 h-4" />
          Adjust Budgets
        </button>
      </div>

      {/* ────────────────── MONTH NAVIGATION SWITCHER ────────────────── */}
      <section className="bg-card border border-border p-4 rounded-2xl shadow-sm flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-xl border border-border bg-background hover:bg-secondary text-icon-default hover:text-icon-active transition-all cursor-pointer"
          title="Previous Month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <h2 className="text-base font-extrabold text-foreground tracking-wide uppercase">
          {formatMonthLabel(selectedDate)}
        </h2>

        <button
          onClick={handleNextMonth}
          className="p-2 rounded-xl border border-border bg-background hover:bg-secondary text-icon-default hover:text-icon-active transition-all cursor-pointer"
          title="Next Month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </section>

      {/* ────────────────── BUDGET PROGRESS LIST ROWS ────────────────── */}
      <section className="space-y-4">
        {categorySummaries.map((summary) => {
          const Icon = summary.icon;
          const pct = Math.min(Math.round((summary.spent / summary.limit) * 100), 200);
          const isOver = summary.spent >= summary.limit;
          const isWarning = summary.spent / summary.limit >= 0.8 && !isOver;

          return (
            <div
              key={summary.id}
              className={`bg-card border p-5 rounded-2xl shadow-sm space-y-4 transition-all hover:shadow-md ${getCardBorderColor(
                summary.spent,
                summary.limit
              )}`}
            >
              {/* Row Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border border-border shrink-0 ${
                    isOver 
                      ? "bg-error-light text-error" 
                      : isWarning 
                        ? "bg-warning-light text-brand" 
                        : "bg-success-light text-success"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-foreground text-sm">{summary.name}</h3>
                    <span className="text-[10px] font-bold text-foreground-secondary tracking-wide uppercase">
                      Budget: {formatAmount(summary.limit, activeCurrency)}
                    </span>
                  </div>
                </div>

                {/* Spent calculations */}
                <div className="text-right space-y-0.5">
                  <span className={`text-base font-black tracking-tight ${
                    isOver ? "text-error" : isWarning ? "text-brand" : "text-foreground"
                  }`}>
                    {formatAmount(summary.spent, activeCurrency)}
                  </span>
                  <span className="text-[10px] font-semibold text-foreground-muted block">
                    {pct}% consumed
                  </span>
                </div>
              </div>

              {/* Progress Bar Meter */}
              <div className="space-y-1">
                <div className="w-full bg-secondary h-3 rounded-full overflow-hidden relative shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                      summary.spent,
                      summary.limit
                    )}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>

                {/* Exceeded / Approaching alert labels */}
                {isOver ? (
                  <span className="text-[10px] font-bold text-error flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Budget ceiling breached by {formatAmount(summary.spent - summary.limit, activeCurrency)}!
                  </span>
                ) : isWarning ? (
                  <span className="text-[10px] font-bold text-brand flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Warning: Budget utilization is above 80% thresholds.
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-success flex items-center gap-1 mt-1">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    Optimal category balance status.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Set Budget Limit Overlay Modal */}
      <SetBudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadBudgetData}
      />
    </div>
  );
}
