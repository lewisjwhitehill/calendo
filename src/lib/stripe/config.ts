import Stripe from "stripe";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required Stripe env var: ${name}`);
  }
  return value;
}

const stripeSecretKey = requireEnv("STRIPE_SECRET_KEY");

export const stripe = new Stripe(stripeSecretKey);

export function getStripeWebhookSecret(): string {
  return requireEnv("STRIPE_WEBHOOK_SECRET");
}

export function getStripePriceIdProMonthly(): string {
  return requireEnv("STRIPE_PRICE_ID_PRO_MONTHLY");
}

export function getStripePublishableKey(): string {
  return requireEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
}

