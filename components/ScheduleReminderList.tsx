"use client";

import SupercellButton from "@/components/SupercellButton";
import { getLocale } from "@/context/LanguageContext";
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
import { loadLayout, type TaskModule } from "@/lib/taskModules";
import { densePressClass } from "@/lib/uiMotion";
import {
  AlertCircle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ScheduledItem = {
  id: string;
  title: string;
  moduleId: string;
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
  time: string | null;
  title: string;
  route: string;
  moduleId: string;
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
        time: occurrence.time ?? null,
        title: item.title,
        route: item.route,
        moduleId: item.moduleId,
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

function formatTaskDateLabel(isoDate: string, locale: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function TaskCard({
  task,
  onClick,
  showDate = false,
  locale,
  index = 0,
}: {
  task: PlannedTask;
  onClick: () => void;
  showDate?: boolean;
  locale?: string;
  index?: number;
}) {
  const dateLabel =
    showDate && locale ? formatTaskDateLabel(task.date, locale) : null;
  const showRatio = task.requiredCount > 1;
  const ratioComplete = task.completedCount >= task.requiredCount;
  const ratioPartial = !ratioComplete && task.completedCount > 0;
  const StatusIcon = task.completed ? CheckCircle2 : AlertCircle;
  const hasMeta = Boolean(dateLabel || task.time || showRatio);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group block w-full overflow-hidden rounded-xl border text-left transition-all hover:shadow-md active:scale-[0.98]",
        task.completed
          ? "border-emerald-200/60 bg-[var(--theme-card-bg)] hover:border-emerald-300"
          : "border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] hover:border-[var(--theme-primary)]/30",
      ].join(" ")}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="flex items-stretch">
        <span
          aria-hidden
          className={[
            "w-1.5 shrink-0",
            task.completed ? "bg-emerald-400" : "bg-red-400",
          ].join(" ")}
        />

        <div className="flex flex-1 items-start gap-3 p-3">
          <div
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
              task.completed ? "bg-emerald-100" : "bg-red-100",
            ].join(" ")}
          >
            <StatusIcon
              className={[
                "h-6 w-6",
                task.completed ? "text-emerald-600" : "text-red-500",
              ].join(" ")}
              strokeWidth={2.5}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className="truncate text-base font-black leading-tight text-[var(--theme-fg)]">
                {task.title}
              </h4>
              <ChevronRight
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-muted)] transition-transform group-hover:translate-x-0.5"
                strokeWidth={2.5}
              />
            </div>

            <p className="mt-1 flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-[var(--theme-muted)]">
              <Layers className="h-3 w-3 shrink-0" strokeWidth={2.75} />
              <span className="truncate">{task.moduleLabel}</span>
            </p>

            {hasMeta ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {dateLabel ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--theme-primary)]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--theme-primary)]">
                    <CalendarDays className="h-3 w-3 shrink-0" strokeWidth={2.75} />
                    {dateLabel}
                  </span>
                ) : null}
                {task.time ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black tabular-nums text-slate-700">
                    <Clock className="h-3 w-3 shrink-0" strokeWidth={2.75} />
                    {task.time}
                  </span>
                ) : null}
                {showRatio ? (
                  <span
                    className={[
                      "ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black tabular-nums",
                      ratioComplete
                        ? "bg-emerald-100 text-emerald-700"
                        : ratioPartial
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700",
                    ].join(" ")}
                  >
                    {task.completedCount}/{task.requiredCount}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

function TaskList({
  tasks,
  emptyText,
  showDate = false,
  locale,
}: {
  tasks: PlannedTask[];
  emptyText: string;
  showDate?: boolean;
  locale?: string;
}) {
  const router = useRouter();
  if (tasks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] px-4 py-5 text-center text-sm font-medium text-[var(--theme-muted)]">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {tasks.map((task, index) => (
        <li key={task.key}>
          <TaskCard
            task={task}
            onClick={() => router.push(task.route)}
            showDate={showDate}
            locale={locale}
            index={index}
          />
        </li>
      ))}
    </ul>
  );
}

