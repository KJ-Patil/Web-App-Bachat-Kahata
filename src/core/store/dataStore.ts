"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

/**
 * Central data layer — the single source of truth for the app.
 *
 * Everything is backed by `localStorage` (same keys the app already used) but
 * with EMPTY defaults: no mock/seed data is ever fabricated. Display values
 * (balances, charts, KPIs) are DERIVED from the real transactions a user adds,
 * rather than stored as separate fake counters.
 *
 * Writes go through the helpers below, which emit a `datastore:change` event so
 * every mounted page recomputes live (same-tab updates — the native `storage`
 * event only fires across tabs).
 */

export interface Transaction {
  id: string;
  amount: number;
  type: "expense" | "income";
  category: string;
  description: string;
  date: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
}

export type BudgetMap = Record<string, number>;

// ──────────────── STORAGE KEYS ────────────────
export const KEYS = {
  transactions: "transactions",
  budgets: "budgets",
  savingsGoals: "savings_goals",
  loans: "loans",
} as const;

const STORE_EVENT = "datastore:change";

/**
 * Keys that hold financial/ledger data (as opposed to auth, preferences, or
 * category config). Used when resetting the app's data without logging out.
 */
const FINANCIAL_KEYS = [
  KEYS.transactions,
  KEYS.budgets,
  KEYS.savingsGoals,
  KEYS.loans,
  "ledger_customers",
  "family_groups",
  "notifications",
  "mood_logs",
  // Legacy / derived caches that were seeded with fabricated values
  "total_income",
  "total_savings",
  "financial_health_score",
  "weekly_insights",
  "last_catchup_run",
] as const;

/**
 * Wipe all financial/ledger data so the app reflects a clean slate, while
 * keeping the user logged in and their preferences (currency, PIN, categories).
 */
export function clearFinancialData(): void {
  if (typeof window === "undefined") return;
  FINANCIAL_KEYS.forEach((key) => localStorage.removeItem(key));
  emitChange();
}

// ──────────────── LOW-LEVEL HELPERS ────────────────
function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  pushToFirestore(key, value);
  emitChange();
}

/** Notify all subscribers in the current tab that stored data changed. */
export function emitChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STORE_EVENT));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ──────────────── FIRESTORE SYNC ────────────────
/**
 * Cloud sync layer. localStorage stays the instant, offline-capable local
 * cache; these helpers mirror every write up to Firestore and stream remote
 * changes back down so the same account stays in sync across devices.
 *
 * Design: one document per collection at `users/{uid}/appData/{key}` holding a
 * single `value` field. A whole-collection write is one Firestore write op and
 * load is one read op per key — a personal finance app uses a few ops per day,
 * far under the free Spark plan's 20k writes / 50k reads daily quota.
 */

/** Keys that are synced to the cloud (financial/ledger data, not auth/prefs). */
const SYNCED_KEYS: string[] = [
  KEYS.transactions,
  KEYS.budgets,
  KEYS.savingsGoals,
  KEYS.loans,
];

let currentUid: string | null = null;
const detachers: Array<() => void> = [];
/** Keys currently being written from a remote snapshot — skip pushing back. */
const applyingRemote = new Set<string>();

/** Mirror a local write up to the signed-in user's Firestore document. */
function pushToFirestore(key: string, value: unknown): void {
  if (!currentUid) return; // not signed in → local-only
  if (!SYNCED_KEYS.includes(key)) return; // not a synced key
  if (applyingRemote.has(key)) return; // came FROM the cloud, don't echo back
  void setDoc(doc(db, "users", currentUid, "appData", key), { value }).catch(
    () => {
      /* offline / transient — localStorage already holds the source of truth */
    }
  );
}

/** Write a value that arrived from Firestore into the local cache. */
function applyRemote(key: string, value: unknown): void {
  applyingRemote.add(key);
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } finally {
    applyingRemote.delete(key);
  }
  emitChange();
}

