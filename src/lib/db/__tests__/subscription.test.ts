import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db/prisma';

// Mock the Prisma client
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    subscription: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('Subscription Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a free subscription for a new user', async () => {
    const mockSubscription = {
      id: 'sub-123',
      userId: 'user-123',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      status: 'active',
      plan: 'free',
      currentPeriodEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.subscription.create as any).mockResolvedValue(mockSubscription);

    const result = await prisma.subscription.create({
      data: {
        userId: 'user-123',
        plan: 'free',
        status: 'active',
      },
    });

    expect(result).toEqual(mockSubscription);
    expect(result.plan).toBe('free');
    expect(result.status).toBe('active');
    expect(prisma.subscription.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-123',
        plan: 'free',
        status: 'active',
      },
    });
  });

  it('should create a pro subscription with Stripe customer ID', async () => {
    const mockSubscription = {
      id: 'sub-456',
      userId: 'user-123',
      stripeCustomerId: 'cus_stripe123',
      stripeSubscriptionId: 'sub_stripe123',
      status: 'active',
      plan: 'pro',
      currentPeriodEnd: new Date('2024-12-31'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.subscription.create as any).mockResolvedValue(mockSubscription);

    const result = await prisma.subscription.create({
      data: {
        userId: 'user-123',
        stripeCustomerId: 'cus_stripe123',
        stripeSubscriptionId: 'sub_stripe123',
        plan: 'pro',
        status: 'active',
        currentPeriodEnd: new Date('2024-12-31'),
      },
    });

    expect(result.plan).toBe('pro');
    expect(result.stripeCustomerId).toBe('cus_stripe123');
    expect(prisma.subscription.create).toHaveBeenCalled();
  });

  it('should update an existing subscription from free to pro', async () => {
    const updatedSubscription = {
      id: 'sub-123',
      userId: 'user-123',
      stripeCustomerId: 'cus_upgrade789',
      stripeSubscriptionId: 'sub_upgrade789',
      status: 'active',
      plan: 'pro',
      currentPeriodEnd: new Date('2025-06-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.subscription.update as any).mockResolvedValue(updatedSubscription);

    const result = await prisma.subscription.update({
      where: { userId: 'user-123' },
      data: {
        plan: 'pro',
        status: 'active',
        stripeCustomerId: 'cus_upgrade789',
        stripeSubscriptionId: 'sub_upgrade789',
        currentPeriodEnd: new Date('2025-06-01'),
      },
    });

    expect(result.plan).toBe('pro');
    expect(result.stripeCustomerId).toBe('cus_upgrade789');
    expect(result.stripeSubscriptionId).toBe('sub_upgrade789');
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      data: expect.objectContaining({
        plan: 'pro',
        stripeCustomerId: 'cus_upgrade789',
      }),
    });
  });
});
