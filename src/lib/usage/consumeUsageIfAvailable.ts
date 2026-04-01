import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { getDailyLimitForPlan, getEffectivePlan } from "./limits";
import { normalizeUtcDay } from "./normalizeUtcDay";
import type { UsageLimitResult } from "./types";

export type { UsageLimitResult };

/**
 * Atomically reserves one daily event slot if under the user's limit.
 * Uses Serializable isolation so concurrent requests cannot overshoot the limit.
 */
export async function consumeUsageIfAvailable(
  userId: string,
  options?: { now?: Date }
): Promise<UsageLimitResult> {
  const date = normalizeUtcDay(options?.now ?? new Date());

  return prisma.$transaction(
    async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { userId },
      });

      const plan = getEffectivePlan(subscription);
      const limit = getDailyLimitForPlan(plan);

      const existing = await tx.usageLog.findUnique({
        where: { userId_date: { userId, date } },
      });

      const used = existing?.count ?? 0;
      if (used >= limit) {
        return {
          allowed: false,
          used,
          limit,
          remaining: 0,
          plan,
        };
      }

      if (!existing) {
        await tx.usageLog.create({
          data: { userId, date, count: 1 },
        });
        const newUsed = 1;
        return {
          allowed: true,
          used: newUsed,
          limit,
          remaining: limit - newUsed,
          plan,
        };
      }

      await tx.usageLog.update({
        where: { userId_date: { userId, date } },
        data: { count: { increment: 1 } },
      });

      const newUsed = used + 1;
      return {
        allowed: true,
        used: newUsed,
        limit,
        remaining: limit - newUsed,
        plan,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}
