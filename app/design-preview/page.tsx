"use client";

import { useState } from "react";
import { ClipboardCheck, History, Settings, Thermometer, SprayCan, Package, Plus } from "lucide-react";

type ThemeKey = "forest" | "navy" | "warm";

const themes: Record<ThemeKey, {
  name: string;
  description: string;
  background: string;
  foreground: string;
  primary: string;
  primaryHover: string;
  primaryBorder: string;
  secondary: string;
  secondaryBorder: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  cardBg: string;
  cardBorder: string;
  cardBorderBottom: string;
  navBg: string;
  navBorder: string;
  mutedText: string;
  neutralBg: string;
  neutralBorder: string;
  neutralText: string;
  successBg: string;
  successBorder: string;
}> = {
  forest: {
    name: "方案 A: 森林绿",
    description: "深绿色主色调，象征新鲜、食品安全和专业性，搭配温暖的米色背景",
    background: "#F5F3EF",
    foreground: "#1F2937",
    primary: "#166534",
    primaryHover: "#15803D",
    primaryBorder: "#14532D",
    secondary: "#F9FAFB",
    secondaryBorder: "#E5E7EB",
    accent: "#166534",
    accentBg: "#DCFCE7",
    accentBorder: "#BBF7D0",
    cardBg: "#FFFFFF",
    cardBorder: "#E5E7EB",
    cardBorderBottom: "#D1D5DB",
    navBg: "#FFFFFF",
    navBorder: "#E5E7EB",
    mutedText: "#6B7280",
    neutralBg: "#FFFFFF",
    neutralBorder: "#D1D5DB",
    neutralText: "#374151",
    successBg: "#10B981",
    successBorder: "#059669",
  },
  navy: {
    name: "方案 B: 海军蓝",
    description: "深海军蓝主色调，搭配极简的纯白/浅灰背景，专业、权威且现代",
    background: "#F8FAFC",
    foreground: "#0F172A",
    primary: "#1E3A5F",
    primaryHover: "#2E4A6F",
    primaryBorder: "#0F2A4F",
    secondary: "#F1F5F9",
    secondaryBorder: "#E2E8F0",
    accent: "#1E3A5F",
    accentBg: "#E0E7EF",
    accentBorder: "#CBD5E1",
    cardBg: "#FFFFFF",
    cardBorder: "#E2E8F0",
    cardBorderBottom: "#CBD5E1",
    navBg: "#FFFFFF",
    navBorder: "#E2E8F0",
    mutedText: "#64748B",
    neutralBg: "#FFFFFF",
    neutralBorder: "#CBD5E1",
    neutralText: "#334155",
    successBg: "#059669",
    successBorder: "#047857",
  },
  warm: {
    name: "方案 C: 暖橙色",
    description: "温暖的橙色/琥珀色主色调，搭配浅米色背景，友好、活力且符合餐饮行业氛围",
    background: "#FFFBF5",
    foreground: "#292524",
    primary: "#C2410C",
    primaryHover: "#EA580C",
    primaryBorder: "#9A3412",
    secondary: "#FEF7ED",
    secondaryBorder: "#FED7AA",
    accent: "#C2410C",
    accentBg: "#FFF7ED",
    accentBorder: "#FDBA74",
    cardBg: "#FFFFFF",
    cardBorder: "#F5D0B0",
    cardBorderBottom: "#E5B090",
    navBg: "#FFFFFF",
    navBorder: "#F5D0B0",
    mutedText: "#78716C",
    neutralBg: "#FFFFFF",
    neutralBorder: "#D6D3D1",
    neutralText: "#44403C",
    successBg: "#059669",
    successBorder: "#047857",
  },
};

const modules = [
  { name: "Koel Temp", icon: Thermometer },
  { name: "Kern Temp", icon: Thermometer },
  { name: "Schoonmaak", icon: SprayCan },
  { name: "Ontvangst", icon: Package },
];

