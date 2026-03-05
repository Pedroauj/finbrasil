/**
 * FinScore – Dynamic financial health score (0-1000)
 *
 * Components (weights):
 * - Budget adherence (250): staying within budget
 * - Savings rate (250): % of income saved
 * - Spending consistency (200): low variance in daily spending
 * - Balance health (150): positive balance relative to income
 * - Data completeness (150): having income, budget, and expenses registered
 */

export interface FinScoreInput {
  income: number;
  totalExpenses: number;
  budgetTotal: number;
  balance: number;
  dailySpendingVariance?: number; // coefficient of variation (stddev/mean)
  hasIncome: boolean;
  hasBudget: boolean;
  hasExpenses: boolean;
  prevMonthExpenses?: number;
}

export interface FinScoreResult {
  total: number;           // 0-1000
  grade: string;           // A+ to F
  label: string;           // "Excelente", "Bom", etc.
  color: "primary" | "yellow" | "destructive";
  breakdown: {
    budgetAdherence: number;
    savingsRate: number;
    consistency: number;
    balanceHealth: number;
    dataCompleteness: number;
  };
  tips: string[];
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function computeFinScore(input: FinScoreInput): FinScoreResult {
  const { income, totalExpenses, budgetTotal, balance, dailySpendingVariance, hasIncome, hasBudget, hasExpenses, prevMonthExpenses } = input;

  // 1. Budget Adherence (0-250)
  let budgetAdherence = 0;
  if (budgetTotal > 0 && hasExpenses) {
    const ratio = totalExpenses / budgetTotal;
    if (ratio <= 0.7) budgetAdherence = 250;
    else if (ratio <= 0.85) budgetAdherence = 220;
    else if (ratio <= 1.0) budgetAdherence = 180;
    else if (ratio <= 1.1) budgetAdherence = 100;
    else if (ratio <= 1.3) budgetAdherence = 50;
    else budgetAdherence = 0;
  } else if (!hasBudget) {
    budgetAdherence = 80; // partial credit for not having budget set
  }

  // 2. Savings Rate (0-250)
  let savingsRate = 0;
  if (income > 0) {
    const saved = income - totalExpenses;
    const rate = saved / income;
    if (rate >= 0.3) savingsRate = 250;
    else if (rate >= 0.2) savingsRate = 210;
    else if (rate >= 0.1) savingsRate = 160;
    else if (rate >= 0) savingsRate = 100;
    else if (rate >= -0.1) savingsRate = 40;
    else savingsRate = 0;
  }

  // 3. Spending Consistency (0-200)
  let consistency = 100; // default middle
  if (dailySpendingVariance !== undefined && dailySpendingVariance >= 0) {
    if (dailySpendingVariance <= 0.3) consistency = 200;
    else if (dailySpendingVariance <= 0.5) consistency = 160;
    else if (dailySpendingVariance <= 0.8) consistency = 120;
    else if (dailySpendingVariance <= 1.2) consistency = 80;
    else consistency = 40;
  }

  // 4. Balance Health (0-150)
  let balanceHealth = 0;
  if (income > 0) {
    const balanceRatio = balance / income;
    if (balanceRatio >= 0.3) balanceHealth = 150;
    else if (balanceRatio >= 0.15) balanceHealth = 120;
    else if (balanceRatio >= 0.05) balanceHealth = 80;
    else if (balanceRatio >= 0) balanceHealth = 50;
    else balanceHealth = 0;
  } else if (balance > 0) {
    balanceHealth = 80;
  }

  // 5. Data Completeness (0-150)
  let dataCompleteness = 0;
  if (hasIncome) dataCompleteness += 50;
  if (hasBudget) dataCompleteness += 50;
  if (hasExpenses) dataCompleteness += 50;

  const total = clamp(
    Math.round(budgetAdherence + savingsRate + consistency + balanceHealth + dataCompleteness),
    0,
    1000
  );

  // Grade
  let grade: string, label: string, color: "primary" | "yellow" | "destructive";
  if (total >= 900) { grade = "A+"; label = "Excepcional"; color = "primary"; }
  else if (total >= 800) { grade = "A"; label = "Excelente"; color = "primary"; }
  else if (total >= 700) { grade = "B+"; label = "Muito bom"; color = "primary"; }
  else if (total >= 600) { grade = "B"; label = "Bom"; color = "primary"; }
  else if (total >= 500) { grade = "C+"; label = "Regular"; color = "yellow"; }
  else if (total >= 400) { grade = "C"; label = "Atenção"; color = "yellow"; }
  else if (total >= 300) { grade = "D"; label = "Preocupante"; color = "destructive"; }
  else if (total >= 200) { grade = "E"; label = "Crítico"; color = "destructive"; }
  else { grade = "F"; label = "Emergência"; color = "destructive"; }

  // Tips
  const tips: string[] = [];
  if (!hasBudget) tips.push("Defina um orçamento mensal para melhorar seu score.");
  if (!hasIncome) tips.push("Registre sua receita para cálculos mais precisos.");
  if (savingsRate < 100 && income > 0) tips.push("Tente poupar pelo menos 20% da sua renda.");
  if (budgetAdherence < 150 && budgetTotal > 0) tips.push("Revise seus gastos para ficar dentro do orçamento.");
  if (balanceHealth < 80) tips.push("Mantenha uma reserva de pelo menos 15% da renda.");

  return {
    total,
    grade,
    label,
    color,
    breakdown: {
      budgetAdherence,
      savingsRate,
      consistency,
      balanceHealth,
      dataCompleteness,
    },
    tips,
  };
}
