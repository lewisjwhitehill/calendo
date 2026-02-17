import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db/prisma';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
        prisma: {
                user: {
                        upsert: vi.fn(),
                },
                subscription: {
                        create: vi.fn(),
                },
        },
}));

// Mock global fetch (used for token refresh)
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock console.error to keep test output clean and to verify error logging
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

// ─── Helper: extract the real callbacks from authOptions ────────────
// We import AFTER mocks are set up so Prisma is already mocked.
const { authOptions } = await import('@/lib/authOptions');
const jwtCallback = authOptions.callbacks!.jwt! as any;
const sessionCallback = authOptions.callbacks!.session! as any;

// ─── Helpers for building callback arguments ────────────────────────
function buildToken(overrides: Record<string, unknown> = {}) {
        return {
                email: 'test@example.com',
                name: 'Test User',
                picture: 'https://example.com/avatar.jpg',
                ...overrides,
        };
}

function buildAccount(overrides: Record<string, unknown> = {}) {
        return {
                access_token: 'google-access-token',
                refresh_token: 'google-refresh-token',
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                providerAccountId: 'google-123',
                ...overrides,
        };
}

function buildProfile(overrides: Record<string, unknown> = {}) {
        return {
                name: 'Profile Name',
                email: 'test@example.com',
                ...overrides,
        };
}

// =====================================================================
//  TESTS
// =====================================================================

describe('Auth Options - User Creation Flow', () => {
        beforeEach(() => {
                vi.clearAllMocks();
        });

        // ─── Existing happy path tests (rewritten to call real callbacks) ──

        it('should create user and subscription on first login', async () => {
                const mockUser = {
                        id: 'user-123',
                        email: 'test@example.com',
                        name: 'Test User',
                        googleId: 'google-123',
                        subscription: null,
                };

                (prisma.user.upsert as any).mockResolvedValue(mockUser);
                (prisma.subscription.create as any).mockResolvedValue({
                        id: 'sub-123',
                        userId: 'user-123',
                        plan: 'free',
                        status: 'active',
                });

                const token = buildToken();
                const account = buildAccount();
                const profile = buildProfile();

                const result = await jwtCallback({ token, account, profile });

                expect(prisma.user.upsert).toHaveBeenCalled();
                expect(prisma.subscription.create).toHaveBeenCalledWith({
                        data: {
                                userId: 'user-123',
                                plan: 'free',
                                status: 'active',
                        },
                });
                expect(result.userId).toBe('user-123');
                expect(result.plan).toBe('free');
        });

        it('should not create duplicate subscription if one exists', async () => {
                const mockUser = {
                        id: 'user-123',
                        email: 'test@example.com',
                        subscription: {
                                id: 'sub-123',
                                userId: 'user-123',
                                plan: 'free',
                                status: 'active',
                        },
                };

                (prisma.user.upsert as any).mockResolvedValue(mockUser);

                const token = buildToken();
                const account = buildAccount();
                const profile = buildProfile();

                const result = await jwtCallback({ token, account, profile });

                expect(prisma.user.upsert).toHaveBeenCalled();
                expect(prisma.subscription.create).not.toHaveBeenCalled();
                expect(result.plan).toBe('free');
        });

        it('should preserve existing pro subscription plan', async () => {
                const mockUser = {
                        id: 'user-123',
                        email: 'test@example.com',
                        subscription: {
                                id: 'sub-123',
                                userId: 'user-123',
                                plan: 'pro',
                                status: 'active',
                        },
                };

                (prisma.user.upsert as any).mockResolvedValue(mockUser);

                const token = buildToken();
                const account = buildAccount();
                const profile = buildProfile();

                const result = await jwtCallback({ token, account, profile });

                expect(result.plan).toBe('pro');
                expect(prisma.subscription.create).not.toHaveBeenCalled();
        });
});

// ─── Error Handling ──────────────────────────────────────────────────

