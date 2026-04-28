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
    <html lang="nl">
      <body
        className={`${nunito.className} ${nunito.variable} bg-slate-50 text-slate-900 antialiased`}
      >
        <Providers>
          <main className="relative mx-auto min-h-screen max-w-md overflow-x-hidden bg-slate-50">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
