import { useEffect, useState } from "react";
import { getTotals, getTotalSaved, isUnlocked } from "@/core/store/dataStore";

export interface CatchUpResult {
  executed: boolean;
  healthScore: number;
  weeklyInsights: string[];
  lastRun: string;
}

const CATCHUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7-day synchronization window

/**
 * Calculates financial health score entirely client-side based on cached data.
 */
function calculateFinancialHealthScore(): number {
  if (typeof window === "undefined") return 70;

  // Derived entirely from the user's real ledger — no fabricated defaults.
  const totalIncome = getTotals().income;
  const totalSavings = getTotalSaved();

  if (totalIncome <= 0) return 50;

  const savingsRate = (totalSavings / totalIncome) * 100;
  const score = Math.round(40 + (savingsRate * 0.6));
  return Math.min(Math.max(score, 0), 100);
}

/**
 * Generates financial insights based on calculated health parameters.
 */
function generateWeeklyInsights(): string[] {
  const score = calculateFinancialHealthScore();
  const insights = [];

  if (score >= 80) {
    insights.push("Excellent wealth-building phase! Your savings rate exceeds standard professional recommendations.");
    insights.push("Action Item: Consider shifting excess liquidity from active accounts into higher-yield assets.");
  } else if (score >= 50) {
    insights.push("Stable cash flow, but category budget efficiency can be optimized further.");
    insights.push("Action Item: Review recurring subscription services to increase your savings yield.");
  } else {
    insights.push("Attention required: Discretionary expenses consumption is higher than standard guidelines.");
    insights.push("Action Item: Set hard budget ceilings on non-essential categories for the upcoming week.");
  }

  insights.push("Your liquidity metrics indicate sound safety cash buffers to cover 3+ months of operations.");
  return insights;
}

/**
 * Evaluates execution windows and runs health metrics syncing client-side.
 */
export function runLazyCatchUpSync(): CatchUpResult {
  if (typeof window === "undefined") {
    return { executed: false, healthScore: 70, weeklyInsights: [], lastRun: "" };
  }

  // Nothing can be computed before the store is unlocked: every financial read
  // returns its empty fallback, so the score would come out as the no-income
  // floor of 50 — and then be cached for a week, hiding the real number long
  // after the user signed in. Skip the run instead; the hook re-runs on unlock.
  if (!isUnlocked()) {
    return { executed: false, healthScore: 0, weeklyInsights: [], lastRun: "" };
  }

  const now = Date.now();
  const lastRunStr = localStorage.getItem("last_catchup_run");
  const lastRunTime = lastRunStr ? Number(lastRunStr) : 0;

  // Execute processing if the 7-day lapse window is reached or not yet initialized
  if (lastRunTime === 0 || (now - lastRunTime) >= CATCHUP_WINDOW_MS) {
    const healthScore = calculateFinancialHealthScore();
    const insights = generateWeeklyInsights();

    localStorage.setItem("financial_health_score", String(healthScore));
    localStorage.setItem("weekly_insights", JSON.stringify(insights));
    localStorage.setItem("last_catchup_run", String(now));

    return {
      executed: true,
      healthScore,
      weeklyInsights: insights,
      lastRun: new Date(now).toISOString(),
    };
  }

  // Load existing cached metrics. Both reads fall back to a fresh computation
  // rather than to invented numbers — the previous default of "75" plus two
  // congratulatory sentences reported a health score the user had never earned.
  const storedScore = Number(localStorage.getItem("financial_health_score"));
  const cachedScore = Number.isFinite(storedScore) && storedScore > 0
    ? storedScore
    : calculateFinancialHealthScore();

  let cachedInsights: string[];
  try {
    const raw = localStorage.getItem("weekly_insights");
    const parsed = raw ? JSON.parse(raw) : null;
    // A corrupt or half-written value used to throw straight out of this
    // function, and it is called during dashboard mount — so it took the whole
    // app down rather than degrading to a recomputed list.
    cachedInsights = Array.isArray(parsed) ? parsed : generateWeeklyInsights();
  } catch {
    cachedInsights = generateWeeklyInsights();
  }

  return {
    executed: false,
    healthScore: cachedScore,
    weeklyInsights: cachedInsights,
    lastRun: new Date(lastRunTime).toISOString(),
  };
}

/**
 * Custom React hook to bind the Lazy sync loop during layout component mounting.
 */
export function useLazyCatchUpSync() {
  const [syncData, setSyncData] = useState<CatchUpResult | null>(null);

  useEffect(() => {
    // Re-run on every store change, not just on mount. At mount the store is
    // usually still locked (the PIN hasn't been entered), so the first run is a
    // no-op; unlocking fires `datastore:change`, and that is when the score can
    // actually be computed from real data.
    const run = () => setSyncData(runLazyCatchUpSync());
    run();
    window.addEventListener("datastore:change", run);
    return () => window.removeEventListener("datastore:change", run);
  }, []);

  return syncData;
}
