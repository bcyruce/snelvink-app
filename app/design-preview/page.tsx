"use client";

import { useState } from "react";
import {
  ClipboardCheck, History, Settings, Thermometer, SprayCan,
  Package, Plus, Pencil
} from "lucide-react";

// ─── 调色盘图标（扁平化 SVG）────────────────────────────────────
function PaletteIcon({ colors, size = 24 }: { colors: string[]; size?: number }) {
  // 6色调色盘：3个大色块 + 3个小圆点
  const slices = [
    { d: "M12 12 L12 2 A10 10 0 0 1 20.66 7 Z",  fill: colors[0] },
    { d: "M12 12 L20.66 7 A10 10 0 0 1 20.66 17 Z", fill: colors[1] },
    { d: "M12 12 L20.66 17 A10 10 0 0 1 12 22 Z", fill: colors[2] },
    { d: "M12 12 L12 22 A10 10 0 0 1 3.34 17 Z", fill: colors[3] },
    { d: "M12 12 L3.34 17 A10 10 0 0 1 3.34 7 Z",  fill: colors[4] },
    { d: "M12 12 L3.34 7 A10 10 0 0 1 12 2 Z",   fill: colors[5] },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {slices.map((s, i) => (
        <path key={i} d={s.d} fill={s.fill} />
      ))}
      {/* 中心白圆 */}
      <circle cx="12" cy="12" r="4" fill="white" />
    </svg>
  );
}

// ─── 主题色系统 ────────────────────────────────────────────────
type Theme = {
  name: string;
  label: string;
  temp: "cool" | "warm";
  dot: string;
  primary: string;
  primaryDark: string;
  bg: string;
  bgGrad: string;
  fg: string;
  muted: string;
  cardBg: string;
  cardBorder: string;
  navBg: string;
  navBorder: string;
};

// 按冷暖排列：冷色在前（钢青蓝、军绿蓝、锡灰），暖色在后（暮色紫灰、暖灰石、米色）
const themes: Record<string, Theme> = {
  // ── 冷色系 ──
  steel: {
    name: "steel",
    label: "钢青蓝",
    temp: "cool",
    dot: "#3E6273",
    primary:     "#3E6273",
    primaryDark: "#2D4D5D",
    bg:          "#EDF3F5",
    bgGrad:      "linear-gradient(170deg, #EDF3F5 0%, #E2EDF1 50%, #D5E6EB 100%)",
    fg:          "#162028",
    muted:       "#527080",
    cardBg:      "rgba(255,255,255,0.78)",
    cardBorder:  "rgba(190,218,228,0.9)",
    navBg:       "rgba(242,249,252,0.95)",
    navBorder:   "rgba(190,218,228,0.6)",
  },
  militaryblue: {
    name: "militaryblue",
    label: "军绿蓝",
    temp: "cool",
    dot: "#3A5248",
    primary:     "#3A5248",
    primaryDark: "#2A3E36",
    bg:          "#EBF2EE",
    bgGrad:      "linear-gradient(170deg, #EBF2EE 0%, #E0EAE5 50%, #D3E3DB 100%)",
    fg:          "#141E1A",
    muted:       "#4E6B60",
    cardBg:      "rgba(255,255,255,0.78)",
    cardBorder:  "rgba(185,215,202,0.9)",
    navBg:       "rgba(241,248,244,0.95)",
    navBorder:   "rgba(185,215,202,0.6)",
  },
  tin: {
    name: "tin",
    label: "锡灰",
    temp: "cool",
    dot: "#525E68",
    primary:     "#525E68",
    primaryDark: "#3E4850",
    bg:          "#EEEEF0",
    bgGrad:      "linear-gradient(170deg, #EEEEF0 0%, #E5E7EA 50%, #DBDDE1 100%)",
    fg:          "#1A1E22",
    muted:       "#6A737C",
    cardBg:      "rgba(255,255,255,0.80)",
    cardBorder:  "rgba(200,204,210,0.9)",
    navBg:       "rgba(245,245,247,0.95)",
    navBorder:   "rgba(200,204,210,0.6)",
  },
  // ── 暖色系 ──
  plum: {
    name: "plum",
    label: "暮色紫灰",
    temp: "warm",
    dot: "#4E4060",
    primary:     "#4E4060",
    primaryDark: "#3A2F4A",
    bg:          "#F0EEF5",
    bgGrad:      "linear-gradient(170deg, #F0EEF5 0%, #E8E4F0 50%, #DFD9EC 100%)",
    fg:          "#1C1628",
    muted:       "#6B5E80",
    cardBg:      "rgba(255,255,255,0.78)",
    cardBorder:  "rgba(210,200,232,0.9)",
    navBg:       "rgba(247,245,252,0.95)",
    navBorder:   "rgba(210,200,232,0.6)",
  },
  warmgray: {
    name: "warmgray",
    label: "暖灰石",
    temp: "warm",
    dot: "#5E5248",
    primary:     "#5E5248",
    primaryDark: "#483F37",
    bg:          "#F2EFEB",
    bgGrad:      "linear-gradient(170deg, #F2EFEB 0%, #EAE5DF 50%, #E2D9D1 100%)",
    fg:          "#211A14",
    muted:       "#7A6E64",
    cardBg:      "rgba(255,255,255,0.80)",
    cardBorder:  "rgba(220,210,198,0.9)",
    navBg:       "rgba(250,247,243,0.95)",
    navBorder:   "rgba(220,210,198,0.6)",
  },
  beige: {
    name: "beige",
    label: "米色",
    temp: "warm",
    dot: "#7A6848",
    primary:     "#7A6848",
    primaryDark: "#5E5038",
    bg:          "#F5F0E8",
    bgGrad:      "linear-gradient(170deg, #F5F0E8 0%, #EDE5D5 50%, #E5DAC5 100%)",
    fg:          "#2A2016",
    muted:       "#8A7860",
    cardBg:      "rgba(255,255,255,0.80)",
    cardBorder:  "rgba(228,214,190,0.9)",
    navBg:       "rgba(252,248,240,0.95)",
    navBorder:   "rgba(228,214,190,0.6)",
  },
};

