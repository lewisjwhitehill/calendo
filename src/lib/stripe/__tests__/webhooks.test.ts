import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const { mockFindFirst, mockUpsert, mockGetPriceId } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockUpsert: vi.fn(),
  mockGetPriceId: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    subscription: {
      findFirst: mockFindFirst,
      upsert: mockUpsert,
    },
  },
}));

vi.mock("../config", () => ({
  getStripePriceIdProMonthly: mockGetPriceId,
}));

import { handleStripeWebhookEvent } from "../webhooks";

describe("handleStripeWebhookEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPriceId.mockReturnValue("price_pro_monthly");
  });

  it("upserts pro subscription for matching Stripe price", async () => {
    mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const event = {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "active",
          current_period_end: 1_800_000_000,
          metadata: { userId: "user_123" },
          items: {
            data: [{ price: { id: "price_pro_monthly" } }],
          },
        },
      },
    } as unknown as Stripe.Event;

    await handleStripeWebhookEvent(event);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_123" },
        update: expect.objectContaining({
          plan: "pro",
          status: "active",
          stripeSubscriptionId: "sub_123",
          stripeCustomerId: "cus_123",
        }),
      })
    );
  });

  it("maps non-pro price to free plan", async () => {
    mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const event = {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_other",
          customer: "cus_other",
          status: "past_due",
          current_period_end: 1_800_000_000,
          metadata: { userId: "user_999" },
          items: {
            data: [{ price: { id: "price_other" } }],
          },
        },
      },
    } as unknown as Stripe.Event;

    await handleStripeWebhookEvent(event);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_999" },
        update: expect.objectContaining({
          plan: "free",
          status: "past_due",
        }),
      })
    );
  });

  it("syncs customer id from checkout completion", async () => {
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_checkout",
          metadata: { userId: "user_checkout" },
        },
      },
    } as unknown as Stripe.Event;

    await handleStripeWebhookEvent(event);

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { userId: "user_checkout" },
      create: {
        userId: "user_checkout",
        stripeCustomerId: "cus_checkout",
        plan: "free",
        status: "active",
      },
      update: {
        stripeCustomerId: "cus_checkout",
      },
    });
  });
});

