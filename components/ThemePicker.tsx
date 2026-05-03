"use client";

import { useRef, useEffect, useState } from "react";
import { useTheme, themes, themeOrder } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { AnimatePresence, motion } from "framer-motion";
import { popoverVariants } from "@/lib/uiMotion";

export function PaletteIcon({ colors, size = 22 }: { colors: string[]; size?: number }) {
  const slices = [
    { d: "M12 12 L12 2 A10 10 0 0 1 20.66 7 Z",       fill: colors[0] ?? "#ccc" },
    { d: "M12 12 L20.66 7 A10 10 0 0 1 20.66 17 Z",   fill: colors[1] ?? "#ccc" },
    { d: "M12 12 L20.66 17 A10 10 0 0 1 12 22 Z",     fill: colors[2] ?? "#ccc" },
    { d: "M12 12 L12 22 A10 10 0 0 1 3.34 17 Z",      fill: colors[3] ?? "#ccc" },
    { d: "M12 12 L3.34 17 A10 10 0 0 1 3.34 7 Z",     fill: colors[4] ?? "#ccc" },
    { d: "M12 12 L3.34 7 A10 10 0 0 1 12 2 Z",        fill: colors[5] ?? "#ccc" },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {slices.map((s, i) => <path key={i} d={s.d} fill={s.fill} />)}
      <circle cx="12" cy="12" r="3.5" fill="rgba(255,255,255,0.92)" />
    </svg>
  );
}

function ThemePickerPopup({
  onClose,
}: {
  onClose: () => void;
}) {
  const { themeName, setThemeName, paletteColors } = useTheme();
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      variants={popoverVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 0,
        zIndex: 200,
        background: "rgba(18,22,20,0.97)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        padding: "12px 12px 10px",
        backdropFilter: "blur(24px)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        transformOrigin: "top right",
      }}
    >
      <div className="flex items-center gap-1.5 mb-3 px-0.5">
        <PaletteIcon colors={paletteColors} size={14} />
        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.22em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
          {t("theme")}
        </span>
      </div>

      {(["cool", "warm"] as const).map((temp, rowIndex) => (
        <motion.div
          key={temp}
          className="flex gap-2 mb-2 last:mb-0"
          initial="initial"
          animate="animate"
          variants={{
            initial: {},
            animate: { transition: { staggerChildren: 0.03, delayChildren: rowIndex * 0.05 } },
          }}
        >
          {themeOrder.filter(k => themes[k].temp === temp).map((key) => {
            const th = themes[key];
            const isActive = themeName === key;
            return (
              <motion.button
                key={key}
                type="button"
                onClick={() => { setThemeName(key); onClose(); }}
                title={th.label}
                variants={{
                  initial: { opacity: 0, scale: 0.5, y: 6 },
                  animate: { opacity: 1, scale: isActive ? 1.15 : 1, y: 0 },
                }}
                whileHover={{ scale: isActive ? 1.2 : 1.12, rotate: 8 }}
                whileTap={{ scale: 0.9, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                animate={{ scale: isActive ? 1.15 : 1 }}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: th.primary,
                  border: isActive
                    ? "2.5px solid rgba(255,255,255,0.9)"
                    : "2.5px solid rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  boxShadow: isActive ? `0 0 0 2px ${th.primary}55` : "none",
                  flexShrink: 0,
                }}
              />
            );
          })}
        </motion.div>
      ))}
    </motion.div>
  );
}

export default function ThemePicker() {
  const { paletteColors } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <motion.button
        type="button"
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.12, rotate: 12 }}
        whileTap={{ scale: 0.92, rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
        style={{
          padding: 4,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: open ? 1 : 0.75,
          transition: "opacity 0.15s",
        }}
        aria-label={t("changeTheme")}
      >
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          style={{ display: "inline-flex" }}
        >
          <PaletteIcon colors={paletteColors} size={24} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && <ThemePickerPopup onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
