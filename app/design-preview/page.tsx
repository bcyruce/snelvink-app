"use client";

import { useState } from "react";
import {
  ClipboardCheck, History, Settings, Thermometer, SprayCan,
  Package, Plus, Check, X, Trash2, ChevronRight,
} from "lucide-react";

// 松针绿系统色
const pine = {
  primary:      "#3D5C45",
  primaryDark:  "#2D4A35",
  primaryLight: "#4A6B52",
  bg:           "#ECF0EC",
  bgAlt:        "#E2EAE4",
  fg:           "#1A2B1E",
  muted:        "#5A7060",
  accentBg:     "#D6E4DA",
  cardBorder:   "rgba(255,255,255,0.55)",
  success:      "#3D7A52",
  successDark:  "#2D6040",
  danger:       "#A63D3D",
  dangerDark:   "#8B2E2E",
};

// ---- 三种玻璃拟态子方案 ----
type Variant = "A" | "B" | "C";

interface VariantConfig {
  label: string;
  tagline: string;
  // 背景
  pageBackground: string;
  // 按钮
  btnPrimary: React.CSSProperties;
  btnPrimaryBorderRadius: string;
  btnSuccess: React.CSSProperties;
  btnNeutral: React.CSSProperties;
  btnDanger: React.CSSProperties;
  // 卡片
  cardStyle: React.CSSProperties;
  cardRadius: string;
  // 图标容器
  iconStyle: React.CSSProperties;
  iconRadius: string;
  // 导航
  navBg: string;
  navItemActive: React.CSSProperties;
  navItemInactive: React.CSSProperties;
  navItemRadius: string;
}

