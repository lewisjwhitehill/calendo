import { NextRequest, NextResponse } from "next/server";
import { stripe, getStripeWebhookSecret } from "@/lib/stripe/config";
import { handleStripeWebhookEvent } from "@/lib/stripe/webhooks";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature header." },
      { status: 400 }
    );
  }

  const body = await req.text();

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret()
    );
    console.log("[webhook raw] event.type:", event.type);
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Record<string, unknown>;
      console.log("[webhook raw] subscription payload:", JSON.stringify({
        id: sub.id,
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        cancel_at: sub.cancel_at,
        canceled_at: sub.canceled_at,
        current_period_end: sub.current_period_end,
        billing_mode: sub.billing_mode,
      }, null, 2));
    }
    await handleStripeWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling failed", error);
    return NextResponse.json({ error: "Invalid Stripe webhook." }, { status: 400 });
  }
}

