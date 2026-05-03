"use client";

import ThemePicker from "@/components/ThemePicker";
import { useTheme } from "@/hooks/useTheme";
import { motion } from "framer-motion";
import Image from "next/image";

export default function AppHeader() {
  const { theme } = useTheme();

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="px-5 pt-2 pb-2"
      style={{ background: theme.primary }}
    >
      <div className="flex items-center justify-between">
        <motion.div
          className="flex items-center gap-2.5"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
        >
          <motion.div
            whileHover={{ rotate: -10, scale: 1.06 }}
            transition={{ type: "spring", stiffness: 360, damping: 16 }}
          >
            <Image
              src="/logo-snelvink.png"
              alt="Snelvink"
              width={72}
              height={72}
              priority
              className="h-16 w-16 shrink-0 select-none"
            />
          </motion.div>
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
        </motion.div>

        <ThemePicker />
      </div>
    </motion.header>
  );
}
