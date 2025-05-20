import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-8 pt-64 pb-20 gap-8 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex flex-col items-center justify-start gap-4">
        <h1 className="text-4xl font-bold">Welcome to Calendo!</h1>
        <h2 className="text-lg text-center">Fastest way to add to your calendar.</h2>
        <p className="text-lg text-center"></p>
      </div>
      <div className="flex flex-col items-center justify-start gap-4">
      <a href="/api/auth/signin" className="px-4 py-2 border-2 border-orange-500 text-orange-500 rounded hover:bg-orange-50">
        Sign in with Google to get started.
      </a>
      </div>
    </div>
  );
}
