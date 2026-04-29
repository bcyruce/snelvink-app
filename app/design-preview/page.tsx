"use client";

import { useState } from "react";
import {
  ClipboardCheck, History, Settings, Thermometer, SprayCan,
  Package, Plus, Pencil
} from "lucide-react";

// ─── 主题色系统 ────────────────────────────────────────────────
type Theme = {
  name: string;
  label: string;
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
  dot: string;
};

const themes: Record<string, Theme> = {
  pine: {
    name: "pine",
    label: "松针绿",
    dot: "#3D5C45",
    primary:      "#3D5C45",
    primaryDark:  "#2D4A35",
    bg:           "#EEF3EF",
    bgGrad:       "linear-gradient(170deg, #EEF3EF 0%, #E5EDE7 50%, #DCE8DF 100%)",
    fg:           "#1A2B1E",
    muted:        "#5A7060",
    cardBg:       "rgba(255,255,255,0.75)",
    cardBorder:   "rgba(210,228,215,0.9)",
    navBg:        "rgba(245,248,246,0.95)",
    navBorder:    "rgba(210,228,215,0.6)",
  },
  navy: {
    name: "navy",
    label: "深海蓝",
    dot: "#1E3A5F",
    primary:      "#1E3A5F",
    primaryDark:  "#152C4A",
    bg:           "#EEF1F6",
    bgGrad:       "linear-gradient(170deg, #EEF1F6 0%, #E5EBF4 50%, #D8E3F0 100%)",
    fg:           "#0F1E31",
    muted:        "#4A6080",
    cardBg:       "rgba(255,255,255,0.75)",
    cardBorder:   "rgba(200,216,238,0.9)",
    navBg:        "rgba(244,247,252,0.95)",
    navBorder:    "rgba(200,216,238,0.6)",
  },
  slate: {
    name: "slate",
    label: "钢灰蓝",
    dot: "#3D5266",
    primary:      "#3D5266",
    primaryDark:  "#2D3F50",
    bg:           "#EFF1F4",
    bgGrad:       "linear-gradient(170deg, #EFF1F4 0%, #E6E9EE 50%, #DDE2E9 100%)",
    fg:           "#1A2330",
    muted:        "#5A6B7A",
    cardBg:       "rgba(255,255,255,0.75)",
    cardBorder:   "rgba(200,212,224,0.9)",
    navBg:        "rgba(244,246,249,0.95)",
    navBorder:    "rgba(200,212,224,0.6)",
  },
  earth: {
    name: "earth",
    label: "陶土棕",
    dot: "#6B4535",
    primary:      "#6B4535",
    primaryDark:  "#563628",
    bg:           "#F4EFEC",
    bgGrad:       "linear-gradient(170deg, #F4EFEC 0%, #EDE6E1 50%, #E6DDD7 100%)",
    fg:           "#2E1C14",
    muted:        "#7A5A4A",
    cardBg:       "rgba(255,255,255,0.75)",
    cardBorder:   "rgba(228,210,200,0.9)",
    navBg:        "rgba(250,246,244,0.95)",
    navBorder:    "rgba(228,210,200,0.6)",
  },
  charcoal: {
    name: "charcoal",
    label: "炭黑",
    dot: "#2C2C2C",
    primary:      "#2C2C2C",
    primaryDark:  "#1A1A1A",
    bg:           "#F0F0F0",
    bgGrad:       "linear-gradient(170deg, #F2F2F2 0%, #EBEBEB 50%, #E4E4E4 100%)",
    fg:           "#111111",
    muted:        "#666666",
    cardBg:       "rgba(255,255,255,0.80)",
    cardBorder:   "rgba(200,200,200,0.9)",
    navBg:        "rgba(246,246,246,0.95)",
    navBorder:    "rgba(200,200,200,0.6)",
  },
  plum: {
    name: "plum",
    label: "暮色紫",
    dot: "#4A3560",
    primary:      "#4A3560",
    primaryDark:  "#38284A",
    bg:           "#F0EEF5",
    bgGrad:       "linear-gradient(170deg, #F0EEF5 0%, #E8E5F0 50%, #E0DCEA 100%)",
    fg:           "#1E1530",
    muted:        "#6A5880",
    cardBg:       "rgba(255,255,255,0.75)",
    cardBorder:   "rgba(210,200,230,0.9)",
    navBg:        "rgba(246,244,250,0.95)",
    navBorder:    "rgba(210,200,230,0.6)",
  },
};

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
        { icon: ClipboardCheck, label: "Taken",       active: true  },
        { icon: History,        label: "Geschiedenis", active: false },
        { icon: Settings,       label: "Instellingen", active: false },
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
      {/* Header */}
      <div className="px-5 pt-6 pb-5" style={{ background: t.primary }}>
        <TitleC />
      </div>
      {/* 浅色区标签行 */}
      <div className="px-4 pt-4 pb-0 flex items-center justify-between">
        <span
          className="text-[11px] font-black uppercase tracking-widest"
          style={{ color: t.muted }}
        >
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
  const [active, setActive] = useState<string>("pine");
  const t = themes[active];

  return (
    <div className="min-h-screen" style={{ background: "#161B17", color: "#fff" }}>
      {/* 顶部选择器 */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#161B17]/95 backdrop-blur-sm px-4 pt-4 pb-3">
        <p className="mb-2.5 text-center text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
          主题色方案 — 点击切换
        </p>
        <div className="grid grid-cols-6 gap-2">
          {Object.values(themes).map((theme) => (
            <button
              key={theme.name}
              onClick={() => setActive(theme.name)}
              className="flex flex-col items-center gap-1.5 rounded-xl border py-2.5 px-1 transition-all"
              style={{
                background: active === theme.name ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                borderColor: active === theme.name ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.08)",
              }}
            >
              {/* 色点 */}
              <div
                className="rounded-full"
                style={{
                  width: 20,
                  height: 20,
                  background: theme.dot,
                  border: active === theme.name ? "2px solid rgba(255,255,255,0.6)" : "2px solid transparent",
                }}
              />
              <span
                className="text-[9px] font-black leading-none"
                style={{ color: active === theme.name ? "#fff" : "rgba(255,255,255,0.4)" }}
              >
                {theme.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 手机预览 */}
      <div className="px-4 py-10 mx-auto max-w-sm">
        <PhonePreview t={t} />
      </div>
    </div>
  );
}
