"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PieChart, ArrowRight, AlertTriangle, CheckCircle, Info } from "lucide-react";
import Link from "next/link";
import { formatAmount } from "@/core/utils/currencyManager";
import { useTransactions, useMonthlyIncome, useMoneyRuleSplit, useBudgets } from "@/core/store/dataStore";
import { computeMoneyRule } from "@/core/insights/moneyRule";
import { useTranslation } from "@/i18n/i18nContext";

export default function MoneyRuleCard() {
  const [activeCurrency, setActiveCurrency] = useState("INR");
  const [isMounted, setIsMounted] = useState(false);
  const { t } = useTranslation();
  
  const transactions = useTransactions();
  const income = useMonthlyIncome();
  const split = useMoneyRuleSplit();
  const budgets = useBudgets();

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === "undefined") return;
    const cur = localStorage.getItem("active_currency");
    if (cur) setActiveCurrency(cur);
  }, []);

  const data = useMemo(() => {
    return computeMoneyRule(income, transactions, new Date(), split, budgets);
  }, [income, transactions, split, budgets]);

  if (!isMounted) {
    return (
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm h-64 animate-pulse" />
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Over Budget":
        return "bg-error-light text-error";
      case "Near Limit":
        return "bg-warning-light text-brand";
      default:
        return "bg-success-light text-success";
    }
  };

  const getProgressBarClass = (status: string) => {
    switch (status) {
      case "Over Budget":
        return "bg-error";
      case "Near Limit":
        return "bg-warning";
      default:
        return "bg-primary";
    }
  };

  return (
    <section className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-4 transition-all hover:shadow-md flex flex-col justify-between">
      {/* Card Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-lighter text-primary flex items-center justify-center">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-foreground text-sm">
              {t("moneyRule.cardTitle") !== "moneyRule.cardTitle" ? t("moneyRule.cardTitle") : "Split Allocation"}
            </h3>
            <span className="text-[10px] font-bold text-foreground-muted tracking-wide uppercase">
              {t("moneyRule.monthlyAllocation") !== "moneyRule.monthlyAllocation" ? t("moneyRule.monthlyAllocation") : "Monthly Allocation"}
            </span>
          </div>
        </div>
        <Link
          href="/budgets"
          className="p-1.5 rounded-lg border border-border bg-background hover:bg-secondary text-icon-default hover:text-icon-active transition-all"
          title="View Details"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {income === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-background-subtle rounded-xl border border-dashed border-border space-y-3">
          <Info className="w-6 h-6 text-foreground-muted" />
          <p className="text-xs font-semibold text-foreground-secondary max-w-[240px]">
            {t("moneyRule.setIncomePrompt") !== "moneyRule.setIncomePrompt" 
              ? t("moneyRule.setIncomePrompt") 
              : "Set your monthly income to automatically track custom budget allocations."}
          </p>
          <Link href="/budgets" className="btn-primary py-1.5 px-4 text-xs font-bold">
            {t("moneyRule.setIncomeBtn") !== "moneyRule.setIncomeBtn" ? t("moneyRule.setIncomeBtn") : "Set Income"}
          </Link>
        </div>
      ) : (
        <div className="space-y-4 flex-1">
          {/* Needs */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-foreground">
              <span>
                {t("moneyRule.needsLabel") !== "moneyRule.needsLabel" ? t("moneyRule.needsLabel") : "Needs"} ({split.needs}%)
              </span>
              <span className="text-foreground-secondary font-extrabold">
                {formatAmount(data.needs.spent, activeCurrency, { decimalPlaces: 0 })} / {formatAmount(data.needs.budget, activeCurrency, { decimalPlaces: 0 })}
              </span>
            </div>
            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden relative shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarClass(data.needs.status)}`}
                style={{ width: `${Math.min(data.needs.usage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className={`px-1.5 py-0.5 rounded-md ${getStatusBadgeClass(data.needs.status)}`}>
                {data.needs.status === "Over Budget" 
                  ? (t("moneyRule.overBudget") !== "moneyRule.overBudget" ? t("moneyRule.overBudget") : "Over Budget")
                  : data.needs.status === "Near Limit"
                  ? (t("moneyRule.nearLimit") !== "moneyRule.nearLimit" ? t("moneyRule.nearLimit") : "Near Limit")
                  : (t("moneyRule.onTrack") !== "moneyRule.onTrack" ? t("moneyRule.onTrack") : "On Track")}
              </span>
              <span className="text-foreground-muted">{data.needs.usage}%</span>
            </div>
          </div>

          {/* Wants */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-foreground">
              <span>
                {t("moneyRule.wantsLabel") !== "moneyRule.wantsLabel" ? t("moneyRule.wantsLabel") : "Wants"} ({split.wants}%)
              </span>
              <span className="text-foreground-secondary font-extrabold">
                {formatAmount(data.wants.spent, activeCurrency, { decimalPlaces: 0 })} / {formatAmount(data.wants.budget, activeCurrency, { decimalPlaces: 0 })}
              </span>
            </div>
            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden relative shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarClass(data.wants.status)}`}
                style={{ width: `${Math.min(data.wants.usage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className={`px-1.5 py-0.5 rounded-md ${getStatusBadgeClass(data.wants.status)}`}>
                {data.wants.status === "Over Budget" 
                  ? (t("moneyRule.overBudget") !== "moneyRule.overBudget" ? t("moneyRule.overBudget") : "Over Budget")
                  : data.wants.status === "Near Limit"
                  ? (t("moneyRule.nearLimit") !== "moneyRule.nearLimit" ? t("moneyRule.nearLimit") : "Near Limit")
                  : (t("moneyRule.onTrack") !== "moneyRule.onTrack" ? t("moneyRule.onTrack") : "On Track")}
              </span>
              <span className="text-foreground-muted">{data.wants.usage}%</span>
            </div>
          </div>

          {/* Investments */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-foreground">
              <span>
                {t("moneyRule.investmentsLabel") !== "moneyRule.investmentsLabel" ? t("moneyRule.investmentsLabel") : "Investments"} ({split.investments}%)
              </span>
              <span className="text-foreground-secondary font-extrabold">
                {formatAmount(data.investments.spent, activeCurrency, { decimalPlaces: 0 })} / {formatAmount(data.investments.budget, activeCurrency, { decimalPlaces: 0 })}
              </span>
            </div>
            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden relative shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarClass(data.investments.status)}`}
                style={{ width: `${Math.min(data.investments.usage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className={`px-1.5 py-0.5 rounded-md ${getStatusBadgeClass(data.investments.status)}`}>
                {data.investments.status === "Over Budget" 
                  ? (t("moneyRule.overBudget") !== "moneyRule.overBudget" ? t("moneyRule.overBudget") : "Over Budget")
                  : data.investments.status === "Near Limit"
                  ? (t("moneyRule.nearLimit") !== "moneyRule.nearLimit" ? t("moneyRule.nearLimit") : "Near Limit")
                  : (t("moneyRule.onTrack") !== "moneyRule.onTrack" ? t("moneyRule.onTrack") : "On Track")}
              </span>
              <span className="text-foreground-muted">{data.investments.usage}%</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
