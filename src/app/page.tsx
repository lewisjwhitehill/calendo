import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-8 pt-64 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex flex-col items-center justify-start gap-4">
        <h1 className="text-4xl font-bold">Calendo</h1>
        <p className="text-lg text-center">Sign in with Google to get started.</p>
      </div>
      <div className="flex flex-col items-center justify-start gap-4">
        <a href="/api/auth/signin" className="btn btn-primary">
          Sign In
        </a>
      </div>
    </div>
  );
}
