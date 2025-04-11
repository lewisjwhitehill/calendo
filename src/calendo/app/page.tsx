import Image from "next/image";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold">Calendo</h1>
        <p className="text-lg text-center">Your calendar, your way.</p>
      </div>
      <div className="flex flex-col items-center justify-center gap-4">
        <Image
          src="/calendo.png"
          alt="Calendo Logo"
          width={200}
          height={200}
          priority
        />
        <a href="/api/auth/signin" className="btn btn-primary">
          Sign in with Google
        </a>
      </div>
    </div>
  );
}
