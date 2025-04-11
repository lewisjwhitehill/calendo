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
    }),
  ],

  callbacks: {
    async redirect({ url, baseUrl }) {
        return baseUrl + "/dashboard";  // Send users to a dashboard after login
      }
  }  
};

const handler = NextAuth(authOptions);
// Export the handler as named exports for GET and POST HTTP methods
export { handler as GET, handler as POST };