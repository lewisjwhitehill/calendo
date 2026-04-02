import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockFindUnique,
  mockCustomerCreate,
  mockCheckoutCreate,
  mockGetPriceId,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockCustomerCreate: vi.fn(),
  mockCheckoutCreate: vi.fn(),
  mockGetPriceId: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("../config", () => ({
  stripe: {
    customers: {
      create: mockCustomerCreate,
    },
    checkout: {
      sessions: {
        create: mockCheckoutCreate,
      },
    },
  },
  getStripePriceIdProMonthly: mockGetPriceId,
}));

import { createCheckoutSession } from "../createCheckout";

describe("createCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPriceId.mockReturnValue("price_pro_monthly");
  });

  it("reuses existing Stripe customer when present", async () => {
    mockFindUnique.mockResolvedValue({ stripeCustomerId: "cus_existing" });
    mockCheckoutCreate.mockResolvedValue({ id: "cs_123", url: "https://example.com" });

    await createCheckoutSession({
      userId: "user_1",
      email: "test@example.com",
      origin: "https://app.example.com",
    });

    expect(mockCustomerCreate).not.toHaveBeenCalled();
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_existing",
        line_items: [{ price: "price_pro_monthly", quantity: 1 }],
        metadata: { userId: "user_1" },
      })
    );
  });

  it("creates Stripe customer when absent", async () => {
    mockFindUnique.mockResolvedValue({ stripeCustomerId: null });
    mockCustomerCreate.mockResolvedValue({ id: "cus_new" });
    mockCheckoutCreate.mockResolvedValue({ id: "cs_456", url: "https://example.com" });

    await createCheckoutSession({
      userId: "user_2",
      email: "new@example.com",
      origin: "https://app.example.com",
    });

    expect(mockCustomerCreate).toHaveBeenCalledWith({
      email: "new@example.com",
      metadata: { userId: "user_2" },
    });
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_new",
        success_url: "https://app.example.com/dashboard?billing=success",
        cancel_url: "https://app.example.com/dashboard?billing=cancelled",
      })
    );
  });
});

