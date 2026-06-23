/**
 * Spending Streaks & Badges — gamification derived from real activity.
 *
 * Pure analysis of the transaction ledger (plus optional budgets/goals) into a
 * logging streak and a set of achievement badges. No state is written.
 */

import type { Transaction, BudgetMap, SavingsGoal } from "@/core/store/dataStore";
import { getSavingsRate } from "@/core/store/dataStore";

export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  /** lucide-react icon name resolved by the page. */
  icon: string;
  earned: boolean;
  /** 0–100 progress toward earning (100 when earned). */
  progress: number;
}

export interface StreaksResult {
  /** Consecutive days (ending today or yesterday) with at least one log. */
  currentStreak: number;
  /** Longest consecutive logging run ever recorded. */
  longestStreak: number;
  /** Total distinct days the user has logged anything. */
  activeDays: number;
  badges: BadgeDefinition[];
  earnedCount: number;
}

/** YYYY-MM-DD in local time for day-bucketing. */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function todayKey(today = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;
}

/** Compute current + longest consecutive-day streaks from sorted day keys. */
function computeStreaks(dayKeys: Set<string>, today = new Date()): {
  current: number;
  longest: number;
} {
  if (dayKeys.size === 0) return { current: 0, longest: 0 };

  const sorted = [...dayKeys].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const gap = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    run = gap === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  // Current streak only counts if it reaches today or yesterday.
  const tKey = todayKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = todayKey(yesterday);

  let current = 0;
  if (dayKeys.has(tKey) || dayKeys.has(yKey)) {
    const cursor = new Date(dayKeys.has(tKey) ? today : yesterday);
    while (dayKeys.has(todayKey(cursor))) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return { current, longest };
}

const pct = (value: number, target: number) =>
  Math.max(0, Math.min(100, Math.round((value / target) * 100)));

export function computeStreaksAndBadges(
  txs: Transaction[],
  budgets: BudgetMap = {},
  goals: SavingsGoal[] = [],
  today = new Date()
): StreaksResult {
  const dayKeys = new Set(txs.map((t) => dayKey(t.date)));
  const { current, longest } = computeStreaks(dayKeys, today);

  const savingsRate = getSavingsRate(txs);
  const categoryCount = new Set(txs.map((t) => t.category)).size;
  const budgetCount = Object.keys(budgets).length;
  const completedGoals = goals.filter((g) => g.current >= g.target && g.target > 0).length;
  const txCount = txs.length;

  const badges: BadgeDefinition[] = [
    {
      id: "first-step",
      title: "First Step",
      description: "Log your very first transaction",
      icon: "Footprints",
      earned: txCount >= 1,
      progress: pct(txCount, 1),
    },
    {
      id: "getting-consistent",
      title: "Getting Consistent",
      description: "Log on 3 days in a row",
      icon: "Flame",
      earned: longest >= 3,
      progress: pct(longest, 3),
    },
    {
      id: "on-fire",
      title: "On Fire",
      description: "Hit a 7-day logging streak",
      icon: "Flame",
      earned: longest >= 7,
      progress: pct(longest, 7),
    },
    {
      id: "unstoppable",
      title: "Unstoppable",
      description: "Reach a 30-day logging streak",
      icon: "Zap",
      earned: longest >= 30,
      progress: pct(longest, 30),
    },
    {
      id: "saver",
      title: "Smart Saver",
      description: "Maintain a savings rate of 20%+",
      icon: "PiggyBank",
      earned: savingsRate >= 20,
      progress: pct(savingsRate, 20),
    },
    {
      id: "super-saver",
      title: "Super Saver",
      description: "Maintain a savings rate of 40%+",
      icon: "Trophy",
      earned: savingsRate >= 40,
      progress: pct(savingsRate, 40),
    },
    {
      id: "budgeter",
      title: "Budget Boss",
      description: "Set up at least one budget",
      icon: "Target",
      earned: budgetCount >= 1,
      progress: pct(budgetCount, 1),
    },
    {
      id: "goal-crusher",
      title: "Goal Crusher",
      description: "Complete a savings goal",
      icon: "Award",
      earned: completedGoals >= 1,
      progress: pct(completedGoals, 1),
    },
    {
      id: "diversified",
      title: "Well Rounded",
      description: "Log expenses across 5 categories",
      icon: "Layers",
      earned: categoryCount >= 5,
      progress: pct(categoryCount, 5),
    },
    {
      id: "century",
      title: "Centurion",
      description: "Log 100 transactions",
      icon: "Medal",
      earned: txCount >= 100,
      progress: pct(txCount, 100),
    },
  ];

  return {
    currentStreak: current,
    longestStreak: longest,
    activeDays: dayKeys.size,
    badges,
    earnedCount: badges.filter((b) => b.earned).length,
  };
}