/** Subscribe to every synced key for the given user. */
function startSync(uid: string): void {
  currentUid = uid;
  for (const key of SYNCED_KEYS) {
    const ref = doc(db, "users", uid, "appData", key);
    detachers.push(
      onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
          // No cloud copy yet — seed it from whatever is already local.
          const local = localStorage.getItem(key);
          if (local) {
            void setDoc(ref, { value: JSON.parse(local) }).catch(() => {});
          }
          return;
        }
        applyRemote(key, snap.data().value);
      })
    );
  }
}

/** Tear down all listeners (called on sign-out). */
function stopSync(): void {
  while (detachers.length) detachers.pop()?.();
  currentUid = null;
}

// Start/stop cloud sync as the user signs in and out. Runs once per client
// (this module is a singleton); no-ops during SSR.
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (user) => {
    stopSync();
    if (user) startSync(user.uid);
  });
}

// ──────────────── TRANSACTIONS ────────────────
export function getTransactions(): Transaction[] {
  return readJSON<Transaction[]>(KEYS.transactions, []);
}

export function setTransactions(txs: Transaction[]): void {
  writeJSON(KEYS.transactions, txs);
}

/** Create a transaction (id + date auto-filled) and prepend it to the ledger. */
export function addTransaction(
  input: Omit<Transaction, "id" | "date"> & { id?: string; date?: string }
): Transaction {
  const tx: Transaction = {
    id: input.id ?? generateId(),
    date: input.date ?? new Date().toISOString(),
    amount: input.amount,
    type: input.type,
    category: input.category,
    description: input.description,
  };
  setTransactions([tx, ...getTransactions()]);
  return tx;
}

export function updateTransaction(id: string, patch: Partial<Transaction>): void {
  setTransactions(getTransactions().map((t) => (t.id === id ? { ...t, ...patch } : t)));
}

export function deleteTransaction(id: string): void {
  setTransactions(getTransactions().filter((t) => t.id !== id));
}

// ──────────────── SAVINGS GOALS ────────────────
export function getSavingsGoals(): SavingsGoal[] {
  return readJSON<SavingsGoal[]>(KEYS.savingsGoals, []);
}

export function setSavingsGoals(goals: SavingsGoal[]): void {
  writeJSON(KEYS.savingsGoals, goals);
}

// ──────────────── BUDGETS ────────────────
export function getBudgets(): BudgetMap {
  return readJSON<BudgetMap>(KEYS.budgets, {});
}

export function setBudgets(budgets: BudgetMap): void {
  writeJSON(KEYS.budgets, budgets);
}

// ──────────────── DERIVED SELECTORS ────────────────
const sum = (txs: Transaction[]) => txs.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

export interface Totals {
  income: number;
  expense: number;
  balance: number;
}

/** Lifetime income / expense / net balance computed from real transactions. */
export function getTotals(txs: Transaction[] = getTransactions()): Totals {
  const income = sum(txs.filter((t) => t.type === "income"));
  const expense = sum(txs.filter((t) => t.type === "expense"));
  return { income, expense, balance: income - expense };
}

function inMonth(date: Date, monthOffset = 0): (t: Transaction) => boolean {
  const target = new Date(date.getFullYear(), date.getMonth() + monthOffset, 1);
  const m = target.getMonth();
  const y = target.getFullYear();
  return (t: Transaction) => {
    const d = new Date(t.date);
    return d.getMonth() === m && d.getFullYear() === y;
  };
}

/** Income / expense / balance for a single month (0 = current, -1 = last). */
export function getMonthTotals(
  monthOffset = 0,
  txs: Transaction[] = getTransactions()
): Totals {
  return getTotals(txs.filter(inMonth(new Date(), monthOffset)));
}

export interface CategorySlice {
  name: string;
  value: number;
  percentage: number;
}

/**
 * Spend (or income) grouped by category, sorted high→low, with each slice's
 * share of the total. Optionally restrict to a given month offset.
 */
