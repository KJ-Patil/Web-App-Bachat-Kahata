# Bachat Khata — Features & Functions Reference

**Bachat Khata – Personal Wealth Manager** is a Next.js personal finance app.
Data lives in `localStorage` as an offline-first cache and is mirrored to
**Firebase Auth + Firestore** for per-user cloud sync. No mock/seed data is
ever fabricated — every KPI and chart is *derived* from the real transactions
a user enters.

---

## Table of Contents
1. [Authentication & Security](#1-authentication--security)
2. [Core Data Layer](#2-core-data-layer-dataStorets)
3. [Dashboard & Tracking](#3-dashboard--tracking)
4. [Financial Engines & Insights](#4-financial-engines--insights)
5. [Debt & Loans](#5-debt--loans)
6. [Ledger & Family Wallet](#6-ledger--family-wallet)
7. [Automation & Input](#7-automation--input)
8. [Education & Settings](#8-education--settings)
9. [Utilities & Export](#9-utilities--export)

---

## 1. Authentication & Security

| Feature | File | Summary |
|---|---|---|
| **Login** | `src/app/(auth)/login/page.tsx` | Email/password sign-in plus Google sign-in popup. |
| **Register** | `src/app/(auth)/register/page.tsx` | Creates a new account and sets the display name. |
| **PIN Lock** | `src/app/(auth)/pin-lock/page.tsx` | App-level PIN gate for quick re-entry without full logout. |
| **Phone Input** | `src/components/inputs/PhoneNumberInput.tsx` | Phone field with country-code selector (`countries.ts`). |

**Functions / APIs used**
- `signInWithEmailAndPassword` — authenticate existing users by email + password.
- `signInWithPopup` + `GoogleAuthProvider` — one-click Google OAuth login.
- `createUserWithEmailAndPassword` — register a brand-new account.
- `updateProfile` — attach a display name to the new user.

---

## 2. Core Data Layer (`dataStore.ts`)

The single source of truth. localStorage = instant offline cache; Firestore =
cloud mirror at `users/{uid}/appData/{key}` (one doc per collection).

### Data models (interfaces)
- `Transaction` — id, amount, type (`income`/`expense`), category, description, date.
- `SavingsGoal` — name, target, current, deadline.
- `BudgetMap` — category → monthly limit.
- `LoanRecord` — lender, principal, interest rate, tenure, months paid.
- `LedgerEntry` / `LedgerCustomer` — gave/got entries and customer/supplier balances.
- `FamilyGroup` / `GroupExpense` — shared wallet groups and their expenses.

### Storage & sync functions
- `readJSON` / `writeJSON` — typed localStorage get/set; writes also push to cloud and emit a change event.
- `pushToFirestore` — mirrors a local write up to the signed-in user's Firestore doc.
- `applyRemote` / `startSync` / `stopSync` — stream cloud changes down; start/stop on sign in/out.
- `isEmptyValue` — guard so an empty/stale cloud snapshot never wipes good local data.
- `emitChange` — broadcasts `datastore:change` so all mounted pages recompute live in-tab.
- `generateId` — short random id for new records.
- `clearFinancialData` — wipe all financial data (local + cloud) while staying logged in.

### CRUD helpers
- **Transactions:** `getTransactions`, `setTransactions`, `addTransaction`, `updateTransaction`, `deleteTransaction`.
- **Savings:** `getSavingsGoals`, `setSavingsGoals`.
- **Loans:** `getLoans`, `setLoans`.
- **Budgets:** `getBudgets`, `setBudgets`.
- **Ledger:** `getLedgerCustomers`, `setLedgerCustomers`.
- **Family:** `getFamilyGroups`, `setFamilyGroups`, `getFamilyExpenses`, `setFamilyExpenses`.

### Derived selectors (computed from real data)
- `getTotals` — lifetime income / expense / net balance.
- `getMonthTotals` — totals for a single month (0 = current, -1 = last).
- `getCategoryBreakdown` — spend/income grouped by category, sorted, with % share.
- `getDailyBalanceTrend` — running balance over the last N days.
- `getMonthlyTrend` — income vs expense per month for the last N months.
- `getSavingsRate` — (income − expense) / income, as a %.
- `getTotalSaved` — sum of all savings-goal balances.
- `getTotalDebt` — best-effort outstanding loan total.

### React hooks (live-updating subscriptions)
`useTransactions`, `useBudgets`, `useLedgerCustomers`, `useLoans`,
`useSavingsGoals`, `useFamilyGroups`, `useFamilyExpenses` — each re-renders on
in-tab (`datastore:change`) and cross-tab (`storage`) changes.

---

## 3. Dashboard & Tracking

| Feature | File | Summary |
|---|---|---|
| **Home Dashboard** | `src/app/(dashboard)/home/page.tsx` | Headline KPIs, balance, quick actions, safe-to-spend card. |
| **Transactions** | `src/app/(dashboard)/transactions/page.tsx` | Full ledger with add / edit / delete. |
| **Analytics** | `src/app/(dashboard)/analytics/page.tsx` | Recharts visualizations of category breakdown and trends. |
| **Comparison** | `src/app/(dashboard)/comparison/page.tsx` | Month-vs-month per-category deltas and % change. |
| **Budgets** | `src/app/(dashboard)/budgets/page.tsx` | Per-category monthly limits + utilization (Set Budget modal). |
| **Savings Goals** | `src/app/(dashboard)/savings/page.tsx` | Goal progress toward targets/deadlines (Add Goal modal). |
| **Notifications** | `src/app/(dashboard)/notifications/page.tsx` | In-app notification feed. |

---

## 4. Financial Engines & Insights

### Health Score — `HealthEngine.ts` (page: `health-score`)
Computes a unified **0–100 financial health rating**.
- `computeHealthScore` — weighted blend: Savings Rate 30%, Budget Discipline 25%, Vault Velocity 20%, Debt-to-Income 15%, Spending Stability 10%.
- `getHealthRecommendations` — turns weak sub-scores into actionable advice.

### Safe-to-Spend — `safeToSpend.ts` (component: `SafeToSpendCard.tsx`)
The "anti-budget" single number — how much you can safely spend per day.
- `computeSafeToSpend` — income (or budget ceiling) − month's spend − savings reserve, divided by days left.
- Internal: `daysLeftInMonth`, `monthlySavingsReserve`.

### Subscription Tracker — `subscriptions.ts` (page: `subscriptions`)
Detects recurring payments purely from the transaction ledger.
- `detectSubscriptions` — groups by merchant, flags charges recurring across ≥2 months, estimates next charge, marks `possiblyUnused` (no charge in ~45 days).
- `summarizeSubscriptions` — monthly/annual totals, counts, unused count.
- Internal: `normalizeKey`, `monthBucket`, `median`.

### What-If Simulator — `whatIf.ts` (page: `what-if`)
Pure future-value math for SIP-style investing.
- `simulateWhatIf` — projects future value of a monthly contribution + lump sum compounded monthly, returning total invested, returns, and a per-year timeline.

### Streaks & Badges — `streaks.ts` (page: `streaks`)
Gamifies logging activity.
- `computeStreaksAndBadges` — current/longest logging streak, active days, and 10 achievement badges (First Step, On Fire, Smart Saver, Goal Crusher, Centurion, etc.) with progress.
- Internal: `dayKey`, `todayKey`, `computeStreaks`, `pct`.

### Anomaly Radar — `AnomalyRadar.ts`
- `checkAnomaly` — flags a spend that exceeds **2.5×** the category's rolling average (needs ≥3 prior samples).

### Catch-Up Sync — `CatchUpSync.ts`
Weekly (7-day) lazy insights generator.
- `runLazyCatchUpSync` — recomputes health score + weekly insights once per 7-day window, else returns cached.
- `useLazyCatchUpSync` — hook to run it on layout mount.
- Internal: `calculateFinancialHealthScore`, `generateWeeklyInsights`.

### Mood Insights — page: `mood-insights`
Daily mood logging (Good/Okay/Stressed) correlated against spending, charted with Recharts.

### CIBIL Simulator — page: `cibil-simulator`
Simulates how actions affect an Indian CIBIL credit score.

---

## 5. Debt & Loans

### EMI Tracker — page: `emi-tracker` (Add Loan modal)
Tracks loans: principal, annual interest rate, tenure, months paid, start date.

### Bill Splitter — `DebtSimplifier.ts` (page: `bill-splitter`)
Splits group expenses and minimizes the number of repayments.
- `calculateBalances` — net balance per person (positive = owed money, negative = owes).
- `simplifyDebts` — greedy algorithm matching biggest debtors to biggest creditors to produce minimal settlements.

---

## 6. Ledger & Family Wallet

| Feature | File | Summary |
|---|---|---|
| **Ledger (Khata)** | `src/app/(dashboard)/ledger/page.tsx` | Customer/supplier credit book ("gave" / "got"). |
| **Ledger Detail** | `src/app/(dashboard)/ledger/[id]/page.tsx` | Per-customer running balance + entry history. |
| **Family Wallet** | `src/app/(dashboard)/family-wallet/page.tsx` | Shared groups with join codes & spending limits. |
| **Family Group Detail** | `src/app/(dashboard)/family-wallet/[groupId]/page.tsx` | Group members, balances, and expenses. |
| **Log Deposit Modal** | `src/components/modals/LogDepositModal.tsx` | Record a ledger payment in/out. |

Ledger entries link to a transaction (`txId`) so dashboard totals stay in sync on add/delete.

---

## 7. Automation & Input

### Voice Logging — `VoiceParser.ts` (modal: `VoiceLoggingModal.tsx`)
Converts spoken Hindi/Hinglish + Devanagari into a transaction.
- `parseVoiceInput` — extracts amount (incl. number words like *paanch*, *hazaar*, *लाख*), type (income/expense keywords), and category (e.g. *khana* → Groceries), with sensible defaults.

### SMS Parser — `SmsParser.ts` (component: `SmsPasteZone.tsx`)
Extracts transactions from pasted Indian bank/UPI SMS alerts.
- `parseSmsMessage` — bank-specific regex rules for HDFC, SBI, ICICI, Axis, Kotak, generic UPI (GPay/PhonePe/Paytm/BHIM), plus a fallback; detects debit vs credit and cleans the merchant name.
- `parseSmsMessages` — batch-parse many messages, skipping unrecognized ones.
- Internal: `cleanDescription`, `parseAmount`, `detectTypeFromKeywords`.

### Add Transaction — modal: `AddTransactionModal.tsx`
Manual entry form for income/expense transactions.

---

## 8. Education & Settings

| Feature | File | Summary |
|---|---|---|
| **Financial Academy** | `src/app/(dashboard)/academy/page.tsx` | Lessons with quizzes; earns badges/rewards, tracks completion in localStorage. |
| **Settings** | `src/app/(dashboard)/settings/page.tsx` | App preferences, currency, data reset. |
| **Category Manager** | `src/app/(dashboard)/settings/categories/page.tsx` | Add/manage spending categories (Add Category modal). |
| **Currency Picker** | `src/components/modals/CurrencyPickerSheet.tsx` | Pick the active display currency. |

---

## 9. Utilities & Export

### Currency Manager — `currencyManager.ts`
22 preset currencies with locale-aware formatting.
- `formatAmount` — formats numbers per currency, with Indian lakh/crore grouping for INR and a manual fallback.
- `getCurrencySymbol`, `getCurrencyInfo`, `getAllCurrencies` — currency metadata lookups.
- `convertAmount` — convert between currencies via exchange rates.

### CSV Export — `csvExporter.ts`
RFC-4180-safe, UTF-8 (BOM) CSV downloads, fully client-side.
- `exportTransactionsCsv`, `exportBudgetsCsv`, `exportSavingsCsv` — export each data type.
- Internal: `escapeCsvCell`, `buildCsvContent`, `triggerDownload`, `dateTag`.

### PDF Export — `pdfGenerator.ts`
Generates PDF reports for transactions, budgets, and savings.

### Export Hub — page: `export`
UI to choose which data set to export (ledger / budgets / savings) as CSV or PDF.

### Countries — `countries.ts`
Country list + dial codes powering the phone-number input.

---

*Generated as a reference snapshot of the current codebase.*
