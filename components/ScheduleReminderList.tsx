"use client";

import SupercellButton from "@/components/SupercellButton";
import { useUser } from "@/hooks/useUser";
import {
  getPeriodRange,
  normalizeSchedule,
  requiredCountForSchedule,
  type FrequencySchedule,
} from "@/lib/schedules";
import { supabase } from "@/lib/supabase";
import { AlertCircle, CalendarClock, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ScheduledItem = {
  id: string;
  title: string;
  moduleLabel: string;
  route: string;
  itemKind: "equipment" | "product" | "location";
  schedule: FrequencySchedule;
};

type RecordRow = {
  recorded_at: string;
  equipment_id: string | null;
  product_id: string | null;
  location_id: string | null;
};

type Reminder = {
  key: string;
  title: string;
  subtitle: string;
  route: string;
  overdue: boolean;
};

function customModuleName(row: { custom_modules?: unknown }) {
  const value = row.custom_modules;
  if (Array.isArray(value)) {
    const first = value[0] as { name?: unknown } | undefined;
    return typeof first?.name === "string" ? first.name : null;
  }
  const maybe = value as { name?: unknown } | null | undefined;
  return typeof maybe?.name === "string" ? maybe.name : null;
}

function countRecords(item: ScheduledItem, records: RecordRow[], start: Date, end: Date) {
  return records.filter((record) => {
    const recordedAt = new Date(record.recorded_at);
    if (recordedAt < start || recordedAt >= end) return false;
    if (item.itemKind === "equipment") return record.equipment_id === item.id;
    if (item.itemKind === "product") return record.product_id === item.id;
    return record.location_id === item.id;
  }).length;
}

function countRecordsAfter(item: ScheduledItem, records: RecordRow[], after: Date) {
  return records.filter((record) => {
    const recordedAt = new Date(record.recorded_at);
    if (recordedAt < after) return false;
    if (item.itemKind === "equipment") return record.equipment_id === item.id;
    if (item.itemKind === "product") return record.product_id === item.id;
    return record.location_id === item.id;
  }).length;
}

function buildReminders(items: ScheduledItem[], records: RecordRow[]): Reminder[] {
  const now = new Date();
  const reminders: Reminder[] = [];

  for (const item of items) {
    const { schedule } = item;
    if (schedule.cadence === "custom") {
      for (const reminder of schedule.reminders) {
        const dueAt = new Date(reminder.dateTime);
        if (Number.isNaN(dueAt.getTime())) continue;
        if (countRecordsAfter(item, records, dueAt) > 0) continue;
        reminders.push({
          key: `${item.itemKind}:${item.id}:${reminder.id}`,
          title: item.title,
          subtitle: `${item.moduleLabel} · ${dueAt.toLocaleString("nl-NL", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          route: item.route,
          overdue: dueAt <= now,
        });
      }
      continue;
    }

    const period = getPeriodRange(schedule.cadence, now);
    const done = countRecords(item, records, period.start, period.end);
    const required = requiredCountForSchedule(schedule);
    if (done >= required) continue;

    reminders.push({
      key: `${item.itemKind}:${item.id}:${schedule.cadence}`,
      title: item.title,
      subtitle: `${item.moduleLabel} · ${done}/${required} geregistreerd ${period.label}`,
      route: item.route,
      overdue: true,
    });
  }

  return reminders.sort((a, b) => Number(b.overdue) - Number(a.overdue));
}

export default function ScheduleReminderList() {
  const router = useRouter();
  const { profile } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    let ignore = false;

    async function load() {
      setLoading(true);
      setErrorMessage(null);

      const [equipments, products, locations] = await Promise.all([
        supabase
          .from("haccp_equipments")
          .select("id, name, type, custom_module_id, schedule, custom_modules(name)")
          .eq("restaurant_id", restaurantId)
          .not("schedule", "is", null),
        supabase
          .from("haccp_products")
          .select("id, name, custom_module_id, schedule, custom_modules(name)")
          .eq("restaurant_id", restaurantId)
          .not("schedule", "is", null),
        supabase
          .from("haccp_locations")
          .select("id, name, custom_module_id, schedule, custom_modules(name)")
          .eq("restaurant_id", restaurantId)
          .not("schedule", "is", null),
      ]);

      if (ignore) return;

      if (equipments.error || products.error || locations.error) {
        console.error(
          "Herinneringen laden mislukt:",
          equipments.error ?? products.error ?? locations.error,
        );
        setErrorMessage("Herinneringen laden mislukt.");
        setLoading(false);
        return;
      }

      const nextItems: ScheduledItem[] = [];

      for (const row of equipments.data ?? []) {
        const schedule = normalizeSchedule(row.schedule);
        if (!schedule) continue;
        const customName = customModuleName(row);
        nextItems.push({
          id: String(row.id),
          title: row.name ?? "Item",
          moduleLabel: customName ?? (row.type === "kerntemperatuur" ? "Kerntemperatuur" : "Koeling"),
          route: row.custom_module_id
            ? `/registreren/custom/${row.custom_module_id}`
            : `/registreren/${row.type}`,
          itemKind: "equipment",
          schedule,
        });
      }

      for (const row of products.data ?? []) {
        const schedule = normalizeSchedule(row.schedule);
        if (!schedule) continue;
        const customName = customModuleName(row);
        nextItems.push({
          id: String(row.id),
          title: row.name ?? "Item",
          moduleLabel: customName ?? "Ontvangst",
          route: row.custom_module_id
            ? `/registreren/custom/${row.custom_module_id}`
            : "/registreren/ontvangst",
          itemKind: "product",
          schedule,
        });
      }

      for (const row of locations.data ?? []) {
        const schedule = normalizeSchedule(row.schedule);
        if (!schedule) continue;
        const customName = customModuleName(row);
        nextItems.push({
          id: String(row.id),
          title: row.name ?? "Item",
          moduleLabel: customName ?? "Schoonmaak",
          route: row.custom_module_id
            ? `/registreren/custom/${row.custom_module_id}`
            : "/registreren/schoonmaak",
          itemKind: "location",
          schedule,
        });
      }

      const yearStart = new Date();
      yearStart.setMonth(0, 1);
      yearStart.setHours(0, 0, 0, 0);
      const recordResult = await supabase
        .from("haccp_records")
        .select("recorded_at, equipment_id, product_id, location_id")
        .eq("restaurant_id", restaurantId)
        .gte("recorded_at", yearStart.toISOString());

      if (ignore) return;

      if (recordResult.error) {
        console.error("Registraties voor herinneringen laden mislukt:", recordResult.error);
        setErrorMessage("Registraties laden mislukt.");
        setLoading(false);
        return;
      }

      setItems(nextItems);
      setRecords((recordResult.data ?? []) as RecordRow[]);
      setLoading(false);
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [restaurantId]);

  const reminders = useMemo(() => buildReminders(items, records), [items, records]);

  if (!restaurantId) return null;

  return (
    <section className="mt-6 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-slate-500" />
        <h2 className="text-lg font-black text-slate-900">Herinneringen</h2>
      </div>

      {loading ? (
        <p className="rounded-2xl bg-white px-4 py-5 text-center text-sm font-semibold text-slate-500 shadow-sm">
          Herinneringen laden...
        </p>
      ) : errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-center text-sm font-semibold text-red-700">
          {errorMessage}
        </p>
      ) : reminders.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-5 text-center text-sm font-semibold text-slate-500 shadow-sm">
          Geen openstaande periodieke taken.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reminders.map((reminder) => (
            <li key={reminder.key}>
              <SupercellButton
                type="button"
                variant="neutral"
                onClick={() => router.push(reminder.route)}
                className="flex min-h-[76px] w-full items-center gap-3 text-left normal-case"
              >
                <AlertCircle
                  className={[
                    "h-6 w-6 shrink-0",
                    reminder.overdue ? "text-red-500" : "text-blue-500",
                  ].join(" ")}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-black text-slate-900">
                    {reminder.title}
                  </span>
                  <span className="block truncate text-sm font-semibold text-slate-500">
                    {reminder.subtitle}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </SupercellButton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