function ReminderSection({
  title,
  tasks,
  emptyText,
  defaultOpen = true,
  showDate = false,
  locale,
}: {
  title: string;
  tasks: PlannedTask[];
  emptyText: string;
  defaultOpen?: boolean;
  showDate?: boolean;
  locale?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const count = tasks.length;
  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={[
          "flex items-center justify-between gap-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] px-4 py-3 text-left transition-all hover:border-[var(--theme-primary)]/30",
          densePressClass,
        ].join(" ")}
      >
        <span className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
            {title}
          </span>
          {count > 0 ? (
            <span className="rounded-full bg-[var(--theme-primary)] px-2 py-0.5 text-[10px] font-bold text-white">
              {count}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={[
            "h-4 w-4 shrink-0 text-[var(--theme-muted)] transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>
      {open ? (
        <TaskList
          tasks={tasks}
          emptyText={emptyText}
          showDate={showDate}
          locale={locale}
        />
      ) : null}
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 h-full w-full"
      />
      <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--theme-bg)] p-5 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--theme-muted)]/30" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-black capitalize text-[var(--theme-fg)]">
            {titleLabel}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className={[
              "flex h-9 w-9 items-center justify-center rounded-full text-[var(--theme-muted)] transition-colors hover:bg-[var(--theme-card-bg)]",
              densePressClass,
            ].join(" ")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {tasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] px-4 py-5 text-center text-sm font-medium text-[var(--theme-muted)]">
            {t("noPlannedTasksOnDay")}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {tasks.map((task, index) => (
              <li key={task.key}>
                <TaskCard
                  task={task}
                  index={index}
                  onClick={() => {
                    onClose();
                    router.push(task.route);
                  }}
                />
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
    <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-3">
      <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[10px] font-bold uppercase text-[var(--theme-muted)]">
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
                "flex min-h-[68px] flex-col rounded-lg border p-1 text-left transition-all hover:border-[var(--theme-primary)]/30",
                densePressClass,
                isCurrentMonth
                  ? "border-[var(--theme-card-border)] bg-white"
                  : "border-transparent bg-transparent opacity-30",
              ].join(" ")}
            >
              <span className="text-[11px] font-bold text-[var(--theme-fg)]">
                {date.getDate()}
              </span>
              <span className="mt-0.5 flex flex-col gap-0.5">
                {dayTasks.slice(0, 2).map((task) => (
                  <span
                    key={task.key}
                    className={[
                      "truncate rounded px-1 py-0.5 text-[9px] font-bold",
                      task.completed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]",
                    ].join(" ")}
                    title={task.title}
                  >
                    {task.title}
                  </span>
                ))}
                {dayTasks.length > 2 ? (
                  <span className="text-[9px] font-bold text-[var(--theme-muted)]">
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
  const locale = getLocale(language);
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
  const [taskModules, setTaskModules] = useState<TaskModule[]>([]);

  useEffect(() => {
    setTaskModules(loadLayout());
  }, []);

  const moduleLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const module of taskModules) {
      if (module.id === "koeling") map.set(module.id, t("koeling"));
      else if (module.id === "ontvangst") map.set(module.id, t("ontvangst"));
      else if (module.id === "schoonmaak") map.set(module.id, t("schoonmaak"));
      else if (module.id === "kerntemperatuur")
        map.set(module.id, t("kerntemperatuur"));
      else map.set(module.id, module.name);
    }
    return map;
  }, [taskModules, t]);

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
        const id = String(row.id);
        const moduleId = row.custom_module_id
          ? String(row.custom_module_id)
          : String(row.type);
        const baseRoute = row.custom_module_id
          ? `/registreren/custom/${row.custom_module_id}`
          : `/registreren/${row.type}`;
        nextItems.push({
          id,
          title: row.name ?? "Item",
          moduleId,
          moduleLabel:
            customName ??
            (row.type === "kerntemperatuur" ? t("kerntemperatuur") : t("koeling")),
          route: `${baseRoute}?item=${encodeURIComponent(id)}`,
          itemKind: "equipment",
          schedule,
        });
      }

      for (const row of products.data ?? []) {
        const schedule = normalizeSchedule(row.schedule);
        if (!schedule) continue;
        const customName = customModuleName(row);
        const id = String(row.id);
        const moduleId = row.custom_module_id
          ? String(row.custom_module_id)
          : "ontvangst";
        const baseRoute = row.custom_module_id
          ? `/registreren/custom/${row.custom_module_id}`
          : "/registreren/ontvangst";
        nextItems.push({
          id,
          title: row.name ?? "Item",
          moduleId,
          moduleLabel: customName ?? t("ontvangst"),
          route: `${baseRoute}?item=${encodeURIComponent(id)}`,
          itemKind: "product",
          schedule,
        });
      }

      for (const row of locations.data ?? []) {
        const schedule = normalizeSchedule(row.schedule);
        if (!schedule) continue;
        const customName = customModuleName(row);
        const id = String(row.id);
        const moduleId = row.custom_module_id
          ? String(row.custom_module_id)
          : "schoonmaak";
        const baseRoute = row.custom_module_id
          ? `/registreren/custom/${row.custom_module_id}`
          : "/registreren/schoonmaak";
        nextItems.push({
          id,
          title: row.name ?? "Item",
          moduleId,
          moduleLabel: customName ?? t("schoonmaak"),
          route: `${baseRoute}?item=${encodeURIComponent(id)}`,
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

  const filterOptions = useMemo(() => {
    const knownIds = new Set<string>();
    const options: { id: string; label: string }[] = [];

    for (const module of taskModules) {
      knownIds.add(module.id);
      options.push({
        id: module.id,
        label: moduleLabelById.get(module.id) ?? module.name,
      });
    }

    const orphans = new Map<string, string>();
    for (const task of plannedTasks) {
      if (!knownIds.has(task.moduleId)) {
        orphans.set(task.moduleId, task.moduleLabel);
      }
    }
    for (const [id, label] of orphans) {
      options.push({ id, label });
    }

    return options.sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [taskModules, plannedTasks, moduleLabelById, locale]);

  const filteredTasks = useMemo(() => {
    if (moduleFilter === "all") return plannedTasks;
    return plannedTasks.filter((task) => task.moduleId === moduleFilter);
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
    <section className="mt-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--theme-primary)]/10">
          <CalendarClock className="h-5 w-5 text-[var(--theme-primary)]" />
        </div>
        <h2 className="text-lg font-black text-[var(--theme-fg)]">{t("reminders")}</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--theme-primary)] border-t-transparent" />
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-5">
          <p className="text-center text-sm font-bold text-red-700">
            {errorMessage}
          </p>
        </div>
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
            showDate
            locale={locale}
          />

          {/* Calendar Section */}
          <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
              {t("allPlanning")}
            </h3>
            
            {filterOptions.length > 0 ? (
              <div className="mb-4">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[var(--theme-muted)]">
                  {t("filterByType")}
                </span>
                <select
                  value={moduleFilter}
                  onChange={(event) => setModuleFilter(event.target.value)}
                  aria-label={t("filterByType")}
                  className="w-full rounded-lg border border-[var(--theme-card-border)] bg-white px-3 py-2 text-sm font-bold text-[var(--theme-fg)]"
                >
                  <option value="all">{t("all")}</option>
                  {filterOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* Month Navigation */}
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMonthIndex((value) => Math.max(0, value - 1))}
                disabled={monthIndex === 0}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--theme-card-border)] bg-white text-[var(--theme-fg)] transition-colors hover:border-[var(--theme-primary)]/30 disabled:opacity-40"
                aria-label={t("previousMonth")}
              >
                <ChevronLeft className="h-4 w-4" />
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
                className="w-36 rounded-lg border border-[var(--theme-card-border)] bg-white px-3 py-2 text-sm font-bold capitalize text-[var(--theme-fg)] sm:w-40"
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
                className="rounded-lg border border-[var(--theme-card-border)] bg-white px-3 py-2 text-sm font-bold text-[var(--theme-fg)]"
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
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--theme-card-border)] bg-white text-[var(--theme-fg)] transition-colors hover:border-[var(--theme-primary)]/30 disabled:opacity-40"
                aria-label={t("nextMonth")}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-center text-sm font-bold capitalize text-[var(--theme-fg)]">
              {monthLabel(calendarMonth, locale)}
            </p>
            
            <CalendarMonth
              month={calendarMonth}
              tasks={filteredTasks}
              onSelectDate={(date) => setSelectedDate(date)}
              weekdays={weekdayNames}
            />
          </div>
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
