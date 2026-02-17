import { PrismaClient } from "@/lib/generated/prisma/client";

// Prevent multiple Prisma Client instances in development (hot-reload).
// In production a single instance is created once.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
