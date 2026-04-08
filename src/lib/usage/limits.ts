import type { Subscription } from "@/lib/generated/prisma/client";

export const FREE_DAILY_EVENT_LIMIT = 5;
export const PRO_DAILY_EVENT_LIMIT = 50;

export type EffectivePlan = "free" | "pro";

/** Pro limits only when there is an active subscription with plan `pro`. */
export function getEffectivePlan(
  subscription: Pick<Subscription, "plan" | "status" | "currentPeriodEnd"> | null,
  options?: { now?: Date }
): EffectivePlan {
  if (!subscription) return "free";
  if (subscription.plan !== "pro") return "free";

  if (subscription.status === "active" || subscription.status === "trialing") {
    return "pro";
  }

  if (subscription.status === "canceling") {
    const now = options?.now ?? new Date();
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd.getTime() > now.getTime()) {
      return "pro";
    }
    return "free";
  }

  return "free";
}

export function getDailyLimitForPlan(plan: EffectivePlan): number {
  return plan === "pro" ? PRO_DAILY_EVENT_LIMIT : FREE_DAILY_EVENT_LIMIT;
}
