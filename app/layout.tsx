import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
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
    <html lang="nl" className="bg-[var(--theme-bg,#F5F3EF)]">
      <body
        className={`${nunito.className} ${nunito.variable} antialiased`}
        style={{ background: "var(--theme-bg, #F5F3EF)", color: "var(--theme-fg, #1A2520)" }}
      >
        <Providers>
          <main className="relative mx-auto min-h-screen max-w-md overflow-x-hidden" style={{ background: "var(--theme-bg, #F5F3EF)" }}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
