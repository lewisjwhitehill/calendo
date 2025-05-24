import { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";


const authOptions: NextAuthOptions = {
    session: {
      strategy: "jwt"
    },
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        authorization: {
            params: {
              scope: "openid email profile https://www.googleapis.com/auth/calendar",
            },
        },
      }),
    ],
    callbacks: {
      async jwt({ token, account }) {
        if (account) {
          token.accessToken = account.access_token;
        }
        return token;
      },
      async session({ session, token }) {
        session.accessToken = token.accessToken as string;
        return session;
      },
      async redirect({ baseUrl }) {
        return baseUrl + "/dashboard";
      }
    }
  };
  

const handler = NextAuth(authOptions);
// Export the handler as named exports for GET and POST HTTP methods
export { handler as GET, handler as POST };