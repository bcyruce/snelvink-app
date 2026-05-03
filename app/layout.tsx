import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Snelvink",
    default: "Snelvink - Digital HACCP & Food Safety",
  },
  description:
    "Digitize your HACCP compliance. Save time on temperature checks, cleaning schedules, and deliveries.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2D5C3C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth bg-white">
      <body
        className={`${inter.className} ${inter.variable} antialiased`}
        style={{ background: "#FAFAFA", color: "#171717" }}
      >
        {children}
      </body>
    </html>
  );
}
