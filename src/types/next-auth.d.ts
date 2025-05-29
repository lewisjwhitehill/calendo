// src/types/next-auth.d.ts

import "next-auth";
import "next-auth/jwt";

/* ----- Session / User augments ----- */
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    expiresAt?: number;   // optional, but handy
    error?: string;
  }
  interface User {
    accessToken?: string;
  }
}

/* ----- JWT augments ----- */
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}