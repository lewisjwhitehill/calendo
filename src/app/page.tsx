'use client';

import { signIn, useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          {/* Tailwind spinner */}
          <svg
            className="h-10 w-10 animate-spin text-orange-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
          <span className="text-lg font-medium">Loading…</span>
        </div>
      </div>
    );
  }

  if (session && typeof window !== "undefined") {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-8 pt-64 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex flex-col items-center justify-start gap-4">
        <h1 className="text-4xl font-bold">Welcome to Calendo!</h1>
        <h2 className="text-lg text-center">Fastest way to add to your calendar.</h2>
        <p className="text-lg text-center"></p>
      </div>
      <div className="flex flex-col items-center justify-start gap-4">
      <button onClick={() => signIn("google")} className="px-4 py-2 border-2 border-orange-500 text-orange-500 rounded hover:bg-orange-50">
        Sign in with Google to get started.
      </button>
      </div>
    </div>
  );
}
