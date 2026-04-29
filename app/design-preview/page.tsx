"use client";

import { useState } from "react";
import {
  ClipboardCheck, History, Settings, Thermometer, SprayCan,
  Package, Plus, ChevronRight,
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
  dangerDark:   "#8B2E2E",
  danger:       "#A63D3D",
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
  btnNeutral: {
    background: "rgba(255,255,255,0.85)",
    border: `2px solid rgba(200,215,205,0.9)`,
    color: pine.fg,
    boxShadow: "0 2px 0 rgba(180,200,186,0.6)",
    backdropFilter: "blur(8px)",
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

// 共用底部导航
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

// 共用深色 Header
function DarkHeader({ edit = true }: { edit?: boolean }) {
  return (
    <div className="px-5 pt-8 pb-10" style={{ background: pine.primary }}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">HACCP</span>
          <h1 className="text-4xl font-black tracking-tight text-white mt-0.5">SnelVink</h1>
        </div>
        {edit && (
          <button
            className="px-4 py-2.5 rounded-xl text-xs font-black"
            style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", color: "#fff" }}
          >
            Wijzigen
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 子方案 A — 2列网格，紧凑卡片
// 图标直接裸露，无背景框，卡片缩小
// ─────────────────────────────────────────
function VariantA() {
  return (
    <div className="relative pb-24 overflow-hidden" style={{ background: pine.bgGrad, minHeight: 680, borderRadius: 28 }}>
      <DarkHeader />
      <div className="px-4 pt-8">
        <div className="grid grid-cols-2 gap-3">
          {modules.map((m, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl"
              style={glass.card}
            >
              <m.icon className="h-8 w-8" strokeWidth={2} style={{ color: pine.primary }} />
              <span className="text-sm font-black" style={{ color: pine.fg }}>{m.name}</span>
            </div>
          ))}
        </div>
        <button className="flex w-full min-h-14 items-center justify-center gap-2 rounded-xl text-sm font-black mt-3" style={glass.btnPrimary}>
          <Plus className="h-5 w-5" strokeWidth={2.75} /> Toevoegen
        </button>
      </div>
      <BottomNav />
    </div>
  );
}

// ─────────────────────────────────────────
// 子方案 B — 3列网格，更小的卡片
// 图标大，文字紧贴图标下方
// ─────────────────────────────────────────
function VariantB() {
  const extModules = [
    ...modules,
    { name: "Frituur",  icon: Thermometer },
    { name: "Levering", icon: Package },
  ];
  return (
    <div className="relative pb-24 overflow-hidden" style={{ background: pine.bgGrad, minHeight: 680, borderRadius: 28 }}>
      <DarkHeader />
      <div className="px-4 pt-8">
        <div className="grid grid-cols-3 gap-2.5">
          {extModules.map((m, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl"
              style={glass.card}
            >
              <m.icon className="h-7 w-7" strokeWidth={2} style={{ color: pine.primary }} />
              <span className="text-xs font-black text-center leading-tight" style={{ color: pine.fg }}>{m.name}</span>
            </div>
          ))}
          {/* Add tile */}
          <div
            className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl"
            style={{ background: pine.primary, border: `1.5px solid ${pine.primaryDark}`, boxShadow: `0 2px 0 ${pine.primaryDark}` }}
          >
            <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
            <span className="text-xs font-black text-white">Nieuw</span>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

// ─────────────────────────────────────────
// 子方案 C — 单栏横向列表
// 图标裸露，文字左对齐，副标题显示最后记录
// ─────────────────────────────────────────
function VariantC() {
  return (
    <div className="relative pb-24 overflow-hidden" style={{ background: pine.bgGrad, minHeight: 680, borderRadius: 28 }}>
      <DarkHeader />
      <div className="px-4 pt-8 flex flex-col gap-2.5">
        {modules.map((m, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-4 rounded-2xl"
            style={glass.card}
          >
            <m.icon className="h-7 w-7 shrink-0" strokeWidth={2} style={{ color: pine.primary }} />
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm" style={{ color: pine.fg }}>{m.name}</p>
              <p className="text-xs mt-0.5 truncate" style={{ color: pine.muted }}>Laatste: vandaag 09:00</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0" style={{ color: pine.muted }} />
          </div>
        ))}
        <button className="flex w-full min-h-14 items-center justify-center gap-2 rounded-xl text-sm font-black mt-1" style={glass.btnPrimary}>
          <Plus className="h-5 w-5" strokeWidth={2.75} /> Toevoegen
        </button>
      </div>
      <BottomNav />
    </div>
  );
}

// ─────────────────────────────────────────
// 子方案 D — 2列网格 + 大图标 + 大文字
// 卡片宽但矮，图标和文字都更大
// ─────────────────────────────────────────
function VariantD() {
  return (
    <div className="relative pb-24 overflow-hidden" style={{ background: pine.bgGrad, minHeight: 680, borderRadius: 28 }}>
      <DarkHeader />
      <div className="px-4 pt-8">
        <div className="grid grid-cols-2 gap-3">
          {modules.map((m, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-3 py-6 rounded-2xl"
              style={glass.card}
            >
              <m.icon className="h-10 w-10" strokeWidth={1.75} style={{ color: pine.primary }} />
              <span className="text-base font-black" style={{ color: pine.fg }}>{m.name}</span>
            </div>
          ))}
        </div>
        <button className="flex w-full min-h-14 items-center justify-center gap-2 rounded-xl text-sm font-black mt-3" style={glass.btnPrimary}>
          <Plus className="h-5 w-5" strokeWidth={2.75} /> Toevoegen
        </button>
      </div>
      <BottomNav />
    </div>
  );
}

type Variant = "A" | "B" | "C" | "D";

const meta: Record<Variant, { label: string; desc: string }> = {
  A: { label: "2列 紧凑",   desc: "卡片缩小 · 图标裸露 · 平衡感强" },
  B: { label: "3列 密集",   desc: "3列网格 · 可容纳更多模块 · 加号作为磁贴" },
  C: { label: "单栏 列表",  desc: "横向布局 · 副标题显示最后记录时间" },
  D: { label: "2列 大字",   desc: "图标更大 · 文字更大 · 触控友好" },
};

export default function DesignPreview() {
  const [active, setActive] = useState<Variant>("A");

  return (
    <div className="min-h-screen" style={{ background: "#161B17", color: "#fff" }}>
      {/* Top selector */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#161B17]/95 backdrop-blur-sm px-4 pt-4 pb-3">
        <p className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
          方案 C 霜冰极简 · 松针绿 · 方案3 排版细化
        </p>
        <div className="grid grid-cols-4 gap-2">
          {(["A", "B", "C", "D"] as Variant[]).map((key) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className="rounded-xl border py-3 px-1 text-center transition-all"
              style={{
                background: active === key ? pine.primary : "rgba(255,255,255,0.05)",
                borderColor: active === key ? pine.primaryDark : "rgba(255,255,255,0.1)",
              }}
            >
              <span className="block text-[11px] font-black" style={{ color: active === key ? "#fff" : "rgba(255,255,255,0.55)" }}>
                {meta[key].label}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-white/40">{meta[active].desc}</p>
      </div>

      {/* Phone preview */}
      <div className="px-4 py-6 mx-auto max-w-sm">
        {active === "A" && <VariantA />}
        {active === "B" && <VariantB />}
        {active === "C" && <VariantC />}
        {active === "D" && <VariantD />}
      </div>
    </div>
  );
}
