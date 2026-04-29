"use client";

import { useState } from "react";
import {
  ClipboardCheck, History, Settings, Thermometer, SprayCan,
  Package, Plus, Pencil,
} from "lucide-react";

const pine = {
  primary:      "#3D5C45",
  primaryDark:  "#2D4A35",
  primaryLight: "#4A6B52",
  bg:           "#EEF3EF",
  bgGrad:       "linear-gradient(170deg, #EEF3EF 0%, #E5EDE7 50%, #DCE8DF 100%)",
  fg:           "#1A2B1E",
  muted:        "#5A7060",
  accentBg:     "rgba(214,228,218,0.7)",
  cardBg:       "rgba(255,255,255,0.75)",
  cardBorder:   "rgba(210,228,215,0.9)",
  navBg:        "rgba(245,248,246,0.95)",
  navBorder:    "rgba(210,228,215,0.6)",
};

const glass = {
  card: {
    background: pine.cardBg,
    border: `1.5px solid ${pine.cardBorder}`,
    backdropFilter: "blur(12px)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  } as React.CSSProperties,
  btnPrimary: {
    background: pine.primary,
    border: `2px solid ${pine.primaryDark}`,
    color: "#fff",
    boxShadow: `0 2px 0 ${pine.primaryDark}, 0 4px 12px ${pine.primary}30`,
  } as React.CSSProperties,
  navItemActive: {
    background: pine.primary,
    border: `2px solid ${pine.primaryDark}`,
    color: "#fff",
    boxShadow: `0 2px 0 ${pine.primaryDark}`,
  } as React.CSSProperties,
  navItemInactive: {
    background: "transparent",
    border: "none",
    color: pine.muted,
  } as React.CSSProperties,
};

const modules = [
  { name: "Koel Temp",  icon: Thermometer },
  { name: "Kern Temp",  icon: Thermometer },
  { name: "Schoonmaak", icon: SprayCan },
  { name: "Ontvangst",  icon: Package },
];

function BottomNav() {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 border-t px-3 pb-5 pt-2.5 flex gap-2"
      style={{ background: pine.navBg, borderColor: pine.navBorder, backdropFilter: "blur(16px)" }}
    >
      {[
        { icon: ClipboardCheck, label: "Taken",        active: true  },
        { icon: History,        label: "Geschiedenis",  active: false },
        { icon: Settings,       label: "Instellingen",  active: false },
      ].map((t, i) => (
        <button
          key={i}
          className="flex flex-1 flex-col items-center justify-center gap-1 min-h-14 text-[10px] font-black rounded-xl"
          style={t.active ? glass.navItemActive : glass.navItemInactive}
        >
          <t.icon className="h-5 w-5" strokeWidth={t.active ? 2.5 : 2} />
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── 三种 Header 变体 ───

// 变体1：Wijzigen 在标题右侧，pill 样式，带描边
function HeaderV1() {
  return (
    <div className="px-5 pt-7 pb-6" style={{ background: pine.primary }}>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.28em] text-white/40">HACCP</span>
          <h1 className="text-3xl font-black tracking-tight text-white leading-none mt-1">SnelVink</h1>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black"
          style={{
            background: "transparent",
            border: "1.5px solid rgba(255,255,255,0.35)",
            color: "rgba(255,255,255,0.85)",
            letterSpacing: "0.04em",
          }}
        >
          <Pencil className="h-3 w-3" strokeWidth={2.5} />
          Wijzigen
        </button>
      </div>
    </div>
  );
}

// 变体2：Wijzigen 在标题下方作为小标签，带左侧竖线装饰
function HeaderV2() {
  return (
    <div className="px-5 pt-7 pb-6" style={{ background: pine.primary }}>
      <h1 className="text-3xl font-black tracking-tight text-white leading-none">SnelVink</h1>
      <div className="flex items-center justify-between mt-3">
        <span className="text-[9px] font-black uppercase tracking-[0.28em] text-white/40">HACCP Dashboard</span>
        <button
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-black"
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderLeft: "3px solid rgba(255,255,255,0.6)",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <Pencil className="h-3 w-3" strokeWidth={2.5} />
          Wijzigen
        </button>
      </div>
    </div>
  );
}

// 变体3：极简，Wijzigen 是右侧的图标+文字对齐底部
function HeaderV3() {
  return (
    <div className="px-5 pt-7 pb-6" style={{ background: pine.primary }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.2)" }}
          >
            <ClipboardCheck className="h-5 w-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-white/40 block">HACCP</span>
            <h1 className="text-2xl font-black tracking-tight text-white leading-none mt-0.5">SnelVink</h1>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1.5px solid rgba(255,255,255,0.25)",
            color: "rgba(255,255,255,0.9)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          <Pencil className="h-3 w-3" strokeWidth={2.5} />
          Wijzigen
        </button>
      </div>
    </div>
  );
}

// ─── 模块网格（2列大字）共用 ───
function ModuleGrid() {
  return (
    <div className="px-4 pt-7 pb-28">
      <div className="grid grid-cols-2 gap-3">
        {modules.map((m, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center gap-3 py-7 rounded-2xl"
            style={glass.card}
          >
            <m.icon className="h-10 w-10" strokeWidth={1.75} style={{ color: pine.primary }} />
            <span className="text-base font-black" style={{ color: pine.fg }}>{m.name}</span>
          </div>
        ))}
        {/* Toevoegen tile */}
        <div
          className="flex flex-col items-center justify-center gap-3 py-7 rounded-2xl"
          style={{
            background: "rgba(61,92,69,0.08)",
            border: `1.5px dashed ${pine.cardBorder}`,
          }}
        >
          <Plus className="h-10 w-10" strokeWidth={1.75} style={{ color: pine.muted }} />
          <span className="text-base font-black" style={{ color: pine.muted }}>Nieuw</span>
        </div>
      </div>
    </div>
  );
}

type Variant = "1" | "2" | "3";

const meta: Record<Variant, { label: string; desc: string }> = {
  "1": { label: "Pill 描边",   desc: "圆角胶囊 · 透明底 · 白色描边" },
  "2": { label: "竖线标签",    desc: "左侧高亮竖线 · 底部对齐文字" },
  "3": { label: "图标 + 按钮", desc: "左侧品牌图标 · 右侧毛玻璃按钮" },
};

export default function DesignPreview() {
  const [active, setActive] = useState<Variant>("1");

  return (
    <div className="min-h-screen" style={{ background: "#161B17", color: "#fff" }}>
      {/* Selector */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#161B17]/95 backdrop-blur-sm px-4 pt-4 pb-3">
        <p className="mb-2.5 text-center text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
          Wijzigen 位置方案 — 2列大字排版 · 松针绿
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(["1", "2", "3"] as Variant[]).map((key) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className="rounded-xl border py-3 px-2 text-center transition-all"
              style={{
                background: active === key ? pine.primary : "rgba(255,255,255,0.05)",
                borderColor: active === key ? pine.primaryDark : "rgba(255,255,255,0.1)",
              }}
            >
              <span className="block text-[11px] font-black leading-tight" style={{ color: active === key ? "#fff" : "rgba(255,255,255,0.55)" }}>
                {meta[key].label}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-white/40">{meta[active].desc}</p>
      </div>

      {/* Phone preview */}
      <div className="px-4 py-6 mx-auto max-w-sm">
        <div className="relative overflow-hidden" style={{ background: pine.bgGrad, minHeight: 680, borderRadius: 28 }}>
          {active === "1" && <HeaderV1 />}
          {active === "2" && <HeaderV2 />}
          {active === "3" && <HeaderV3 />}
          <ModuleGrid />
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
