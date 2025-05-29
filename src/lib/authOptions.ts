import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
    async jwt({ token, account }) {
      if (account) {
        // Save the new access token every sign‑in
        token.accessToken = account.access_token;

        // Google only returns refresh_token the very first time the user consents.
        // Keep the previous one if Google doesn't send a new one.
        if (account.refresh_token) {
          token.refreshToken = account.refresh_token;
        }

        // account.expires_at is in seconds; fall back to 1 hour if missing
        token.expiresAt =
          (account.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000;
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
              client_id:     process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              refresh_token: token.refreshToken!,
              grant_type:    "refresh_token",
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            console.error("Google refresh failed", data);
            token.error = data.error ?? "RefreshFailed";
            return token;
          }
          token.accessToken = data.access_token;
          token.expiresAt   = Date.now() + data.expires_in * 1000;
        } catch (err) {
          console.error("Failed to refresh access token", err);
          token.error = "RefreshAccessTokenError";
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
    async redirect({ baseUrl }) {
      return baseUrl + "/dashboard";
    },
  },
};