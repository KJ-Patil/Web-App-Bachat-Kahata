import type { Transaction, BudgetMap } from "@/core/store/dataStore";
import {
  resolveBucketForCategory,
  isBucketExcludedCategory,
} from "@/core/utils/categories";

export interface BucketSummary {
  budget: number;       // Target allocation limit based on income split
  spent: number;        // Total actual expenses in this month
  remaining: number;    // budget - spent
  usage: number;        // (spent / budget) * 100
  status: "On Track" | "Near Limit" | "Over Budget";
  allocatedBudget: number; // Sum of custom category budgets allocated within this bucket
}

export interface MoneyRuleResult {
  needs: BucketSummary;
  wants: BucketSummary;
  investments: BucketSummary;
}

export function computeMoneyRule(
  income: number,
  transactions: Transaction[],
  targetDate: Date,
  split: { needs: number; wants: number; investments: number },
  budgets: BudgetMap
): MoneyRuleResult {
  const targetMonth = targetDate.getMonth();
  const targetYear = targetDate.getFullYear();

  // Filter transactions to this month's expenses. Notebook-ledger mirrors are
  // excluded — lending isn't spending, see BUCKET_EXCLUDED_CATEGORIES.
  const monthlyExpenses = transactions.filter((t) => {
    if (t.type !== "expense") return false;
    if (isBucketExcludedCategory(t.category)) return false;
    const date = new Date(t.date);
    return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
  });

  // Calculate spent for each bucket
  let needsSpent = 0;
  let wantsSpent = 0;
  let investmentsSpent = 0;

  for (const tx of monthlyExpenses) {
    const bucket = resolveBucketForCategory(tx.category);
    if (bucket === "needs") {
      needsSpent += tx.amount;
    } else if (bucket === "wants") {
      wantsSpent += tx.amount;
    } else if (bucket === "investments") {
      investmentsSpent += tx.amount;
    }
  }

  // Calculate total manual category budgets allocated per bucket
  let needsAllocated = 0;
  let wantsAllocated = 0;
  let investmentsAllocated = 0;

  for (const [category, budgetLimit] of Object.entries(budgets)) {
    if (isBucketExcludedCategory(category)) continue;
    const bucket = resolveBucketForCategory(category);
    if (bucket === "needs") {
      needsAllocated += budgetLimit;
    } else if (bucket === "wants") {
      wantsAllocated += budgetLimit;
    } else if (bucket === "investments") {
      investmentsAllocated += budgetLimit;
    }
  }

  // Budgets calculated based on variable user split ratios (needs, wants, investments percentages)
  const needsBudget = income * (split.needs / 100);
  const wantsBudget = income * (split.wants / 100);
  const investmentsBudget = income * (split.investments / 100);

  const buildBucketSummary = (budget: number, spent: number, allocatedBudget: number): BucketSummary => {
    const remaining = budget - spent;
    
    let usage = 0;
    if (budget > 0) {
      usage = (spent / budget) * 100;
      // Round to 2 decimal places
      usage = Math.round(usage * 100) / 100;
    } else if (spent > 0) {
      usage = 100;
    }

    let status: "On Track" | "Near Limit" | "Over Budget" = "On Track";
    if (usage > 100 || (budget === 0 && spent > 0)) {
      status = "Over Budget";
    } else if (usage >= 90) {
      status = "Near Limit";
    }

    return {
      budget,
      spent,
      remaining,
      usage,
      status,
      allocatedBudget,
    };
  };

  return {
    needs: buildBucketSummary(needsBudget, needsSpent, needsAllocated),
    wants: buildBucketSummary(wantsBudget, wantsSpent, wantsAllocated),
    investments: buildBucketSummary(investmentsBudget, investmentsSpent, investmentsAllocated),
  };
}
