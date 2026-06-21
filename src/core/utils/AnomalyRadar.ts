export function checkAnomaly(
  amount: number,
  category: string,
  transactions: any[]
): string | null {
  if (!transactions || transactions.length === 0) return null;

  // Filter expenses by the same category
  const categoryExpenses = transactions.filter(
    (tx) => tx.type === "expense" && tx.category === category
  );

  if (categoryExpenses.length < 3) {
    // Not enough data to establish a baseline
    return null;
  }

  // Calculate rolling average
  const totalSpent = categoryExpenses.reduce((sum, tx) => sum + tx.amount, 0);
  const averageSpent = totalSpent / categoryExpenses.length;

  // Variance threshold is 2.5x
  const varianceThreshold = averageSpent * 2.5;

  if (amount > varianceThreshold) {
    return `Anomaly detected! ${amount} is significantly higher than your average ${category} spend of ${Math.round(averageSpent)}.`;
  }

  return null;
}
