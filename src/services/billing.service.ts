import { UserPlan } from "@prisma/client";

export type UpgradePlanResult = {
  plan: UserPlan;
  transactionId: string;
};

/**
 * Paid plans are off until a real payment provider (Google Play Billing / RevenueCat) is wired
 * here. BILLING_STUB_ENABLED=true turns on free simulated upgrades for testing, never in
 * production.
 */
export const isBillingEnabled = (): boolean =>
  process.env.NODE_ENV !== "production" && process.env.BILLING_STUB_ENABLED === "true";

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
