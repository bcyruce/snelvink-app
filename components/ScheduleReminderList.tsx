"use client";

import SupercellButton from "@/components/SupercellButton";
import { useTranslation } from "@/hooks/useTranslation";
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
import { densePressClass } from "@/lib/uiMotion";
import {
  AlertCircle,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
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
  moduleLabel: string;
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

function monthLabel(date: Date, locale: string) {
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
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
        moduleLabel: item.moduleLabel,
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

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "rounded-full border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wide",
        densePressClass,
        active
          ? "border-blue-700 bg-blue-500 text-white"
          : "border-slate-200 bg-white text-slate-600",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function ReminderSection({
  title,
  tasks,
  emptyText,
  defaultOpen = true,
}: {
  title: string;
  tasks: PlannedTask[];
  emptyText: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const count = tasks.length;
  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={[
          "flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm",
          densePressClass,
        ].join(" ")}
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-black uppercase tracking-wide text-slate-500">
            {title}
          </span>
          {count > 0 ? (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-black text-white">
              {count}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={[
            "h-5 w-5 shrink-0 text-slate-400 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>
      {open ? <TaskList tasks={tasks} emptyText={emptyText} /> : null}
    </section>
  );
}

function DayPreviewModal({
  date,
  tasks,
  onClose,
  locale,
}: {
  date: Date;
  tasks: PlannedTask[];
  onClose: () => void;
  locale: string;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const titleLabel = date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 h-full w-full"
      />
      <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black capitalize text-slate-900">
            {titleLabel}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className={[
              "flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100",
              densePressClass,
            ].join(" ")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {tasks.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm font-semibold text-slate-500">
            {t("noPlannedTasksOnDay")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <li key={task.key}>
                <SupercellButton
                  type="button"
                  variant="neutral"
                  onClick={() => {
                    onClose();
                    router.push(task.route);
                  }}
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
        )}
      </div>
    </div>
  );
}

function CalendarMonth({
  month,
  tasks,
  onSelectDate,
  weekdays,
}: {
  month: Date;
  tasks: PlannedTask[];
  onSelectDate: (date: Date) => void;
  weekdays: string[];
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstOffset = (first.getDay() + 6) % 7;
  const start = addDays(first, -firstOffset);
  const cells = Array.from({ length: 42 }, (_, index) => addDays(start, index));

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[10px] font-black uppercase text-slate-400">
        {weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date) => {
          const dayTasks = tasksForDate(tasks, date);
          const isCurrentMonth = date.getMonth() === month.getMonth();
          return (
            <button
              key={toIsoDate(date)}
              type="button"
              onClick={() => onSelectDate(date)}
              className={[
                "flex min-h-[76px] flex-col rounded-xl border p-1 text-left active:bg-slate-100",
                densePressClass,
                isCurrentMonth
                  ? "border-slate-100 bg-slate-50"
                  : "border-transparent bg-transparent opacity-40",
              ].join(" ")}
            >
              <span className="text-xs font-black text-slate-700">
                {date.getDate()}
              </span>
              <span className="mt-1 flex flex-col gap-1">
                {dayTasks.slice(0, 2).map((task) => (
                  <span
                    key={task.key}
                    className={[
                      "truncate rounded px-1 py-0.5 text-[10px] font-bold",
                      task.completed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700",
                    ].join(" ")}
                    title={task.title}
                  >
                    {task.title}
                  </span>
                ))}
                {dayTasks.length > 2 ? (
                  <span className="text-[10px] font-bold text-slate-400">
                    +{dayTasks.length - 2}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ScheduleReminderList() {
  const { profile, restaurant } = useUser();
  const { t, language } = useTranslation();
  const locale = language === "en" ? "en-GB" : "nl-NL";
  const monthNames = t("months").split("|");
  const weekdayNames = t("weekdaysShort").split("|");
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string>("all");

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
        setErrorMessage(t("remindersLoadFailed"));
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
            (row.type === "kerntemperatuur" ? t("kerntemperatuur") : t("koeling")),
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
          moduleLabel: customName ?? t("ontvangst"),
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
          moduleLabel: customName ?? t("schoonmaak"),
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
        setErrorMessage(t("recordsLoadFailed"));
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
  }, [restaurantId, t]);

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

  const moduleLabels = useMemo(() => {
    const seen = new Set<string>();
    for (const task of plannedTasks) seen.add(task.moduleLabel);
    return Array.from(seen).sort((a, b) => a.localeCompare(b, locale));
  }, [plannedTasks, locale]);

  const filteredTasks = useMemo(() => {
    if (moduleFilter === "all") return plannedTasks;
    return plannedTasks.filter((task) => task.moduleLabel === moduleFilter);
  }, [plannedTasks, moduleFilter]);

  const todayTasks = tasksForDate(filteredTasks, today).filter(
    (task) => !task.completed,
  );
  const tomorrowTasks = tasksForDate(filteredTasks, tomorrow);
  const weekTasks = tasksForRange(filteredTasks, today, nextWeek);
  const calendarMonth = addMonths(today, monthIndex);
  const maxMonthIndex = 23;
  const monthOptions = useMemo(
    () =>
      Array.from({ length: maxMonthIndex + 1 }, (_, index) => {
        const date = addMonths(today, index);
        return {
          index,
          year: date.getFullYear(),
          month: date.getMonth(),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const yearOptions = useMemo(
    () => Array.from(new Set(monthOptions.map((option) => option.year))),
    [monthOptions],
  );
  const monthsForYear = monthOptions.filter(
    (option) => option.year === calendarMonth.getFullYear(),
  );

  if (!restaurantId) return null;

  return (
    <section className="mt-6 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-slate-500" />
        <h2 className="text-lg font-black text-slate-900">{t("reminders")}</h2>
      </div>

      {loading ? (
        <p className="rounded-2xl bg-white px-4 py-5 text-center text-sm font-semibold text-slate-500 shadow-sm">
          {t("loadingReminders")}
        </p>
      ) : errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-center text-sm font-semibold text-red-700">
          {errorMessage}
        </p>
      ) : (
        <>
          <ReminderSection
            title={t("today")}
            tasks={todayTasks}
            emptyText={t("todayAllDone")}
          />
          <ReminderSection
            title={t("tomorrow")}
            tasks={tomorrowTasks}
            emptyText={t("noTasksTomorrow")}
          />
          <ReminderSection
            title={t("thisWeek")}
            tasks={weekTasks}
            emptyText={t("noTasksThisWeek")}
            defaultOpen={false}
          />

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
              {t("allPlanning")}
            </h3>
            {moduleLabels.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                  {t("filterByType")}
                </span>
                <div className="-mx-1 flex flex-wrap gap-2">
                  <FilterChip
                    active={moduleFilter === "all"}
                    onClick={() => setModuleFilter("all")}
                    label={t("all")}
                  />
                  {moduleLabels.map((label) => (
                    <FilterChip
                      key={label}
                      active={moduleFilter === label}
                      onClick={() => setModuleFilter(label)}
                      label={label}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonthIndex((value) => Math.max(0, value - 1))}
                disabled={monthIndex === 0}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm disabled:opacity-40"
                aria-label={t("previousMonth")}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <select
                value={calendarMonth.getMonth()}
                onChange={(event) => {
                  const target = monthOptions.find(
                    (option) =>
                      option.year === calendarMonth.getFullYear() &&
                      option.month === Number(event.target.value),
                  );
                  if (target) setMonthIndex(target.index);
                }}
                aria-label={t("chooseMonth")}
                className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-base font-black capitalize text-slate-900 shadow-sm"
              >
                {monthsForYear.map((option) => (
                  <option key={option.index} value={option.month}>
                    {monthNames[option.month]}
                  </option>
                ))}
              </select>
              <select
                value={calendarMonth.getFullYear()}
                onChange={(event) => {
                  const year = Number(event.target.value);
                  const target =
                    monthOptions.find(
                      (option) =>
                        option.year === year &&
                        option.month === calendarMonth.getMonth(),
                    ) ?? monthOptions.find((option) => option.year === year);
                  if (target) setMonthIndex(target.index);
                }}
                aria-label={t("chooseYear")}
                className="rounded-xl bg-white px-3 py-2 text-base font-black text-slate-900 shadow-sm"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  setMonthIndex((value) => Math.min(maxMonthIndex, value + 1))
                }
                disabled={monthIndex === maxMonthIndex}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm disabled:opacity-40"
                aria-label={t("nextMonth")}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <p className="text-center text-base font-black capitalize text-slate-900">
              {monthLabel(calendarMonth, locale)}
            </p>
            <CalendarMonth
              month={calendarMonth}
              tasks={filteredTasks}
              onSelectDate={(date) => setSelectedDate(date)}
              weekdays={weekdayNames}
            />
          </section>
        </>
      )}

      {selectedDate ? (
        <DayPreviewModal
          date={selectedDate}
          tasks={tasksForDate(filteredTasks, selectedDate)}
          onClose={() => setSelectedDate(null)}
          locale={locale}
        />
      ) : null}
    </section>
  );
}
