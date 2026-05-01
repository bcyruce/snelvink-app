import { WEEKDAYS, type Weekday } from "@/lib/schedules";

export type OpeningDay = {
  open: boolean;
  from: string;
  to: string;
};

export type OpeningHours = Record<Weekday, OpeningDay>;

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  1: { open: true, from: "09:00", to: "17:00" },
  2: { open: true, from: "09:00", to: "17:00" },
  3: { open: true, from: "09:00", to: "17:00" },
  4: { open: true, from: "09:00", to: "17:00" },
  5: { open: true, from: "09:00", to: "17:00" },
  6: { open: true, from: "09:00", to: "17:00" },
  7: { open: true, from: "09:00", to: "17:00" },
};

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function weekdayForDate(date: Date): Weekday {
  const day = date.getDay();
  return (day === 0 ? 7 : day) as Weekday;
}

export function normalizeOpeningHours(value: unknown): OpeningHours {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const next = { ...DEFAULT_OPENING_HOURS };

  for (const weekday of WEEKDAYS) {
    const key = String(weekday.value);
    const day = raw[key] as Record<string, unknown> | undefined;
    if (!day || typeof day !== "object") continue;

    next[weekday.value] = {
      open: day.open !== false,
      from: typeof day.from === "string" && day.from ? day.from : "09:00",
      to: typeof day.to === "string" && day.to ? day.to : "17:00",
    };
  }

  return next;
}

export function normalizeClosedDays(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item),
      ),
    ),
  ).sort();
}

export function isRestaurantOpenOn(
  date: Date,
  openingHours: OpeningHours,
  closedDays: readonly string[],
): boolean {
  if (closedDays.includes(toIsoDate(date))) return false;
  return openingHours[weekdayForDate(date)]?.open !== false;
}
