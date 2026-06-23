/**
 * Safe-to-Spend — the "anti-budget" single number.
 *
 * Answers: "after this month's spending and the savings I want to set aside,
 * how much can I safely spend per day for the rest of the month?" Pure function
 * over real transactions, budgets and goals — no state is mutated.
 */

import type { Transaction, BudgetMap, SavingsGoal } from "@/core/store/dataStore";
import { getMonthTotals } from "@/core/store/dataStore";

export interface SafeToSpendResult {
  /** Recommended spend for the remainder of today. */
  perDay: number;
  /** Total discretionary money left for the rest of the month. */
  remainingForMonth: number;
  /** Whole days left in the current month, including today. */
  daysLeft: number;
  /** Income recognised this month. */
  monthIncome: number;
  /** Expenses already logged this month. */
  monthSpent: number;
  /** Amount earmarked for savings goals this month. */
  reservedForSavings: number;
  /** True when we don't yet have enough data to give a meaningful number. */
  insufficientData: boolean;
}

/** Days remaining in the current month, counting today. */
function daysLeftInMonth(today = new Date()): number {
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return last - today.getDate() + 1;
}

/**
 * Monthly amount that still needs to be set aside to hit open savings goals by
 * their deadlines (sum of per-goal "remaining / months left").
 */
function monthlySavingsReserve(goals: SavingsGoal[], today = new Date()): number {
  return goals.reduce((acc, g) => {
    const remaining = (Number(g.target) || 0) - (Number(g.current) || 0);
    if (remaining <= 0) return acc;
    const deadline = new Date(g.deadline).getTime();
    const months = Math.max(
      1,
      Math.ceil((deadline - today.getTime()) / (30 * 86_400_000))
    );
    return acc + remaining / months;
  }, 0);
}

/**
 * @param budgets used only as a fallback "spending ceiling" when there is no
 *   income recorded yet this month, so the number is still useful early on.
 */
export function computeSafeToSpend(
  txs: Transaction[],
  budgets: BudgetMap,
  goals: SavingsGoal[],
  today = new Date()
): SafeToSpendResult {
  const month = getMonthTotals(0, txs);
  const daysLeft = daysLeftInMonth(today);
  const reservedForSavings = Math.round(monthlySavingsReserve(goals, today));

  const totalBudget = Object.values(budgets).reduce((a, b) => a + (Number(b) || 0), 0);

  // Prefer real income as the pool; fall back to the configured budget ceiling.
  const pool = month.income > 0 ? month.income : totalBudget;
  const insufficientData = pool <= 0;

  const remainingForMonth = Math.max(0, pool - month.expense - reservedForSavings);
  const perDay = daysLeft > 0 ? Math.floor(remainingForMonth / daysLeft) : 0;

  return {
    perDay,
    remainingForMonth: Math.round(remainingForMonth),
    daysLeft,
    monthIncome: Math.round(month.income),
    monthSpent: Math.round(month.expense),
    reservedForSavings,
    insufficientData,
  };
}