describe('Auth Options - Error Handling', () => {
        beforeEach(() => {
                vi.clearAllMocks();
        });

        it('should handle database failure gracefully and still return token', async () => {
                (prisma.user.upsert as any).mockRejectedValue(
                        new Error('Database connection failed')
                );

                const token = buildToken();
                const account = buildAccount();
                const profile = buildProfile();

                const result = await jwtCallback({ token, account, profile });

                // Auth flow should not crash - token is still returned
                expect(result).toBeDefined();
                expect(result.accessToken).toBe('google-access-token');
                // userId and plan should NOT be set because DB failed
                expect(result.userId).toBeUndefined();
                expect(result.plan).toBeUndefined();
                // Error should be logged
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                        'Failed to upsert user in database:',
                        expect.any(Error)
                );
        });

        it('should handle subscription creation failure gracefully', async () => {
                const mockUser = {
                        id: 'user-123',
                        email: 'test@example.com',
                        subscription: null, // No subscription yet
                };

                (prisma.user.upsert as any).mockResolvedValue(mockUser);
                (prisma.subscription.create as any).mockRejectedValue(
                        new Error('Subscription creation failed')
                );

                const token = buildToken();
                const account = buildAccount();
                const profile = buildProfile();

                const result = await jwtCallback({ token, account, profile });

                // Auth flow should not crash
                expect(result).toBeDefined();
                // userId was set before subscription creation failed
                expect(result.userId).toBe('user-123');
                // Error should be logged
                expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it('should handle token refresh failure and clear dead tokens', async () => {
                // Token with expired access token triggers refresh
                const token = buildToken({
                        refreshToken: 'old-refresh-token',
                        expiresAt: Date.now() - 1000, // already expired
                        accessToken: 'old-access-token',
                });

                // Mock Google returning an error response
                mockFetch.mockResolvedValue({
                        ok: false,
                        json: () => Promise.resolve({ error: 'invalid_grant' }),
                });

                const result = await jwtCallback({ token, account: undefined, profile: undefined });

                // Tokens should be wiped
                expect(result.accessToken).toBeUndefined();
                expect(result.refreshToken).toBeUndefined();
                expect(result.expiresAt).toBeUndefined();
                // Error should be set on token
                expect(result.error).toBe('invalid_grant');
        });

        it('should handle fetch exception during token refresh', async () => {
                const token = buildToken({
                        refreshToken: 'old-refresh-token',
                        expiresAt: Date.now() - 1000,
                        accessToken: 'old-access-token',
                });

                // Mock fetch throwing a network error
                mockFetch.mockRejectedValue(new Error('Network error'));

                const result = await jwtCallback({ token, account: undefined, profile: undefined });

                expect(result.error).toBe('RefreshAccessTokenError');
                expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to refresh access token');
        });
});

// ─── Edge Cases ──────────────────────────────────────────────────────

describe('Auth Options - Edge Cases', () => {
        beforeEach(() => {
                vi.clearAllMocks();
        });

        it('should skip database operations when email is missing', async () => {
                const token = buildToken({ email: undefined });
                const account = buildAccount();
                const profile = buildProfile();

                const result = await jwtCallback({ token, account, profile });

                // Database should never be called
                expect(prisma.user.upsert).not.toHaveBeenCalled();
                expect(prisma.subscription.create).not.toHaveBeenCalled();
                // Token should still have access token from account
                expect(result.accessToken).toBe('google-access-token');
        });

        it('should use profile name as fallback when token name is null', async () => {
                const mockUser = {
                        id: 'user-123',
                        email: 'test@example.com',
                        name: 'Profile Name',
                        subscription: { id: 'sub-1', plan: 'free', status: 'active' },
                };

                (prisma.user.upsert as any).mockResolvedValue(mockUser);

                const token = buildToken({ name: undefined }); // No name on token
                const account = buildAccount();
                const profile = buildProfile({ name: 'Profile Name' }); // Name from Google profile

                await jwtCallback({ token, account, profile });

                // Verify upsert was called with profile name as fallback
                expect(prisma.user.upsert).toHaveBeenCalledWith(
                        expect.objectContaining({
                                update: expect.objectContaining({
                                        name: 'Profile Name', // Falls back to profile.name
                                }),
                                create: expect.objectContaining({
                                        name: 'Profile Name',
                                }),
                        })
                );
        });

        it('should skip token refresh when no refreshToken exists', async () => {
                const token = buildToken({
                        refreshToken: undefined,
                        expiresAt: Date.now() - 1000, // expired, but no refresh token
                        accessToken: 'stale-token',
                });

                const result = await jwtCallback({ token, account: undefined, profile: undefined });

                // Fetch should never be called (no refresh token)
                expect(mockFetch).not.toHaveBeenCalled();
                // Original access token should remain unchanged
                expect(result.accessToken).toBe('stale-token');
        });
});

// ─── Token Refresh ───────────────────────────────────────────────────

describe('Auth Options - Token Refresh', () => {
        beforeEach(() => {
                vi.clearAllMocks();
        });

        it('should refresh token successfully when expired', async () => {
                const token = buildToken({
                        refreshToken: 'valid-refresh-token',
                        expiresAt: Date.now() - 1000, // expired
                        accessToken: 'old-access-token',
                });

                mockFetch.mockResolvedValue({
                        ok: true,
                        json: () =>
                                Promise.resolve({
                                        access_token: 'new-access-token',
                                        expires_in: 3600,
                                }),
                });

                const result = await jwtCallback({ token, account: undefined, profile: undefined });

                expect(result.accessToken).toBe('new-access-token');
                expect(result.expiresAt).toBeGreaterThan(Date.now());
                expect(result.error).toBeUndefined();
        });

        it('should not refresh token when it is still valid', async () => {
                const token = buildToken({
                        refreshToken: 'valid-refresh-token',
                        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
                        accessToken: 'still-valid-token',
                });

                const result = await jwtCallback({ token, account: undefined, profile: undefined });

                // Fetch should not be called (token is still valid)
                expect(mockFetch).not.toHaveBeenCalled();
                expect(result.accessToken).toBe('still-valid-token');
        });
});

// ─── Session Callback ────────────────────────────────────────────────

describe('Auth Options - Session Callback', () => {
        beforeEach(() => {
                vi.clearAllMocks();
        });

        it('should map token data to session correctly', async () => {
                const session = { user: { email: 'test@example.com' }, expires: '' };
                const token = {
                        accessToken: 'access-123',
                        userId: 'user-123',
                        plan: 'pro',
                };

                const result = await sessionCallback({ session, token });

                expect(result.accessToken).toBe('access-123');
                expect(result.userId).toBe('user-123');
                expect(result.plan).toBe('pro');
        });
});

// ─── Integration ─────────────────────────────────────────────────────

describe('Auth Options - Integration', () => {
        beforeEach(() => {
                vi.clearAllMocks();
        });

        it('should handle full first login flow end-to-end', async () => {
                // Step 1: User signs in for the first time
                const mockUser = {
                        id: 'user-new',
                        email: 'new@example.com',
                        name: 'New User',
                        googleId: 'google-new',
                        subscription: null,
                };

                (prisma.user.upsert as any).mockResolvedValue(mockUser);
                (prisma.subscription.create as any).mockResolvedValue({
                        id: 'sub-new',
                        userId: 'user-new',
                        plan: 'free',
                        status: 'active',
                });

                const token = buildToken({ email: 'new@example.com', name: 'New User' });
                const account = buildAccount({ providerAccountId: 'google-new' });
                const profile = buildProfile({ name: 'New User', email: 'new@example.com' });

                // JWT callback (login)
                const jwtResult = await jwtCallback({ token, account, profile });

                // Verify complete state after login
                expect(jwtResult.userId).toBe('user-new');
                expect(jwtResult.plan).toBe('free');
                expect(jwtResult.accessToken).toBe('google-access-token');
                expect(jwtResult.refreshToken).toBe('google-refresh-token');
                expect(jwtResult.expiresAt).toBeGreaterThan(Date.now());

                // Step 2: Session callback maps the token data
                const session = { user: { email: 'new@example.com' }, expires: '' };
                const sessionResult = await sessionCallback({ session, token: jwtResult });

                expect(sessionResult.userId).toBe('user-new');
                expect(sessionResult.plan).toBe('free');
                expect(sessionResult.accessToken).toBe('google-access-token');
        });

        it('should handle returning user with existing pro subscription', async () => {
                // User already exists with pro plan
                const mockUser = {
                        id: 'user-existing',
                        email: 'pro@example.com',
                        name: 'Pro User',
                        googleId: 'google-pro',
                        subscription: {
                                id: 'sub-existing',
                                userId: 'user-existing',
                                plan: 'pro',
                                status: 'active',
                                stripeCustomerId: 'cus_123',
                        },
                };

                (prisma.user.upsert as any).mockResolvedValue(mockUser);

                const token = buildToken({ email: 'pro@example.com', name: 'Pro User' });
                const account = buildAccount({ providerAccountId: 'google-pro' });
                const profile = buildProfile({ name: 'Pro User', email: 'pro@example.com' });

                // JWT callback (login)
                const jwtResult = await jwtCallback({ token, account, profile });

                // Pro plan should be preserved
                expect(jwtResult.userId).toBe('user-existing');
                expect(jwtResult.plan).toBe('pro');
                // No subscription should be created
                expect(prisma.subscription.create).not.toHaveBeenCalled();

                // Session should reflect pro plan
                const session = { user: { email: 'pro@example.com' }, expires: '' };
                const sessionResult = await sessionCallback({ session, token: jwtResult });
                expect(sessionResult.plan).toBe('pro');
        });
});
