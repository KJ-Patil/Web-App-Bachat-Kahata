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
  /** The effective amount that hits the ledger (post-discount for expenses). */
  amount: number;
  type: "expense" | "income";
  category: string;
  description: string;
  date: string;
  /** Pre-discount price, present only when a discount was applied. */
  originalAmount?: number;
  /** Discount value in ₹ (already subtracted from `amount`). */
  discountAmount?: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
}

export type BudgetMap = Record<string, number>;

export interface LoanRecord {
  id: string;
  name: string;
  lender: string;
  principal: number;
  annualInterestRate: number;
  tenureMonths: number;
  monthsPaid: number;
  startDate: string;
}

export interface LedgerEntry {
  id: string;
  amount: number;
  type: "gave" | "got";
  description: string;
  date: string;
  /** Linked transaction id so dashboard totals stay in sync on add/delete. */
  txId?: string;
}

export interface LedgerCustomer {
  id: string;
  name: string;
  phone: string;
  type: "customer" | "supplier";
  /** positive: credit (customer owes us), negative: debit (we owe supplier) */
  balance: number;
  history: LedgerEntry[];
}

export interface FamilyGroup {
  id: string;
  name: string;
  code: string;
  members: number;
  totalBalance: number;
  spendingLimit?: number;
}

export interface GroupExpense {
  id: string;
  groupId: string;
  amount: number;
  description: string;
  paidBy: string;
  date: string;
}

/** A subscription the user added by hand (vs. auto-detected from transactions). */
export interface ManualSubscription {
  id: string;
  name: string;
  category: string;
  /** Recurring charge per month, in the active currency. */
  monthlyAmount: number;
  createdAt: string;
}

