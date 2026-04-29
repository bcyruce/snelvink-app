"use client";

import { useState } from "react";
import { ClipboardCheck, History, Settings, Thermometer, SprayCan, Package, Plus, Check, X, Trash2, ChevronRight } from "lucide-react";

// 松针绿主题色
const pine = {
  primary: "#3D5C45",
  primaryDark: "#2D4A35",
  primaryLight: "#4A6B52",
  background: "#F5F7F5",
  foreground: "#1E2E22",
  accentBg: "#E4EDE6",
  accentBorder: "#BDD0C2",
  cardBg: "#FFFFFF",
  cardBorder: "#D4E0D8",
  mutedText: "#5A7060",
  success: "#3D7A52",
  successDark: "#2D6040",
  danger: "#A63D3D",
  dangerDark: "#8B2E2E",
};

type StyleKey = "supercell" | "soft" | "sharp" | "neumorphic" | "glassmorphic" | "outline";

interface StyleConfig {
  name: string;
  description: string;
  buttonClass: string;
  buttonStyle: React.CSSProperties;
  buttonActiveStyle: React.CSSProperties;
  cardClass: string;
  cardStyle: React.CSSProperties;
  navClass: string;
  navStyle: React.CSSProperties;
  navActiveClass: string;
  navActiveStyle: React.CSSProperties;
}

