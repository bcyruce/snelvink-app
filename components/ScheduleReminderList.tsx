"use client";

import SupercellButton from "@/components/SupercellButton";
import { useUser } from "@/hooks/useUser";
import {
  isRestaurantOpenOn,
  normalizeClosedDays,
  normalizeOpeningHours,
  toIsoDate,
} from "@/lib/restaurantHours";
import {
  generateScheduleOccurrences,
  normalizeSchedule,
  type FrequencySchedule,
} from "@/lib/schedules";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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

type PlannedTask = {
  key: string;
  date: string;
  title: string;
  subtitle: string;
  route: string;
  completed: boolean;
  requiredCount: number;
  completedCount: number;
};

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}

function countRecordsForDate(
  item: ScheduledItem,
  records: RecordRow[],
  date: string,
) {
  return records.filter((record) => {
    if (toIsoDate(new Date(record.recorded_at)) !== date) return false;
    if (item.itemKind === "equipment") return record.equipment_id === item.id;
    if (item.itemKind === "product") return record.product_id === item.id;
    return record.location_id === item.id;
  }).length;
}

function customModuleName(row: { custom_modules?: unknown }) {
  const value = row.custom_modules;
  if (Array.isArray(value)) {
    const first = value[0] as { name?: unknown } | undefined;
    return typeof first?.name === "string" ? first.name : null;
  }
  const maybe = value as { name?: unknown } | null | undefined;
  return typeof maybe?.name === "string" ? maybe.name : null;
}

function buildPlannedTasks(
  items: ScheduledItem[],
  records: RecordRow[],
  start: Date,
  end: Date,
  isOpenDate: (date: Date) => boolean,
) {
  const tasks: PlannedTask[] = [];

  for (const item of items) {
    const occurrences = generateScheduleOccurrences(
      item.schedule,
      start,
      end,
      isOpenDate,
    );

    for (const occurrence of occurrences) {
      const completedCount = countRecordsForDate(item, records, occurrence.date);
      const completed = completedCount >= occurrence.requiredCount;
      tasks.push({
        key: `${item.itemKind}:${item.id}:${occurrence.date}:${occurrence.time ?? ""}`,
        date: occurrence.date,
        title: item.title,
        subtitle: [
          item.moduleLabel,
          occurrence.time,
          `${completedCount}/${occurrence.requiredCount}`,
        ]
          .filter(Boolean)
          .join(" · "),
        route: item.route,
        completed,
        requiredCount: occurrence.requiredCount,
        completedCount,
      });
    }
  }

  return tasks.sort((a, b) => a.date.localeCompare(b.date));
}

function tasksForDate(tasks: PlannedTask[], date: Date) {
  const iso = toIsoDate(date);
  return tasks.filter((task) => task.date === iso);
}

function tasksForRange(tasks: PlannedTask[], start: Date, end: Date) {
  const startIso = toIsoDate(start);
  const endIso = toIsoDate(end);
  return tasks.filter((task) => task.date >= startIso && task.date < endIso);
}

function TaskList({
  tasks,
  emptyText,
}: {
  tasks: PlannedTask[];
  emptyText: string;
}) {
  const router = useRouter();
  if (tasks.length === 0) {
    return (
      <p className="rounded-2xl bg-white px-4 py-5 text-center text-sm font-semibold text-slate-500 shadow-sm">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <li key={task.key}>
          <SupercellButton
            type="button"
            variant="neutral"
            onClick={() => router.push(task.route)}
            className="flex min-h-[72px] w-full items-center gap-3 text-left normal-case"
          >
            <AlertCircle
              className={[
                "h-5 w-5 shrink-0",
                task.completed ? "text-emerald-500" : "text-red-500",
              ].join(" ")}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-lg font-black text-slate-900">
                {task.title}
              </span>
              <span className="block truncate text-sm font-semibold text-slate-500">
                {task.subtitle}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
          </SupercellButton>
        </li>
      ))}
    </ul>
  );
}

function ReminderSection({
  title,
  tasks,
  emptyText,
}: {
  title: string;
  tasks: PlannedTask[];
  emptyText: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <TaskList tasks={tasks} emptyText={emptyText} />
    </section>
  );
}

