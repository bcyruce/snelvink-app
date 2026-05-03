"use client";

import ThemePicker from "@/components/ThemePicker";
import { useTheme } from "@/hooks/useTheme";
import Image from "next/image";

export default function AppHeader() {
  const { theme } = useTheme();

  return (
    <header
      className="px-5 pt-3 pb-3"
      style={{ background: theme.primary }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo-snelvink.png"
            alt="Snelvink"
            width={48}
            height={48}
            priority
            className="h-12 w-12 shrink-0 select-none"
          />
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "0.06em",
              lineHeight: 1,
              fontFamily: "'Trebuchet MS', sans-serif",
              textTransform: "uppercase",
            }}
          >
            SNEL
            <span style={{ opacity: 0.5, marginLeft: "0.1em" }}>VINK</span>
          </div>
        </div>

        <ThemePicker />
      </div>
    </header>
  );
}
