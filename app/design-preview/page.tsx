"use client";

import { useState } from "react";
import {
  ClipboardCheck, History, Settings, Thermometer, SprayCan,
  Package, Plus, Pencil, CheckSquare, Zap, Check, Leaf, Shield
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

type LogoVariant = "A" | "B" | "C" | "D" | "E";

// Logo A：双层环形图案，几何抽象
function LogoA({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center" style={{ gap: size * 0.3 }}>
      <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
        {/* 外环 */}
        <svg width={size} height={size} style={{ position: "absolute" }}>
          <circle cx={size/2} cy={size/2} r={size/2 - 2} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <circle cx={size/2} cy={size/2} r={size/2 - 5} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeDasharray={`${size * 0.4} ${size * 0.3}`} />
          {/* 中心点 */}
          <circle cx={size/2} cy={size/2} r="3" fill="rgba(255,255,255,0.6)" />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: size * 0.85, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 0.95 }}>
          SnelVink
        </div>
        <div style={{ fontSize: size * 0.28, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em", marginTop: 1 }}>
          QUALITY CHECK
        </div>
      </div>
    </div>
  );
}

// Logo B：竖排盾牌 + S 字，品牌感强
function LogoB({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center" style={{ gap: size * 0.28 }}>
      <div style={{ position: "relative", flexShrink: 0, width: size * 0.8, height: size }}>
        <svg width={size * 0.8} height={size} viewBox="0 0 28 36" style={{ position: "absolute" }}>
          {/* 盾牌 */}
          <path
            d="M14 1 C14 1, 6 5, 6 12 C6 22, 14 31, 14 31 C14 31, 22 22, 22 12 C22 5, 14 1, 14 1"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1.5"
          />
          {/* 内部 S 曲线 */}
          <path
            d="M14 8 Q 18 11, 18 15 Q 18 19, 14 22"
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: size * 0.8, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
          SnelVink
        </div>
        <div style={{ fontSize: size * 0.26, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", marginTop: 2, textTransform: "uppercase" }}>
          Food Safety
        </div>
      </div>
    </div>
  );
}

// Logo C：叶片六边形组合，生态感
function LogoC({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center" style={{ gap: size * 0.3 }}>
      <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 40 40">
          {/* 中心六边形 */}
          <polygon
            points="20,8 30,14 30,26 20,32 10,26 10,14"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1.2"
          />
          {/* 三个递进叶片 */}
          <path d="M20 15 Q 25 18 25 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M20 12 Q 28 16 28 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M20 18 Q 22 22 20 26" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: size * 0.8, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
          SnelVink
        </div>
        <div style={{ fontSize: size * 0.26, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", marginTop: 2 }}>
          ORGANIC CONTROL
        </div>
      </div>
    </div>
  );
}

// Logo D：折线检查波形，动态感
function LogoD({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center" style={{ gap: size * 0.28 }}>
      <div style={{ position: "relative", flexShrink: 0, width: size * 0.85, height: size * 0.7, display: "flex", alignItems: "center" }}>
        <svg width={size * 0.85} height={size * 0.7} viewBox="0 0 36 24">
          {/* 波形背景 */}
          <path d="M2 12 Q 8 4, 14 12 T 26 12 L 34 8" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
          {/* 检查标记 */}
          <path d="M2 14 L 8 20 L 16 8" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: size * 0.82, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
          SnelVink
        </div>
        <div style={{ fontSize: size * 0.26, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em", marginTop: 2, textTransform: "uppercase" }}>
          Real-time Check
        </div>
      </div>
    </div>
  );
}

// Logo E：分层立体圆形，现代感
function LogoE({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center" style={{ gap: size * 0.3 }}>
      <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
        {/* 外层圆 */}
        <svg width={size} height={size} style={{ position: "absolute" }}>
          {/* 三层圆环 */}
          <circle cx={size/2} cy={size/2} r={size/2 - 2} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          <circle cx={size/2} cy={size/2} r={size/2 - 8} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
          <circle cx={size/2} cy={size/2} r={size/2 - 14} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          {/* 中心点阵 */}
          <circle cx={size/2 - 3} cy={size/2 - 3} r="1.5" fill="rgba(255,255,255,0.6)" />
          <circle cx={size/2 + 3} cy={size/2 - 3} r="1.5" fill="rgba(255,255,255,0.4)" />
          <circle cx={size/2} cy={size/2 + 4} r="1.5" fill="rgba(255,255,255,0.5)" />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: size * 0.8, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>
          SnelVink
        </div>
        <div style={{ fontSize: size * 0.26, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", marginTop: 2 }}>
          PRECISION SYSTEM
        </div>
      </div>
    </div>
  );
}

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

const logoMeta: Record<LogoVariant, { label: string; desc: string }> = {
  A: { label: "圆形虚线", desc: "双层环形几何 · 简约抽象 · 现代科技感" },
  B: { label: "盾牌 S 曲", desc: "盾牌+S波线 · 品牌保护象征 · 优雅动感" },
  C: { label: "六边形叶", desc: "六边形结构 · 三层叶片 · 生态专业感" },
  D: { label: "波形检查", desc: "折线+检查标 · 实时监测感 · 动态活力" },
  E: { label: "分层圆环", desc: "三层圆环 · 精准点阵 · 系统感最强" },
};

export default function DesignPreview() {
  const [active, setActive] = useState<LogoVariant>("A");

  return (
    <div className="min-h-screen" style={{ background: "#161B17", color: "#fff" }}>
      {/* Selector */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#161B17]/95 backdrop-blur-sm px-4 pt-4 pb-3">
        <p className="mb-2.5 text-center text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
          Logo 与字体方案 — 松针绿主题
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {(["A", "B", "C", "D", "E"] as LogoVariant[]).map((key) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className="rounded-xl border py-2.5 px-1 text-center transition-all"
              style={{
                background: active === key ? pine.primary : "rgba(255,255,255,0.05)",
                borderColor: active === key ? pine.primaryDark : "rgba(255,255,255,0.1)",
              }}
            >
              <span className="block text-[11px] font-black leading-tight" style={{ color: active === key ? "#fff" : "rgba(255,255,255,0.5)" }}>
                {key}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-2 text-center">
          <span className="text-[12px] font-black text-white/70">{logoMeta[active].label}</span>
          <span className="ml-2 text-[11px] text-white/35">{logoMeta[active].desc}</span>
        </div>
      </div>

      {/* Logo 大图展示区 */}
      <div className="px-6 py-6">
        <div
          className="rounded-2xl flex items-center justify-center py-10 px-6"
          style={{ background: pine.primary }}
        >
          {active === "A" && <LogoA size={44} />}
          {active === "B" && <LogoB size={44} />}
          {active === "C" && <LogoC size={44} />}
          {active === "D" && <LogoD size={44} />}
          {active === "E" && <LogoE size={44} />}
        </div>
        <p className="mt-2 text-center text-[10px] text-white/25 uppercase tracking-widest">大图预览</p>
      </div>

      {/* Phone preview */}
      <div className="px-4 pb-10 mx-auto max-w-sm">
        <div className="relative overflow-hidden" style={{ background: pine.bgGrad, minHeight: 680, borderRadius: 28 }}>
          {/* Header with Pill style (方案1) + selected logo */}
          <div className="px-5 pt-7 pb-6" style={{ background: pine.primary }}>
            <div className="flex items-end justify-between">
              <div>
                {active === "A" && <LogoA size={34} />}
                {active === "B" && <LogoB size={34} />}
                {active === "C" && <LogoC size={34} />}
                {active === "D" && <LogoD size={34} />}
                {active === "E" && <LogoE size={34} />}
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
          <ModuleGrid />
          <BottomNav />
        </div>
        <p className="mt-2 text-center text-[10px] text-white/25 uppercase tracking-widest">实机预览</p>
      </div>
    </div>
  );
}
