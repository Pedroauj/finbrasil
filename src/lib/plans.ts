// Plan tier definitions (no billing — structural only)

export type PlanTier = "free" | "pro" | "ultra";
export type UserRole = "user" | "admin" | "owner";

export interface PlanLimits {
  maxAccounts: number;
  maxCards: number;
  aiEnabled: boolean;
  aiAdvanced: boolean;
  projections: boolean;
  unlimitedGoals: boolean;
  smartInsights: boolean;
  financialForecast: boolean;
  monthlyReport: boolean;
  advancedFinScore: boolean;
  priorityFeatures: boolean;
  advancedPlanning: boolean;
  financialSimulations: boolean;
}

export interface PlanInfo {
  key: PlanTier;
  name: string;
  displayName: string;
  description: string;
  price: string;
  popular?: boolean;
  features: string[];
  limitations?: string[];
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxAccounts: 2,
    maxCards: 1,
    aiEnabled: false,
    aiAdvanced: false,
    projections: false,
    unlimitedGoals: false,
    smartInsights: false,
    financialForecast: false,
    monthlyReport: false,
    advancedFinScore: false,
    priorityFeatures: false,
    advancedPlanning: false,
    financialSimulations: false,
  },
  pro: {
    maxAccounts: Infinity,
    maxCards: Infinity,
    aiEnabled: true,
    aiAdvanced: true,
    projections: true,
    unlimitedGoals: true,
    smartInsights: true,
    financialForecast: true,
    monthlyReport: true,
    advancedFinScore: true,
    priorityFeatures: false,
    advancedPlanning: false,
    financialSimulations: false,
  },
  ultra: {
    maxAccounts: Infinity,
    maxCards: Infinity,
    aiEnabled: true,
    aiAdvanced: true,
    projections: true,
    unlimitedGoals: true,
    smartInsights: true,
    financialForecast: true,
    monthlyReport: true,
    advancedFinScore: true,
    priorityFeatures: true,
    advancedPlanning: true,
    financialSimulations: true,
  },
};

export const PLANS: PlanInfo[] = [
  {
    key: "free",
    name: "Essencial",
    displayName: "Plano Essencial",
    description: "Perfeito para quem quer começar a organizar sua vida financeira.",
    price: "Gratuito",
    features: [
      "Até 2 contas financeiras",
      "1 cartão de crédito",
      "Controle de receitas e despesas",
      "Dashboard financeiro básico",
      "Histórico de transações",
    ],
    limitations: [
      "Sem assistente financeiro com IA",
      "Sem insights automáticos",
      "Sem previsões financeiras",
      "Limite de contas e cartões",
    ],
  },
  {
    key: "pro",
    name: "Inteligente",
    displayName: "Plano Inteligente",
    description: "Controle financeiro avançado com inteligência artificial.",
    price: "R$ 19/mês",
    popular: true,
    features: [
      "Contas ilimitadas",
      "Cartões ilimitados",
      "Assistente financeiro com IA",
      "Insights automáticos de gastos",
      "Projeções financeiras inteligentes",
      "Alertas inteligentes de despesas",
      "Dashboard avançado",
      "Relatório financeiro mensal automático",
    ],
  },
  {
    key: "ultra",
    name: "Elite",
    displayName: "Plano Elite",
    description: "Controle financeiro completo com todos os recursos avançados do FinBrasil.",
    price: "R$ 39/mês",
    features: [
      "Tudo do plano Inteligente",
      "Recursos avançados de IA",
      "Prioridade em novos recursos",
      "Planejamento financeiro avançado",
      "Simulações financeiras futuras",
    ],
  },
];

export function getPlanInfo(tier: PlanTier): PlanInfo {
  return PLANS.find((p) => p.key === tier)!;
}

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLAN_LIMITS[tier];
}
