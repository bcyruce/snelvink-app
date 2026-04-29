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

type FontVariant = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

// 字体方案 A：经典现代 — 大写超紧凑
function TitleA() {
  return (
    <div>
      <div style={{
        fontSize: 52,
        fontWeight: 900,
        color: "#fff",
        letterSpacing: "-0.08em",
        lineHeight: 1,
        fontFamily: "'Arial Black', sans-serif",
        textTransform: "uppercase",
        textShadow: "0 2px 4px rgba(0,0,0,0.2)"
      }}>
        SnelVink
      </div>
    </div>
  );
}

// 字体方案 B：优雅衬线 — 专业高端感
function TitleB() {
  return (
    <div style={{
      fontSize: 48,
      fontWeight: 700,
      color: "#fff",
      letterSpacing: "-0.02em",
      lineHeight: 1,
      fontFamily: "'Georgia', serif",
      fontStyle: "normal"
    }}>
      SnelVink
    </div>
  );
}

// 字体方案 C：几何现代 — 未来科技感
function TitleC({ compact = false }: { compact?: boolean }) {
  const size = compact ? 28 : 44;
  return (
    <div>
      <div style={{
        fontSize: size,
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
        fontSize: compact ? 9.5 : 12,
        fontWeight: 600,
        color: "rgba(255,255,255,0.45)",
        letterSpacing: "0.15em",
        marginTop: compact ? 3 : 5,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}>
        Meten · Vinken · Weten
      </div>
    </div>
  );
}

// 字体方案 D：粗体块状 — 有力冲击感
function TitleD() {
  return (
    <div style={{
      fontSize: 60,
      fontWeight: 900,
      color: "#fff",
      letterSpacing: "-0.05em",
      lineHeight: 0.9,
      fontFamily: "'Impact', sans-serif",
      textTransform: "uppercase"
    }}>
      SNELVINK
    </div>
  );
}

// 字体方案 E：流畅圆润 — 友好易读
function TitleE() {
  return (
    <div style={{
      fontSize: 50,
      fontWeight: 700,
      color: "#fff",
      letterSpacing: "-0.01em",
      lineHeight: 1,
      fontFamily: "'Segoe UI', sans-serif"
    }}>
      SnelVink
    </div>
  );
}

// 字体方案 F：混合大小 — 视觉层级
function TitleF() {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <div style={{
        fontSize: 36,
        fontWeight: 900,
        color: "#fff",
        letterSpacing: "-0.08em",
        lineHeight: 1,
        fontFamily: "'Arial Black', sans-serif",
        textTransform: "uppercase"
      }}>
        Snel
      </div>
      <div style={{
        fontSize: 48,
        fontWeight: 900,
        color: "rgba(255,255,255,0.7)",
        letterSpacing: "-0.04em",
        lineHeight: 1,
        fontFamily: "'Arial Black', sans-serif",
        textTransform: "uppercase"
      }}>
        Vink
      </div>
    </div>
  );
}

// 字体方案 G：竖排强调 — 时尚现代
function TitleG() {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{
        width: 3,
        height: 54,
        background: "rgba(255,255,255,0.5)",
        borderRadius: "2px"
      }} />
      <div style={{
        fontSize: 48,
        fontWeight: 900,
        color: "#fff",
        letterSpacing: "-0.03em",
        lineHeight: 1,
        fontFamily: "'Verdana', sans-serif"
      }}>
        SnelVink
      </div>
    </div>
  );
}

// 字体方案 H：低对比斜体 — 优雅动感
function TitleH() {
  return (
    <div style={{
      fontSize: 52,
      fontWeight: 700,
      color: "#fff",
      letterSpacing: "0.02em",
      lineHeight: 1,
      fontFamily: "'Georgia', serif",
      fontStyle: "italic",
      transform: "skewX(-8deg)"
    }}>
      SnelVink
    </div>
  );
}

const fontMeta: Record<FontVariant, { label: string; desc: string }> = {
  A: { label: "经典现代", desc: "超紧凑 · 大写 · 有力冲击 · 专业工业感" },
  B: { label: "优雅衬线", desc: "传统衬线 · 高端气质 · 成熟稳重 · 信任感" },
  C: { label: "几何未来", desc: "宽字距 · 几何感 · 科技感强 · 国际范" },
  D: { label: "粗体块状", desc: "超粗超紧凑 · 冲击力最强 · 记忆度高" },
  E: { label: "流畅圆润", desc: "系统默认 · 高易读性 · 友好亲切 · 大众化" },
  F: { label: "混合分层", desc: "两个尺寸 · 视觉层级 · 强调 Vink · 现代设计" },
  G: { label: "竖线强调", desc: "左侧竖线 · 独特标志 · 设计感强 · 视觉焦点" },
  H: { label: "斜体优雅", desc: "衬线+斜体 · 动感十足 · 高端时尚 · 现代优雅" },
};

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

export default function DesignPreview() {
  const [active, setActive] = useState<FontVariant>("A");

  return (
    <div className="min-h-screen" style={{ background: "#161B17", color: "#fff" }}>
      {/* Selector */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[#161B17]/95 backdrop-blur-sm px-4 pt-4 pb-3">
        <p className="mb-2.5 text-center text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
          SnelVink 字体方案 — 松针绿主题
        </p>
        <div className="grid grid-cols-4 gap-2">
          {(["A", "B", "C", "D", "E", "F", "G", "H"] as FontVariant[]).map((key) => (
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
          <span className="text-[12px] font-black text-white/70">{fontMeta[active].label}</span>
          <span className="ml-2 text-[11px] text-white/35">{fontMeta[active].desc}</span>
        </div>
      </div>

      {/* 字体大图展示区 */}
      <div className="px-6 py-12">
        <div className="rounded-2xl flex items-center justify-center py-16 px-6"
          style={{ background: pine.primary }}
        >
          {active === "A" && <TitleA />}
          {active === "B" && <TitleB />}
          {active === "C" && <TitleC />}
          {active === "D" && <TitleD />}
          {active === "E" && <TitleE />}
          {active === "F" && <TitleF />}
          {active === "G" && <TitleG />}
          {active === "H" && <TitleH />}
        </div>
        <p className="mt-2 text-center text-[10px] text-white/25 uppercase tracking-widest">大图预览</p>
      </div>

      {/* Phone preview */}
      <div className="px-4 pb-10 mx-auto max-w-sm">
        <div className="relative overflow-hidden" style={{ background: pine.bgGrad, minHeight: 680, borderRadius: 28 }}>
          {/* Header with selected font */}
          <div className="px-5 pt-6 pb-5" style={{ background: pine.primary }}>
            <div className="min-w-0">
              {active === "A" && <TitleA />}
              {active === "B" && <TitleB />}
              {active === "C" && <TitleC compact />}
              {active === "D" && <TitleD />}
              {active === "E" && <TitleE />}
              {active === "F" && <TitleF />}
              {active === "G" && <TitleG />}
              {active === "H" && <TitleH />}
            </div>
          </div>

          {/* Wijzigen button in light section */}
          <div className="px-4 pt-5 pb-0 flex justify-end">
            <button
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-black"
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
          </div>

          <ModuleGrid />
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