// ──────────────── STORAGE KEYS ────────────────
export const KEYS = {
  transactions: "transactions",
  budgets: "budgets",
  savingsGoals: "savings_goals",
  loans: "loans",
  ledgerCustomers: "ledger_customers",
  familyGroups: "family_groups",
  familyExpenses: "family_expenses",
  manualSubscriptions: "manual_subscriptions",
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
  KEYS.ledgerCustomers,
  KEYS.familyGroups,
  KEYS.familyExpenses,
  KEYS.manualSubscriptions,
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

  // 1. Wipe synced keys by writing empty defaults. This triggers pushToFirestore 
  // so the cloud is also wiped, preventing it from restoring deleted data.
  writeJSON(KEYS.transactions, []);
  writeJSON(KEYS.budgets, {});
  writeJSON(KEYS.savingsGoals, []);
  writeJSON(KEYS.loans, []);
  writeJSON(KEYS.ledgerCustomers, []);
  writeJSON(KEYS.familyGroups, []);
  writeJSON(KEYS.familyExpenses, []);
  writeJSON(KEYS.manualSubscriptions, []);

  // 2. Remove any remaining local-only financial keys
  FINANCIAL_KEYS.forEach((key) => {
    if (!SYNCED_KEYS.includes(key)) {
      localStorage.removeItem(key);
    }
  });

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
  KEYS.ledgerCustomers,
  KEYS.familyGroups,
  KEYS.familyExpenses,
  KEYS.manualSubscriptions,
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

/** True for `null`/`undefined`, an empty array, or an empty object — i.e. a
 *  value that carries no user data and must never overwrite a populated one. */
function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
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

        const remote = snap.data().value;

        // Guard against data loss: never let an empty/stale remote snapshot
        // clobber data the user already has locally. This is what made saves
        // "not stick" — a stale empty cloud doc would overwrite a just-saved
        // budget on the next snapshot. When the cloud is empty but local has
        // data, push local up to reconcile instead of wiping it.
        if (isEmptyValue(remote)) {
          const local = localStorage.getItem(key);
          if (local && !isEmptyValue(JSON.parse(local))) {
            void setDoc(ref, { value: JSON.parse(local) }).catch(() => {});
            return;
          }
        }

        applyRemote(key, remote);
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
    ...(input.originalAmount !== undefined && { originalAmount: input.originalAmount }),
    ...(input.discountAmount !== undefined && { discountAmount: input.discountAmount }),
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

// ──────────────── LOANS (EMI TRACKER) ────────────────
export function getLoans(): LoanRecord[] {
  return readJSON<LoanRecord[]>(KEYS.loans, []);
}

export function setLoans(loans: LoanRecord[]): void {
  writeJSON(KEYS.loans, loans);
}

// ──────────────── BUDGETS ────────────────
export function getBudgets(): BudgetMap {
  return readJSON<BudgetMap>(KEYS.budgets, {});
}

export function setBudgets(budgets: BudgetMap): void {
  writeJSON(KEYS.budgets, budgets);
}

// ──────────────── LEDGER (NOTEBOOK) CUSTOMERS ────────────────
export function getLedgerCustomers(): LedgerCustomer[] {
  return readJSON<LedgerCustomer[]>(KEYS.ledgerCustomers, []);
}

export function setLedgerCustomers(customers: LedgerCustomer[]): void {
  writeJSON(KEYS.ledgerCustomers, customers);
}

// ──────────────── FAMILY WALLET ────────────────
export function getFamilyGroups(): FamilyGroup[] {
  return readJSON<FamilyGroup[]>(KEYS.familyGroups, []);
}

export function setFamilyGroups(groups: FamilyGroup[]): void {
  writeJSON(KEYS.familyGroups, groups);
}

export function getFamilyExpenses(): GroupExpense[] {
  return readJSON<GroupExpense[]>(KEYS.familyExpenses, []);
}

export function setFamilyExpenses(expenses: GroupExpense[]): void {
  writeJSON(KEYS.familyExpenses, expenses);
}

// ──────────────── MANUAL SUBSCRIPTIONS ────────────────
export function getManualSubscriptions(): ManualSubscription[] {
  return readJSON<ManualSubscription[]>(KEYS.manualSubscriptions, []);
}

export function setManualSubscriptions(subs: ManualSubscription[]): void {
  writeJSON(KEYS.manualSubscriptions, subs);
}

/** Create a manual subscription (id + createdAt auto-filled) and prepend it. */
export function addManualSubscription(
  input: Omit<ManualSubscription, "id" | "createdAt">
): ManualSubscription {
  const sub: ManualSubscription = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  setManualSubscriptions([sub, ...getManualSubscriptions()]);
  return sub;
}

export function deleteManualSubscription(id: string): void {
  setManualSubscriptions(getManualSubscriptions().filter((s) => s.id !== id));
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

/** Subscribe to the budgets store. Re-renders whenever budgets change. */
export function useBudgets(): BudgetMap {
  const [budgets, setBudgetsState] = useState<BudgetMap>({});
  useEffect(() => {
    const sync = () => setBudgetsState(getBudgets());
    sync();
    window.addEventListener(STORE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return budgets;
}

/** Subscribe to the notebook ledger customers store. */
export function useLedgerCustomers(): LedgerCustomer[] {
  const [customers, setCustomers] = useState<LedgerCustomer[]>([]);
  useEffect(() => {
    const sync = () => setCustomers(getLedgerCustomers());
    sync();
    window.addEventListener(STORE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return customers;
}

/** Subscribe to the loans (EMI tracker) store. */
export function useLoans(): LoanRecord[] {
  const [loans, setLoansState] = useState<LoanRecord[]>([]);
  useEffect(() => {
    const sync = () => setLoansState(getLoans());
    sync();
    window.addEventListener(STORE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return loans;
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

/** Subscribe to the family groups store. */
export function useFamilyGroups(): FamilyGroup[] {
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  useEffect(() => {
    const sync = () => setGroups(getFamilyGroups());
    sync();
    window.addEventListener(STORE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return groups;
}

/** Subscribe to the manual subscriptions store. */
export function useManualSubscriptions(): ManualSubscription[] {
  const [subs, setSubs] = useState<ManualSubscription[]>([]);
  useEffect(() => {
    const sync = () => setSubs(getManualSubscriptions());
    sync();
    window.addEventListener(STORE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return subs;
}

/** Subscribe to the family expenses store. */
export function useFamilyExpenses(): GroupExpense[] {
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  useEffect(() => {
    const sync = () => setExpenses(getFamilyExpenses());
    sync();
    window.addEventListener(STORE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return expenses;
}
