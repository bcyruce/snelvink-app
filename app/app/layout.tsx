import type { Metadata } from "next";
import Providers from "../providers";

export const metadata: Metadata = {
  title: "SnelVink App",
  description: "De keuken is open - Jouw digitale HACCP logboek.",
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--theme-bg, #F5F3EF)",
        color: "var(--theme-fg, #1A2520)",
      }}
    >
      <Providers>
        <main
          className="relative mx-auto min-h-screen max-w-md overflow-x-hidden"
          style={{ background: "var(--theme-bg, #F5F3EF)" }}
        >
          {children}
        </main>
      </Providers>
    </div>
  );
}