export default function DesignPreview() {
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("forest");
  const theme = themes[activeTheme];

  return (
    <div className="min-h-screen pb-8" style={{ background: theme.background, color: theme.foreground }}>
      {/* Theme Selector */}
      <div className="sticky top-0 z-50 border-b-2 px-4 py-4" style={{ background: theme.navBg, borderColor: theme.navBorder }}>
        <h2 className="mb-3 text-center text-sm font-bold" style={{ color: theme.mutedText }}>
          选择配色方案
        </h2>
        <div className="flex gap-2 overflow-x-auto">
          {(Object.keys(themes) as ThemeKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTheme(key)}
              className="flex-1 rounded-xl border-2 border-b-4 px-3 py-2.5 text-xs font-black transition-all"
              style={{
                background: activeTheme === key ? themes[key].primary : theme.neutralBg,
                borderColor: activeTheme === key ? themes[key].primaryBorder : theme.neutralBorder,
                color: activeTheme === key ? "#FFFFFF" : theme.neutralText,
              }}
            >
              {themes[key].name.split(":")[0]}
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-xs" style={{ color: theme.mutedText }}>
          {theme.description}
        </p>
      </div>

      {/* App Preview */}
      <section className="px-5 pt-6">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-xs font-black uppercase tracking-[0.2em]"
              style={{ color: theme.accent }}
            >
              HACCP
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight" style={{ color: theme.foreground }}>
              SnelVink
            </h1>
          </div>

          <button
            className="shrink-0 rounded-2xl border-2 border-b-4 px-4 py-2.5 text-sm font-black transition-colors"
            style={{
              background: theme.neutralBg,
              borderColor: theme.neutralBorder,
              color: theme.neutralText,
            }}
          >
            Wijzigen
          </button>
        </header>

        {/* Module Grid */}
        <div className="grid grid-cols-2 gap-4">
          {modules.map((module, idx) => (
            <div
              key={idx}
              className="flex min-h-[150px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-b-4 px-4 text-center"
              style={{
                background: theme.cardBg,
                borderColor: theme.cardBorder,
                borderBottomColor: theme.cardBorderBottom,
              }}
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-b-4"
                style={{
                  background: theme.accentBg,
                  borderColor: theme.accentBorder,
                }}
              >
                <module.icon
                  className="h-8 w-8"
                  strokeWidth={2.5}
                  style={{ color: theme.accent }}
                />
              </div>
              <span className="text-sm font-black leading-tight" style={{ color: theme.foreground }}>
                {module.name}
              </span>
            </div>
          ))}
        </div>

        {/* Add Button */}
        <button
          className="mt-4 flex min-h-[80px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-b-4 py-4 text-base font-black text-white transition-colors"
          style={{
            background: theme.primary,
            borderColor: theme.primaryBorder,
          }}
        >
          <Plus className="h-7 w-7" strokeWidth={2.75} />
          Toevoegen
        </button>

        {/* Sample Buttons Row */}
        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.mutedText }}>
            按钮样式预览
          </h3>
          <div className="flex gap-3">
            <button
              className="flex-1 rounded-2xl border-2 border-b-4 px-4 py-3 text-sm font-black text-white"
              style={{ background: theme.primary, borderColor: theme.primaryBorder }}
            >
              主要按钮
            </button>
            <button
              className="flex-1 rounded-2xl border-2 border-b-4 px-4 py-3 text-sm font-black text-white"
              style={{ background: theme.successBg, borderColor: theme.successBorder }}
            >
              成功按钮
            </button>
          </div>
          <div className="flex gap-3">
            <button
              className="flex-1 rounded-2xl border-2 border-b-4 px-4 py-3 text-sm font-black"
              style={{ background: theme.neutralBg, borderColor: theme.neutralBorder, color: theme.neutralText }}
            >
              中性按钮
            </button>
            <button
              className="flex-1 rounded-2xl border-2 border-b-4 px-4 py-3 text-sm font-black text-white"
              style={{ background: "#DC2626", borderColor: "#B91C1C" }}
            >
              危险按钮
            </button>
          </div>
        </div>
      </section>

      {/* Bottom Nav Preview */}
      <nav
        className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t-2"
        style={{ background: theme.navBg, borderColor: theme.navBorder }}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around gap-2 px-3 pb-4 pt-3">
          {[
            { icon: ClipboardCheck, label: "Taken", active: true },
            { icon: History, label: "Geschiedenis", active: false },
            { icon: Settings, label: "Instellingen", active: false },
          ].map((tab, idx) => (
            <button
              key={idx}
              className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 border-b-4 px-2 py-2 text-xs font-black"
              style={{
                background: tab.active ? theme.primary : theme.neutralBg,
                borderColor: tab.active ? theme.primaryBorder : theme.neutralBorder,
                color: tab.active ? "#FFFFFF" : theme.neutralText,
              }}
            >
              <tab.icon className="h-5 w-5 shrink-0" strokeWidth={tab.active ? 2.5 : 2.25} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Color Palette Display */}
      <section className="mt-8 px-5 pb-32">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: theme.mutedText }}>
          色彩面板
        </h3>
        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className="h-12 w-12 rounded-lg border" style={{ background: theme.primary, borderColor: theme.primaryBorder }} />
            <span className="text-[10px] font-bold" style={{ color: theme.mutedText }}>主色</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="h-12 w-12 rounded-lg border" style={{ background: theme.accentBg, borderColor: theme.accentBorder }} />
            <span className="text-[10px] font-bold" style={{ color: theme.mutedText }}>强调背景</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="h-12 w-12 rounded-lg border" style={{ background: theme.cardBg, borderColor: theme.cardBorder }} />
            <span className="text-[10px] font-bold" style={{ color: theme.mutedText }}>卡片</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="h-12 w-12 rounded-lg border" style={{ background: theme.background, borderColor: theme.navBorder }} />
            <span className="text-[10px] font-bold" style={{ color: theme.mutedText }}>背景</span>
          </div>
        </div>
      </section>
    </div>
  );
}