const themeOrder = ["steel", "militaryblue", "tin", "plum", "warmgray", "beige"];

const modules = [
  { name: "Koel Temp",  icon: Thermometer },
  { name: "Kern Temp",  icon: Thermometer },
  { name: "Schoonmaak", icon: SprayCan },
  { name: "Ontvangst",  icon: Package },
];

function TitleC() {
  return (
    <div>
      <div style={{
        fontSize: 28,
        fontWeight: 800,
        color: "#fff",
        letterSpacing: "0.06em",
        lineHeight: 1,
        fontFamily: "'Trebuchet MS', sans-serif",
        textTransform: "uppercase",
      }}>
        SNEL<span style={{ opacity: 0.55, marginLeft: "0.12em" }}>VINK</span>
      </div>
      <div style={{
        fontSize: 9.5,
        fontWeight: 600,
        color: "rgba(255,255,255,0.45)",
        letterSpacing: "0.15em",
        marginTop: 3,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}>
        Meten · Vinken · Weten
      </div>
    </div>
  );
}

function BottomNav({ t }: { t: Theme }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 border-t px-3 pb-5 pt-2.5 flex gap-2"
      style={{ background: t.navBg, borderColor: t.navBorder, backdropFilter: "blur(16px)" }}
    >
      {[
        { icon: ClipboardCheck, label: "Taken",        active: true  },
        { icon: History,        label: "Geschiedenis",  active: false },
        { icon: Settings,       label: "Instellingen",  active: false },
      ].map((tab, i) => (
        <button
          key={i}
          className="flex flex-1 flex-col items-center justify-center gap-1 min-h-14 text-[10px] font-black rounded-xl"
          style={tab.active ? {
            background: t.primary,
            border: `2px solid ${t.primaryDark}`,
            color: "#fff",
            boxShadow: `0 2px 0 ${t.primaryDark}`,
          } : {
            background: "transparent",
            border: "none",
            color: t.muted,
          }}
        >
          <tab.icon className="h-5 w-5" strokeWidth={tab.active ? 2.5 : 2} />
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ModuleGrid({ t }: { t: Theme }) {
  return (
    <div className="px-4 pb-28">
      <div className="grid grid-cols-2 gap-3">
        {modules.map((m, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center gap-3 py-7 rounded-2xl"
            style={{
              background: t.cardBg,
              border: `1.5px solid ${t.cardBorder}`,
              backdropFilter: "blur(12px)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
            }}
          >
            <m.icon className="h-10 w-10" strokeWidth={1.75} style={{ color: t.primary }} />
            <span className="text-base font-black" style={{ color: t.fg }}>{m.name}</span>
          </div>
        ))}
        <div
          className="flex flex-col items-center justify-center gap-3 py-7 rounded-2xl"
          style={{
            background: "rgba(0,0,0,0.04)",
            border: `1.5px dashed ${t.cardBorder}`,
          }}
        >
          <Plus className="h-10 w-10" strokeWidth={1.75} style={{ color: t.muted }} />
          <span className="text-base font-black" style={{ color: t.muted }}>Nieuw</span>
        </div>
      </div>
    </div>
  );
}

function PhonePreview({ t }: { t: Theme }) {
  return (
    <div className="relative overflow-hidden" style={{ background: t.bgGrad, minHeight: 660, borderRadius: 28 }}>
      <div className="px-5 pt-6 pb-5" style={{ background: t.primary }}>
        <TitleC />
      </div>
      <div className="px-4 pt-4 pb-0 flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: t.muted }}>
          Taken
        </span>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black"
          style={{
            background: "transparent",
            border: `1.5px solid ${t.cardBorder}`,
            color: t.primary,
            letterSpacing: "0.04em",
          }}
        >
          <Pencil className="h-3 w-3" strokeWidth={2.5} />
          Wijzigen
        </button>
      </div>
      <div className="pt-2" />
      <ModuleGrid t={t} />
      <BottomNav t={t} />
    </div>
  );
}

export default function DesignPreview() {
  const [active, setActive] = useState<string>("steel");
  const t = themes[active];

  const paletteColors = themeOrder.map(k => themes[k].dot);

  return (
    <div className="min-h-screen" style={{ background: "#161B17", color: "#fff" }}>

      {/* 顶部选择器 */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#161B17]/95 backdrop-blur-sm px-4 pt-4 pb-3">

        {/* 标题行：调色盘图标 + 说明 */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <PaletteIcon colors={paletteColors} size={20} />
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
            主题色方案
          </span>
        </div>

        {/* 冷暖分组 */}
        <div className="flex gap-2">
          {/* 冷色组 */}
          <div className="flex-1">
            <div className="text-[8px] font-black uppercase tracking-widest text-white/25 mb-1.5 text-center">冷色</div>
            <div className="grid grid-cols-3 gap-1.5">
              {themeOrder.filter(k => themes[k].temp === "cool").map((key) => {
                const th = themes[key];
                const isActive = active === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActive(key)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border py-2.5 px-1 transition-all"
                    style={{
                      background: isActive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                      borderColor: isActive ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      className="rounded-full"
                      style={{
                        width: 18,
                        height: 18,
                        background: th.dot,
                        border: isActive ? "2px solid rgba(255,255,255,0.7)" : "2px solid transparent",
                      }}
                    />
                    <span className="text-[8px] font-black leading-tight text-center" style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.35)" }}>
                      {th.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 分割线 */}
          <div className="w-px bg-white/10 self-stretch" />

          {/* 暖色组 */}
          <div className="flex-1">
            <div className="text-[8px] font-black uppercase tracking-widest text-white/25 mb-1.5 text-center">暖色</div>
            <div className="grid grid-cols-3 gap-1.5">
              {themeOrder.filter(k => themes[k].temp === "warm").map((key) => {
                const th = themes[key];
                const isActive = active === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActive(key)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border py-2.5 px-1 transition-all"
                    style={{
                      background: isActive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                      borderColor: isActive ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      className="rounded-full"
                      style={{
                        width: 18,
                        height: 18,
                        background: th.dot,
                        border: isActive ? "2px solid rgba(255,255,255,0.7)" : "2px solid transparent",
                      }}
                    />
                    <span className="text-[8px] font-black leading-tight text-center" style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.35)" }}>
                      {th.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 手机预览 */}
      <div className="px-4 py-10 mx-auto max-w-sm">
        <PhonePreview t={t} />
      </div>
    </div>
  );
}
