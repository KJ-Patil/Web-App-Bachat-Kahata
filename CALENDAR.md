# Calendar Feature

A month-grid calendar that lets the user browse their finances **day by day**. Each
cell shows the day's income, expense, ledger and upcoming-due activity; tapping a day
opens a full detail page for it. Everything is computed **client-side** from the data
store — the calendar stores nothing of its own.

---

## 1. File structure

| File | Role |
| --- | --- |
| [src/app/(dashboard)/calendar/page.tsx](src/app/(dashboard)/calendar/page.tsx) | **Month view** — the grid, month navigation, month totals, per-day markers, expense heatmap. |
| [src/app/(dashboard)/calendar/[date]/page.tsx](src/app/(dashboard)/calendar/[date]/page.tsx) | **Day detail** — dynamic route `/calendar/YYYY-MM-DD`. Lists transactions, ledger entries and due items for one day, with search + KPI totals. |
| [src/core/utils/calendar.ts](src/core/utils/calendar.ts) | **Date helpers** — labels, `toDateKey`, `isSameDay`, `parseDateKey`, `buildMonthGrid`. All local-time based. |
| [src/core/utils/dueDates.ts](src/core/utils/dueDates.ts) | **Due projection** — `computeDueDates` projects loan EMIs + subscription renewals onto future days. |

Data comes from the store hooks in [src/core/store/dataStore.ts](src/core/store/dataStore.ts):
`useTransactions`, `useLedgerCustomers`, `useLoans`, `useManualSubscriptions`.

### Route map

```
/calendar              → month grid (page.tsx)
/calendar/2026-07-14   → detail for that day ([date]/page.tsx)
```

---

## 2. Shared date helpers (`calendar.ts`)

All logic works in the user's **local** time so a transaction's day matches what they
see everywhere else (the transactions list also groups by local date).

- **`WEEKDAY_LABELS`** — `["M","T","W","T","F","S","S"]`, Monday-first.
- **`MONTH_LABELS`** — full month names, indexed 0–11.
- **`toDateKey(date)`** — returns a local `YYYY-MM-DD` string. Used both for grouping
  data into buckets and as the URL param for the day page.
- **`isSameDay(a, b)`** — true if two dates share the same local `toDateKey`.
- **`parseDateKey(key)`** — parses `YYYY-MM-DD` back into a local `Date`, or `null` if
  malformed (guards the `[date]` route against bad input).
- **`buildMonthGrid(year, month)`** — returns **42 dates (6 weeks)**, Monday-first,
  including the leading/trailing spill-over days from adjacent months so the grid is
  always full. The Sunday-first JS `getDay()` is converted via `(getDay() + 6) % 7`.

---

## 3. Month view logic (`calendar/page.tsx`)

### State
- `viewDate` — first day of the month currently shown (defaults to the current month).
- `activeCurrency` — read once from `localStorage["active_currency"]` (default `INR`).

### Data pipeline (all memoized)

1. **`grid`** — `buildMonthGrid(year, month)`: the 42 cells to render.
2. **`ledgerTxIds`** — set of transaction ids that mirror a ledger entry. These are
   **excluded** from transaction totals so ledger activity isn't double-counted (it
   surfaces under "Ledger" instead).
3. **`dayMap`** — groups standalone transactions (minus ledger-mirrored ones) by local
   day key into `{ income, expense, txs[] }`.
4. **`ledgerDays`** — set of day keys that have any notebook-ledger activity (drives the
   "Ledger" marker).
5. **`dueMap`** — `computeDueDates(...)`: day key → array of upcoming EMI/subscription
   obligations (drives the "Due" marker).
6. **`monthStats`** — totals for the visible month (`income`, `expense`) plus
   `maxExpense`, the single busiest expense day — used to normalise the heatmap.

### Rendering each cell
For every date in `grid`:
- `inMonth` — dims spill-over days (opacity 40%).
- `isToday` — highlights the date number with the primary color pill.
- **Heatmap tint** — an absolutely-positioned red overlay whose opacity scales with that
  day's expense relative to `monthStats.maxExpense`:
  `opacity = 0.06 + (day.expense / maxExpense) * 0.22`.
- **Markers** — on `sm+` screens, amount labels (`+income`, `-expense`, `Ledger`,
  `Due`); on mobile, colored dots (success / error / primary / warning).

### Interactions
- `‹ / ›` — `shiftMonth(±1)` moves `viewDate` a month.
- **Today** button — `goToday()` jumps back to the current month.
- Tapping a cell — `openDay(d)` → `router.push('/calendar/' + toDateKey(d))`.

---

## 4. Day detail logic (`calendar/[date]/page.tsx`)

Dynamic route; `params` is a Promise unwrapped with React `use()`. The `date` param is
validated through `parseDateKey` → `dayKey`.

### Data for the day (all memoized on `dayKey`)
- **`dayTxs`** — standalone transactions on this day (ledger-mirrored ids filtered out),
  sorted newest-first.
- **`dayLedger`** — notebook-ledger entries on this day, each carrying the customer's
  name and current running balance (`LedgerHit`).
- **`dayDue`** — `computeDueDates(...)[dayKey]`: EMIs / subscription renewals due today.

### Search + totals
- A search box filters all three lists by name / category / note / label.
- **KPI totals** combine transactions **and** ledger movements under the current filter:
  - **Income** = income transactions **+** ledger `"got"` entries (money in).
  - **Expense** = expense transactions **+** ledger `"gave"` entries (money out).

### Sections rendered (when non-empty)
1. **Due / Upcoming** — EMI (`CreditCard`) or subscription (`Repeat`) items, warning-colored.
2. **Transactions** — description, category, signed amount.
3. **Notebook Ledger** — customer name, Got/Gave + note, and the account's overall
   standing ("You will get / give / Settled").

Empty states distinguish "Nothing recorded on this day" from "No matches for your search".

---

## 5. Due-date projection (`dueDates.ts`)

`computeDueDates(loans, transactions, manualSubs)` builds a read-only
`Record<dayKey, DueItem[]>` for roughly the next 12 months. Nothing is persisted.

- **Loan EMIs** — for each loan, the reducing-balance EMI (`calcEmi`, same formula as the
  EMI tracker) is projected onto each **remaining, future** payment date
  (`monthsPaid + 1 … tenureMonths`, anchored to `startDate`).
- **Subscriptions** — the next 12 monthly charges for each of:
  - **manual** subscriptions (anchored to `createdAt`), and
  - **auto-detected** subscriptions from transaction history (`detectSubscriptions`,
    skipping ones flagged `possiblyUnused`).

`upcomingMonthly(anchor, count)` rolls the anchor's day-of-month forward from today.

```
DueItem = { kind: "emi" | "subscription"; label: string; amount: number }
```

---

## 6. Data flow summary

```
dataStore hooks ─┬─ transactions ─┐
                 ├─ ledgerCustomers ┤
                 ├─ loans ──────────┼─► computeDueDates ─► dueMap ─┐
                 └─ manualSubs ─────┘                              │
                                                                   ▼
  buildMonthGrid(year, month) ─► grid ──► [ per-cell: dayMap / ledgerDays / dueMap ]
                                                   │
                                                   ▼
                                       tap cell ─► /calendar/YYYY-MM-DD
                                                   │
                                                   ▼
                                  day page re-derives the same buckets for one day
```

**Key design points**
- Local-time keying throughout (`toDateKey`) keeps the calendar consistent with the rest
  of the app.
- Ledger-mirrored transactions are de-duplicated so they're counted once, under Ledger.
- The heatmap and markers are pure presentation derived from the same memoized buckets —
  no extra data is stored for the calendar.
