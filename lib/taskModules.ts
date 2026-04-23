import {
  Clock,
  Droplet,
  Flame,
  Snowflake,
  Sparkles,
  Thermometer,
  Truck,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export type TaskModule = {
  id: string;
  name: string;
  icon: string;
  isCustom: boolean;
  href: string;
};

export const ICON_MAP: Record<string, LucideIcon> = {
  thermometer: Thermometer,
  truck: Truck,
  sparkles: Sparkles,
  droplet: Droplet,
  flame: Flame,
  snowflake: Snowflake,
  clock: Clock,
  utensils: UtensilsCrossed,
};

export const AVAILABLE_ICONS: readonly string[] = [
  "thermometer",
  "truck",
  "sparkles",
  "droplet",
  "flame",
  "snowflake",
  "clock",
  "utensils",
];

export function getModuleIcon(iconKey: string): LucideIcon {
  return ICON_MAP[iconKey] ?? Thermometer;
}

export const DEFAULT_MODULES: TaskModule[] = [
  {
    id: "koeling",
    name: "Koeling",
    icon: "thermometer",
    isCustom: false,
    href: "/taken/koeling",
  },
  {
    id: "ontvangst",
    name: "Ontvangst",
    icon: "truck",
    isCustom: false,
    href: "/taken/ontvangst",
  },
  {
    id: "schoonmaak",
    name: "Schoonmaak",
    icon: "sparkles",
    isCustom: false,
    href: "/taken/schoonmaak",
  },
  {
    id: "kerntemperatuur",
    name: "Kerntemperatuur",
    icon: "thermometer",
    isCustom: false,
    href: "/taken/kerntemperatuur",
  },
  {
    id: "frituurvet",
    name: "Frituurvet registratie",
    icon: "droplet",
    isCustom: false,
    href: "/taken/frituurvet",
  },
];

const STORAGE_KEY = "snelvink:taskModulesLayout:v1";

export function loadLayout(): TaskModule[] {
  if (typeof window === "undefined") return DEFAULT_MODULES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MODULES;
    const parsed = JSON.parse(raw) as TaskModule[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_MODULES;
    return parsed;
  } catch {
    return DEFAULT_MODULES;
  }
}

export function saveLayout(modules: TaskModule[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
  } catch {
    // localStorage 写入失败时静默忽略（例如隐身模式配额）
  }
}
