// Plan tier definitions (no billing — structural only)

export type PlanTier = "free" | "pro";

export interface PlanLimits {
  maxAccounts: number;
  maxCards: number;
  aiEnabled: boolean;
  aiAdvanced: boolean;
  projections: boolean;
  unlimitedGoals: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxAccounts: 1,
    maxCards: 1,
    aiEnabled: true,
    aiAdvanced: false,
    projections: false,
    unlimitedGoals: false,
  },
  pro: {
    maxAccounts: Infinity,
    maxCards: Infinity,
    aiEnabled: true,
    aiAdvanced: true,
    projections: true,
    unlimitedGoals: true,
  },
};

export function getUserPlan(): PlanTier {
  try {
    const saved = localStorage.getItem("finbrasil.plan");
    if (saved === "pro") return "pro";
  } catch {}
  return "free";
}

export function getPlanLimits(tier?: PlanTier): PlanLimits {
  return PLAN_LIMITS[tier ?? getUserPlan()];
}
