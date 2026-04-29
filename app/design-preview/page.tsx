"use client";

import { useState } from "react";
import { ClipboardCheck, History, Settings, Thermometer, SprayCan, Package, Plus } from "lucide-react";

type ThemeKey =
  | "sage"
  | "steel"
  | "slate-warm"
  | "pine"
  | "pewter"
  | "dusk"
  | "clay"
  | "graphite"
  | "moss"
  | "cadet";

interface Theme {
  name: string;
  tag: string;
  description: string;
  background: string;
  foreground: string;
  primary: string;
  primaryBorder: string;
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
}

const themes: Record<ThemeKey, Theme> = {
  sage: {
    name: "鼠尾草绿",
    tag: "灰绿",
    description: "柔和灰绿，自然克制，低调优雅",
    background: "#F7F8F5",
    foreground: "#2D3A2D",
    primary: "#5F7A5F",
    primaryBorder: "#4A654A",
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
  },
  steel: {
    name: "钢青蓝",
    tag: "钢蓝",
    description: "冷静钢蓝，工业感强，可靠稳重",
    background: "#F4F7FA",
    foreground: "#1A2A3A",
    primary: "#3D5A80",
    primaryBorder: "#2D4A70",
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
  },
  "slate-warm": {
    name: "暖灰石",
    tag: "暖灰",
    description: "带一丝暖意的中性灰，极简克制，百搭专业",
    background: "#F6F5F3",
    foreground: "#282520",
    primary: "#5C5650",
    primaryBorder: "#45413C",
    accentBg: "#EDEAE6",
    accentBorder: "#D4D0CA",
    cardBg: "#FFFFFF",
    cardBorder: "#E0DDD8",
    cardBorderBottom: "#CAC7C0",
    navBg: "#FFFFFF",
    navBorder: "#E0DDD8",
    mutedText: "#7A7570",
    neutralBg: "#FFFFFF",
    neutralBorder: "#D4D0CA",
    neutralText: "#3D3A35",
  },
  pine: {
    name: "松针绿",
    tag: "深绿",
    description: "沉稳的深松绿，带灰调，克制有力",
    background: "#F5F7F5",
    foreground: "#1E2E22",
    primary: "#3D5C45",
    primaryBorder: "#2D4A35",
    accentBg: "#E4EDE6",
    accentBorder: "#BDD0C2",
    cardBg: "#FFFFFF",
    cardBorder: "#D4E0D8",
    cardBorderBottom: "#BDCEC2",
    navBg: "#FFFFFF",
    navBorder: "#D4E0D8",
    mutedText: "#5A7060",
    neutralBg: "#FFFFFF",
    neutralBorder: "#C4D4CA",
    neutralText: "#2E4035",
  },
  pewter: {
    name: "锡灰",
    tag: "银灰",
    description: "冷调银灰，像优质不锈钢，专业厨房感",
    background: "#F3F4F6",
    foreground: "#1C2030",
    primary: "#4A5568",
    primaryBorder: "#374151",
    accentBg: "#E8EAF0",
    accentBorder: "#C8CCE0",
    cardBg: "#FFFFFF",
    cardBorder: "#DDE0EC",
    cardBorderBottom: "#C0C4D8",
    navBg: "#FFFFFF",
    navBorder: "#DDE0EC",
    mutedText: "#6B7280",
    neutralBg: "#FFFFFF",
    neutralBorder: "#C8CCD8",
    neutralText: "#374151",
  },
  dusk: {
    name: "暮色紫灰",
    tag: "紫灰",
    description: "带紫调的深灰，沉静神秘，低调高级感",
    background: "#F6F5F8",
    foreground: "#252030",
    primary: "#5A5272",
    primaryBorder: "#463E5E",
    accentBg: "#ECEAF4",
    accentBorder: "#C8C2E0",
    cardBg: "#FFFFFF",
    cardBorder: "#E0DCF0",
    cardBorderBottom: "#C4BEDC",
    navBg: "#FFFFFF",
    navBorder: "#E0DCF0",
    mutedText: "#7A6E95",
    neutralBg: "#FFFFFF",
    neutralBorder: "#D0CAE8",
    neutralText: "#3C3550",
  },
  clay: {
    name: "陶土棕",
    tag: "暖棕",
    description: "温润陶土色，带红调的中性棕，自然亲切",
    background: "#F8F5F2",
    foreground: "#2E2018",
    primary: "#7A5544",
    primaryBorder: "#5E4035",
    accentBg: "#F0E8E2",
    accentBorder: "#D8C4B8",
    cardBg: "#FFFFFF",
    cardBorder: "#E8DEDA",
    cardBorderBottom: "#D0C0B8",
    navBg: "#FFFFFF",
    navBorder: "#E8DEDA",
    mutedText: "#8A7060",
    neutralBg: "#FFFFFF",
    neutralBorder: "#D8CCCA",
    neutralText: "#4A3328",
  },
  graphite: {
    name: "炭黑",
    tag: "深灰",
    description: "接近黑的深炭灰，力量感十足，极致专业",
    background: "#F2F2F2",
    foreground: "#161616",
    primary: "#2A2A2A",
    primaryBorder: "#161616",
    accentBg: "#E8E8E8",
    accentBorder: "#CCCCCC",
    cardBg: "#FFFFFF",
    cardBorder: "#E0E0E0",
    cardBorderBottom: "#C8C8C8",
    navBg: "#FFFFFF",
    navBorder: "#E0E0E0",
    mutedText: "#666666",
    neutralBg: "#FFFFFF",
    neutralBorder: "#CCCCCC",
    neutralText: "#333333",
  },
  moss: {
    name: "苔藓绿",
    tag: "橄榄",
    description: "偏黄调的橄榄绿，大地气息，自然有机感",
    background: "#F6F7F2",
    foreground: "#26280E",
    primary: "#5C6428",
    primaryBorder: "#464E1C",
    accentBg: "#ECEEE0",
    accentBorder: "#CDD4AA",
    cardBg: "#FFFFFF",
    cardBorder: "#DDE0CC",
    cardBorderBottom: "#C4CAA8",
    navBg: "#FFFFFF",
    navBorder: "#DDE0CC",
    mutedText: "#6E7540",
    neutralBg: "#FFFFFF",
    neutralBorder: "#CCCEA8",
    neutralText: "#3A3E1A",
  },
  cadet: {
    name: "军绿蓝",
    tag: "灰青",
    description: "介于军绿与蓝灰之间，冷静克制，工装感",
    background: "#F3F6F7",
    foreground: "#182028",
    primary: "#3D6068",
    primaryBorder: "#2C4E58",
    accentBg: "#DFF0F2",
    accentBorder: "#AACDD4",
    cardBg: "#FFFFFF",
    cardBorder: "#D0E0E4",
    cardBorderBottom: "#A8C4CC",
    navBg: "#FFFFFF",
    navBorder: "#D0E0E4",
    mutedText: "#4E7A88",
    neutralBg: "#FFFFFF",
    neutralBorder: "#B8CED4",
    neutralText: "#264050",
  },
};

