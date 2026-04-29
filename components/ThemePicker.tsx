"use client";

import { useRef, useEffect, useState } from "react";
import { useTheme, themes, themeOrder } from "@/hooks/useTheme";

// 扁平化调色盘 SVG 图标
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

// 主题选择弹窗
function ThemePickerPopup({
  onClose,
}: {
  onClose: () => void;
}) {
  const { themeName, setThemeName, paletteColors } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  return (
    <div
      ref={ref}
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
      }}
    >
      {/* 顶部标题行 */}
      <div className="flex items-center gap-1.5 mb-3 px-0.5">
        <PaletteIcon colors={paletteColors} size={14} />
        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.22em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>
          Thema
        </span>
      </div>

      {/* 冷暖色两行 */}
      {(["cool", "warm"] as const).map((temp) => (
        <div key={temp} className="flex gap-2 mb-2 last:mb-0">
          {themeOrder.filter(k => themes[k].temp === temp).map((key) => {
            const th = themes[key];
            const isActive = themeName === key;
            return (
              <button
                key={key}
                onClick={() => { setThemeName(key); onClose(); }}
                title={th.label}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: th.primary,
                  border: isActive
                    ? "2.5px solid rgba(255,255,255,0.9)"
                    : "2.5px solid rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  boxShadow: isActive ? `0 0 0 2px ${th.primary}55` : "none",
                  transition: "border 0.15s, box-shadow 0.15s, transform 0.1s",
                  transform: isActive ? "scale(1.15)" : "scale(1)",
                  flexShrink: 0,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// 调色盘按钮（带弹窗）
export default function ThemePicker() {
  const { paletteColors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
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
        aria-label="Thema wijzigen"
      >
        <PaletteIcon colors={paletteColors} size={24} />
      </button>

      {open && <ThemePickerPopup onClose={() => setOpen(false)} />}
    </div>
  );
}
