import type Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { getStripePriceIdProMonthly, stripe } from "./config";

function toAppStatus(
  status: Stripe.Subscription.Status,
  cancelAtPeriodEnd: boolean,
  cancelAt: number | null,
): string {
  if ((cancelAtPeriodEnd || cancelAt) && (status === "active" || status === "trialing")) {
    return "canceling";
  }
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "canceled";
}

function asStripeId(value: string | Stripe.Customer | Stripe.Subscription | Stripe.DeletedCustomer) {
  if (typeof value === "string") return value;
  return value.id;
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
  const stripeCustomerId = asStripeId(subscription.customer);

  const existingBySubId = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  const existingByCustomer = await prisma.subscription.findFirst({
    where: { stripeCustomerId },
  });

  const userId = existingBySubId?.userId ?? existingByCustomer?.userId ?? metadataUserId;
  if (!userId) {
    console.warn("Stripe webhook ignored: cannot determine user for subscription", {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId,
    });
    return;
  }

  const item = subscription.items.data[0];
  const priceId = item?.price?.id;
  const appStatus = toAppStatus(subscription.status, subscription.cancel_at_period_end, subscription.cancel_at);
  const appPlan = appStatus === "canceled" ? "free" : toAppPlan(priceId);
  const currentPeriodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  console.log("[webhook debug] upsertFromSubscription", {
    stripeSubId: subscription.id,
    stripeStatus: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelAt: subscription.cancel_at,
    computedAppStatus: appStatus,
    computedAppPlan: appPlan,
    userId,
    priceId,
    currentPeriodEnd,
  });

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      status: appStatus,
      plan: appPlan,
      currentPeriodEnd,
    },
    update: {
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      status: appStatus,
      plan: appPlan,
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

  if (typeof session.subscription === "string") {
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    await upsertFromSubscription(subscription);
  }
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  console.log("[webhook debug] received event:", event.type);

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

