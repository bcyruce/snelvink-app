"use client";

import { useState } from "react";
import {
  ClipboardCheck, History, Settings, Thermometer, SprayCan,
  Package, Plus, Pencil
} from "lucide-react";

const pine = {
  primary:      "#3D5C45",
  primaryDark:  "#2D4A35",
  primaryLight: "#4A6B52",
  bg:           "#EEF3EF",
  bgGrad:       "linear-gradient(170deg, #EEF3EF 0%, #E5EDE7 50%, #DCE8DF 100%)",
  fg:           "#1A2B1E",
  muted:        "#5A7060",
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

type Variant = "1" | "2" | "3" | "4" | "5";

const variantMeta: Record<Variant, { label: string; desc: string }> = {
  "1": { label: "Header 右上角", desc: "深色背景内，标题右侧" },
  "2": { label: "Header 底部行", desc: "深色背景内，标题下方独立一行" },
  "3": { label: "交界处悬浮", desc: "深浅交界，半浮在分割线上" },
  "4": { label: "浅色区右对齐", desc: "浅色背景，模块上方右侧" },
  "5": { label: "浅色区左对齐", desc: "浅色背景，模块上方左侧，带说明文字" },
};

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

const wijzigenPill = (
  <button
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black shrink-0"
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
);

const wijzigenLight = (
  <button
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black"
    style={{
      background: "transparent",
      border: `1.5px solid ${pine.cardBorder}`,
      color: pine.primary,
      letterSpacing: "0.04em",
    }}
  >
    <Pencil className="h-3 w-3" strokeWidth={2.5} />
    Wijzigen
  </button>
);

function BottomNav() {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 border-t px-3 pb-5 pt-2.5 flex gap-2"
      style={{ background: pine.navBg, borderColor: pine.navBorder, backdropFilter: "blur(16px)" }}
    >
      {[
        { icon: ClipboardCheck, label: "Taken",       active: true  },
        { icon: History,        label: "Geschiedenis", active: false },
        { icon: Settings,       label: "Instellingen", active: false },
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

function ModuleGrid() {
  return (
    <div className="px-4 pb-28">
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
        <div
          className="flex flex-col items-center justify-center gap-3 py-7 rounded-2xl"
          style={{ background: "rgba(61,92,69,0.06)", border: `1.5px dashed ${pine.cardBorder}` }}
        >
          <Plus className="h-10 w-10" strokeWidth={1.75} style={{ color: pine.muted }} />
          <span className="text-base font-black" style={{ color: pine.muted }}>Nieuw</span>
        </div>
      </div>
    </div>
  );
}

// 方案1: Wijzigen 在 Header 右上角（深色背景内，与标题同行）
function Phone1() {
  return (
    <div className="relative overflow-hidden" style={{ background: pine.bgGrad, minHeight: 660, borderRadius: 28 }}>
      <div className="px-5 pt-6 pb-5 flex items-center justify-between" style={{ background: pine.primary }}>
        <TitleC />
        {wijzigenPill}
      </div>
      <div className="pt-6" />
      <ModuleGrid />
      <BottomNav />
    </div>
  );
}

// 方案2: Wijzigen 在 Header 底部行（深色背景内，标题下方独立一行，右对齐）
function Phone2() {
  return (
    <div className="relative overflow-hidden" style={{ background: pine.bgGrad, minHeight: 660, borderRadius: 28 }}>
      <div className="px-5 pt-6 pb-4" style={{ background: pine.primary }}>
        <TitleC />
        <div className="flex justify-end mt-3">
          {wijzigenPill}
        </div>
      </div>
      <div className="pt-6" />
      <ModuleGrid />
      <BottomNav />
    </div>
  );
}

// 方案3: Wijzigen 悬浮在深浅交界处（绝对定位，横跨两个背景）
function Phone3() {
  return (
    <div className="relative overflow-hidden" style={{ background: pine.bgGrad, minHeight: 660, borderRadius: 28 }}>
      <div className="px-5 pt-6 pb-8" style={{ background: pine.primary }}>
        <TitleC />
      </div>
      {/* 悬浮按钮 */}
      <div className="absolute left-0 right-0 flex justify-end px-5" style={{ top: 80 }}>
        <button
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black"
          style={{
            background: "rgba(255,255,255,0.95)",
            border: `1.5px solid ${pine.cardBorder}`,
            color: pine.primary,
            letterSpacing: "0.04em",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          }}
        >
          <Pencil className="h-3 w-3" strokeWidth={2.5} />
          Wijzigen
        </button>
      </div>
      <div className="pt-10" />
      <ModuleGrid />
      <BottomNav />
    </div>
  );
}

// 方案4: Wijzigen 在浅色区右对齐，模块上方，小尺寸
function Phone4() {
  return (
    <div className="relative overflow-hidden" style={{ background: pine.bgGrad, minHeight: 660, borderRadius: 28 }}>
      <div className="px-5 pt-6 pb-5" style={{ background: pine.primary }}>
        <TitleC />
      </div>
      <div className="px-4 pt-4 pb-0 flex justify-end">
        {wijzigenLight}
      </div>
      <div className="pt-2" />
      <ModuleGrid />
      <BottomNav />
    </div>
  );
}

// 方案5: Wijzigen 在浅色区左侧，带"模块"小标签同行
function Phone5() {
  return (
    <div className="relative overflow-hidden" style={{ background: pine.bgGrad, minHeight: 660, borderRadius: 28 }}>
      <div className="px-5 pt-6 pb-5" style={{ background: pine.primary }}>
        <TitleC />
      </div>
      <div className="px-4 pt-4 pb-0 flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: pine.muted }}>
          Modules
        </span>
        {wijzigenLight}
      </div>
      <div className="pt-2" />
      <ModuleGrid />
      <BottomNav />
    </div>
  );
}

export default function DesignPreview() {
  const [active, setActive] = useState<Variant>("1");

  return (
    <div className="min-h-screen" style={{ background: "#161B17", color: "#fff" }}>
      {/* Selector */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#161B17]/95 backdrop-blur-sm px-4 pt-4 pb-3">
        <p className="mb-2.5 text-center text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
          Wijzigen 位置方案 — 字体C · 松针绿主题
        </p>
        <div className="grid grid-cols-5 gap-2">
          {(["1", "2", "3", "4", "5"] as Variant[]).map((key) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className="rounded-xl border py-2.5 px-1 text-center transition-all"
              style={{
                background: active === key ? pine.primary : "rgba(255,255,255,0.05)",
                borderColor: active === key ? pine.primaryDark : "rgba(255,255,255,0.1)",
              }}
            >
              <span className="block text-[13px] font-black" style={{ color: active === key ? "#fff" : "rgba(255,255,255,0.5)" }}>
                {key}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-2.5 text-center">
          <span className="text-[12px] font-black" style={{ color: pine.bg }}>{variantMeta[active].label}</span>
          <span className="ml-2 text-[11px] text-white/35">{variantMeta[active].desc}</span>
        </div>
      </div>

      {/* 手机预览 */}
      <div className="px-4 py-10 mx-auto max-w-sm">
        {active === "1" && <Phone1 />}
        {active === "2" && <Phone2 />}
        {active === "3" && <Phone3 />}
        {active === "4" && <Phone4 />}
        {active === "5" && <Phone5 />}
      </div>
    </div>
  );
}
