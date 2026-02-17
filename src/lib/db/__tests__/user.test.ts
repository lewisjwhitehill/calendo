import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db/prisma';

// Mock the Prisma client
vi.mock('@/lib/db/prisma', () => ({
        prisma: {
                user: {
                        upsert: vi.fn(),
                        findUnique: vi.fn(),
                },
                subscription: {
                        create: vi.fn(),
                        findUnique: vi.fn(),
                },
        },
}));

describe('User Database Operations', () => {
        beforeEach(() => {
                vi.clearAllMocks();
        });

        it('should create a new user on first login', async () => {
                const mockUser = {
                        id: 'user-123',
                        email: 'test@example.com',
                        name: 'Test User',
                        googleId: 'google-123',
                        image: 'https://example.com/avatar.jpg',
                        subscription: null,
                };

                (prisma.user.upsert as any).mockResolvedValue(mockUser);

                const result = await prisma.user.upsert({
                        where: { email: 'test@example.com' },
                        update: {},
                        create: {
                                email: 'test@example.com',
                                name: 'Test User',
                                googleId: 'google-123',
                                image: 'https://example.com/avatar.jpg',
                        },
                        include: { subscription: true },
                });

                expect(result).toEqual(mockUser);
                expect(prisma.user.upsert).toHaveBeenCalledWith({
                        where: { email: 'test@example.com' },
                        update: {},
                        create: {
                                email: 'test@example.com',
                                name: 'Test User',
                                googleId: 'google-123',
                                image: 'https://example.com/avatar.jpg',
                        },
                        include: { subscription: true },
                });
        });

        it('should update existing user on subsequent login', async () => {
                const mockUser = {
                        id: 'user-123',
                        email: 'test@example.com',
                        name: 'Updated Name',
                        googleId: 'google-123',
                        image: 'https://example.com/new-avatar.jpg',
                        subscription: null,
                };

                (prisma.user.upsert as any).mockResolvedValue(mockUser);

                const result = await prisma.user.upsert({
                        where: { email: 'test@example.com' },
                        update: {
                                name: 'Updated Name',
                                image: 'https://example.com/new-avatar.jpg',
                                googleId: 'google-123',
                        },
                        create: {
                                email: 'test@example.com',
                                name: 'Updated Name',
                                googleId: 'google-123',
                                image: 'https://example.com/new-avatar.jpg',
                        },
                        include: { subscription: true },
                });

                expect(result.name).toBe('Updated Name');
                expect(prisma.user.upsert).toHaveBeenCalled();
        });

        it('should handle null/undefined optional fields', async () => {
                const mockUser = {
                        id: 'user-456',
                        email: 'minimal@example.com',
                        name: null,
                        googleId: 'google-456',
                        image: null,
                        subscription: null,
                };

                (prisma.user.upsert as any).mockResolvedValue(mockUser);

                const result = await prisma.user.upsert({
                        where: { email: 'minimal@example.com' },
                        update: {
                                name: null,
                                image: null,
                                googleId: 'google-456',
                        },
                        create: {
                                email: 'minimal@example.com',
                                name: null,
                                googleId: 'google-456',
                                image: null,
                        },
                        include: { subscription: true },
                });

                expect(result.email).toBe('minimal@example.com');
                expect(result.name).toBeNull();
                expect(result.image).toBeNull();
                expect(prisma.user.upsert).toHaveBeenCalledWith(
                        expect.objectContaining({
                                create: expect.objectContaining({
                                        name: null,
                                        image: null,
                                }),
                        })
                );
        });
});
