import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";
import { createCheckoutSession } from "@/lib/stripe/createCheckout";
import { getStripePublishableKey } from "@/lib/stripe/config";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const email = session.user?.email;
    if (!email) {
      return NextResponse.json(
        { error: "Missing email on session. Please sign in again." },
        { status: 400 }
      );
    }

    // Validate required public key config early for predictable deployment failures.
    getStripePublishableKey();

    const checkout = await createCheckoutSession({
      userId: session.userId,
      email,
      origin: req.nextUrl.origin,
    });

    return NextResponse.json({ url: checkout.url, sessionId: checkout.id });
  } catch (error) {
    console.error("Failed to create Stripe checkout session", error);
    return NextResponse.json(
      { error: "Failed to create Stripe checkout session." },
      { status: 500 }
    );
  }
}

