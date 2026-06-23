/**
 * Subscription Tracker — detects recurring payments from real transactions.
 *
 * Pure, read-only analysis over the existing `Transaction` ledger. Nothing is
 * stored: a "subscription" is inferred whenever the same merchant/description is
 * charged a similar amount across two or more distinct calendar months.
 */

import type { Transaction } from "@/core/store/dataStore";

export interface DetectedSubscription {
  /** Stable key derived from the normalized description. */
  id: string;
  /** Human-readable label (the most recent original description). */
  name: string;
  category: string;
  /** Representative (median) monthly charge. */
  monthlyAmount: number;
  /** monthlyAmount × 12 — the headline "annual cost" figure. */
  annualCost: number;
  /** How many charges were matched. */
  occurrences: number;
  /** ISO date of the most recent charge. */
  lastChargedISO: string;
  /** Estimated next charge (lastCharged + ~1 month), ISO date. */
  nextEstimatedISO: string;
  /**
   * True when nothing has been charged in the last ~45 days even though the
   * series looked monthly — a candidate "unused / forgotten" subscription.
   */
  possiblyUnused: boolean;
}

/** Strip noise so "Netflix #4471" and "NETFLIX" collapse to one merchant. */
function normalizeKey(description: string): string {
  return description
    .toLowerCase()
    .replace(/\d+/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const monthBucket = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
};

const median = (nums: number[]): number => {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const DAY_MS = 86_400_000;

/**
 * Group expense transactions by merchant and surface those that recur monthly.
 *
 * @param minOccurrences how many charges before something counts as recurring.
 */
export function detectSubscriptions(
  txs: Transaction[],
  minOccurrences = 2
): DetectedSubscription[] {
  const groups = new Map<string, Transaction[]>();

  for (const tx of txs) {
    if (tx.type !== "expense") continue;
    const key = normalizeKey(tx.description || tx.category || "");
    if (!key) continue;
    const bucket = groups.get(key) ?? [];
    bucket.push(tx);
    groups.set(key, bucket);
  }

  const now = Date.now();
  const result: DetectedSubscription[] = [];

  for (const [key, charges] of groups) {
    // Require charges spread across distinct months — a one-off split into two
    // entries in the same month is not a subscription.
    const distinctMonths = new Set(charges.map((c) => monthBucket(c.date)));
    if (distinctMonths.size < minOccurrences) continue;

    const sortedByDate = [...charges].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const last = sortedByDate[0];
    const amounts = charges.map((c) => Number(c.amount) || 0);
    const monthlyAmount = Math.round(median(amounts));

    const lastTime = new Date(last.date).getTime();
    const nextEstimated = new Date(lastTime);
    nextEstimated.setMonth(nextEstimated.getMonth() + 1);

    result.push({
      id: key.replace(/\s+/g, "-"),
      name: last.description?.trim() || last.category,
      category: last.category,
      monthlyAmount,
      annualCost: monthlyAmount * 12,
      occurrences: charges.length,
      lastChargedISO: last.date,
      nextEstimatedISO: nextEstimated.toISOString(),
      possiblyUnused: now - lastTime > 45 * DAY_MS,
    });
  }

  return result.sort((a, b) => b.annualCost - a.annualCost);
}

/** Convenience aggregate for headline KPIs on the page. */
export function summarizeSubscriptions(subs: DetectedSubscription[]): {
  monthlyTotal: number;
  annualTotal: number;
  count: number;
  unusedCount: number;
} {
  return {
    monthlyTotal: subs.reduce((a, s) => a + s.monthlyAmount, 0),
    annualTotal: subs.reduce((a, s) => a + s.annualCost, 0),
    count: subs.length,
    unusedCount: subs.filter((s) => s.possiblyUnused).length,
  };
}