export function getCategoryBreakdown(
  type: "expense" | "income" = "expense",
  monthOffset: number | null = null,
  txs: Transaction[] = getTransactions()
): CategorySlice[] {
  let filtered = txs.filter((t) => t.type === type);
  if (monthOffset !== null) filtered = filtered.filter(inMonth(new Date(), monthOffset));

  const byCategory = new Map<string, number>();
  for (const t of filtered) {
    byCategory.set(t.category, (byCategory.get(t.category) || 0) + (Number(t.amount) || 0));
  }

  const total = [...byCategory.values()].reduce((a, b) => a + b, 0);
  return [...byCategory.entries()]
    .map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export interface DailyBalancePoint {
  day: string;
  Balance: number;
}

/**
 * Running balance over the last `days` days, ending at the current net balance.
 * Returns one point per day labelled with the short weekday.
 */
export function getDailyBalanceTrend(
  days = 7,
  txs: Transaction[] = getTransactions()
): DailyBalancePoint[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Net change per day within the window.
  const windowStart = new Date(startOfToday);
  windowStart.setDate(windowStart.getDate() - (days - 1));

  const dailyNet = new Array(days).fill(0);
  let netInWindow = 0;
  for (const t of txs) {
    const d = new Date(t.date);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const idx = Math.round((dayStart.getTime() - windowStart.getTime()) / 86400000);
    if (idx >= 0 && idx < days) {
      const delta = t.type === "income" ? t.amount : -t.amount;
      dailyNet[idx] += delta;
      netInWindow += delta;
    }
  }

  const currentBalance = getTotals(txs).balance;
  let running = currentBalance - netInWindow; // balance at the start of the window
  const points: DailyBalancePoint[] = [];
  for (let i = 0; i < days; i++) {
    running += dailyNet[i];
    const d = new Date(windowStart);
    d.setDate(d.getDate() + i);
    points.push({ day: d.toLocaleDateString("en-US", { weekday: "short" }), Balance: running });
  }
  return points;
}

export interface MonthlyTrendPoint {
  month: string;
  Income: number;
  Expense: number;
}

/** Income vs expense per month for the last `months` months (oldest → newest). */
export function getMonthlyTrend(
  months = 6,
  txs: Transaction[] = getTransactions()
): MonthlyTrendPoint[] {
  const now = new Date();
  const points: MonthlyTrendPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthTxs = txs.filter(inMonth(now, -i));
    const t = getTotals(monthTxs);
    points.push({
      month: ref.toLocaleDateString("en-US", { month: "short" }),
      Income: t.income,
      Expense: t.expense,
    });
  }
  return points;
}

/** Savings rate as a percentage: (income − expense) / income. */
export function getSavingsRate(txs: Transaction[] = getTransactions()): number {
  const { income, expense } = getTotals(txs);
  if (income <= 0) return 0;
  return Math.round(((income - expense) / income) * 1000) / 10;
}

/** Total amount accumulated across all savings goals. */
export function getTotalSaved(goals: SavingsGoal[] = getSavingsGoals()): number {
  return goals.reduce((acc, g) => acc + (Number(g.current) || 0), 0);
}

/** Best-effort outstanding debt from the loans store (0 when none). */
export function getTotalDebt(): number {
  const loans = readJSON<Array<Record<string, unknown>>>(KEYS.loans, []);
  return loans.reduce((acc, loan) => {
    const value = loan.outstanding ?? loan.balance ?? loan.principal ?? loan.amount ?? 0;
    return acc + (Number(value) || 0);
  }, 0);
}

// ──────────────── REACT HOOKS ────────────────
/**
 * Subscribe to the transactions ledger. Re-renders whenever data changes in
 * this tab (via `datastore:change`) or another tab (via `storage`).
 */
export function useTransactions(): Transaction[] {
  const [txs, setTxs] = useState<Transaction[]>([]);
  useEffect(() => {
    const sync = () => setTxs(getTransactions());
    sync();
    window.addEventListener(STORE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return txs;
}

/** Subscribe to the savings goals store. */
export function useSavingsGoals(): SavingsGoal[] {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  useEffect(() => {
    const sync = () => setGoals(getSavingsGoals());
    sync();
    window.addEventListener(STORE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return goals;
}
