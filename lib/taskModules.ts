import type { SupabaseClient } from "@supabase/supabase-js";
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
    href: "/app/taken/koeling",
  },
  {
    id: "ontvangst",
    name: "Ontvangst",
    icon: "truck",
    isCustom: false,
    href: "/app/taken/ontvangst",
  },
  {
    id: "schoonmaak",
    name: "Schoonmaak",
    icon: "sparkles",
    isCustom: false,
    href: "/app/taken/schoonmaak",
  },
  {
    id: "kerntemperatuur",
    name: "Kerntemperatuur",
    icon: "thermometer",
    isCustom: false,
    href: "/app/taken/kerntemperatuur",
  },
];

// Modules die ooit standaard waren maar nu uit de app verwijderd zijn.
// We filteren ze uit eerder opgeslagen layouts zodat bestaande gebruikers
// na de update niet alsnog een dode tegel zien.
const REMOVED_DEFAULT_IDS = new Set<string>(["frituurvet"]);

const STORAGE_KEY = "snelvink:taskModulesLayout:v1";

/** Routes moved under `/app/*`; rewrite stored layout hrefs from before that change. */
function normalizeStoredModuleHref(href: string): string {
  if (!href.startsWith("/") || href.startsWith("/app/")) return href;
  if (
    href.startsWith("/taken/") ||
    href.startsWith("/registreren") ||
    href.startsWith("/geschiedenis/") ||
    href.startsWith("/instellingen/") ||
    href.startsWith("/dashboard/")
  ) {
    return `/app${href}`;
  }
  return href;
}

export function loadLayout(): TaskModule[] {
  if (typeof window === "undefined") return DEFAULT_MODULES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MODULES;
    const parsed = JSON.parse(raw) as TaskModule[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_MODULES;
    return parsed
      .filter((m) => !REMOVED_DEFAULT_IDS.has(m.id))
      .map((m) => ({
        ...m,
        href: normalizeStoredModuleHref(m.href),
      }));
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

function normalizeModuleList(modules: TaskModule[]): TaskModule[] {
  return modules
    .filter((m) => !REMOVED_DEFAULT_IDS.has(m.id))
    .map((m) => ({
      ...m,
      href: normalizeStoredModuleHref(m.href),
    }));
}

/** Parse JSON from DB/localStorage into task modules; skips invalid entries. */
export function parseTaskModulesFromJson(raw: unknown): TaskModule[] | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  const out: TaskModule[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : null;
    const name = typeof o.name === "string" ? o.name : null;
    const icon = typeof o.icon === "string" ? o.icon : null;
    const href = typeof o.href === "string" ? o.href : null;
    const isCustom =
      o.isCustom === true ||
      (href !== null &&
        (href.includes("/taken/custom/") || href.includes("/app/taken/custom/")));
    if (!id || !name || !icon || !href) continue;
    out.push({
      id,
      name,
      icon,
      isCustom,
      href: normalizeStoredModuleHref(href),
    });
  }
  return out;
}

/**
 * Prefer server layout when present so all browsers match.
 * If server empty, use local (localStorage) so old single-device layouts still work.
 */
export function mergeServerAndLocalLayout(
  serverModules: TaskModule[] | null,
  localModules: TaskModule[],
): TaskModule[] {
  if (serverModules && serverModules.length > 0) {
    return normalizeModuleList(serverModules);
  }
  const local = normalizeModuleList(localModules);
  if (local.length > 0) return local;
  return DEFAULT_MODULES;
}

const DEFAULT_MODULE_IDS = new Set(DEFAULT_MODULES.map((m) => m.id));

/**
 * Append active custom modules from DB that are missing from the layout.
 * Fixes new browsers when layout JSON is empty/default but `custom_modules` has rows.
 */
export function mergeLayoutWithDbCustomModules(
  layout: TaskModule[],
  dbCustomTiles: TaskModule[],
): TaskModule[] {
  const base = normalizeModuleList(layout);
  const seen = new Set(base.map((m) => m.id));
  const extras = dbCustomTiles.filter((m) => !seen.has(m.id));
  if (extras.length === 0) {
    return base.length > 0 ? base : DEFAULT_MODULES;
  }
  return [...base, ...extras];
}

/** Active custom modules for a restaurant (source of truth for tiles). */
export async function fetchActiveCustomModuleTiles(
  client: SupabaseClient,
  restaurantId: string,
): Promise<TaskModule[]> {
  const { data, error } = await client
    .from("custom_modules")
    .select("id, name, icon")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Custom modules voor layout ophalen:", error.message);
    return [];
  }

  return (data ?? []).map((row: { id: string; name: string; icon: string | null }) => {
    const icon =
      row.icon && (AVAILABLE_ICONS as readonly string[]).includes(row.icon)
        ? row.icon
        : "thermometer";
    return {
      id: String(row.id),
      name: (row.name ?? "").trim() || "Custom",
      icon,
      isCustom: true,
      href: `/app/taken/custom/${row.id}`,
    } satisfies TaskModule;
  });
}

/** True if layout is not the default four tiles in default order (incl. custom tiles). */
export function layoutDiffersFromDefault(modules: TaskModule[]): boolean {
  const ids = modules.map((m) => m.id).join("\0");
  const defaultIds = DEFAULT_MODULES.map((m) => m.id).join("\0");
  return ids !== defaultIds || modules.some((m) => m.isCustom);
}

export async function fetchRestaurantTaskModulesLayout(
  client: SupabaseClient,
  restaurantId: string,
): Promise<TaskModule[] | null> {
  const { data, error } = await client
    .from("restaurant_task_modules_layout")
    .select("modules")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) {
    console.warn("Task layout ophalen mislukt:", error.message);
    return null;
  }
  return parseTaskModulesFromJson(data?.modules);
}

export async function upsertRestaurantTaskModulesLayout(
  client: SupabaseClient,
  restaurantId: string,
  modules: TaskModule[],
): Promise<boolean> {
  const { error } = await client.from("restaurant_task_modules_layout").upsert(
    {
      restaurant_id: restaurantId,
      modules,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "restaurant_id" },
  );

  if (error) {
    console.warn("Task layout opslaan mislukt:", error.message);
    return false;
  }
  return true;
}
