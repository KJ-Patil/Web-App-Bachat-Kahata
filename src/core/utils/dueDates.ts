// Upcoming financial obligations projected onto calendar days: loan EMIs and
// recurring subscription charges. Read-only projection over existing data —
// nothing is stored. Used by the Calendar month grid and the day-detail page.

import type {
  LoanRecord,
  ManualSubscription,
  Transaction,
} from "@/core/store/dataStore";
import { detectSubscriptions } from "@/core/insights/subscriptions";
import { toDateKey, addMonthsClamped } from "@/core/utils/calendar";
import { calcEmi } from "@/core/math/loan";

export interface DueItem {
  kind: "emi" | "subscription";
  label: string;
  amount: number;
}

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Upcoming monthly occurrences (from today forward) anchored to a date's day.
 *
 * Each occurrence is clamped to a day that exists in its month, so a renewal on
 * the 31st shows on 28/29 February instead of overflowing into March — and,
 * crucially, the anchor day is re-derived every month rather than carried
 * forward, so one short month can't shift the whole rest of the series.
 */
function upcomingMonthly(anchor: Date, count: number): Date[] {
  const today = startOfToday();
  const anchorDay = anchor.getDate();

  const occurrenceIn = (year: number, month: number): Date => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(anchorDay, lastDay));
  };

  const year = today.getFullYear();
  // Start at this month's occurrence, or next month's if it has already passed.
  const startMonth =
    occurrenceIn(year, today.getMonth()) < today ? today.getMonth() + 1 : today.getMonth();

  return Array.from({ length: count }, (_, i) => occurrenceIn(year, startMonth + i));
}

/**
 * Build a map of local day-key -> due items for the next ~12 months.
 * EMIs cover each loan's remaining unpaid, future payments; subscriptions cover
 * the next 12 recurring charges (manual + auto-detected, skipping stale ones).
 */
export function computeDueDates(
  loans: LoanRecord[],
  transactions: Transaction[],
  manualSubs: ManualSubscription[]
): Record<string, DueItem[]> {
  const map: Record<string, DueItem[]> = {};
  const today = startOfToday();

  const push = (d: Date, item: DueItem) => {
    const key = toDateKey(d);
    (map[key] ??= []).push(item);
  };

  // ── Loan EMIs: remaining unpaid payments, future only ──
  loans.forEach((loan) => {
    const emi = calcEmi(loan.principal, loan.annualInterestRate, loan.tenureMonths);
    const start = new Date(loan.startDate);
    for (let k = loan.monthsPaid + 1; k <= loan.tenureMonths; k++) {
      // Always measured from the loan's start date, so a short month clamps
      // once rather than dragging every later instalment along with it.
      const due = addMonthsClamped(start, k);
      if (due >= today) push(due, { kind: "emi", label: `${loan.name} EMI`, amount: emi });
    }
  });

  // ── Subscriptions: manual + detected, next 12 charges ──
  const manualAnchors = manualSubs.map((m) => ({
    name: m.name,
    amount: m.monthlyAmount,
    anchor: new Date(m.createdAt),
  }));
  const detectedAnchors = detectSubscriptions(transactions)
    .filter((s) => !s.possiblyUnused)
    .map((s) => ({
      name: s.name,
      amount: s.monthlyAmount,
      anchor: new Date(s.nextEstimatedISO),
    }));

  [...manualAnchors, ...detectedAnchors].forEach(({ name, amount, anchor }) => {
    upcomingMonthly(anchor, 12).forEach((d) =>
      push(d, { kind: "subscription", label: `${name} renews`, amount })
    );
  });

  return map;
}
