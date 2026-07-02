// Upcoming financial obligations projected onto calendar days: loan EMIs and
// recurring subscription charges. Read-only projection over existing data —
// nothing is stored. Used by the Calendar month grid and the day-detail page.

import type {
  LoanRecord,
  ManualSubscription,
  Transaction,
} from "@/core/store/dataStore";
import { detectSubscriptions } from "@/core/insights/subscriptions";
import { toDateKey } from "@/core/utils/calendar";

export interface DueItem {
  kind: "emi" | "subscription";
  label: string;
  amount: number;
}

/** Reducing-balance EMI (same formula as the EMI tracker). */
function calcEmi(principal: number, annualRate: number, tenureMonths: number): number {
  if (tenureMonths <= 0) return 0;
  if (annualRate === 0) return principal / tenureMonths;
  const r = annualRate / 100 / 12;
  const factor = Math.pow(1 + r, tenureMonths);
  return (principal * r * factor) / (factor - 1);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Upcoming monthly occurrences (from today forward) anchored to a date's day. */
function upcomingMonthly(anchor: Date, count: number): Date[] {
  const today = startOfToday();
  let d = new Date(today.getFullYear(), today.getMonth(), anchor.getDate());
  if (d < today) d = addMonths(d, 1);
  const out: Date[] = [];
  for (let i = 0; i < count; i++) {
    out.push(new Date(d));
    d = addMonths(d, 1);
  }
  return out;
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
      const due = addMonths(start, k);
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
