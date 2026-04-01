import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { normalizeUtcDay } from "./normalizeUtcDay";

/**
 * Reverses one `consumeUsageIfAvailable` increment for the given UTC day.
 * Used when event creation fails after a slot was reserved (e.g. Google API error).
 * If count reaches 0, the row is deleted so "no row" again means zero usage.
 */
export async function rollbackConsumedUsage(
  userId: string,
  options?: { now?: Date }
): Promise<void> {
  const date = normalizeUtcDay(options?.now ?? new Date());

  await prisma.$transaction(
    async (tx) => {
      const row = await tx.usageLog.findUnique({
        where: { userId_date: { userId, date } },
      });

      if (!row) {
        console.warn(
          "[rollbackConsumedUsage] No usage_logs row for user/day; nothing to roll back.",
          { userId, date: date.toISOString() }
        );
        return;
      }

      if (row.count <= 0) {
        return;
      }

      if (row.count === 1) {
        await tx.usageLog.delete({
          where: { userId_date: { userId, date } },
        });
        return;
      }

      await tx.usageLog.update({
        where: { userId_date: { userId, date } },
        data: { count: { decrement: 1 } },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}
