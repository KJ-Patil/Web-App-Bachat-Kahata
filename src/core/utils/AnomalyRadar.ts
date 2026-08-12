import type { Transaction } from "@/core/store/dataStore";

/** How far back the baseline looks. A "usual" spend means recent habit, not
 *  something from two years ago. */
const BASELINE_WINDOW_DAYS = 180;
const DAY_MS = 86_400_000;

/** Minimum samples before a baseline means anything. */
const MIN_SAMPLES = 3;

/** How many times the typical spend counts as unusual. */
const VARIANCE_MULTIPLIER = 2.5;

/** Middle value — robust to the outliers this function exists to detect. */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Flag a spend that is far above what this category usually costs.
 *
 * Two things were wrong with the previous version, and both made it fire less
 * often than intended — which is the bad direction for an alert:
 *
 *  - It averaged the WHOLE history, so a single large past spend lifted the
 *    baseline permanently and suppressed every later alert. The baseline is now
 *    a median (an outlier moves it barely at all) over a recent window.
 *  - It was typed `any[]`, so nothing checked that real transactions were being
 *    passed, or that `amount` was a number.
 *
 * @param amount the spend being checked, in base currency
 * @param category its category
 * @param transactions the existing ledger — must NOT already contain this spend,
 *   or it inflates its own baseline
 * @param now injectable for tests
 * @returns a human-readable warning, or null when the spend looks normal
 */
export function checkAnomaly(
  amount: number,
  category: string,
  transactions: Transaction[],
  now: Date = new Date()
): string | null {
  if (!Array.isArray(transactions) || transactions.length === 0) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const cutoff = now.getTime() - BASELINE_WINDOW_DAYS * DAY_MS;

  const recentAmounts = transactions
    .filter((tx) => {
      if (tx.type !== "expense" || tx.category !== category) return false;
      const time = new Date(tx.date).getTime();
      return Number.isFinite(time) && time >= cutoff;
    })
    .map((tx) => Number(tx.amount))
    .filter((value) => Number.isFinite(value) && value > 0);

  // Not enough history to say what "usual" looks like.
  if (recentAmounts.length < MIN_SAMPLES) return null;

  const typicalSpend = median(recentAmounts);
  if (typicalSpend <= 0) return null;

  if (amount <= typicalSpend * VARIANCE_MULTIPLIER) return null;

  return `Anomaly detected! ${Math.round(amount)} is significantly higher than your usual ${category} spend of ${Math.round(typicalSpend)}.`;
}
