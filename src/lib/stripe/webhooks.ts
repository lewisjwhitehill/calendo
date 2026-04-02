import type Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { getStripePriceIdProMonthly } from "./config";

function toAppStatus(status: Stripe.Subscription.Status): string {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "canceled";
}

function toAppPlan(priceId: string | null | undefined): "free" | "pro" {
  if (!priceId) return "free";
  return priceId === getStripePriceIdProMonthly() ? "pro" : "free";
}

async function upsertFromSubscription(
  subscription: Stripe.Subscription
): Promise<void> {
  const metadataUserId =
    typeof subscription.metadata?.userId === "string"
      ? subscription.metadata.userId
      : undefined;

  const existingBySubId = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  const existingByCustomer = await prisma.subscription.findFirst({
    where: { stripeCustomerId: subscription.customer as string },
  });

  const userId = existingBySubId?.userId ?? existingByCustomer?.userId ?? metadataUserId;
  if (!userId) {
    console.warn("Stripe webhook ignored: cannot determine user for subscription", {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer,
    });
    return;
  }

  const item = subscription.items.data[0];
  const priceId = item?.price?.id;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      status: toAppStatus(subscription.status),
      plan: toAppPlan(priceId),
      currentPeriodEnd,
    },
    update: {
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscription.id,
      status: toAppStatus(subscription.status),
      plan: toAppPlan(priceId),
      currentPeriodEnd,
    },
  });
}

async function syncCustomerFromCheckout(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId =
    typeof session.metadata?.userId === "string" ? session.metadata.userId : undefined;
  if (!userId || typeof session.customer !== "string") return;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: session.customer,
      plan: "free",
      status: "active",
    },
    update: {
      stripeCustomerId: session.customer,
    },
  });
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await syncCustomerFromCheckout(event.data.object as Stripe.Checkout.Session);
      return;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await upsertFromSubscription(event.data.object as Stripe.Subscription);
      return;
    default:
      return;
  }
}

