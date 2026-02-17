import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        // Save the new access token every sign‑in
        token.accessToken = account.access_token;

        // Google only returns refresh_token the very first time the user consents.
        // Keep the previous one if Google doesn't send a new one.
        if (account.refresh_token) {
          token.refreshToken = account.refresh_token;
        }

        // account.expires_at is in seconds; fall back to 1 hour if missing
        token.expiresAt =
          (account.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000;

        // ── UPSERT user in the database ──────────────────
        // Runs on every sign-in; creates the user row if it doesn't exist yet,
        // and updates name/image if the Google profile changed.
        if (token.email) {
          try {
            const dbUser = await prisma.user.upsert({
              where: { email: token.email },
              update: {
                name: token.name ?? profile?.name,
                image: token.picture as string | undefined,
                googleId: account.providerAccountId,
              },
              create: {
                email: token.email,
                name: token.name ?? profile?.name,
                image: token.picture as string | undefined,
                googleId: account.providerAccountId,
              },
              include: { subscription: true },
            });

            token.userId = dbUser.id;

            // Ensure the user has a subscription row (default: free plan)
            if (!dbUser.subscription) {
              await prisma.subscription.create({
                data: {
                  userId: dbUser.id,
                  plan: "free",
                  status: "active",
                },
              });
              token.plan = "free";
            } else {
              token.plan = dbUser.subscription.plan;
            }
          } catch (err) {
            console.error("Failed to upsert user in database:", err);
          }
        }
      }

      // ── AUTO‑REFRESH ──────────────────────────────
      // Only attempt a refresh if we actually have a refreshToken
      if (
        token.refreshToken &&
        Date.now() > (token.expiresAt ?? 0) - 5 * 60_000
      ) {
        try {
          const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              refresh_token: token.refreshToken!,
              grant_type: "refresh_token",
            }),
          });
          // receive the response
          const data = await res.json();
          // If the response is not OK, log the error and return the token with an error
          if (!res.ok) {
            console.error("Google refresh failed");
            token.error = data.error ?? "RefreshFailed";
            // Safeguard: wipe the dead tokens so your API knows it has to re-login
            delete token.accessToken;
            delete token.refreshToken;
            delete token.expiresAt;
            return token;
          }
          token.accessToken = data.access_token;
          token.expiresAt = Date.now() + data.expires_in * 1000;
        } catch {
          console.error("Failed to refresh access token");
          token.error = "RefreshAccessTokenError";
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.userId = token.userId as string;
      session.plan = token.plan as string;
      return session;
    },
    async redirect({ baseUrl }) {
      return baseUrl + "/dashboard";
    },
  },
};
