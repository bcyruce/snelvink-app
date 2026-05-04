"use client";

import ThemePicker from "@/components/ThemePicker";
import { useTheme } from "@/hooks/useTheme";
import Image from "next/image";

export default function AppHeader() {
  const { theme } = useTheme();

  return (
    <header
      className="sticky top-0 z-50 px-4 py-3 backdrop-blur-md border-b"
      style={{
        background: theme.primary,
        borderColor: theme.primaryDark,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-snelvink-transparent.png"
            alt="Snelvink"
            width={48}
            height={48}
            priority
            className="h-10 w-10 shrink-0 select-none"
          />
          <div className="flex items-baseline gap-0.5">
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: "#FFFFFF" }}
            >
              Snel
            </span>
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: "rgba(255,255,255,0.78)" }}
            >
              vink
            </span>
          </div>
        </div>

        <ThemePicker />
      </div>
    </header>
  );
}
