"use client";

import { useState } from "react";
import { ClipboardCheck, History, Settings, Thermometer, SprayCan, Package, Plus } from "lucide-react";

type ThemeKey = "forest" | "emerald" | "teal" | "sage" | "navy" | "indigo" | "slate" | "steel";

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
  category: "green" | "blue";
}> = {
  // 绿色系
  forest: {
    name: "森林绿",
    description: "深邃的森林绿，象征新鲜与食品安全，专业可靠",
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
    category: "green",
  },
  emerald: {
    name: "翡翠绿",
    description: "明亮的翡翠绿，清新活力，现代感十足",
    background: "#F0FDF4",
    foreground: "#1F2937",
    primary: "#059669",
    primaryHover: "#10B981",
    primaryBorder: "#047857",
    secondary: "#ECFDF5",
    secondaryBorder: "#D1FAE5",
    accent: "#059669",
    accentBg: "#D1FAE5",
    accentBorder: "#A7F3D0",
    cardBg: "#FFFFFF",
    cardBorder: "#D1FAE5",
    cardBorderBottom: "#A7F3D0",
    navBg: "#FFFFFF",
    navBorder: "#D1FAE5",
    mutedText: "#6B7280",
    neutralBg: "#FFFFFF",
    neutralBorder: "#D1D5DB",
    neutralText: "#374151",
    successBg: "#10B981",
    successBorder: "#059669",
    category: "green",
  },
  teal: {
    name: "青绿色",
    description: "介于蓝绿之间，平静专业，兼具信任感",
    background: "#F0FDFA",
    foreground: "#134E4A",
    primary: "#0D9488",
    primaryHover: "#14B8A6",
    primaryBorder: "#0F766E",
    secondary: "#CCFBF1",
    secondaryBorder: "#99F6E4",
    accent: "#0D9488",
    accentBg: "#CCFBF1",
    accentBorder: "#99F6E4",
    cardBg: "#FFFFFF",
    cardBorder: "#CCFBF1",
    cardBorderBottom: "#99F6E4",
    navBg: "#FFFFFF",
    navBorder: "#CCFBF1",
    mutedText: "#5F7B7A",
    neutralBg: "#FFFFFF",
    neutralBorder: "#CBD5D4",
    neutralText: "#374544",
    successBg: "#10B981",
    successBorder: "#059669",
    category: "green",
  },
  sage: {
    name: "鼠尾草绿",
    description: "柔和的灰绿色，自然舒适，低调优雅",
    background: "#F8FAF8",
    foreground: "#2D3A2D",
    primary: "#5F7A5F",
    primaryHover: "#6B8A6B",
    primaryBorder: "#4A654A",
    secondary: "#F0F4F0",
    secondaryBorder: "#DCE4DC",
    accent: "#5F7A5F",
    accentBg: "#E8EFE8",
    accentBorder: "#C8D8C8",
    cardBg: "#FFFFFF",
    cardBorder: "#DCE4DC",
    cardBorderBottom: "#C8D8C8",
    navBg: "#FFFFFF",
    navBorder: "#DCE4DC",
    mutedText: "#6B7A6B",
    neutralBg: "#FFFFFF",
    neutralBorder: "#C8D4C8",
    neutralText: "#3D4A3D",
    successBg: "#5F9A5F",
    successBorder: "#4A854A",
    category: "green",
  },
  // 蓝色系
  navy: {
    name: "海军蓝",
    description: "深邃海军蓝，专业权威，企业级品质感",
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
    category: "blue",
  },
  indigo: {
    name: "靛蓝色",
    description: "深邃的靛蓝，沉稳大气，科技感强",
    background: "#F5F7FF",
    foreground: "#1E1B4B",
    primary: "#4338CA",
    primaryHover: "#4F46E5",
    primaryBorder: "#3730A3",
    secondary: "#EEF2FF",
    secondaryBorder: "#E0E7FF",
    accent: "#4338CA",
    accentBg: "#E0E7FF",
    accentBorder: "#C7D2FE",
    cardBg: "#FFFFFF",
    cardBorder: "#E0E7FF",
    cardBorderBottom: "#C7D2FE",
    navBg: "#FFFFFF",
    navBorder: "#E0E7FF",
    mutedText: "#6366A0",
    neutralBg: "#FFFFFF",
    neutralBorder: "#C7D2FE",
    neutralText: "#3730A3",
    successBg: "#059669",
    successBorder: "#047857",
    category: "blue",
  },
  slate: {
    name: "岩石灰蓝",
    description: "低饱和度蓝灰，极简现代，专注于内容",
    background: "#F8FAFC",
    foreground: "#0F172A",
    primary: "#475569",
    primaryHover: "#64748B",
    primaryBorder: "#334155",
    secondary: "#F1F5F9",
    secondaryBorder: "#E2E8F0",
    accent: "#475569",
    accentBg: "#F1F5F9",
    accentBorder: "#E2E8F0",
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
    category: "blue",
  },
  steel: {
    name: "钢青蓝",
    description: "冷静的钢蓝色，工业感强，可靠稳重",
    background: "#F4F7FA",
    foreground: "#1A2A3A",
    primary: "#3D5A80",
    primaryHover: "#4D6A90",
    primaryBorder: "#2D4A70",
    secondary: "#E8EEF4",
    secondaryBorder: "#D0DCE8",
    accent: "#3D5A80",
    accentBg: "#E0EAF4",
    accentBorder: "#B8CCE0",
    cardBg: "#FFFFFF",
    cardBorder: "#D0DCE8",
    cardBorderBottom: "#B8CCE0",
    navBg: "#FFFFFF",
    navBorder: "#D0DCE8",
    mutedText: "#5A7A9A",
    neutralBg: "#FFFFFF",
    neutralBorder: "#B8CCE0",
    neutralText: "#2A4A6A",
    successBg: "#059669",
    successBorder: "#047857",
    category: "blue",
  },
};