const variants: Record<Variant, VariantConfig> = {
  A: {
    label: "方案 A — 柔光磨砂",
    tagline: "圆润大按钮，白色磨砂卡片，轻盈层次感",
    pageBackground: `linear-gradient(160deg, #E2EDE5 0%, #D4E8D8 40%, #C8E0D0 100%)`,
    btnPrimary: {
      background: `linear-gradient(170deg, ${pine.primaryLight} 0%, ${pine.primary} 60%, ${pine.primaryDark} 100%)`,
      border: "1px solid rgba(255,255,255,0.3)",
      color: "#fff",
      borderRadius: "18px",
      boxShadow: `0 6px 20px ${pine.primary}50, 0 1px 0 rgba(255,255,255,0.25) inset`,
    },
    btnPrimaryBorderRadius: "18px",
    btnSuccess: {
      background: `linear-gradient(170deg, #4A9466 0%, ${pine.success} 100%)`,
      border: "1px solid rgba(255,255,255,0.25)",
      color: "#fff",
      borderRadius: "18px",
      boxShadow: `0 4px 14px ${pine.success}40`,
    },
    btnNeutral: {
      background: "rgba(255,255,255,0.6)",
      border: "1px solid rgba(255,255,255,0.7)",
      color: pine.fg,
      borderRadius: "18px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
      backdropFilter: "blur(10px)",
    },
    btnDanger: {
      background: `linear-gradient(170deg, #C44F4F 0%, ${pine.danger} 100%)`,
      border: "1px solid rgba(255,255,255,0.2)",
      color: "#fff",
      borderRadius: "18px",
      boxShadow: `0 4px 14px ${pine.danger}40`,
    },
    cardStyle: {
      background: "rgba(255,255,255,0.6)",
      border: "1px solid rgba(255,255,255,0.7)",
      backdropFilter: "blur(16px)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.8) inset",
      borderRadius: "20px",
    },
    cardRadius: "20px",
    iconStyle: {
      background: "rgba(255,255,255,0.7)",
      border: "1px solid rgba(255,255,255,0.8)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    },
    iconRadius: "14px",
    navBg: "rgba(255,255,255,0.75)",
    navItemActive: {
      background: `linear-gradient(170deg, ${pine.primaryLight} 0%, ${pine.primaryDark} 100%)`,
      border: "1px solid rgba(255,255,255,0.25)",
      color: "#fff",
      borderRadius: "14px",
      boxShadow: `0 4px 14px ${pine.primary}40`,
    },
    navItemInactive: {
      background: "rgba(255,255,255,0.4)",
      border: "1px solid rgba(255,255,255,0.5)",
      color: pine.muted,
      borderRadius: "14px",
    },
    navItemRadius: "14px",
  },

  B: {
    label: "方案 B — 深色磨砂",
    tagline: "深绿沉底，半透明卡片，边框明显，质感厚重",
    pageBackground: `linear-gradient(160deg, #1E3226 0%, #243D2C 40%, #1A2E22 100%)`,
    btnPrimary: {
      background: `rgba(61,92,69,0.9)`,
      border: "1px solid rgba(255,255,255,0.18)",
      color: "#fff",
      borderRadius: "14px",
      backdropFilter: "blur(12px)",
      boxShadow: `0 4px 20px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.12) inset`,
    },
    btnPrimaryBorderRadius: "14px",
    btnSuccess: {
      background: "rgba(61,122,82,0.85)",
      border: "1px solid rgba(255,255,255,0.15)",
      color: "#fff",
      borderRadius: "14px",
      backdropFilter: "blur(8px)",
      boxShadow: "0 3px 14px rgba(0,0,0,0.3)",
    },
    btnNeutral: {
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.2)",
      color: "rgba(255,255,255,0.8)",
      borderRadius: "14px",
      backdropFilter: "blur(10px)",
    },
    btnDanger: {
      background: "rgba(166,61,61,0.85)",
      border: "1px solid rgba(255,255,255,0.12)",
      color: "#fff",
      borderRadius: "14px",
      backdropFilter: "blur(8px)",
      boxShadow: "0 3px 14px rgba(0,0,0,0.3)",
    },
    cardStyle: {
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.14)",
      backdropFilter: "blur(20px)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.06) inset",
      borderRadius: "16px",
    },
    cardRadius: "16px",
    iconStyle: {
      background: "rgba(255,255,255,0.10)",
      border: "1px solid rgba(255,255,255,0.16)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    },
    iconRadius: "12px",
    navBg: "rgba(20,38,26,0.85)",
    navItemActive: {
      background: "rgba(61,92,69,0.85)",
      border: "1px solid rgba(255,255,255,0.16)",
      color: "#fff",
      borderRadius: "12px",
      backdropFilter: "blur(10px)",
      boxShadow: "0 3px 12px rgba(0,0,0,0.3)",
    },
    navItemInactive: {
      background: "transparent",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "rgba(255,255,255,0.45)",
      borderRadius: "12px",
    },
    navItemRadius: "12px",
  },

  C: {
    label: "方案 C — 霜冰极简",
    tagline: "近白色磨砂，细边框，极简克制，专业感强",
    pageBackground: `linear-gradient(170deg, #EEF3EF 0%, #E5EDE7 50%, #DCE8DF 100%)`,
    btnPrimary: {
      background: pine.primary,
      border: `2px solid ${pine.primaryDark}`,
      color: "#fff",
      borderRadius: "12px",
      boxShadow: `0 2px 0 ${pine.primaryDark}, 0 4px 12px ${pine.primary}30`,
    },
    btnPrimaryBorderRadius: "12px",
    btnSuccess: {
      background: pine.success,
      border: `2px solid ${pine.successDark}`,
      color: "#fff",
      borderRadius: "12px",
      boxShadow: `0 2px 0 ${pine.successDark}`,
    },
    btnNeutral: {
      background: "rgba(255,255,255,0.85)",
      border: "2px solid rgba(200,215,205,0.9)",
      color: pine.fg,
      borderRadius: "12px",
      boxShadow: "0 2px 0 rgba(180,200,186,0.6)",
      backdropFilter: "blur(8px)",
    },
    btnDanger: {
      background: pine.danger,
      border: `2px solid ${pine.dangerDark}`,
      color: "#fff",
      borderRadius: "12px",
      boxShadow: `0 2px 0 ${pine.dangerDark}`,
    },
    cardStyle: {
      background: "rgba(255,255,255,0.75)",
      border: "1.5px solid rgba(210,228,215,0.9)",
      backdropFilter: "blur(12px)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      borderRadius: "14px",
    },
    cardRadius: "14px",
    iconStyle: {
      background: "rgba(214,228,218,0.7)",
      border: "1.5px solid rgba(255,255,255,0.9)",
    },
    iconRadius: "10px",
    navBg: "rgba(245,248,246,0.9)",
    navItemActive: {
      background: pine.primary,
      border: `2px solid ${pine.primaryDark}`,
      color: "#fff",
      borderRadius: "10px",
      boxShadow: `0 2px 0 ${pine.primaryDark}`,
    },
    navItemInactive: {
      background: "transparent",
      border: "none",
      color: pine.muted,
      borderRadius: "10px",
    },
    navItemRadius: "10px",
  },
};

const modules = [
  { name: "Koel Temp", icon: Thermometer },
  { name: "Kern Temp", icon: Thermometer },
  { name: "Schoonmaak", icon: SprayCan },
  { name: "Ontvangst", icon: Package },
];

