/**
 * "What-If" Simulator — pure future-value math.
 *
 * Models a recurring monthly contribution (SIP-style) plus an optional initial
 * lump sum, compounded monthly at a fixed annual rate. No app state is touched;
 * every function here is a pure calculation so the page can stay presentational.
 */

export interface WhatIfInput {
  /** Recurring contribution added at the start of every month. */
  monthlyContribution: number;
  /** One-time amount invested today (optional). */
  initialLumpSum: number;
  /** Investment horizon in years. */
  years: number;
  /** Expected annual return, as a percentage (e.g. 8 for 8%). */
  annualRatePercent: number;
}

export interface WhatIfYearPoint {
  /** Year index, 1..years. */
  year: number;
  /** Cumulative amount the user has put in by the end of this year. */
  Invested: number;
  /** Projected portfolio value at the end of this year. */
  Value: number;
}

export interface WhatIfResult {
  /** Projected value at the end of the horizon. */
  futureValue: number;
  /** Total of every rupee the user contributed (lump sum + all months). */
  totalInvested: number;
  /** Growth on top of contributions (futureValue − totalInvested). */
  totalReturns: number;
  /** Per-year trajectory for charting (length === whole years). */
  timeline: WhatIfYearPoint[];
}

const clampNonNegative = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Compute the future value of a monthly contribution + lump sum.
 *
 * Contributions are treated as an "annuity due" (deposited at the start of each
 * month) so the first month earns a full period of growth — matching how most
 * consumer SIP calculators present the number.
 */
export function simulateWhatIf(input: WhatIfInput): WhatIfResult {
  const monthly = clampNonNegative(input.monthlyContribution);
  const lump = clampNonNegative(input.initialLumpSum);
  const years = Math.max(0, Math.round(input.years));
  const ratePercent = clampNonNegative(input.annualRatePercent);

  const monthlyRate = ratePercent / 100 / 12;
  const timeline: WhatIfYearPoint[] = [];

  let value = lump;
  let invested = lump;

  for (let year = 1; year <= years; year++) {
    for (let m = 0; m < 12; m++) {
      // Deposit at the start of the month, then accrue a month of growth.
      value += monthly;
      invested += monthly;
      value += value * monthlyRate;
    }
    timeline.push({
      year,
      Invested: Math.round(invested),
      Value: Math.round(value),
    });
  }

  const futureValue = Math.round(value);
  const totalInvested = Math.round(invested);

  return {
    futureValue,
    totalInvested,
    totalReturns: Math.max(0, futureValue - totalInvested),
    timeline,
  };
}
