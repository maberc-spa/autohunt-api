import { UserPlan } from "@prisma/client";

const DEFAULT_TIER_3_LIMIT = 50;

const PLAN_LIMITS: Record<UserPlan, number | null> = {
  FREE: 1,
  PREMIUM_TIER_1: 10,
  PREMIUM_TIER_2: 30,
  PREMIUM_TIER_3: null,
};

export type PlanInfo = {
  plan: UserPlan;
  maxVehicles: number;
  planVehicleLimit: number | null;
};

export const getMaxVehiclesForPlan = (
  plan: UserPlan,
  planVehicleLimit?: number | null
): number => {
  if (plan === "PREMIUM_TIER_3") {
    return planVehicleLimit ?? DEFAULT_TIER_3_LIMIT;
  }
  return PLAN_LIMITS[plan] ?? 1;
};

export const getPlanInfo = (
  plan: UserPlan,
  planVehicleLimit?: number | null
): PlanInfo => ({
  plan,
  maxVehicles: getMaxVehiclesForPlan(plan, planVehicleLimit),
  planVehicleLimit: plan === "PREMIUM_TIER_3" ? planVehicleLimit ?? DEFAULT_TIER_3_LIMIT : null,
});

export const PLAN_CATALOG = [
  {
    plan: "FREE" as const,
    name: "Gratis",
    maxVehicles: 1,
    priceLabel: "$0",
  },
  {
    plan: "PREMIUM_TIER_1" as const,
    name: "Premium Nivel 1",
    maxVehicles: 10,
    priceLabel: "$4.99/mes",
  },
  {
    plan: "PREMIUM_TIER_2" as const,
    name: "Premium Nivel 2",
    maxVehicles: 30,
    priceLabel: "$9.99/mes",
  },
  {
    plan: "PREMIUM_TIER_3" as const,
    name: "Premium Nivel 3",
    maxVehicles: DEFAULT_TIER_3_LIMIT,
    priceLabel: "$14.99/mes",
  },
];