const styles: Record<StyleKey, StyleConfig> = {
  supercell: {
    name: "游戏风格",
    description: "厚实底边，立体感强，点击反馈明显",
    buttonClass: "rounded-2xl border-2 border-b-[5px] font-black",
    buttonStyle: {
      background: pine.primary,
      borderColor: pine.primaryDark,
      color: "#FFFFFF",
      boxShadow: "none",
    },
    buttonActiveStyle: {
      background: pine.primaryLight,
      borderColor: pine.primary,
    },
    cardClass: "rounded-2xl border-2 border-b-[5px]",
    cardStyle: {
      background: pine.cardBg,
      borderColor: pine.cardBorder,
      borderBottomColor: pine.accentBorder,
    },
    navClass: "rounded-xl border-2 border-b-4",
    navStyle: {
      background: pine.cardBg,
      borderColor: pine.cardBorder,
    },
    navActiveClass: "rounded-xl border-2 border-b-4",
    navActiveStyle: {
      background: pine.primary,
      borderColor: pine.primaryDark,
      color: "#FFFFFF",
    },
  },
  soft: {
    name: "柔和圆润",
    description: "大圆角，柔和阴影，现代简约",
    buttonClass: "rounded-[20px] font-bold",
    buttonStyle: {
      background: pine.primary,
      border: "none",
      color: "#FFFFFF",
      boxShadow: `0 4px 14px ${pine.primary}40, 0 2px 4px ${pine.primary}20`,
    },
    buttonActiveStyle: {
      background: pine.primaryLight,
      boxShadow: `0 6px 20px ${pine.primary}50`,
    },
    cardClass: "rounded-[24px]",
    cardStyle: {
      background: pine.cardBg,
      border: "none",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
    },
    navClass: "rounded-[16px]",
    navStyle: {
      background: pine.accentBg,
      border: "none",
    },
    navActiveClass: "rounded-[16px]",
    navActiveStyle: {
      background: pine.primary,
      color: "#FFFFFF",
      boxShadow: `0 4px 12px ${pine.primary}30`,
    },
  },
  sharp: {
    name: "锐利极简",
    description: "小圆角，硬朗线条，专业干练",
    buttonClass: "rounded-lg font-bold border-2",
    buttonStyle: {
      background: pine.primary,
      borderColor: pine.primaryDark,
      color: "#FFFFFF",
      boxShadow: "none",
    },
    buttonActiveStyle: {
      background: pine.primaryLight,
    },
    cardClass: "rounded-lg border-2",
    cardStyle: {
      background: pine.cardBg,
      borderColor: pine.cardBorder,
    },
    navClass: "rounded-md border-2",
    navStyle: {
      background: pine.cardBg,
      borderColor: pine.cardBorder,
    },
    navActiveClass: "rounded-md border-2",
    navActiveStyle: {
      background: pine.primary,
      borderColor: pine.primaryDark,
      color: "#FFFFFF",
    },
  },
  neumorphic: {
    name: "新拟态",
    description: "凸起质感，内外阴影，触感真实",
    buttonClass: "rounded-2xl font-bold",
    buttonStyle: {
      background: pine.primary,
      border: "none",
      color: "#FFFFFF",
      boxShadow: `4px 4px 10px ${pine.primaryDark}60, -2px -2px 8px ${pine.primaryLight}40, inset 0 1px 0 ${pine.primaryLight}50`,
    },
    buttonActiveStyle: {
      boxShadow: `inset 3px 3px 8px ${pine.primaryDark}60, inset -2px -2px 6px ${pine.primaryLight}30`,
    },
    cardClass: "rounded-2xl",
    cardStyle: {
      background: pine.background,
      border: "none",
      boxShadow: "6px 6px 16px rgba(0,0,0,0.08), -6px -6px 16px rgba(255,255,255,0.9)",
    },
    navClass: "rounded-xl",
    navStyle: {
      background: pine.background,
      boxShadow: "3px 3px 8px rgba(0,0,0,0.06), -3px -3px 8px rgba(255,255,255,0.8)",
    },
    navActiveClass: "rounded-xl",
    navActiveStyle: {
      background: pine.primary,
      color: "#FFFFFF",
      boxShadow: `inset 2px 2px 6px ${pine.primaryDark}50, inset -1px -1px 4px ${pine.primaryLight}30`,
    },
  },
  glassmorphic: {
    name: "玻璃拟态",
    description: "半透明毛玻璃，轻盈通透，现代感强",
    buttonClass: "rounded-2xl font-bold border",
    buttonStyle: {
      background: `linear-gradient(135deg, ${pine.primary}E6 0%, ${pine.primaryDark}E6 100%)`,
      borderColor: `${pine.primaryLight}60`,
      color: "#FFFFFF",
      backdropFilter: "blur(8px)",
      boxShadow: `0 4px 16px ${pine.primary}30`,
    },
    buttonActiveStyle: {
      background: `linear-gradient(135deg, ${pine.primaryLight}E6 0%, ${pine.primary}E6 100%)`,
    },
    cardClass: "rounded-2xl border",
    cardStyle: {
      background: "rgba(255,255,255,0.7)",
      borderColor: "rgba(255,255,255,0.5)",
      backdropFilter: "blur(12px)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    },
    navClass: "rounded-xl border",
    navStyle: {
      background: "rgba(255,255,255,0.5)",
      borderColor: "rgba(255,255,255,0.4)",
      backdropFilter: "blur(8px)",
    },
    navActiveClass: "rounded-xl",
    navActiveStyle: {
      background: `${pine.primary}E6`,
      color: "#FFFFFF",
      backdropFilter: "blur(8px)",
    },
  },
  outline: {
    name: "线框风格",
    description: "纯边框设计，极简透气，轻量清爽",
    buttonClass: "rounded-xl font-bold border-[3px]",
    buttonStyle: {
      background: "transparent",
      borderColor: pine.primary,
      color: pine.primary,
      boxShadow: "none",
    },
    buttonActiveStyle: {
      background: pine.primary,
      color: "#FFFFFF",
    },
    cardClass: "rounded-xl border-[3px]",
    cardStyle: {
      background: "transparent",
      borderColor: pine.cardBorder,
    },
    navClass: "rounded-lg border-[3px]",
    navStyle: {
      background: "transparent",
      borderColor: pine.cardBorder,
    },
    navActiveClass: "rounded-lg border-[3px]",
    navActiveStyle: {
      background: pine.primary,
      borderColor: pine.primary,
      color: "#FFFFFF",
    },
  },
};

const allStyleKeys = Object.keys(styles) as StyleKey[];

const modules = [
  { name: "Koel Temp", icon: Thermometer },
  { name: "Kern Temp", icon: Thermometer },
  { name: "Schoonmaak", icon: SprayCan },
  { name: "Ontvangst", icon: Package },
];

export default function DesignPreview() {
  const [activeStyle, setActiveStyle] = useState<StyleKey>("supercell");
  const style = styles[activeStyle];

  return (
    <div 
      className="min-h-screen pb-44" 
      style={{ 
        background: activeStyle === "glassmorphic" 
          ? `linear-gradient(135deg, ${pine.background} 0%, ${pine.accentBg} 50%, #E8F0EA 100%)`
          : pine.background, 
        color: pine.foreground,
        transition: "all 0.3s ease" 
      }}
    >

      {/* Sticky Selector */}
      <div
        className="sticky top-0 z-50 border-b-2 px-4 pt-4 pb-3"
        style={{ 
          background: activeStyle === "glassmorphic" ? "rgba(255,255,255,0.8)" : pine.cardBg, 
          borderColor: pine.cardBorder,
          backdropFilter: activeStyle === "glassmorphic" ? "blur(12px)" : "none",
        }}
      >
        <p className="mb-3 text-center text-xs font-black uppercase tracking-widest" style={{ color: pine.mutedText }}>
          松针绿 - 选择 UI 风格
        </p>
        <div className="grid grid-cols-3 gap-2">
          {allStyleKeys.map((key) => {
            const s = styles[key];
            const isActive = activeStyle === key;
            return (
              <button
                key={key}
                onClick={() => setActiveStyle(key)}
                className="flex flex-col items-center gap-1 rounded-xl border-2 border-b-4 py-2 px-1 transition-all"
                style={{
                  background: isActive ? pine.primary : pine.cardBg,
                  borderColor: isActive ? pine.primaryDark : pine.cardBorder,
                }}
              >
                <span
                  className="text-xs font-black leading-tight text-center"
                  style={{ color: isActive ? "#FFFFFF" : pine.foreground }}
                >
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active description */}
        <div
          className="mt-3 rounded-xl border-2 px-3 py-2"
          style={{ background: pine.accentBg, borderColor: pine.accentBorder }}
        >
          <p className="text-center text-sm font-black" style={{ color: pine.primary }}>
            {style.name}
          </p>
          <p className="text-center text-xs mt-0.5" style={{ color: pine.mutedText }}>
            {style.description}
          </p>
        </div>
      </div>

      {/* App Preview */}
      <div className="px-5 pt-6 space-y-5">

        {/* Header */}
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: pine.primary }}>
              HACCP
            </p>
            <h1 className="mt-0.5 text-4xl font-black tracking-tight" style={{ color: pine.foreground }}>
              SnelVink
            </h1>
          </div>
          <button
            className={`${style.buttonClass} px-4 py-2.5 text-sm`}
            style={{ 
              ...style.buttonStyle,
              background: pine.cardBg,
              borderColor: pine.cardBorder,
              color: pine.foreground,
            }}
          >
            Wijzigen
          </button>
        </header>

        {/* Module Cards */}
        <div className="grid grid-cols-2 gap-4">
          {modules.map((mod, idx) => (
            <div
              key={idx}
              className={`${style.cardClass} flex min-h-[140px] flex-col items-center justify-center gap-3 px-4 text-center`}
              style={style.cardStyle}
            >
              <div
                className="flex h-13 w-13 items-center justify-center rounded-xl"
                style={{ background: pine.accentBg }}
              >
                <mod.icon className="h-7 w-7" strokeWidth={2.5} style={{ color: pine.primary }} />
              </div>
              <span className="text-sm font-black leading-tight" style={{ color: pine.foreground }}>
                {mod.name}
              </span>
            </div>
          ))}
        </div>

        {/* Primary Add Button */}
        <button
          className={`${style.buttonClass} flex w-full min-h-[72px] flex-col items-center justify-center gap-1.5 text-base`}
          style={style.buttonStyle}
        >
          <Plus className="h-6 w-6" strokeWidth={2.75} />
          Toevoegen
        </button>

        {/* Button Variants Section */}
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: pine.mutedText }}>
            按钮样式变体
          </p>
          <div className="space-y-3">
            {/* Row 1: Primary actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                className={`${style.buttonClass} py-3.5 text-sm flex items-center justify-center gap-2`}
                style={style.buttonStyle}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
                主要操作
              </button>
              <button
                className={`${style.buttonClass} py-3.5 text-sm flex items-center justify-center gap-2`}
                style={{ 
                  ...style.buttonStyle, 
                  background: activeStyle === "outline" ? "transparent" : pine.success, 
                  borderColor: activeStyle === "outline" ? pine.success : pine.successDark,
                  color: activeStyle === "outline" ? pine.success : "#FFFFFF",
                  boxShadow: activeStyle === "soft" ? `0 4px 14px ${pine.success}40` : style.buttonStyle.boxShadow,
                }}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
                确认完成
              </button>
            </div>
            
            {/* Row 2: Secondary actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                className={`${style.buttonClass} py-3.5 text-sm flex items-center justify-center gap-2`}
                style={{ 
                  ...style.buttonStyle,
                  background: activeStyle === "outline" || activeStyle === "glassmorphic" ? "transparent" : pine.cardBg,
                  borderColor: pine.cardBorder,
                  color: pine.foreground,
                  boxShadow: activeStyle === "soft" ? "0 2px 8px rgba(0,0,0,0.06)" : (activeStyle === "neumorphic" ? "3px 3px 8px rgba(0,0,0,0.06), -3px -3px 8px rgba(255,255,255,0.8)" : "none"),
                }}
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
                取消
              </button>
              <button
                className={`${style.buttonClass} py-3.5 text-sm flex items-center justify-center gap-2`}
                style={{ 
                  ...style.buttonStyle, 
                  background: activeStyle === "outline" ? "transparent" : pine.danger, 
                  borderColor: activeStyle === "outline" ? pine.danger : pine.dangerDark,
                  color: activeStyle === "outline" ? pine.danger : "#FFFFFF",
                  boxShadow: activeStyle === "soft" ? `0 4px 14px ${pine.danger}40` : style.buttonStyle.boxShadow,
                }}
              >
                <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                删除
              </button>
            </div>

            {/* Row 3: Full width action */}
            <button
              className={`${style.buttonClass} w-full py-4 text-sm flex items-center justify-center gap-2`}
              style={style.buttonStyle}
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
              继续下一步
            </button>
          </div>
        </div>

        {/* Card Variants */}
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: pine.mutedText }}>
            卡片样式
          </p>
          <div className="space-y-3">
            {/* Info card */}
            <div
              className={`${style.cardClass} p-4`}
              style={style.cardStyle}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
                  style={{ background: pine.accentBg }}
                >
                  <Thermometer className="h-6 w-6" strokeWidth={2.5} style={{ color: pine.primary }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-base" style={{ color: pine.foreground }}>Koelkast #1</p>
                  <p className="text-sm" style={{ color: pine.mutedText }}>Laatst: 4.2°C</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0" style={{ color: pine.mutedText }} />
              </div>
            </div>

            {/* Status card */}
            <div
              className={`${style.cardClass} p-4`}
              style={{
                ...style.cardStyle,
                borderColor: activeStyle === "outline" || activeStyle === "sharp" || activeStyle === "supercell" ? pine.success : style.cardStyle.borderColor,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full shrink-0"
                  style={{ background: `${pine.success}20` }}
                >
                  <Check className="h-5 w-5" strokeWidth={3} style={{ color: pine.success }} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ color: pine.success }}>Vandaag voltooid</p>
                  <p className="text-xs" style={{ color: pine.mutedText }}>Schoonmaak om 14:30</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Input Style Preview */}
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-wider" style={{ color: pine.mutedText }}>
            输入框样式
          </p>
          <div className="space-y-3">
            <div
              className={`${style.cardClass} px-4 py-3`}
              style={style.cardStyle}
            >
              <label className="text-xs font-bold block mb-1" style={{ color: pine.mutedText }}>温度</label>
              <div className="flex items-center">
                <span className="text-2xl font-black" style={{ color: pine.foreground }}>4.2</span>
                <span className="text-lg font-bold ml-1" style={{ color: pine.mutedText }}>°C</span>
              </div>
            </div>
          </div>
        </div>

        {/* Color System */}
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-wider" style={{ color: pine.mutedText }}>
            色彩系统
          </p>
          <div className="flex gap-2">
            {[
              { label: "主色", color: pine.primary, border: pine.primaryDark },
              { label: "成功", color: pine.success, border: pine.successDark },
              { label: "危险", color: pine.danger, border: pine.dangerDark },
              { label: "背景", color: pine.background, border: pine.cardBorder },
              { label: "文字", color: pine.foreground, border: pine.foreground },
            ].map((sw) => (
              <div key={sw.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="h-10 w-full rounded-lg border-2" style={{ background: sw.color, borderColor: sw.border }} />
                <span className="text-[9px] font-bold" style={{ color: pine.mutedText }}>{sw.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 border-t-2"
        style={{ 
          background: activeStyle === "glassmorphic" ? "rgba(255,255,255,0.85)" : pine.cardBg, 
          borderColor: pine.cardBorder,
          backdropFilter: activeStyle === "glassmorphic" ? "blur(12px)" : "none",
        }}
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around gap-2 px-3 pb-4 pt-3">
          {[
            { icon: ClipboardCheck, label: "Taken", active: true },
            { icon: History, label: "Geschiedenis", active: false },
            { icon: Settings, label: "Instellingen", active: false },
          ].map((tab, idx) => (
            <button
              key={idx}
              className={`${tab.active ? style.navActiveClass : style.navClass} flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-black`}
              style={tab.active ? style.navActiveStyle : style.navStyle}
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
