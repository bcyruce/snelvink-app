import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SnelVink",
  description: "De keuken is open.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        className={`${inter.variable} bg-[#F7F9FC] text-slate-900 antialiased`}
      >
        <Providers>
          <main className="relative mx-auto min-h-screen max-w-md overflow-x-hidden bg-[#F7F9FC]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
