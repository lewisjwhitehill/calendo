import type { Subscription } from "@/lib/generated/prisma/client";

export const FREE_DAILY_EVENT_LIMIT = 5;
export const PRO_DAILY_EVENT_LIMIT = 50;

export type EffectivePlan = "free" | "pro";

/** Pro limits only when there is an active subscription with plan `pro`. */
export function getEffectivePlan(
  subscription: Pick<Subscription, "plan" | "status"> | null
): EffectivePlan {
  if (!subscription) return "free";
  if (subscription.status !== "active") return "free";
  if (subscription.plan === "pro") return "pro";
  return "free";
}

export function getDailyLimitForPlan(plan: EffectivePlan): number {
  return plan === "pro" ? PRO_DAILY_EVENT_LIMIT : FREE_DAILY_EVENT_LIMIT;
}
