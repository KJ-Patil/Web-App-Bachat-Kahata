export interface ExpenseEntry {
  paidBy: string;
  amount: number;
  participants: string[]; // List of names
}

export interface BalanceRecord {
  person: string;
  balance: number; // positive = gets money back, negative = owes money
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

/**
 * Computes each person's net balance across all expenses.
 * positive balance = the person should RECEIVE money (others owe them).
 * negative balance = the person should GIVE money (they owe others).
 */
export function calculateBalances(expenses: ExpenseEntry[]): BalanceRecord[] {
  const balances: Record<string, number> = {};

  expenses.forEach((expense) => {
    balances[expense.paidBy] = (balances[expense.paidBy] || 0) + expense.amount;

    if (expense.participants.length > 0) {
      const splitAmount = expense.amount / expense.participants.length;
      expense.participants.forEach((participant) => {
        balances[participant] = (balances[participant] || 0) - splitAmount;
      });
    }
  });

  return Object.entries(balances)
    .map(([person, balance]) => ({
      person,
      // Round to 2 dp to avoid floating-point noise (e.g. -0.00001).
      balance: Math.round(balance * 100) / 100,
    }))
    .sort((a, b) => b.balance - a.balance);
}

/**
 * Calculates simplified debt settlements.
 * 1. Calculates net balance for each person.
 * 2. Uses a greedy approach to settle the largest debtors with the largest creditors.
 */
export function simplifyDebts(expenses: ExpenseEntry[]): Settlement[] {
  const balances: Record<string, number> = {};

  // 1. Calculate raw balances
  expenses.forEach((expense) => {
    // Add to paidBy balance
    balances[expense.paidBy] = (balances[expense.paidBy] || 0) + expense.amount;

    // Subtract from all participants evenly
    if (expense.participants.length > 0) {
      const splitAmount = expense.amount / expense.participants.length;
      expense.participants.forEach((participant) => {
        balances[participant] = (balances[participant] || 0) - splitAmount;
      });
    }
  });

  // 2. Separate into debtors and creditors
  const debtors: { person: string; amount: number }[] = [];
  const creditors: { person: string; amount: number }[] = [];

  Object.entries(balances).forEach(([person, balance]) => {
    // We round to 2 decimal places to avoid floating point issues
    const rounded = Math.round(balance * 100) / 100;
    if (rounded < 0) {
      debtors.push({ person, amount: -rounded });
    } else if (rounded > 0) {
      creditors.push({ person, amount: rounded });
    }
  });

  // Sort by amount descending
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0; // debtor index
  let j = 0; // creditor index

  // 3. Greedy settling
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settledAmount = Math.min(debtor.amount, creditor.amount);

    settlements.push({
      from: debtor.person,
      to: creditor.person,
      amount: Math.round(settledAmount * 100) / 100,
    });

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    // Move to next if fully settled
    if (Math.abs(debtor.amount) < 0.01) i++;
    if (Math.abs(creditor.amount) < 0.01) j++;
  }

  return settlements;
}
