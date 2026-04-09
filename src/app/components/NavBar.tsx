"use client";

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function NavBar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userImage = session?.user?.image;
  const userName = session?.user?.name;
  const userEmail = session?.user?.email;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <Image src="/images/calendo_logo.png" alt="Calendo Logo" width={26} height={26} />
          <span className="text-base font-semibold tracking-tight text-gray-900">Calendo</span>
        </a>

        {/* Right side: nav links + separator + avatar */}
        <div className="flex items-center gap-1">
          <nav className="flex items-center">
            <a
              href="/about"
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              About
            </a>
            <a
              href="/help"
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Help
            </a>
            <a
              href="/contact"
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Contact
            </a>
          </nav>

          {session?.user && (
            <>
              {/* Separator */}
              <div className="mx-2 h-5 w-px bg-gray-200" />

              {/* Avatar + dropdown */}
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setOpen((prev) => !prev)}
                  className="flex items-center rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                >
                  {userImage ? (
                    <img
                      src={userImage}
                      alt={userName ?? "Avatar"}
                      width={30}
                      height={30}
                      className="rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-orange-500 text-xs font-semibold text-white">
                      {(userName ?? userEmail ?? "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-gray-200 bg-white p-1 shadow-lg ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1">
                    <div className="px-3 py-2.5">
                      {userName && (
                        <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                      )}
                      {userEmail && (
                        <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                      )}
                    </div>
                    <div className="mx-1 border-t border-gray-100" />
                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