const modules = [
  { name: "Koel Temp", icon: Thermometer },
  { name: "Kern Temp", icon: Thermometer },
  { name: "Schoonmaak", icon: SprayCan },
  { name: "Ontvangst", icon: Package },
];

const greenThemes: ThemeKey[] = ["forest", "emerald", "teal", "sage"];
const blueThemes: ThemeKey[] = ["navy", "indigo", "slate", "steel"];

export default function DesignPreview() {
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("forest");
  const theme = themes[activeTheme];

  return (
    <div className="min-h-screen pb-8" style={{ background: theme.background, color: theme.foreground }}>
      {/* Theme Selector */}
      <div className="sticky top-0 z-50 border-b-2 px-4 py-4" style={{ background: theme.navBg, borderColor: theme.navBorder }}>
        <h2 className="mb-4 text-center text-base font-black" style={{ color: theme.foreground }}>
          选择配色方案
        </h2>
        
        {/* Green Themes */}
        <div className="mb-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: theme.mutedText }}>
            绿色系
          </p>
          <div className="grid grid-cols-4 gap-2">
            {greenThemes.map((key) => (
              <button
                key={key}
                onClick={() => setActiveTheme(key)}
                className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-b-4 px-2 py-2.5 transition-all"
                style={{
                  background: activeTheme === key ? themes[key].primary : theme.neutralBg,
                  borderColor: activeTheme === key ? themes[key].primaryBorder : theme.neutralBorder,
                }}
              >
                <div 
                  className="h-6 w-6 rounded-full border-2"
                  style={{ 
                    background: themes[key].primary, 
                    borderColor: themes[key].primaryBorder 
                  }}
                />
                <span 
                  className="text-[10px] font-black leading-tight"
                  style={{ color: activeTheme === key ? "#FFFFFF" : theme.neutralText }}
                >
                  {themes[key].name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Blue Themes */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: theme.mutedText }}>
            蓝色系
          </p>
          <div className="grid grid-cols-4 gap-2">
            {blueThemes.map((key) => (
              <button
                key={key}
                onClick={() => setActiveTheme(key)}
                className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-b-4 px-2 py-2.5 transition-all"
                style={{
                  background: activeTheme === key ? themes[key].primary : theme.neutralBg,
                  borderColor: activeTheme === key ? themes[key].primaryBorder : theme.neutralBorder,
                }}
              >
                <div 
                  className="h-6 w-6 rounded-full border-2"
                  style={{ 
                    background: themes[key].primary, 
                    borderColor: themes[key].primaryBorder 
                  }}
                />
                <span 
                  className="text-[10px] font-black leading-tight"
                  style={{ color: activeTheme === key ? "#FFFFFF" : theme.neutralText }}
                >
                  {themes[key].name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Current Theme Description */}
        <div className="mt-4 rounded-xl border-2 p-3" style={{ background: theme.accentBg, borderColor: theme.accentBorder }}>
          <p className="text-center text-sm font-bold" style={{ color: theme.primary }}>
            {theme.name}
          </p>
          <p className="mt-1 text-center text-xs" style={{ color: theme.mutedText }}>
            {theme.description}
          </p>
        </div>
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
