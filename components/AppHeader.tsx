"use client";

import ThemePicker from "@/components/ThemePicker";
import { useTheme } from "@/hooks/useTheme";
import { motion } from "framer-motion";
import Image from "next/image";

export default function AppHeader() {
  const { theme } = useTheme();

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="sticky top-0 z-50 px-4 py-3 backdrop-blur-md border-b"
      style={{ 
        background: theme.navBg,
        borderColor: theme.navBorder,
      }}
    >
      <div className="flex items-center justify-between">
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <Image
            src="/logo-snelvink.png"
            alt="Snelvink"
            width={48}
            height={48}
            priority
            className="h-10 w-10 shrink-0 select-none"
          />
          <div className="flex items-baseline gap-0.5">
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: theme.fg }}
            >
              Snel
            </span>
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: theme.muted }}
            >
              vink
            </span>
          </div>
        </motion.div>

        <ThemePicker />
      </div>
    </motion.header>
  );
}