const allThemeKeys = Object.keys(themes) as ThemeKey[];

const modules = [
  { name: "Koel Temp", icon: Thermometer },
  { name: "Kern Temp", icon: Thermometer },
  { name: "Schoonmaak", icon: SprayCan },
  { name: "Ontvangst", icon: Package },
];

export default function DesignPreview() {
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("sage");
  const theme = themes[activeTheme];

  return (
    <div className="min-h-screen pb-40" style={{ background: theme.background, color: theme.foreground, transition: "all 0.2s ease" }}>

      {/* Sticky Selector */}
      <div
        className="sticky top-0 z-50 border-b-2 px-4 pt-4 pb-3"
        style={{ background: theme.navBg, borderColor: theme.navBorder }}
      >
        <p className="mb-3 text-center text-xs font-black uppercase tracking-widest" style={{ color: theme.mutedText }}>
          选择配色方案
        </p>
        <div className="grid grid-cols-5 gap-2">
          {allThemeKeys.map((key) => {
            const t = themes[key];
            const isActive = activeTheme === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTheme(key)}
                className="flex flex-col items-center gap-1 rounded-xl border-2 border-b-4 py-2 px-1 transition-all"
                style={{
                  background: isActive ? t.primary : theme.neutralBg,
                  borderColor: isActive ? t.primaryBorder : theme.neutralBorder,
                }}
              >
                <div
                  className="h-5 w-5 rounded-full border-2"
                  style={{ background: t.primary, borderColor: t.primaryBorder }}
                />
                <span
                  className="text-[9px] font-black leading-tight text-center"
                  style={{ color: isActive ? "#FFFFFF" : theme.mutedText }}
                >
                  {t.tag}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active description */}
        <div
          className="mt-3 rounded-xl border-2 px-3 py-2"
          style={{ background: theme.accentBg, borderColor: theme.accentBorder }}
        >
          <p className="text-center text-sm font-black" style={{ color: theme.primary }}>
            {theme.name}
          </p>
          <p className="text-center text-xs mt-0.5" style={{ color: theme.mutedText }}>
            {theme.description}
          </p>
        </div>
      </div>

      {/* App Preview */}
      <div className="px-5 pt-6 space-y-4">

        {/* Header */}
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: theme.primary }}>
              HACCP
            </p>
            <h1 className="mt-0.5 text-4xl font-black tracking-tight" style={{ color: theme.foreground }}>
              SnelVink
            </h1>
          </div>
          <button
            className="rounded-2xl border-2 border-b-4 px-4 py-2.5 text-sm font-black"
            style={{ background: theme.neutralBg, borderColor: theme.neutralBorder, color: theme.neutralText }}
          >
            Wijzigen
          </button>
        </header>

        {/* Module Cards */}
        <div className="grid grid-cols-2 gap-4">
          {modules.map((mod, idx) => (
            <div
              key={idx}
              className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-b-4 px-4 text-center"
              style={{ background: theme.cardBg, borderColor: theme.cardBorder, borderBottomColor: theme.cardBorderBottom }}
            >
              <div
                className="flex h-13 w-13 items-center justify-center rounded-xl border-2 border-b-4"
                style={{ background: theme.accentBg, borderColor: theme.accentBorder }}
              >
                <mod.icon className="h-7 w-7" strokeWidth={2.5} style={{ color: theme.primary }} />
              </div>
              <span className="text-sm font-black leading-tight" style={{ color: theme.foreground }}>
                {mod.name}
              </span>
            </div>
          ))}
        </div>

        {/* Add Button */}
        <button
          className="flex w-full min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-b-4 text-base font-black text-white"
          style={{ background: theme.primary, borderColor: theme.primaryBorder }}
        >
          <Plus className="h-6 w-6" strokeWidth={2.75} />
          Toevoegen
        </button>

        {/* Button Palette */}
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wider" style={{ color: theme.mutedText }}>
            按钮样式
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              className="rounded-2xl border-2 border-b-4 py-3 text-sm font-black text-white"
              style={{ background: theme.primary, borderColor: theme.primaryBorder }}
            >
              主要操作
            </button>
            <button
              className="rounded-2xl border-2 border-b-4 py-3 text-sm font-black text-white"
              style={{ background: "#4A7C59", borderColor: "#3A6248" }}
            >
              确认完成
            </button>
            <button
              className="rounded-2xl border-2 border-b-4 py-3 text-sm font-black"
              style={{ background: theme.neutralBg, borderColor: theme.neutralBorder, color: theme.neutralText }}
            >
              取消 / 返回
            </button>
            <button
              className="rounded-2xl border-2 border-b-4 py-3 text-sm font-black text-white"
              style={{ background: "#C0392B", borderColor: "#922B21" }}
            >
              删除 / 危险
            </button>
          </div>
        </div>

        {/* Color Swatches */}
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wider" style={{ color: theme.mutedText }}>
            色彩系统
          </p>
          <div className="flex gap-2">
            {[
              { label: "主色", color: theme.primary, border: theme.primaryBorder },
              { label: "强调", color: theme.accentBg, border: theme.accentBorder },
              { label: "卡片", color: theme.cardBg, border: theme.cardBorder },
              { label: "背景", color: theme.background, border: theme.navBorder },
              { label: "文字", color: theme.foreground, border: theme.foreground },
            ].map((sw) => (
              <div key={sw.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="h-10 w-full rounded-lg border-2" style={{ background: sw.color, borderColor: sw.border }} />
                <span className="text-[9px] font-bold" style={{ color: theme.mutedText }}>{sw.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 border-t-2"
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
              <tab.icon className="h-5 w-5 shrink-0" strokeWidth={tab.active ? 2.5 : 2} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
