/**
 * Reducing-balance loan math — the single source of truth for EMI and
 * outstanding-debt figures.
 *
 * This module exists because the EMI formula was copy-pasted into three files
 * (the tracker page, the add-loan modal, the calendar's due-date projection),
 * and the "what do I still owe?" figure was wrong in all of them: it summed the
 * REMAINING PAYMENTS, which is principal plus every future interest charge, and
 * then labelled that total "remaining principal". On a 20-year home loan that
 * overstates the debt by roughly the entire interest cost.
 */

/** The shape these helpers need. Matches LoanRecord in the store and the modal. */
export interface LoanTerms {
  principal: number;
  annualInterestRate: number;
  tenureMonths: number;
  monthsPaid: number;
}

/** Monthly rate as a fraction, from an annual percentage. */
const monthlyRate = (annualRate: number): number => annualRate / 100 / 12;

/**
 * Equated monthly instalment: `EMI = P × r(1+r)^n / ((1+r)^n − 1)`.
 * Falls back to straight-line repayment at 0% interest.
 */
export function calcEmi(principal: number, annualRate: number, tenureMonths: number): number {
  if (tenureMonths <= 0) return 0;
  if (annualRate === 0) return principal / tenureMonths;
  const r = monthlyRate(annualRate);
  const factor = Math.pow(1 + r, tenureMonths);
  return (principal * r * factor) / (factor - 1);
}

/**
 * What is actually still owed today: the present value of the remaining
 * instalments, i.e. the balance that would settle the loan right now.
 *
 * `PV = EMI × (1 − (1+r)^−k) / r`, for k instalments left. This is strictly less
 * than `EMI × k` — the difference is the interest you avoid by settling early,
 * and it is exactly what the old figure wrongly included.
 */
export function calcOutstandingPrincipal(loan: LoanTerms): number {
  const { principal, annualInterestRate, tenureMonths, monthsPaid } = loan;
  if (tenureMonths <= 0 || principal <= 0) return 0;

  const remaining = Math.max(0, tenureMonths - Math.max(0, monthsPaid));
  if (remaining === 0) return 0; // fully repaid

  // At 0% interest the balance is simply the unpaid share of the principal.
  if (annualInterestRate === 0) return (principal * remaining) / tenureMonths;

  const r = monthlyRate(annualInterestRate);
  const emi = calcEmi(principal, annualInterestRate, tenureMonths);
  return (emi * (1 - Math.pow(1 + r, -remaining))) / r;
}

/** Total interest paid across the full original schedule. */
export function calcTotalInterest(loan: LoanTerms): number {
  const emi = calcEmi(loan.principal, loan.annualInterestRate, loan.tenureMonths);
  return Math.max(0, emi * loan.tenureMonths - loan.principal);
}

/** Sum of every instalment still to be paid (principal + future interest).
 *  Distinct from calcOutstandingPrincipal — label it as "remaining payments",
 *  never as the outstanding balance. */
export function calcRemainingPayments(loan: LoanTerms): number {
  const emi = calcEmi(loan.principal, loan.annualInterestRate, loan.tenureMonths);
  return emi * Math.max(0, loan.tenureMonths - Math.max(0, loan.monthsPaid));
}
