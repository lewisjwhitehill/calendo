import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Image from "next/image";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Calendo",
  description: "Text to calendar web app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <div className="flex flex-col min-h-screen bg-gray-50 text-black">
            <header className="w-full flex items-center justify-between px-8 py-4 bg-gray-100">
              <div className="flex items-center">
                <Image src="/images/calendo_logo.png" alt="Calendo Logo" width={32} height={32} />
                <span className="ml-2 text-xl font-bold text-orange-600">Calendo</span>
              </div>
              <nav className="flex space-x-6">
                <a href="/about" className="text-gray-700 hover:text-orange-600">About</a>
                <a href="/help" className="text-gray-700 hover:text-orange-600">Help</a>
                <a href="/contact" className="text-gray-700 hover:text-orange-600">Contact</a>
              </nav>
            </header>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
