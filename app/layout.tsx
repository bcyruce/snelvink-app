import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

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
      <body className="bg-gray-100 text-gray-900 antialiased">
        <Providers>
          <main className="max-w-md mx-auto min-h-screen bg-white shadow-xl relative overflow-x-hidden">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
