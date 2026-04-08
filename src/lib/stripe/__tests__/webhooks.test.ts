import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const { mockFindFirst, mockUpsert, mockGetPriceId, mockRetrieveSubscription } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockUpsert: vi.fn(),
  mockGetPriceId: vi.fn(),
  mockRetrieveSubscription: vi.fn(),
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
  stripe: {
    subscriptions: {
      retrieve: mockRetrieveSubscription,
    },
  },
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
          metadata: { userId: "user_123" },
          items: {
            data: [{ price: { id: "price_pro_monthly" }, current_period_end: 1_800_000_000 }],
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
          currentPeriodEnd: expect.any(Date),
        }),
      })
    );
  });

  it("keeps pro and marks status canceling at period end", async () => {
    mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const event = {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_canceling",
          customer: "cus_canceling",
          status: "active",
          cancel_at_period_end: true,
          metadata: { userId: "user_canceling" },
          items: {
            data: [{ price: { id: "price_pro_monthly" }, current_period_end: 1_800_000_000 }],
          },
        },
      },
    } as unknown as Stripe.Event;

    await handleStripeWebhookEvent(event);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_canceling" },
        update: expect.objectContaining({
          plan: "pro",
          status: "canceling",
        }),
      })
    );
  });

  it("marks status canceling when cancel_at is set but cancel_at_period_end is false", async () => {
    mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const event = {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_cancel_at",
          customer: "cus_cancel_at",
          status: "active",
          cancel_at_period_end: false,
          cancel_at: 1_800_000_000,
          metadata: { userId: "user_cancel_at" },
          items: {
            data: [{ price: { id: "price_pro_monthly" }, current_period_end: 1_800_000_000 }],
          },
        },
      },
    } as unknown as Stripe.Event;

    await handleStripeWebhookEvent(event);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_cancel_at" },
        update: expect.objectContaining({
          plan: "pro",
          status: "canceling",
        }),
      })
    );
  });

  it("downgrades to free when Stripe marks subscription canceled", async () => {
    mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const event = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_deleted",
          customer: "cus_deleted",
          status: "canceled",
          metadata: { userId: "user_deleted" },
          items: {
            data: [{ price: { id: "price_pro_monthly" }, current_period_end: 1_800_000_000 }],
          },
        },
      },
    } as unknown as Stripe.Event;

    await handleStripeWebhookEvent(event);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_deleted" },
        update: expect.objectContaining({
          plan: "free",
          status: "canceled",
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
          metadata: { userId: "user_999" },
          items: {
            data: [{ price: { id: "price_other" }, current_period_end: 1_800_000_000 }],
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
    mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mockRetrieveSubscription.mockResolvedValue({
      id: "sub_checkout",
      customer: "cus_checkout",
      status: "active",
      cancel_at_period_end: false,
      metadata: { userId: "user_checkout" },
      items: { data: [{ price: { id: "price_pro_monthly" }, current_period_end: 1_800_000_000 }] },
    });

    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_checkout",
          subscription: "sub_checkout",
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
    expect(mockRetrieveSubscription).toHaveBeenCalledWith("sub_checkout");
  });
});

