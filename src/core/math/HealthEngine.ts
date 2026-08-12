/**
 * HealthEngine computes a unified 0-100 rating model representing financial health.
 * 
 * Weights:
 * - Savings Rate (30%)
 * - Budget Discipline (25%)
 * - Vault Accumulation Velocity (20%)
 * - Debt-to-Income load (15%)
 * - Spending Stability (10%)
 */

export interface HealthMetrics {
  savingsRateScore: number;     // 0-100
  budgetDisciplineScore: number;// 0-100
  vaultVelocityScore: number;   // 0-100
  debtToIncomeScore: number;    // 0-100
  spendingStabilityScore: number;// 0-100
  totalScore: number;           // 0-100
}

export function computeHealthScore(
  monthlyIncome: number,
  monthlyExpenses: number,
  totalSavings: number,
  monthlyDebtPayments: number,
  budgetAdherencePercentage: number // 0-100 (e.g. 100 means fully adhered, >100 overspent)
): HealthMetrics {
  
  // 1. Savings Rate (30%)
  // Ideal savings rate > 20%
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
  let savingsRateScore = (savingsRate / 20) * 100; 
  if (savingsRateScore > 100) savingsRateScore = 100;
  if (savingsRateScore < 0) savingsRateScore = 0;

  // 2. Budget Discipline (25%)
  // 100% adherence = 100 points. Over 100% drops score.
  let budgetDisciplineScore = 100;
  if (budgetAdherencePercentage > 100) {
    budgetDisciplineScore = Math.max(0, 100 - (budgetAdherencePercentage - 100) * 2);
  }

  // 3. Vault Accumulation Velocity (20%)
  // Based on total savings vs monthly income (Ideally having 3x monthly income in savings)
  const vaultRatio = monthlyIncome > 0 ? totalSavings / monthlyIncome : 0;
  // Clamped at BOTH ends: only the ceiling was applied before, so a negative
  // savings total produced a negative score and pulled the weighted total below
  // what any single component should be able to take away.
  let vaultVelocityScore = (vaultRatio / 3) * 100;
  if (vaultVelocityScore > 100) vaultVelocityScore = 100;
  if (vaultVelocityScore < 0) vaultVelocityScore = 0;

  // 4. Debt-to-Income load (15%)
  // Ideal DTI < 30%; 50% DTI scores zero.
  let debtToIncomeScore: number;
  if (monthlyIncome > 0) {
    const dti = (monthlyDebtPayments / monthlyIncome) * 100;
    debtToIncomeScore = Math.max(0, 100 - (dti / 50) * 100);
  } else {
    // With no income recorded, DTI is undefined. It used to compute as 0% and
    // therefore award FULL marks — someone with no income and real EMIs scored
    // a perfect 100 on debt health. Debt that no income can service is the worst
    // case, not the best; having no debt at all is still genuinely fine.
    debtToIncomeScore = monthlyDebtPayments > 0 ? 0 : 100;
  }

  // 5. Spending Stability (10%)
  // For this model, we'll approximate based on expense vs income volatility. 
  // A simple proxy: consistent expenses that don't fluctuate wildly. 
  // Assuming a baseline of 80 for a typical user.
  const spendingStabilityScore = 80 + (budgetDisciplineScore > 80 ? 10 : -10);

  // Apply Weights
  const totalScore = 
    (savingsRateScore * 0.30) + 
    (budgetDisciplineScore * 0.25) + 
    (vaultVelocityScore * 0.20) + 
    (debtToIncomeScore * 0.15) + 
    (spendingStabilityScore * 0.10);

  return {
    savingsRateScore: Math.round(savingsRateScore),
    budgetDisciplineScore: Math.round(budgetDisciplineScore),
    vaultVelocityScore: Math.round(vaultVelocityScore),
    debtToIncomeScore: Math.round(debtToIncomeScore),
    spendingStabilityScore: Math.round(Math.min(100, Math.max(0, spendingStabilityScore))),
    totalScore: Math.round(totalScore)
  };
}

export function getHealthRecommendations(metrics: HealthMetrics): string[] {
  const recommendations: string[] = [];
  
  if (metrics.savingsRateScore < 50) {
    recommendations.push("Your savings rate is critically low. Consider cutting discretionary expenses to retain at least 20% of your income.");
  } else if (metrics.savingsRateScore < 80) {
    recommendations.push("Boost your savings rate slightly to hit the optimal 20% wealth-building threshold.");
  }

  if (metrics.budgetDisciplineScore < 60) {
    recommendations.push("Budget discipline requires attention. You are consistently exceeding your allocated category limits.");
  }

  if (metrics.vaultVelocityScore < 40) {
    recommendations.push("Your emergency vault is underfunded. Aim to accumulate at least 3 months of income in reserves.");
  }

  if (metrics.debtToIncomeScore < 50) {
    recommendations.push("Debt load is heavy. Focus on paying down high-interest liabilities to improve your cashflow.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Excellent financial posture. Consider aggressively investing surplus capital.");
  }

  return recommendations;
}