function PhoneFrame({ v }: { v: VariantConfig; }) {
  const isDark = v.label.includes("深色");
  const textMain = isDark ? "rgba(255,255,255,0.95)" : pine.fg;
  const textMuted = isDark ? "rgba(255,255,255,0.5)" : pine.muted;
  const textLabel = isDark ? "rgba(255,255,255,0.35)" : pine.muted;
  const labelBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(61,92,69,0.08)";
  const labelBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(61,92,69,0.15)";

  return (
    <div
      className="relative w-full overflow-hidden pb-20"
      style={{
        background: v.pageBackground,
        minHeight: 680,
        borderRadius: 28,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: isDark ? "rgba(255,255,255,0.45)" : pine.muted }}>
            HACCP
          </p>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: textMain }}>
            SnelVink
          </h1>
        </div>
        <button
          className="px-3 py-2 text-xs font-black"
          style={v.btnNeutral}
        >
          Wijzigen
        </button>
      </div>

      {/* Module Grid — 单图标框 */}
      <div className="grid grid-cols-2 gap-3 px-5 pt-5">
        {modules.map((mod, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center gap-3 py-6 px-3 text-center"
            style={v.cardStyle}
          >
            {/* 只有一个图标框 */}
            <div
              className="flex h-12 w-12 items-center justify-center"
              style={{ ...v.iconStyle, borderRadius: v.iconRadius }}
            >
              <mod.icon
                className="h-6 w-6"
                strokeWidth={2.5}
                style={{ color: isDark ? "rgba(255,255,255,0.8)" : pine.primary }}
              />
            </div>
            <span className="text-sm font-black leading-tight" style={{ color: textMain }}>
              {mod.name}
            </span>
          </div>
        ))}
      </div>

      {/* Add Button */}
      <div className="px-5 pt-4">
        <button
          className="flex w-full min-h-16 items-center justify-center gap-2 text-sm font-black"
          style={v.btnPrimary}
        >
          <Plus className="h-5 w-5" strokeWidth={2.75} />
          Toevoegen
        </button>
      </div>

      {/* Button Variants */}
      <div className="px-5 pt-5">
        <div
          className="mb-2 inline-block rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
          style={{ background: labelBg, border: `1px solid ${labelBorder}`, color: textLabel }}
        >
          按钮变体
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button className="flex items-center justify-center gap-1.5 py-3.5 text-xs font-black" style={v.btnSuccess}>
            <Check className="h-4 w-4" strokeWidth={3} /> 确认
          </button>
          <button className="flex items-center justify-center gap-1.5 py-3.5 text-xs font-black" style={v.btnDanger}>
            <Trash2 className="h-4 w-4" strokeWidth={2.5} /> 删除
          </button>
          <button className="col-span-2 flex items-center justify-center gap-1.5 py-3.5 text-xs font-black" style={v.btnNeutral}>
            <X className="h-4 w-4" strokeWidth={2.5} /> 取消操作
          </button>
        </div>
      </div>

      {/* Card List Item */}
      <div className="px-5 pt-4">
        <div
          className="mb-2 inline-block rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
          style={{ background: labelBg, border: `1px solid ${labelBorder}`, color: textLabel }}
        >
          列表卡片
        </div>
        <div className="flex items-center gap-3 p-4" style={v.cardStyle}>
          <div className="flex h-11 w-11 items-center justify-center shrink-0" style={{ ...v.iconStyle, borderRadius: v.iconRadius }}>
            <Thermometer className="h-5 w-5" strokeWidth={2.5} style={{ color: isDark ? "rgba(255,255,255,0.8)" : pine.primary }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm" style={{ color: textMain }}>Koelkast #1</p>
            <p className="text-xs mt-0.5" style={{ color: textMuted }}>4.2°C — 10 min geleden</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0" style={{ color: textMuted }} />
        </div>
      </div>

      {/* Bottom Nav */}
      <div
        className="absolute bottom-0 left-0 right-0 border-t"
        style={{
          background: v.navBg,
          borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(210,228,215,0.6)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-stretch gap-2 px-3 pb-5 pt-2.5">
          {[
            { icon: ClipboardCheck, label: "Taken", active: true },
            { icon: History, label: "Geschiedenis", active: false },
            { icon: Settings, label: "Instellingen", active: false },
          ].map((tab, i) => (
            <button
              key={i}
              className="flex flex-1 flex-col items-center justify-center gap-1 min-h-14 text-[10px] font-black"
              style={tab.active ? v.navItemActive : v.navItemInactive}
            >
              <tab.icon className="h-5 w-5" strokeWidth={tab.active ? 2.5 : 2} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DesignPreview() {
  const [active, setActive] = useState<Variant>("A");
  const v = variants[active];

  return (
    <div className="min-h-screen" style={{ background: "#1A1F1B", color: "#fff" }}>
      {/* Top selector */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#1A1F1B]/95 backdrop-blur-sm px-4 pt-4 pb-3">
        <p className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
          玻璃拟态 · 松针绿 · 选择方案
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(["A", "B", "C"] as Variant[]).map((key) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className="rounded-xl border py-3 px-2 text-center transition-all"
              style={{
                background: active === key ? pine.primary : "rgba(255,255,255,0.05)",
                borderColor: active === key ? pine.primaryDark : "rgba(255,255,255,0.1)",
              }}
            >
              <span className="block text-xs font-black" style={{ color: active === key ? "#fff" : "rgba(255,255,255,0.6)" }}>
                方案 {key}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-white/40">{v.tagline}</p>
      </div>

      {/* Phone preview */}
      <div className="px-4 py-6 mx-auto max-w-sm">
        <PhoneFrame v={v} />
      </div>
    </div>
  );
}
