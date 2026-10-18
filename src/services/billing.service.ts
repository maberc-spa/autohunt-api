import { UserPlan } from "@prisma/client";

export type UpgradePlanResult = {
  plan: UserPlan;
  transactionId: string;
};

/**
 * Stub billing service. Wire to in_app_purchase / RevenueCat / Stripe later.
 */
export const purchasePlan = async (
  userId: number,
  plan: UserPlan
): Promise<UpgradePlanResult> => {
  console.info("[billing:stub] Plan upgrade simulated", { userId, plan });
  return {
    plan,
    transactionId: `stub_${Date.now()}`,
  };
};