function CalendarMonth({
  month,
  tasks,
}: {
  month: Date;
  tasks: PlannedTask[];
}) {
  const router = useRouter();
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstOffset = (first.getDay() + 6) % 7;
  const start = addDays(first, -firstOffset);
  const cells = Array.from({ length: 42 }, (_, index) => addDays(start, index));

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[10px] font-black uppercase text-slate-400">
        {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date) => {
          const dayTasks = tasksForDate(tasks, date);
          const isCurrentMonth = date.getMonth() === month.getMonth();
          return (
            <div
              key={toIsoDate(date)}
              className={[
                "min-h-[76px] rounded-xl border p-1",
                isCurrentMonth
                  ? "border-slate-100 bg-slate-50"
                  : "border-transparent bg-transparent opacity-40",
              ].join(" ")}
            >
              <div className="text-xs font-black text-slate-700">
                {date.getDate()}
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {dayTasks.slice(0, 2).map((task) => (
                  <button
                    key={task.key}
                    type="button"
                    onClick={() => router.push(task.route)}
                    className={[
                      "truncate rounded px-1 py-0.5 text-left text-[10px] font-bold",
                      task.completed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700",
                    ].join(" ")}
                    title={task.title}
                  >
                    {task.title}
                  </button>
                ))}
                {dayTasks.length > 2 ? (
                  <span className="text-[10px] font-bold text-slate-400">
                    +{dayTasks.length - 2}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ScheduleReminderList() {
  const { profile, restaurant } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;
  const openingHours = useMemo(
    () => normalizeOpeningHours(restaurant?.opening_hours),
    [restaurant?.opening_hours],
  );
  const closedDays = useMemo(
    () => normalizeClosedDays(restaurant?.closed_days),
    [restaurant?.closed_days],
  );
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [monthIndex, setMonthIndex] = useState(0);

  useEffect(() => {
    if (!restaurantId) return;
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
          moduleLabel:
            customName ??
            (row.type === "kerntemperatuur" ? "Kerntemperatuur" : "Koeling"),
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

      const today = startOfDay(new Date());
      const recordResult = await supabase
        .from("haccp_records")
        .select("recorded_at, equipment_id, product_id, location_id")
        .eq("restaurant_id", restaurantId)
        .gte("recorded_at", today.toISOString());

      if (ignore) return;

      if (recordResult.error) {
        console.error(
          "Registraties voor herinneringen laden mislukt:",
          recordResult.error,
        );
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

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);
  const calendarEnd = addDays(today, 365 * 2 + 1);
  const isOpenDate = (date: Date) =>
    isRestaurantOpenOn(date, openingHours, closedDays);

  const plannedTasks = useMemo(
    () => buildPlannedTasks(items, records, today, calendarEnd, isOpenDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, records, restaurant?.opening_hours, restaurant?.closed_days],
  );

  const todayTasks = tasksForDate(plannedTasks, today).filter(
    (task) => !task.completed,
  );
  const tomorrowTasks = tasksForDate(plannedTasks, tomorrow);
  const weekTasks = tasksForRange(plannedTasks, today, nextWeek);
  const calendarMonth = addMonths(today, monthIndex);
  const maxMonthIndex = 23;

  if (!restaurantId) return null;

  return (
    <section className="mt-6 flex flex-col gap-5">
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
      ) : (
        <>
          <ReminderSection
            title="Vandaag"
            tasks={todayTasks}
            emptyText="Vandaag zijn alle taken voltooid!"
          />
          <ReminderSection
            title="Morgen"
            tasks={tomorrowTasks}
            emptyText="Morgen staan er geen taken gepland."
          />
          <ReminderSection
            title="Deze week"
            tasks={weekTasks}
            emptyText="Deze week staan er geen taken gepland."
          />

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
                Alle planning
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMonthIndex((value) => Math.max(0, value - 1))}
                  disabled={monthIndex === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm disabled:opacity-40"
                  aria-label="Vorige maand"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMonthIndex((value) => Math.min(maxMonthIndex, value + 1))
                  }
                  disabled={monthIndex === maxMonthIndex}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm disabled:opacity-40"
                  aria-label="Volgende maand"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <p className="text-center text-base font-black capitalize text-slate-900">
              {monthLabel(calendarMonth)}
            </p>
            <CalendarMonth month={calendarMonth} tasks={plannedTasks} />
          </section>
        </>
      )}
    </section>
  );
}
