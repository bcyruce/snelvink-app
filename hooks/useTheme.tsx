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
    name: "pine", label: "Dennengroen", temp: "cool", dot: "#10B981",
    primary: "#059669", primaryDark: "#047857",
    bg: "#FAFAFA", fg: "#171717", muted: "#525252",
    cardBg: "rgba(255,255,255,0.95)", cardBorder: "rgba(229,229,229,0.8)",
    navBg: "rgba(255,255,255,0.92)", navBorder: "rgba(229,229,229,0.6)",
  },
  steel: {
    name: "steel", label: "Staalblauw", temp: "cool", dot: "#0EA5E9",
    primary: "#0284C7", primaryDark: "#0369A1",
    bg: "#FAFAFA", fg: "#171717", muted: "#525252",
    cardBg: "rgba(255,255,255,0.95)", cardBorder: "rgba(229,229,229,0.8)",
    navBg: "rgba(255,255,255,0.92)", navBorder: "rgba(229,229,229,0.6)",
  },
  militaryblue: {
    name: "militaryblue", label: "Legergroen", temp: "cool", dot: "#22C55E",
    primary: "#16A34A", primaryDark: "#15803D",
    bg: "#FAFAFA", fg: "#171717", muted: "#525252",
    cardBg: "rgba(255,255,255,0.95)", cardBorder: "rgba(229,229,229,0.8)",
    navBg: "rgba(255,255,255,0.92)", navBorder: "rgba(229,229,229,0.6)",
  },
  tin: {
    name: "tin", label: "Tingrijs", temp: "cool", dot: "#64748B",
    primary: "#475569", primaryDark: "#334155",
    bg: "#FAFAFA", fg: "#171717", muted: "#525252",
    cardBg: "rgba(255,255,255,0.95)", cardBorder: "rgba(229,229,229,0.8)",
    navBg: "rgba(255,255,255,0.92)", navBorder: "rgba(229,229,229,0.6)",
  },
  plum: {
    name: "plum", label: "Pruimpaars", temp: "warm", dot: "#A855F7",
    primary: "#9333EA", primaryDark: "#7E22CE",
    bg: "#FAFAFA", fg: "#171717", muted: "#525252",
    cardBg: "rgba(255,255,255,0.95)", cardBorder: "rgba(229,229,229,0.8)",
    navBg: "rgba(255,255,255,0.92)", navBorder: "rgba(229,229,229,0.6)",
  },
  warmgray: {
    name: "warmgray", label: "Warm grijs", temp: "warm", dot: "#F97316",
    primary: "#EA580C", primaryDark: "#C2410C",
    bg: "#FAFAFA", fg: "#171717", muted: "#525252",
    cardBg: "rgba(255,255,255,0.95)", cardBorder: "rgba(229,229,229,0.8)",
    navBg: "rgba(255,255,255,0.92)", navBorder: "rgba(229,229,229,0.6)",
  },
  beige: {
    name: "beige", label: "Beige", temp: "warm", dot: "#EAB308",
    primary: "#CA8A04", primaryDark: "#A16207",
    bg: "#FAFAFA", fg: "#171717", muted: "#525252",
    cardBg: "rgba(255,255,255,0.95)", cardBorder: "rgba(229,229,229,0.8)",
    navBg: "rgba(255,255,255,0.92)", navBorder: "rgba(229,229,229,0.6)",
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
  const [themeName, setThemeNameState] = useState<string>(() => {
    try {
      if (typeof window === "undefined") return "pine";
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved && themes[saved] ? saved : "pine";
    } catch {
      return "pine";
    }
  });

  useEffect(() => {
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
  }, [themeName]);

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
