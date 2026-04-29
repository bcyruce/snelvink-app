"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Theme = {
  name: string;
  label: string;
  temp: "cool" | "warm";
  dot: string;
  primary: string;
  primaryDark: string;
  bg: string;
  fg: string;
  muted: string;
  cardBg: string;
  cardBorder: string;
  navBg: string;
  navBorder: string;
};

export const themes: Record<string, Theme> = {
  pine: {
    name: "pine", label: "松叶绿", temp: "cool", dot: "#22C55E",
    primary: "#2D5C3C", primaryDark: "#1E4029",
    bg: "#F5F3EF", fg: "#1A2520", muted: "#5A6E62",
    cardBg: "rgba(255,255,255,0.80)", cardBorder: "rgba(200,215,205,0.9)",
    navBg: "rgba(248,246,242,0.95)", navBorder: "rgba(200,215,205,0.6)",
  },
  steel: {
    name: "steel", label: "钢青蓝", temp: "cool", dot: "#38BDF8",
    primary: "#3E6273", primaryDark: "#2D4D5D",
    bg: "#EDF3F5", fg: "#162028", muted: "#527080",
    cardBg: "rgba(255,255,255,0.78)", cardBorder: "rgba(190,218,228,0.9)",
    navBg: "rgba(242,249,252,0.95)", navBorder: "rgba(190,218,228,0.6)",
  },
  militaryblue: {
    name: "militaryblue", label: "军绿蓝", temp: "cool", dot: "#4ADE80",
    primary: "#3A5248", primaryDark: "#2A3E36",
    bg: "#EBF2EE", fg: "#141E1A", muted: "#4E6B60",
    cardBg: "rgba(255,255,255,0.78)", cardBorder: "rgba(185,215,202,0.9)",
    navBg: "rgba(241,248,244,0.95)", navBorder: "rgba(185,215,202,0.6)",
  },
  tin: {
    name: "tin", label: "锡灰", temp: "cool", dot: "#94A3B8",
    primary: "#525E68", primaryDark: "#3E4850",
    bg: "#EEEEF0", fg: "#1A1E22", muted: "#6A737C",
    cardBg: "rgba(255,255,255,0.80)", cardBorder: "rgba(200,204,210,0.9)",
    navBg: "rgba(245,245,247,0.95)", navBorder: "rgba(200,204,210,0.6)",
  },
  plum: {
    name: "plum", label: "暮色紫灰", temp: "warm", dot: "#C084FC",
    primary: "#4E4060", primaryDark: "#3A2F4A",
    bg: "#F0EEF5", fg: "#1C1628", muted: "#6B5E80",
    cardBg: "rgba(255,255,255,0.78)", cardBorder: "rgba(210,200,232,0.9)",
    navBg: "rgba(247,245,252,0.95)", navBorder: "rgba(210,200,232,0.6)",
  },
  warmgray: {
    name: "warmgray", label: "暖灰石", temp: "warm", dot: "#FB923C",
    primary: "#5E5248", primaryDark: "#483F37",
    bg: "#F2EFEB", fg: "#211A14", muted: "#7A6E64",
    cardBg: "rgba(255,255,255,0.80)", cardBorder: "rgba(220,210,198,0.9)",
    navBg: "rgba(250,247,243,0.95)", navBorder: "rgba(220,210,198,0.6)",
  },
  beige: {
    name: "beige", label: "米色", temp: "warm", dot: "#FCD34D",
    primary: "#7A6848", primaryDark: "#5E5038",
    bg: "#F5F0E8", fg: "#2A2016", muted: "#8A7860",
    cardBg: "rgba(255,255,255,0.80)", cardBorder: "rgba(228,214,190,0.9)",
    navBg: "rgba(252,248,240,0.95)", navBorder: "rgba(228,214,190,0.6)",
  },
};

export const themeOrder = ["pine", "steel", "militaryblue", "tin", "plum", "warmgray", "beige"];

type ThemeContextValue = {
  theme: Theme;
  themeName: string;
  setThemeName: (name: string) => void;
  paletteColors: string[];
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "snelvink-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState<string>("pine");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && themes[saved]) {
      setThemeNameState(saved);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEY, themeName);
    
    // 更新 CSS 变量
    const t = themes[themeName];
    const root = document.documentElement;
    root.style.setProperty("--theme-primary", t.primary);
    root.style.setProperty("--theme-primary-dark", t.primaryDark);
    root.style.setProperty("--theme-bg", t.bg);
    root.style.setProperty("--theme-fg", t.fg);
    root.style.setProperty("--theme-muted", t.muted);
    root.style.setProperty("--theme-card-bg", t.cardBg);
    root.style.setProperty("--theme-card-border", t.cardBorder);
    root.style.setProperty("--theme-nav-bg", t.navBg);
    root.style.setProperty("--theme-nav-border", t.navBorder);
  }, [themeName, isHydrated]);

  const setThemeName = (name: string) => {
    if (themes[name]) {
      setThemeNameState(name);
    }
  };

  const theme = themes[themeName];
  const paletteColors = themeOrder.map((k) => themes[k].dot);

  return (
    <ThemeContext.Provider value={{ theme, themeName, setThemeName, paletteColors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
