"use client";

import { useState } from "react";
import {
  ClipboardCheck, History, Settings, Thermometer, SprayCan,
  Package, Plus, Pencil, CheckSquare, Zap, Check,
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

// ─── Logo 变体定义 ───
type LogoVariant = "A" | "B" | "C" | "D" | "E";

// Logo A：纯文字 checkmark，简洁
function LogoA({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center" style={{ gap: size * 0.25 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          background: "rgba(255,255,255,0.18)",
          border: "1.5px solid rgba(255,255,255,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Check
          style={{ width: size * 0.55, height: size * 0.55, color: "#fff", strokeWidth: 3 }}
        />
      </div>
      <div>
        <div style={{ fontSize: size * 0.32, fontWeight: 900, color: "rgba(255,255,255,0.45)", letterSpacing: "0.25em", lineHeight: 1, textTransform: "uppercase" }}>HACCP</div>
        <div style={{ fontSize: size * 0.72, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1, marginTop: 2 }}>SnelVink</div>
      </div>
    </div>
  );
}

// Logo B：双字母 SV 图标，几何感
function LogoB({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center" style={{ gap: size * 0.25 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.22,
          background: "rgba(255,255,255,0.2)",
          border: "1.5px solid rgba(255,255,255,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: size * 0.42, fontWeight: 900, color: "#fff", letterSpacing: "-0.05em", lineHeight: 1 }}>SV</span>
      </div>
      <div>
        <div style={{ fontSize: size * 0.28, fontWeight: 800, color: "rgba(255,255,255,0.45)", letterSpacing: "0.22em", lineHeight: 1, textTransform: "uppercase" }}>HACCP</div>
        <div
          style={{
            fontSize: size * 0.68,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            marginTop: 2,
            fontStyle: "italic",
          }}
        >
          SnelVink
        </div>
      </div>
    </div>
  );
}

// Logo C：竖线分隔，字体细长
function LogoC({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center" style={{ gap: size * 0.28 }}>
      <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
            border: "1.5px solid rgba(255,255,255,0.25)",
          }}
        />
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Zap style={{ width: size * 0.5, height: size * 0.5, color: "#fff", fill: "rgba(255,255,255,0.9)" }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "stretch", gap: size * 0.2 }}>
        <div style={{ width: 1.5, background: "rgba(255,255,255,0.3)", borderRadius: 2, alignSelf: "stretch" }} />
        <div>
          <div style={{ fontSize: size * 0.28, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.22em", lineHeight: 1, textTransform: "uppercase" }}>HACCP</div>
          <div style={{ fontSize: size * 0.68, fontWeight: 900, color: "#fff", letterSpacing: "0.01em", lineHeight: 1.1, marginTop: 2 }}>SnelVink</div>
        </div>
      </div>
    </div>
  );
}

// Logo D：圆形纯符号 logo，极简
function LogoD({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center" style={{ gap: size * 0.25 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          border: "2px solid rgba(255,255,255,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)",
        }}
      >
        <ClipboardCheck style={{ width: size * 0.52, height: size * 0.52, color: "#fff", strokeWidth: 2 }} />
      </div>
      <div>
        <div style={{ fontSize: size * 0.72, fontWeight: 900, color: "#fff", letterSpacing: "0.06em", lineHeight: 1, textTransform: "uppercase" }}>SNELVINK</div>
        <div style={{ fontSize: size * 0.28, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.18em", lineHeight: 1, marginTop: 3, textTransform: "uppercase" }}>HACCP Dashboard</div>
      </div>
    </div>
  );
}

// Logo E：方块截断风格，大胆现代
function LogoE({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center" style={{ gap: size * 0.22 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.2,
          background: pine.primaryDark,
          border: "1.5px solid rgba(255,255,255,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{
          position: "absolute",
          top: -size * 0.2,
          right: -size * 0.2,
          width: size * 0.7,
          height: size * 0.7,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.07)",
        }} />
        <span style={{ fontSize: size * 0.52, fontWeight: 900, color: "#fff", letterSpacing: "-0.05em", lineHeight: 1, position: "relative" }}>SV</span>
      </div>
      <div>
        <div style={{ fontSize: size * 0.75, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 0.95 }}>Snel<span style={{ color: "rgba(255,255,255,0.5)" }}>Vink</span></div>
        <div style={{ fontSize: size * 0.26, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", marginTop: 3, textTransform: "uppercase" }}>HACCP</div>
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
  A: { label: "Check 图标", desc: "圆角方块 + 对勾 · 分层HACCP标签 · 无衬线粗体" },
  B: { label: "SV 斜体",    desc: "SV缩写方块 + 斜体粗体字 · 有力动感" },
  C: { label: "竖线+闪电",  desc: "圆形闪电图标 + 竖线分隔 · 干净利落" },
  D: { label: "圆形剪贴板", desc: "圆形图标 + 全大写宽字距 · 极简权威" },
  E: { label: "双色分字",   desc: "SV深色方块 + Snel/Vink双色 · 大胆现代" },
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
