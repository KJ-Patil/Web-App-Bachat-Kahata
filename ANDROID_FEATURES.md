# Bachat Khata (Android) — Complete Features & Functions Reference

> A build-from-scratch reference for recreating **Bachat Khata – Personal Wealth Manager**
> as a **native Android app in Android Studio**. Every feature, function, and module from
> the existing Next.js/React web app is mapped here to its Android (Kotlin + Jetpack)
> equivalent so the same product can be built with the same behavior.
>
> Source of truth for behavior: `PROJECT_BLUEPRINT.md` and `FEATURES.md` (web).
> This file is the **Android translation layer**.

---

## 0. How to Read This Doc

Each section gives:
- **What it does** (identical to the web app's behavior).
- **Android building block** — the Jetpack/AndroidX/library API to use.
- **Functions** — the concrete Kotlin function signatures to implement (1:1 with the web logic).

The financial/business logic (health score, EMI math, SMS/voice parsing, safe-to-spend,
subscriptions, streaks, what-if, bill-split) is **pure Kotlin** and ports directly — no
Android APIs needed there. Only I/O, UI, auth, sync, and device features change.

---

## 1. Tech Stack (Android equivalent)

| Web (current) | Android (target) | Purpose |
|---|---|---|
| Next.js App Router | **Jetpack Compose + Navigation-Compose** | UI + screen routing |
| React 19 | **Kotlin + Compose** | Declarative UI |
| localStorage | **Room** (structured) + **Jetpack DataStore** (prefs) | Offline-first local store |
| Firebase JS SDK | **Firebase Android SDK (BoM)** | Auth + Firestore + Storage |
| Recharts | **MPAndroidChart** or **Vico** (Compose-native) | Charts |
| framer-motion | **Compose `animate*AsState` / `Animatable`** | CIBIL spring counter |
| lucide-react | **Material Symbols / Compose `Icon`** | Iconography |
| sonner (toasts) | **Compose `Snackbar` / `SnackbarHost`** | Toast/snackbar |
| nextjs-toploader | **`LinearProgressIndicator`** on nav | Loading bar |
| dexie / IndexedDB | **Room** | Local DB |
| Web Speech API | **`android.speech.SpeechRecognizer`** | Hindi/Hinglish voice logging |
| WebAuthn / SHA-256 PIN | **`androidx.biometric.BiometricPrompt`** + PIN hash | App lock |
| Service Worker (PWA) | **`WorkManager`** (background) | Weekly catch-up sync |
| CSV Blob download | **`MediaStore` / Storage Access Framework** | CSV export |
| Print-to-PDF | **`android.graphics.pdf.PdfDocument`** or **`PdfRenderer`/print framework** | PDF report |
| Tailwind theme tokens | **Material 3 `ColorScheme` + theme.kt** | Design tokens |

**Suggested Gradle dependencies (Kotlin DSL):**
```kotlin
// Compose
implementation(platform("androidx.compose:compose-bom:<latest>"))
implementation("androidx.compose.material3:material3")
implementation("androidx.navigation:navigation-compose:<latest>")
implementation("androidx.lifecycle:lifecycle-viewmodel-compose:<latest>")

// Local storage
implementation("androidx.room:room-runtime:<latest>")
implementation("androidx.room:room-ktx:<latest>")
ksp("androidx.room:room-compiler:<latest>")
implementation("androidx.datastore:datastore-preferences:<latest>")

// Firebase
implementation(platform("com.google.firebase:firebase-bom:<latest>"))
implementation("com.google.firebase:firebase-auth-ktx")
implementation("com.google.firebase:firebase-firestore-ktx")
implementation("com.google.firebase:firebase-storage-ktx")
implementation("com.google.android.gms:play-services-auth:<latest>") // Google sign-in

// Charts, biometric, background, coroutines
implementation("com.github.PhilJay:MPAndroidChart:v3.1.0")
implementation("androidx.biometric:biometric:<latest>")
implementation("androidx.work:work-runtime-ktx:<latest>")
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:<latest>")
```

---

## 2. Architecture (recommended)

**MVVM + Repository + single-source-of-truth store**, mirroring the web `dataStore.ts`.

```
app/
├─ data/
│  ├─ local/            # Room DB, DAOs, DataStore prefs
│  │   ├─ entities/     # TransactionEntity, GoalEntity, LoanEntity, ...
│  │   ├─ dao/          # TransactionDao, LedgerDao, ...
│  │   └─ AppDatabase.kt
│  ├─ remote/           # FirestoreSync.kt (mirror per-user docs)
│  └─ repository/       # DataRepository.kt  (== dataStore.ts)
├─ domain/              # PURE Kotlin logic (ports of core/)
│  ├─ math/             # HealthEngine.kt, DebtSimplifier.kt, EmiCalculator.kt
│  ├─ insights/         # SafeToSpend.kt, Subscriptions.kt, Streaks.kt, WhatIf.kt
│  ├─ automation/       # SmsParser.kt
│  ├─ voice/            # VoiceParser.kt
│  └─ util/             # CurrencyManager.kt, CsvExporter.kt, PdfGenerator.kt,
│                       # Countries.kt, AnomalyRadar.kt
├─ ui/
│  ├─ theme/            # Color.kt, Theme.kt, Type.kt  (== globals.css tokens)
│  ├─ auth/             # LoginScreen, RegisterScreen, PinLockScreen
│  ├─ dashboard/        # HomeScreen + all feature screens
│  ├─ components/       # reusable composables & "modals" (bottom sheets)
│  └─ navigation/       # NavGraph.kt  (== NAV_ITEMS)
└─ MainActivity.kt
```

**Concurrency:** Kotlin Coroutines + `Flow`. Repository exposes `Flow<List<Transaction>>`
from Room — this replaces the web's `datastore:change` event + React hooks. Compose
collects with `collectAsStateWithLifecycle()`.

---

## 3. Data Models (Kotlin data classes / Room entities)

Port of `dataStore.ts` interfaces. Annotate as Room `@Entity` where persisted.

```kotlin
@Entity data class Transaction(
    @PrimaryKey val id: String,
    val amount: Double,
    val type: String,          // "expense" | "income"
    val category: String,
    val description: String,
    val date: String           // ISO string, keep parity with web
)

@Entity data class SavingsGoal(
    @PrimaryKey val id: String, val name: String,
    val target: Double, val current: Double, val deadline: String
)

// BudgetMap: category -> monthly limit
@Entity data class Budget(@PrimaryKey val category: String, val limit: Double)

@Entity data class LoanRecord(
    @PrimaryKey val id: String, val name: String, val lender: String,
    val principal: Double, val annualInterestRate: Double,
    val tenureMonths: Int, val monthsPaid: Int, val startDate: String
)

@Entity data class LedgerCustomer(
    @PrimaryKey val id: String, val name: String, val phone: String,
    val type: String,          // "customer" | "supplier"
    val balance: Double
    // history stored in a related table or JSON column
)
data class LedgerEntry(
    val id: String, val amount: Double, val type: String, // "gave" | "got"
    val description: String, val date: String, val txId: String? = null
)

@Entity data class FamilyGroup(
    @PrimaryKey val id: String, val name: String, val code: String,
    val members: Int, val totalBalance: Double, val spendingLimit: Double? = null
)
@Entity data class GroupExpense(
    @PrimaryKey val id: String, val groupId: String, val amount: Double,
    val description: String, val paidBy: String, val date: String
)

// Derived (not persisted)
data class Totals(val income: Double, val expense: Double, val balance: Double)
data class CategorySlice(val name: String, val value: Double, val percentage: Double)
data class DailyBalancePoint(val day: String, val balance: Double)
data class MonthlyTrendPoint(val month: String, val income: Double, val expense: Double)
```

---

## 4. Core Data Layer — `DataRepository.kt` (== `dataStore.ts`)

The single source of truth. **Room = instant offline cache; Firestore = cloud mirror**
at `users/{uid}/appData/{key}`.

### Storage keys / synced collections
Synced (cloud-mirrored), one Firestore doc each:
`transactions`, `budgets`, `savings_goals`, `loans`, `ledger_customers`,
`family_groups`, `family_expenses`.

Local-only (DataStore prefs, never synced): auth/session, PIN hash, biometric flag,
active currency, categories, notifications, mood logs, academy progress, caches.

### Storage & sync functions
| Web function | Android function |
|---|---|
| `readJSON` / `writeJSON` | Room DAO queries + `DataStore.edit {}` |
| `emitChange` | Room `Flow` emissions (automatic) |
| `generateId` | `fun generateId(): String = UUID.randomUUID().toString().take(9)` |
| `pushToFirestore(key,value)` | `suspend fun pushToFirestore(key: String, value: Any)` — `firestore.document("users/$uid/appData/$key").set(mapOf("value" to value))`; skip when signed-out / not a synced key / value came from remote snapshot (`applyingRemote` guard). |
| `isEmptyValue(value)` | `fun isEmptyValue(v: Any?): Boolean` — true for null / empty list / empty map. **Prevents stale-cloud data loss.** |
| `applyRemote(key,value)` | `suspend fun applyRemote(...)` — write remote value into Room **without** re-pushing. |
| `startSync(uid)` | `fun startSync(uid: String)` — attach a Firestore `addSnapshotListener` per synced key. If cloud doc missing → seed from local; if remote empty but local has data → push local up. |
| `stopSync()` | remove all registered `ListenerRegistration`s. |
| `onAuthStateChanged` wiring | `FirebaseAuth.addAuthStateListener { startSync / stopSync }` |
| `clearFinancialData()` | `suspend fun clearFinancialData()` — wipe all synced tables (local + cloud) then clear local-only financial prefs. |

### CRUD (Room DAOs + repository methods)
- **Transactions:** `getTransactions()`, `setTransactions()`, `addTransaction(input)` (auto id + date, insert at top), `updateTransaction(id, patch)`, `deleteTransaction(id)`.
- **Savings:** `getSavingsGoals()`, `setSavingsGoals()`.
- **Loans:** `getLoans()`, `setLoans()`.
- **Budgets:** `getBudgets()`, `setBudgets()`.
- **Ledger:** `getLedgerCustomers()`, `setLedgerCustomers()`.
- **Family:** `getFamilyGroups()`, `setFamilyGroups()`, `getFamilyExpenses()`, `setFamilyExpenses()`.

### Derived selectors (pure Kotlin, computed from real rows)
```kotlin
fun getTotals(txs: List<Transaction>): Totals
fun getMonthTotals(monthOffset: Int = 0, txs: List<Transaction>): Totals
fun getCategoryBreakdown(type: String = "expense", monthOffset: Int?, txs: List<Transaction>): List<CategorySlice>
fun getDailyBalanceTrend(days: Int = 7, txs: List<Transaction>): List<DailyBalancePoint>
fun getMonthlyTrend(months: Int = 6, txs: List<Transaction>): List<MonthlyTrendPoint>
fun getSavingsRate(txs: List<Transaction>): Double
fun getTotalSaved(goals: List<SavingsGoal>): Double
fun getTotalDebt(loans: List<LoanRecord>): Double
```

### "Hooks" → Flows
Web hooks `useTransactions`, `useBudgets`, `useLedgerCustomers`, `useLoans`,
`useSavingsGoals`, `useFamilyGroups`, `useFamilyExpenses` become **`Flow<List<…>>`**
exposed by DAOs and surfaced through ViewModels as `StateFlow`. Compose collects them;
they auto-update on any write (replacing the manual change-event system).

---

## 5. Core Logic Modules (pure Kotlin — port directly)

### 5.1 `HealthEngine.kt` — Financial Health Score (0–100)
```kotlin
fun computeHealthScore(
    monthlyIncome: Double, monthlyExpenses: Double, totalSavings: Double,
    monthlyDebtPayments: Double, budgetAdherencePercentage: Double
): HealthMetrics
fun getHealthRecommendations(metrics: HealthMetrics): List<String>
```
Weights: **Savings Rate 30%, Budget Discipline 25%, Vault Velocity 20%,
Debt-to-Income 15%, Spending Stability 10%.** `HealthMetrics` holds the five sub-scores
+ `totalScore`. (Logic identical to web.)

### 5.2 `DebtSimplifier.kt` — Bill Splitting
```kotlin
fun calculateBalances(expenses: List<ExpenseEntry>): List<BalanceRecord>   // net per person
fun simplifyDebts(expenses: List<ExpenseEntry>): List<Settlement>          // greedy min-transfers
```
Types: `ExpenseEntry(paidBy, amount, participants, description?)`,
`BalanceRecord(person, balance)`, `Settlement(from, to, amount)`.

### 5.3 `EmiCalculator.kt` — Loan math (EMI Tracker)
```kotlin
fun calcEmi(principal: Double, annualRate: Double, tenureMonths: Int): Double
// reducing-balance: P·r(1+r)^n / ((1+r)^n − 1)
fun calcAmortization(loan: LoanRecord): Amortization
// -> emi, totalPayable, totalInterest, outstanding, progressPct, completionDate
```

### 5.4 `SmsParser.kt` — Bank SMS → Transaction
```kotlin
fun parseSmsMessage(raw: String): ParsedSmsTransaction?
fun parseSmsMessages(messages: List<String>): List<ParsedSmsTransaction>
```
Regex rule sets for **HDFC, SBI, ICICI, Axis, Kotak, UPI (GPay/PhonePe/Paytm/BHIM),
generic "Bank Alert" fallback**. `DEBIT_SIGNALS`/`CREDIT_SIGNALS` decide direction;
`NOISE_PATTERNS` clean the merchant string. Internal: `cleanDescription`, `parseAmount`,
`detectTypeFromKeywords`. **Fully offline.**
- **Android bonus:** with the `RECEIVE_SMS`/`READ_SMS` permission (or **SMS Retriever API**,
  no permission), a `BroadcastReceiver` can auto-feed incoming bank SMS into `parseSmsMessage`
  instead of manual paste. Guard behind explicit user opt-in for Play Store policy.

### 5.5 `VoiceParser.kt` — Speech → Transaction
```kotlin
fun parseVoiceInput(text: String): ParsedVoiceData   // amount?, type?, category?, description
```
`NUMBER_MAP` (Hinglish + Devanagari digits + sau/hazaar/lakh/crore), `CATEGORY_MAP`
(khana→Groceries, petrol→Travel…), `INCOME_WORDS`/`EXPENSE_WORDS`. Defaults expense + Housing/Salary.
- **Android capture:** `SpeechRecognizer.createSpeechRecognizer()` with
  `RecognizerIntent.EXTRA_LANGUAGE = "hi-IN"` (offer 9 Indian languages). Feed the recognized
  string into `parseVoiceInput`. Needs `RECORD_AUDIO` permission.

### 5.6 `SafeToSpend.kt`
```kotlin
fun computeSafeToSpend(
    txs: List<Transaction>, budgets: Map<String,Double>,
    goals: List<SavingsGoal>, today: LocalDate = LocalDate.now()
): SafeToSpendResult
```
Pool = month income (or total budget). `remainingForMonth = pool − monthExpense − savingsReserve`;
`perDay = floor(remaining / daysLeft)`. `monthlySavingsReserve` = Σ per-goal `remaining/monthsLeft`.

### 5.7 `Subscriptions.kt`
```kotlin
fun detectSubscriptions(txs: List<Transaction>, minOccurrences: Int = 2): List<DetectedSubscription>
fun summarizeSubscriptions(subs: List<DetectedSubscription>): SubscriptionSummary
```
Group expenses by normalized merchant; require charges across ≥2 distinct months; median
monthly amount; next charge = +1 month; `possiblyUnused` if no charge in ~45 days.

### 5.8 `WhatIf.kt`
```kotlin
fun simulateWhatIf(input: WhatIfInput): WhatIfResult
// monthly-compounding annuity-due -> futureValue, totalInvested, totalReturns, timeline
```

### 5.9 `Streaks.kt`
```kotlin
fun computeStreaksAndBadges(
    txs: List<Transaction>, budgets: Map<String,Double> = emptyMap(),
    goals: List<SavingsGoal> = emptyList(), today: LocalDate = LocalDate.now()
): StreaksResult   // currentStreak, longestStreak, activeDays, badges, earnedCount
```
10 badges: First Step, Getting Consistent (3d), On Fire (7d), Unstoppable (30d),
Smart Saver (20%), Super Saver (40%), Budget Boss, Goal Crusher, Well Rounded (5 cats),
Centurion (100 tx). Current streak counts only if it reaches today/yesterday.

### 5.10 `AnomalyRadar.kt`
```kotlin
fun checkAnomaly(amount: Double, category: String, transactions: List<Transaction>): String?
// needs >=3 prior same-category expenses; flags if amount > 2.5x rolling average
```

### 5.11 `CurrencyManager.kt`
```kotlin
val PRESET_CURRENCIES: List<CurrencyInfo>   // INR, USD, EUR, AUD (exactly 4)
fun formatAmount(amount: Double, code: String = "INR", includeSymbol: Boolean = true,
                 decimalPlaces: Int? = null, useIndianLayoutForINR: Boolean = true): String
fun getCurrencySymbol(code: String): String
fun getCurrencyInfo(code: String): CurrencyInfo
fun getAllCurrencies(): List<CurrencyInfo>
fun convertAmount(amount: Double, fromRate: Double, toRate: Double): Double
```
INR uses lakh/crore grouping (Android: `NumberFormat.getInstance(Locale("en","IN"))` or the
manual grouping fallback). Returns `"—"` for NaN/Infinity.

### 5.12 `CsvExporter.kt`
```kotlin
fun exportTransactionsCsv(context: Context, txs: List<Transaction>, currencyCode: String = "INR", filename: String? = null)
fun exportBudgetsCsv(...)
fun exportSavingsCsv(...)
```
RFC-4180 escaping + UTF-8 BOM (Excel). Write via **MediaStore (`Downloads`)** or SAF
`ACTION_CREATE_DOCUMENT`. Default names `bachatkhata-<type>-<yyyy-MM-dd>.csv`.

### 5.13 `PdfGenerator.kt`
```kotlin
fun generatePdfReport(context: Context, options: PdfReportOptions)
```
Build a styled A4 statement (brand header, income/expense/net boxes, transaction/budget/
savings tables with progress bars) using **`android.graphics.pdf.PdfDocument`** (draw to a
`Canvas`) or the **Android print framework**; save via MediaStore. Replaces the web
print-window approach.

### 5.14 `Countries.kt`
```kotlin
val COUNTRIES: List<CountryInfo>   // 26 countries: name, iso2, dialCode, min/max digits, currency, flag
fun getCountryByIso(iso2: String): CountryInfo?
fun getCountryByCurrency(currency: String): CountryInfo?
fun digitsOnly(value: String): String
fun validatePhone(iso2: String, nationalNumber: String): String?   // error or null
fun toFullNumber(iso2: String, nationalNumber: String): String     // "+<dial><digits>"
```

### 5.15 `CatchUpSync.kt` — weekly lazy recompute → `WorkManager`
```kotlin
fun runLazyCatchUpSync(): CatchUpResult   // executed, healthScore, weeklyInsights, lastRun
```
Runs once per 7-day window (tracked in DataStore `last_catchup_run`); else returns cached
health score / insights. On Android, schedule with a **`PeriodicWorkRequest`** (WorkManager)
that calls this, instead of running on layout mount. Internal: `calculateFinancialHealthScore`
(40 + savingsRate×0.6, clamped), `generateWeeklyInsights`.

---

## 6. Auth & Security Flow

### 6.1 Splash & redirect (== web `app/page.tsx`)
A launcher `SplashActivity` / start destination: after ~1.5s → no session → Login;
session + PIN set → PinLock; else → Home.

### 6.2 Login (3 methods)
| Web | Android (Firebase Auth) |
|---|---|
| `signInWithEmailAndPassword` | `auth.signInWithEmailAndPassword(email, pass)` |
| Google popup | **Credential Manager / Google Sign-In** → `GoogleAuthProvider.getCredential(idToken)` → `auth.signInWithCredential(...)` |
| Phone OTP | `PhoneAuthProvider.verifyPhoneNumber(...)` + `PhoneAuthProvider.getCredential(verificationId, code)`; E.164 validation `^\+[1-9]\d{6,14}$` |
On success: persist session in DataStore, route to PinLock if a PIN hash exists else Home.

### 6.3 Register
`auth.createUserWithEmailAndPassword` → `user.updateProfile { displayName }` →
Firestore `users/{uid}` doc `{uid, name, email, createdAt = FieldValue.serverTimestamp()}`.
Avatar upload → **Firebase Storage** (`storage.reference.child("avatars/$uid").putFile(uri)`)
with progress listener. Store session, route to PinLock.

### 6.4 PIN Lock + Biometric
- 4-digit keypad composable. Hash with `MessageDigest.getInstance("SHA-256")`; store hex in
  **encrypted DataStore / EncryptedSharedPreferences**. Setup (enter→confirm) vs verify.
- Biometric: **`androidx.biometric.BiometricPrompt`** with `BiometricManager.canAuthenticate(BIOMETRIC_STRONG)`
  capability check (replaces WebAuthn). On success + PIN exists → Home. "Switch Account" clears session.
- **Auto-lock:** in `Application`/lifecycle observer (`ProcessLifecycleOwner`), if the app is
  backgrounded >60s and a PIN is set, route to PinLock on return (== web Page Visibility API).

### 6.5 Session keys (DataStore, not synced)
`user_session`, `pin_hash`, `user_avatar_uri`, `biometrics_enabled`, `active_currency`,
`legacy_seed_cleared_v1`.

---

## 7. Navigation & Screens (== NAV_ITEMS)

**Navigation-Compose `NavHost`** with these routes. Desktop sidebar → a
**Navigation Rail** (tablet) / **Navigation Drawer**; mobile bottom nav → **`NavigationBar`**.

**Bottom nav (5):** Home, Transactions, Notebooks (Ledger), Analytics, Settings —
plus a center **FAB** (Add Transaction) and a **voice mic** action.

**Full route list (19):** `home`, `transactions`, `budgets`, `savings`, `ledger`,
`bill-splitter`, `family-wallet`, `mood-insights`, `health-score`, `cibil-simulator`,
`academy`, `analytics`, `comparison`, `subscriptions`, `what-if`, `streaks`,
`emi-tracker`, `export`, `settings` (+ nested: `ledger/{id}`, `family-wallet/{groupId}`,
`settings/categories`). Use typed nav args for `{id}` / `{groupId}`.

---

## 8. Feature Screens (Compose) — behavior parity

> Common pattern: each screen is a composable backed by a `ViewModel` that collects
> repository `Flow`s into `StateFlow`; read `active_currency` from DataStore; format money
> with `formatAmount`; show **empty states** when there's no real data; charts via MPAndroidChart/Vico.

| Screen | Android composable | Key behavior |
|---|---|---|
| **Home / Workspace** | `HomeScreen` | Hourly greeting + name, notifications bell, `SmsPasteZone`, balance card (`getTotals().balance`), `SafeToSpendCard`, 4-stat grid (Remaining Budget %, Goal Progress %, Health Index, Ledger count), 7-day balance line + monthly category bar with Both/Income/Spent toggle. |
| **Transactions** | `TransactionsScreen` | Live list (`Flow`), search, type tabs (all/income/expense), grouped Today/Yesterday/Previous Weeks, inline edit + delete-confirm, add via bottom sheet. |
| **Analytics** | `AnalyticsScreen` | KPI cards with MoM % badges, income-vs-expense area chart (6 mo), category pie + legend, grouped bar (this vs last), top-5 category bars. |
| **Comparison** | `ComparisonScreen` | Month-vs-month per-category deltas, grouped bar (top 8); expense decrease=green, increase=red. |
| **Budgets** | `BudgetsScreen` | Month switcher, per-category progress bars (spent vs limit), color ≥100% error / ≥80% warning; SetBudget sheet. |
| **Savings** | `SavingsScreen` | Goal cards with radial % ring (Compose `Canvas`/arc), required monthly deposit, AddGoal + LogDeposit sheets. |
| **Ledger (Khata)** | `LedgerScreen` | Receivable/Payable/Net summary, filter tabs + search, add customer/supplier (`PhoneNumberInput`), WhatsApp reminder via `Intent` to `wa.me`. |
| **Ledger Detail** | `LedgerDetailScreen` | nav arg `id`; balance card, You-Gave/You-Got entry (mirrors into transactions, category `Ledger`), running history with per-entry delete (removes linked `txId`). |
| **Family Wallet** | `FamilyWalletScreen` | Join via 6-digit code or create group (random code); group cards → detail. |
| **Family Group Detail** | `FamilyGroupScreen` | nav arg `groupId`; pool balance vs optional spending limit, add expense claim, set-limit overlay. |
| **EMI Tracker** | `EmiTrackerScreen` | `useLoans` flow, summary cards, per-loan card with amortization (`calcEmi`/`calcAmortization`), expandable breakdown, delete-confirm, AddLoan sheet. |
| **Health Score** | `HealthScoreScreen` | Aggregate real ledger → `computeHealthScore`; semicircle gauge (`Canvas` arc, color by band), per-metric breakdown rows, recommendations. |
| **CIBIL Simulator** | `CibilSimulatorScreen` | Sliders (Payment 35%, Utilization 30%, Age 15%, Mix 10%, Inquiries 10%), score 300–900, animated spring counter via `Animatable`. Educational only. |
| **Academy** | `AcademyScreen` | Load lessons from bundled `assets/lessons/lessons.json` (Moshi/kotlinx.serialization), lesson→quiz→results, 100% unlocks reward badge, progress in DataStore. |
| **Mood Insights** | `MoodInsightsScreen` | Log mood (Good/Okay/Stressed) keyed `yyyy-MM-dd`, 7-day bar of spend/income colored by mood, variance alert. |
| **What-If** | `WhatIfScreen` | Sliders (contribution, lump sum, years, return %), `simulateWhatIf`, area chart Value vs Invested. |
| **Subscriptions** | `SubscriptionsScreen` | `detectSubscriptions` + `summarizeSubscriptions`, KPI cards, list with possibly-unused badge. |
| **Streaks** | `StreaksScreen` | `computeStreaksAndBadges`, three stat cards, achievements grid (earned vs locked w/ progress). |
| **Bill Splitter** | `BillSplitterScreen` | Local-only state, add shared expense (equal/assign), `simplifyDebts` + `calculateBalances`, WhatsApp request links, live split preview. |
| **Notifications** | `NotificationsScreen` | Notification feed with severity icons, mark-all-read, delete per item. Consider mirroring to **system notifications** via `NotificationManager`. |
| **Export** | `ExportScreen` | Date-range presets + custom, data-type multiselect with live counts, CSV (per type) or PDF export. |
| **Settings** | `SettingsScreen` | Profile from session, currency picker sheet, category manager link, biometric toggle, reset PIN, sign-out-everywhere, multi-stage Clear-All-Data (Danger Zone). |
| **Category Manager** | `CategoriesScreen` | Active vs archived categories, archive/restore, AddCategory sheet. |

---

## 9. Reusable Components & "Modals" (bottom sheets)

Web modals → **Compose `ModalBottomSheet`** (Material 3) or full-screen dialogs.

| Web component | Android composable | Behavior |
|---|---|---|
| `AddTransactionModal` | `AddTransactionSheet` | Expense/Income toggle, category grid, amount + description → `addTransaction`; on expense ≥80% of a budget, push a notification + inline warning; success animation. |
| `AddGoalModal` | `AddGoalSheet` | Name, target, deadline (min tomorrow) → new goal (current 0). |
| `AddCategoryModal` | `AddCategorySheet` | Type toggle, name, 8 colors, 12 icons → `CategoryData`. |
| `AddLoanModal` | `AddLoanSheet` | Name, lender presets, principal, rate, tenure, monthsPaid, startDate; live amortization preview. |
| `LogDepositModal` | `LogDepositSheet` | Amount → increment goal `current` + log an Investment expense. |
| `SetBudgetModal` | `SetBudgetSheet` | Category chips + monthly limit → `setBudgets`. |
| `CurrencyPickerSheet` | `CurrencyPickerSheet` | Searchable `PRESET_CURRENCIES`; writes `active_currency`. |
| `SafeToSpendCard` | `SafeToSpendCard` | `computeSafeToSpend`; per-day number + "left"/"reserved"; "Set a budget" when insufficient. |
| `SmsPasteZone` | `SmsPasteZone` | Paste area; `parseSmsMessage` → confirm sheet → `addTransaction`. |
| `VoiceLoggingModal` | `VoiceLoggingSheet` | `SpeechRecognizer` (9 langs, default hi-IN) → `parseVoiceInput` → `checkAnomaly` → confirm → `addTransaction`. |
| `PhoneNumberInput` | `PhoneNumberField` | Country selector (flag+dial) + national field enforcing per-country digit limits via `Countries.kt`. |

---

## 10. Android-Specific Integrations (device features)

| Feature | Android API |
|---|---|
| WhatsApp reminders | `Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$number?text=$msg"))` |
| Auto SMS capture | **SMS Retriever API** (no permission) or `BroadcastReceiver` + `RECEIVE_SMS` (opt-in) → `parseSmsMessage` |
| Voice logging | `SpeechRecognizer` + `RECORD_AUDIO` |
| Biometric unlock | `androidx.biometric.BiometricPrompt` |
| Weekly insights | `WorkManager` `PeriodicWorkRequest` → `runLazyCatchUpSync` |
| CSV / PDF files | `MediaStore` / Storage Access Framework; `PdfDocument` |
| System notifications | `NotificationManager` + notification channels |
| Offline cache | Room + Firestore offline persistence (`FirebaseFirestore` caches by default on Android) |
| Theming / dark mode | Material 3 `dynamicColorScheme` (Android 12+) or fixed `ColorScheme` from theme tokens |
| Currency/number format | `java.text.NumberFormat` with `Locale("en","IN")` |
| Dates | `java.time.LocalDate` / `DateTimeFormatter` (keep ISO strings for parity) |

**Manifest permissions to declare (only those you enable):**
`INTERNET`, `RECORD_AUDIO` (voice), `RECEIVE_SMS`/`READ_SMS` (optional auto-SMS),
`USE_BIOMETRIC`, `POST_NOTIFICATIONS` (Android 13+).

---

## 11. Design System (== `globals.css` tokens)

Map Tailwind semantic tokens to a Material 3 `ColorScheme` + custom extension colors in
`ui/theme/Color.kt`:

| Web token | Material 3 / custom slot |
|---|---|
| `bg-background` / `bg-card` | `background` / `surface` |
| `bg-secondary` | `surfaceVariant` / `secondaryContainer` |
| `text-foreground` / `-secondary` / `-muted` | `onBackground` / `onSurfaceVariant` / muted custom |
| `text-primary` / `bg-primary-lighter` | `primary` / `primaryContainer` |
| `text-brand` / `bg-brand-light` | custom brand color pair |
| `text-success` / `text-error` / `text-warning` | custom `success`/`error`/`warning` extension colors |
| `chart-1..6` | a `ChartColors` list for MPAndroidChart |

- **Buttons:** `btn-primary`/`btn-secondary` → `Button`/`OutlinedButton` styles.
- **Inputs:** `input-base` → `OutlinedTextField` default.
- **Modal pattern:** `ModalBottomSheet` (bottom on mobile), success splash with a check icon,
  auto-dismiss ~1.2–1.5s.
- **Charts:** consistent grid, custom marker/tooltip, gradient fills.
- **Money:** always `formatAmount(value, activeCurrency)` (often `decimalPlaces = 0`).
- **Empty states:** an inbox icon + helper text whenever there's no real data.
- **Icons:** Material Symbols (map from lucide names).

---

## 12. Build Checklist (order of operations)

1. New Android Studio project (Empty Compose Activity, min SDK 24+), add deps (§1), `google-services.json`.
2. `ui/theme/` — port color tokens, typography, shapes; Material 3 theme.
3. Firebase console: enable Auth (email, Google, phone), Firestore, Storage.
4. **Room** entities + DAOs + `AppDatabase`; **DataStore** for prefs.
5. `DataRepository.kt` — CRUD, derived selectors, Flows, `FirestoreSync` with empty-value guard (§4).
6. **Pure logic** (`domain/`) — port all §5 modules (they're framework-free; unit-test them).
7. Auth flow — splash, login (3 methods), register (+Firestore profile + Storage avatar), PinLock (SHA-256 + BiometricPrompt), auto-lock via `ProcessLifecycleOwner`.
8. `NavGraph` + scaffold (bottom bar + FAB + mic) (§7).
9. Reusable composables & bottom sheets (§9).
10. Feature screens (§8) — each wired to its ViewModel/Flows + domain modules.
11. Device integrations (§10): SpeechRecognizer, WorkManager catch-up, CSV/PDF, WhatsApp intents, notifications.
12. Bundle `assets/lessons/lessons.json`; QA offline-first + sync parity vs the web app.

---

*This document mirrors `PROJECT_BLUEPRINT.md` / `FEATURES.md` and translates every feature
and function of the web app into its Android Studio (Kotlin + Jetpack Compose) equivalent.
Behavior and business logic are identical; only platform I/O, UI, and device APIs change.*
