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
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // 1. FIRST SIGN-IN: stash access + refresh + expiry
    if (account) {
      token.accessToken  = account.access_token;
      token.refreshToken = account.refresh_token;           // ← new
      token.expiresAt    = account.expires_at! * 1000;      // ← new (ms)
    }

    // 2. ON EVERY NEXT INVOCATION: if we’re within 5 min of expiry, refresh
    if (Date.now() > (token.expiresAt ?? 0) - 5 * 60_000) {
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