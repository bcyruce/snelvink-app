"use client";

import { useState } from "react";
import {
  ClipboardCheck, History, Settings, Thermometer, SprayCan,
  Package, ShoppingCart, Plus, Check, X, Trash2, ChevronRight,
  MoreHorizontal, Bell,
} from "lucide-react";

// 松针绿 · 方案C 霜冰极简 系统色
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
  success:      "#3D7A52",
  successDark:  "#2D6040",
  danger:       "#A63D3D",
  dangerDark:   "#8B2E2E",
  navBg:        "rgba(245,248,246,0.95)",
  navBorder:    "rgba(210,228,215,0.6)",
};

// 玻璃拟态 C 通用样式
const glass = {
  card: {
    background: pine.cardBg,
    border: `1.5px solid ${pine.cardBorder}`,
    backdropFilter: "blur(12px)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  } as React.CSSProperties,
  btnPrimary: {
    background: pine.primary,
    border: `2px solid ${pine.primaryDark}`,
    color: "#fff",
    boxShadow: `0 2px 0 ${pine.primaryDark}, 0 4px 12px ${pine.primary}30`,
  } as React.CSSProperties,
  btnSuccess: {
    background: pine.success,
    border: `2px solid ${pine.successDark}`,
    color: "#fff",
    boxShadow: `0 2px 0 ${pine.successDark}`,
  } as React.CSSProperties,
  btnNeutral: {
    background: "rgba(255,255,255,0.85)",
    border: `2px solid rgba(200,215,205,0.9)`,
    color: pine.fg,
    boxShadow: "0 2px 0 rgba(180,200,186,0.6)",
    backdropFilter: "blur(8px)",
  } as React.CSSProperties,
  btnDanger: {
    background: pine.danger,
    border: `2px solid ${pine.dangerDark}`,
    color: "#fff",
    boxShadow: `0 2px 0 ${pine.dangerDark}`,
  } as React.CSSProperties,
  icon: {
    background: pine.accentBg,
    border: "1.5px solid rgba(255,255,255,0.9)",
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

type Layout = "1" | "2" | "3" | "4";

// ─────────────────────────────────────────────
// 排版方案 1：当前布局优化版
// Header 大字 + 小标签，2列网格卡片，底部导航
// ─────────────────────────────────────────────
function Layout1() {
  return (
    <div className="relative pb-24 overflow-hidden" style={{ background: pine.bgGrad, minHeight: 680, borderRadius: 28 }}>
      {/* Header */}
      <div className="px-5 pt-8 pb-2 flex items-start justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: pine.muted }}>HACCP</span>
          <h1 className="text-4xl font-black tracking-tight mt-0.5" style={{ color: pine.fg }}>SnelVink</h1>
        </div>
        <button className="px-4 py-2.5 rounded-xl text-xs font-black" style={glass.btnNeutral}>Wijzigen</button>
      </div>

      {/* 2-col grid */}
      <div className="grid grid-cols-2 gap-3 px-5 pt-5">
        {modules.map((m, i) => (
          <div key={i} className="flex flex-col items-center justify-center gap-3 py-7 rounded-2xl" style={glass.card}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={glass.icon}>
              <m.icon className="h-6 w-6" strokeWidth={2.5} style={{ color: pine.primary }} />
            </div>
            <span className="text-sm font-black" style={{ color: pine.fg }}>{m.name}</span>
          </div>
        ))}
      </div>

      {/* Add btn */}
      <div className="px-5 pt-4">
        <button className="flex w-full min-h-16 items-center justify-center gap-2 rounded-xl text-sm font-black" style={glass.btnPrimary}>
          <Plus className="h-5 w-5" strokeWidth={2.75} /> Toevoegen
        </button>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 border-t px-3 pb-5 pt-2.5 flex gap-2" style={{ background: pine.navBg, borderColor: pine.navBorder, backdropFilter: "blur(16px)" }}>
        {[{ icon: ClipboardCheck, label: "Taken", active: true }, { icon: History, label: "Geschiedenis", active: false }, { icon: Settings, label: "Instellingen", active: false }].map((t, i) => (
          <button key={i} className="flex flex-1 flex-col items-center justify-center gap-1 min-h-14 text-[10px] font-black rounded-xl" style={t.active ? glass.navItemActive : glass.navItemInactive}>
            <t.icon className="h-5 w-5" strokeWidth={t.active ? 2.5 : 2} />{t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 排版方案 2：单栏大卡片列表
// Header 带日期副标题，模块以横向大卡片展示
// ─────────────────────────────────────────────
function Layout2() {
  return (
    <div className="relative pb-24 overflow-hidden" style={{ background: pine.bgGrad, minHeight: 680, borderRadius: 28 }}>
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: pine.muted }}>HACCP</span>
          <span className="text-[10px] font-bold" style={{ color: pine.muted }}>29 apr 2026</span>
        </div>
        <div className="flex items-end justify-between">
          <h1 className="text-4xl font-black tracking-tight" style={{ color: pine.fg }}>SnelVink</h1>
          <button className="px-4 py-2.5 rounded-xl text-xs font-black" style={glass.btnNeutral}>Wijzigen</button>
        </div>
      </div>

      {/* Single-col list */}
      <div className="flex flex-col gap-2.5 px-5">
        {modules.map((m, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 rounded-2xl" style={glass.card}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0" style={glass.icon}>
              <m.icon className="h-6 w-6" strokeWidth={2.5} style={{ color: pine.primary }} />
            </div>
            <div className="flex-1">
              <p className="font-black text-sm" style={{ color: pine.fg }}>{m.name}</p>
              <p className="text-xs mt-0.5" style={{ color: pine.muted }}>Laatste: vandaag 09:00</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0" style={{ color: pine.muted }} />
          </div>
        ))}
      </div>

      {/* Add btn */}
      <div className="px-5 pt-4">
        <button className="flex w-full min-h-14 items-center justify-center gap-2 rounded-xl text-sm font-black" style={glass.btnPrimary}>
          <Plus className="h-5 w-5" strokeWidth={2.75} /> Toevoegen
        </button>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 border-t px-3 pb-5 pt-2.5 flex gap-2" style={{ background: pine.navBg, borderColor: pine.navBorder, backdropFilter: "blur(16px)" }}>
        {[{ icon: ClipboardCheck, label: "Taken", active: true }, { icon: History, label: "Geschiedenis", active: false }, { icon: Settings, label: "Instellingen", active: false }].map((t, i) => (
          <button key={i} className="flex flex-1 flex-col items-center justify-center gap-1 min-h-14 text-[10px] font-black rounded-xl" style={t.active ? glass.navItemActive : glass.navItemInactive}>
            <t.icon className="h-5 w-5" strokeWidth={t.active ? 2.5 : 2} />{t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 排版方案 3：深色 Header 横幅 + 白色卡片区
// 顶部松针绿横幅，品牌感强，卡片区浮在上面
// ─────────────────────────────────────────────
function Layout3() {
  return (
    <div className="relative pb-24 overflow-hidden" style={{ background: pine.bgGrad, minHeight: 680, borderRadius: 28 }}>
      {/* Dark header banner */}
      <div className="px-5 pt-8 pb-10" style={{ background: pine.primary }}>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">HACCP</span>
            <h1 className="text-4xl font-black tracking-tight text-white mt-0.5">SnelVink</h1>
          </div>
          <button className="px-4 py-2.5 rounded-xl text-xs font-black" style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)", color: "#fff", backdropFilter: "blur(8px)" }}>
            Wijzigen
          </button>
        </div>
      </div>

      {/* Cards float over banner */}
      <div className="px-4 -mt-5">
        <div className="grid grid-cols-2 gap-3">
          {modules.map((m, i) => (
            <div key={i} className="flex flex-col items-center justify-center gap-3 py-7 rounded-2xl" style={{ ...glass.card, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={glass.icon}>
                <m.icon className="h-6 w-6" strokeWidth={2.5} style={{ color: pine.primary }} />
              </div>
              <span className="text-sm font-black" style={{ color: pine.fg }}>{m.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add btn */}
      <div className="px-5 pt-4">
        <button className="flex w-full min-h-16 items-center justify-center gap-2 rounded-xl text-sm font-black" style={glass.btnPrimary}>
          <Plus className="h-5 w-5" strokeWidth={2.75} /> Toevoegen
        </button>
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 right-0 border-t px-3 pb-5 pt-2.5 flex gap-2" style={{ background: pine.navBg, borderColor: pine.navBorder, backdropFilter: "blur(16px)" }}>
        {[{ icon: ClipboardCheck, label: "Taken", active: true }, { icon: History, label: "Geschiedenis", active: false }, { icon: Settings, label: "Instellingen", active: false }].map((t, i) => (
          <button key={i} className="flex flex-1 flex-col items-center justify-center gap-1 min-h-14 text-[10px] font-black rounded-xl" style={t.active ? glass.navItemActive : glass.navItemInactive}>
            <t.icon className="h-5 w-5" strokeWidth={t.active ? 2.5 : 2} />{t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 排版方案 4：大图标 + 文字垂直排列，加号独立悬浮
// ─────────────────────────────────────────────
function Layout4() {
  return (
    <div className="relative pb-24 overflow-hidden" style={{ background: pine.bgGrad, minHeight: 680, borderRadius: 28 }}>
      {/* Header — 超大字 */}
      <div className="px-5 pt-8 pb-6 flex items-start justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: pine.muted }}>HACCP</span>
          <h1 className="text-5xl font-black tracking-tight leading-none mt-1" style={{ color: pine.fg }}>Snel<br/>Vink</h1>
        </div>
        <div className="flex flex-col items-end gap-2 pt-1">
          <button className="px-4 py-2.5 rounded-xl text-xs font-black" style={glass.btnNeutral}>Wijzigen</button>
          <span className="text-[10px] font-bold" style={{ color: pine.muted }}>29 apr 2026</span>
        </div>
      </div>

      {/* 2-col grid — bigger icons */}
      <div className="grid grid-cols-2 gap-3 px-5">
        {modules.map((m, i) => (
          <div key={i} className="flex flex-col items-center justify-center gap-4 py-8 rounded-2xl" style={glass.card}>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ ...glass.icon, boxShadow: `0 4px 16px ${pine.primary}20` }}>
              <m.icon className="h-8 w-8" strokeWidth={2} style={{ color: pine.primary }} />
            </div>
            <div className="text-center px-2">
              <span className="text-sm font-black block" style={{ color: pine.fg }}>{m.name}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Floating add btn — round */}
      <div className="flex justify-center pt-5">
        <button
          className="flex h-16 w-16 items-center justify-center rounded-full text-sm font-black shadow-lg"
          style={{ ...glass.btnPrimary, borderRadius: "50%", boxShadow: `0 4px 0 ${pine.primaryDark}, 0 8px 24px ${pine.primary}40` }}
        >
          <Plus className="h-7 w-7" strokeWidth={2.75} />
        </button>
      </div>

      {/* Bottom Nav — pill style */}
      <div className="absolute bottom-0 left-0 right-0 border-t px-3 pb-5 pt-2.5 flex gap-2" style={{ background: pine.navBg, borderColor: pine.navBorder, backdropFilter: "blur(16px)" }}>
        {[{ icon: ClipboardCheck, label: "Taken", active: true }, { icon: History, label: "Geschiedenis", active: false }, { icon: Settings, label: "Instellingen", active: false }].map((t, i) => (
          <button key={i} className="flex flex-1 flex-col items-center justify-center gap-1 min-h-14 text-[10px] font-black rounded-full" style={t.active ? { ...glass.navItemActive, borderRadius: 9999 } : glass.navItemInactive}>
            <t.icon className="h-5 w-5" strokeWidth={t.active ? 2.5 : 2} />{t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const layoutMeta: Record<Layout, { label: string; desc: string }> = {
  "1": { label: "方案 1", desc: "当前布局优化 — 2列网格，紧凑大字 Header" },
  "2": { label: "方案 2", desc: "单栏大卡片列表 — 带日期副标题，横向信息展示" },
  "3": { label: "方案 3", desc: "深色 Header 横幅 — 品牌感强，卡片浮出横幅" },
  "4": { label: "方案 4", desc: "大图标版 — 超大字 + 大图标，圆形加号悬浮按钮" },
};

export default function DesignPreview() {
  const [active, setActive] = useState<Layout>("1");

  return (
    <div className="min-h-screen" style={{ background: "#161B17", color: "#fff" }}>
      {/* Top selector */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#161B17]/95 backdrop-blur-sm px-4 pt-4 pb-3">
        <p className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
          方案 C 霜冰极简 · 松针绿 · 排版对比
        </p>
        <div className="grid grid-cols-4 gap-2">
          {(["1", "2", "3", "4"] as Layout[]).map((key) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className="rounded-xl border py-3 px-1 text-center transition-all"
              style={{
                background: active === key ? pine.primary : "rgba(255,255,255,0.05)",
                borderColor: active === key ? pine.primaryDark : "rgba(255,255,255,0.1)",
              }}
            >
              <span className="block text-xs font-black" style={{ color: active === key ? "#fff" : "rgba(255,255,255,0.55)" }}>
                {layoutMeta[key].label}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-white/40">{layoutMeta[active].desc}</p>
      </div>

      {/* Phone preview */}
      <div className="px-4 py-6 mx-auto max-w-sm">
        {active === "1" && <Layout1 />}
        {active === "2" && <Layout2 />}
        {active === "3" && <Layout3 />}
        {active === "4" && <Layout4 />}
      </div>
    </div>
  );
}
