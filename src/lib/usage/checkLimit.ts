import { prisma } from "@/lib/db/prisma";
import { getDailyLimitForPlan, getEffectivePlan } from "./limits";
import { normalizeUtcDay } from "./normalizeUtcDay";
import type { UsageLimitResult } from "./types";

export type { UsageLimitResult };

/**
 * Read-only: current usage vs daily limit for the user (UTC day).
 * Does not create or mutate `UsageLog` rows.
 */
export async function checkLimit(
  userId: string,
  options?: { now?: Date }
): Promise<UsageLimitResult> {
  const date = normalizeUtcDay(options?.now ?? new Date());

  const [usage, subscription] = await Promise.all([
    prisma.usageLog.findUnique({
      where: { userId_date: { userId, date } },
    }),
    prisma.subscription.findUnique({ where: { userId } }),
  ]);

  const plan = getEffectivePlan(subscription);
  const limit = getDailyLimitForPlan(plan);
  const used = usage?.count ?? 0;
  const remaining = Math.max(0, limit - used);
  const allowed = used < limit;

  return { allowed, used, limit, remaining, plan };
}
