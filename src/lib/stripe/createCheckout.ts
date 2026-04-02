import { prisma } from "@/lib/db/prisma";
import { stripe, getStripePriceIdProMonthly } from "./config";

type CreateCheckoutParams = {
  userId: string;
  email: string;
  origin: string;
};

export async function createCheckoutSession({
  userId,
  email,
  origin,
}: CreateCheckoutParams) {
  const priceId = getStripePriceIdProMonthly();

  const existingSubscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  let customerId = existingSubscription?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });
    customerId = customer.id;
  }

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?billing=success`,
    cancel_url: `${origin}/dashboard?billing=cancelled`,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
    allow_promotion_codes: true,
  });
}

