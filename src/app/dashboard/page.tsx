// app/dashboard/page.tsx (Server Component version)

import ClientDashboard from "@/app/components/ClientDashboard";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/db/prisma";
import { checkLimit } from "@/lib/usage/checkLimit";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.userId) {
    redirect("/api/auth/signin");
  }

  const [subscription, usage] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId: session.userId },
      select: {
        plan: true,
        status: true,
        stripeCustomerId: true,
        currentPeriodEnd: true,
      },
    }),
    checkLimit(session.userId),
  ]);

  return (
    <ClientDashboard
      billing={{
        plan: usage.plan,
        status: subscription?.status ?? "active",
        used: usage.used,
        limit: usage.limit,
        remaining: usage.remaining,
        hasBilling: Boolean(subscription?.stripeCustomerId),
        currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
      }}
    />
  );
}
