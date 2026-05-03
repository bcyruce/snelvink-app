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
import {
  iconPressMotionProps,
  listContainerVariants,
  listItemVariants,
  modalBackdropVariants,
  modalSheetVariants,
} from "@/lib/uiMotion";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
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
  id: string;
  recorded_at: string;
  equipment_id: string | null;
  product_id: string | null;
  location_id: string | null;
};

type CompletedRecord = {
  id: string;
  /** HH:MM string in the user's local time. */
  time: string;
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
  /** All haccp_records that contributed to this occurrence (for the "details" view). */
  completedRecords: CompletedRecord[];
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

function recordsForDate(
  item: ScheduledItem,
  records: RecordRow[],
  date: string,
) {
  return records.filter((record) => {
    if (toIsoDate(new Date(record.recorded_at)) !== date) return false;
    if (item.itemKind === "equipment") return record.equipment_id === item.id;
    if (item.itemKind === "product") return record.product_id === item.id;
    return record.location_id === item.id;
  });
}

function formatTimeOfDay(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
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
      const matchedRecords = recordsForDate(item, records, occurrence.date);
      const completedCount = matchedRecords.length;
      const completed = completedCount >= occurrence.requiredCount;
      const completedRecords: CompletedRecord[] = matchedRecords
        .map((record) => ({
          id: record.id,
          time: formatTimeOfDay(record.recorded_at),
        }))
        .sort((a, b) => a.time.localeCompare(b.time));
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
        completedRecords,
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
  const { t } = useTranslation();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const dateLabel =
    showDate && locale ? formatTaskDateLabel(task.date, locale) : null;
  const showRatio = task.requiredCount > 1;
  const ratioPartial =
    task.completedCount > 0 && task.completedCount < task.requiredCount;
  const hasMeta = Boolean(dateLabel || task.time || showRatio);

  // ── COMPLETED: compact "done" row that can be expanded for details ──────────
  if (task.completed) {
    const detailsId = `task-details-${task.key}`;
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, type: "spring", stiffness: 320, damping: 24 }}
        className="overflow-hidden rounded-lg border border-emerald-200/70 bg-emerald-50/40"
      >
        <div className="flex items-center gap-2 px-2 py-1.5">
          <motion.span
            aria-hidden
            initial={{ scale: 0.6, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 460, damping: 18, delay: index * 0.03 + 0.05 }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </motion.span>
          <motion.button
            type="button"
            onClick={onClick}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
            className="min-w-0 flex-1 truncate text-left text-sm font-bold text-emerald-900/80 line-through decoration-emerald-400/60 underline-offset-2 hover:text-emerald-900"
            title={task.title}
          >
            {task.title}
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setDetailsOpen((value) => !value)}
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-700 transition-colors hover:bg-emerald-100/60"
          >
            {t("details")}
            <motion.span
              animate={{ rotate: detailsOpen ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="inline-flex"
            >
              <ChevronDown
                className="h-3.5 w-3.5"
                strokeWidth={2.75}
                aria-hidden
              />
            </motion.span>
          </motion.button>
        </div>
        <AnimatePresence initial={false}>
          {detailsOpen ? (
            <motion.div
              key="details"
              id={detailsId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-emerald-200/70 bg-white/70"
            >
              <div className="px-3 py-2">
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800/80">
                  <Layers className="h-3 w-3 shrink-0" strokeWidth={2.75} />
                  <span className="truncate">{task.moduleLabel}</span>
                  {showRatio ? (
                    <span className="ml-auto rounded-md bg-emerald-100 px-1.5 py-0.5 tabular-nums text-emerald-700">
                      {task.completedCount}/{task.requiredCount}
                    </span>
                  ) : null}
                </p>
                {dateLabel ? (
                  <p className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                    <CalendarDays className="h-3 w-3 shrink-0" strokeWidth={2.75} />
                    {dateLabel}
                  </p>
                ) : null}
                {task.completedRecords.length > 0 ? (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {task.completedRecords.map((record) => (
                      <li
                        key={record.id}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-black tabular-nums text-emerald-800"
                      >
                        <Clock className="h-3 w-3" strokeWidth={2.75} aria-hidden />
                        {record.time || "—"}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ── PENDING / TODO: friendly to-do card with an empty checkbox affordance ───
  return (
    <motion.button
      type="button"
      onClick={onClick}
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 320, damping: 22 }}
      whileHover={{ y: -2, boxShadow: "0 10px 24px rgba(0,0,0,0.08)" }}
      whileTap={{ scale: 0.97 }}
      className={[
        "group block w-full overflow-hidden rounded-xl border-2 text-left transition-colors",
        ratioPartial
          ? "border-amber-200 border-b-4 border-b-amber-300 bg-amber-50/50 hover:border-amber-300"
          : "border-[var(--theme-card-border)] border-b-4 border-b-slate-300 bg-[var(--theme-card-bg)] hover:border-[var(--theme-primary)]/40",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 p-3">
        <span
          aria-hidden
          className={[
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            ratioPartial
              ? "border-amber-400 bg-white text-amber-500"
              : "border-[var(--theme-primary)]/40 bg-white text-[var(--theme-primary)]/0 group-hover:bg-[var(--theme-primary)]/5",
          ].join(" ")}
        >
          {ratioPartial ? (
            <span className="block h-2 w-2 rounded-full bg-amber-500" />
          ) : (
            <Circle className="h-3.5 w-3.5" strokeWidth={2.5} />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate text-base font-black leading-tight text-[var(--theme-fg)]">
              {task.title}
            </h4>
            <ChevronRight
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--theme-muted)] transition-transform duration-200 group-hover:translate-x-1"
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
                  <CalendarDays
                    className="h-3 w-3 shrink-0"
                    strokeWidth={2.75}
                  />
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
                    ratioPartial
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-700",
                  ].join(" ")}
                >
                  {task.completedCount}/{task.requiredCount}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </motion.button>
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

  // Pending first, completed (compact rows) at the bottom — preserves
  // the original ordering inside each group.
  const pending = tasks.filter((task) => !task.completed);
  const completed = tasks.filter((task) => task.completed);

  return (
    <div className="flex flex-col gap-1.5">
      {pending.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {pending.map((task, index) => (
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
      ) : null}
      {completed.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {completed.map((task, index) => (
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
      ) : null}
    </div>
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
      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        whileHover={{ y: -1, boxShadow: "0 6px 14px rgba(0,0,0,0.06)" }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 400, damping: 24 }}
        className="flex items-center justify-between gap-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] px-4 py-3 text-left transition-colors hover:border-[var(--theme-primary)]/30"
      >
        <span className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
            {title}
          </span>
          <AnimatePresence>
            {count > 0 ? (
              <motion.span
                key={count}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 460, damping: 22 }}
                className="rounded-full bg-[var(--theme-primary)] px-2 py-0.5 text-[10px] font-bold text-white"
              >
                {count}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="inline-flex"
        >
          <ChevronDown
            className="h-4 w-4 shrink-0 text-[var(--theme-muted)]"
          />
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <TaskList
              tasks={tasks}
              emptyText={emptyText}
              showDate={showDate}
              locale={locale}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
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
    <motion.div
      variants={modalBackdropVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 h-full w-full"
      />
      <motion.div
        variants={modalSheetVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80 || info.velocity.y > 600) onClose();
        }}
        className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--theme-bg)] p-5 shadow-2xl"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--theme-muted)]/30" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-black capitalize text-[var(--theme-fg)]">
            {titleLabel}
          </h3>
          <motion.button
            {...iconPressMotionProps}
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--theme-muted)] transition-colors hover:bg-[var(--theme-card-bg)]"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>
        {tasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] px-4 py-5 text-center text-sm font-medium text-[var(--theme-muted)]">
            {t("noPlannedTasksOnDay")}
          </p>
        ) : (
          <motion.ul
            className="flex flex-col gap-1.5"
            variants={listContainerVariants}
            initial="initial"
            animate="animate"
          >
            {tasks.map((task, index) => (
              <motion.li key={task.key} variants={listItemVariants}>
                <TaskCard
                  task={task}
                  index={index}
                  onClick={() => {
                    onClose();
                    router.push(task.route);
                  }}
                />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </motion.div>
    </motion.div>
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
        {cells.map((date, cellIndex) => {
          const dayTasks = tasksForDate(tasks, date);
          const isCurrentMonth = date.getMonth() === month.getMonth();
          return (
            <motion.button
              key={toIsoDate(date)}
              type="button"
              onClick={() => onSelectDate(date)}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: isCurrentMonth ? 1 : 0.3, scale: 1 }}
              transition={{ delay: cellIndex * 0.005, duration: 0.18 }}
              whileHover={isCurrentMonth ? { scale: 1.05, y: -1, zIndex: 1 } : undefined}
              whileTap={isCurrentMonth ? { scale: 0.95 } : undefined}
              className={[
                "flex min-h-[68px] flex-col rounded-lg border p-1 text-left transition-colors hover:border-[var(--theme-primary)]/30",
                isCurrentMonth
                  ? "border-[var(--theme-card-border)] bg-white"
                  : "border-transparent bg-transparent",
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
            </motion.button>
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
        .select("id, recorded_at, equipment_id, product_id, location_id")
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

  // Keep completed tasks in the list — they collapse into a compact "done"
  // row (with an expandable details panel) instead of disappearing.
  const todayTasks = tasksForDate(filteredTasks, today);
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
              <motion.button
                type="button"
                onClick={() => setMonthIndex((value) => Math.max(0, value - 1))}
                disabled={monthIndex === 0}
                whileHover={monthIndex === 0 ? undefined : { scale: 1.1, x: -2 }}
                whileTap={monthIndex === 0 ? undefined : { scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--theme-card-border)] bg-white text-[var(--theme-fg)] transition-colors hover:border-[var(--theme-primary)]/30 disabled:opacity-40"
                aria-label={t("previousMonth")}
              >
                <ChevronLeft className="h-4 w-4" />
              </motion.button>
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
              <motion.button
                type="button"
                onClick={() =>
                  setMonthIndex((value) => Math.min(maxMonthIndex, value + 1))
                }
                disabled={monthIndex === maxMonthIndex}
                whileHover={monthIndex === maxMonthIndex ? undefined : { scale: 1.1, x: 2 }}
                whileTap={monthIndex === maxMonthIndex ? undefined : { scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--theme-card-border)] bg-white text-[var(--theme-fg)] transition-colors hover:border-[var(--theme-primary)]/30 disabled:opacity-40"
                aria-label={t("nextMonth")}
              >
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={monthIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="mb-3 text-center text-sm font-bold capitalize text-[var(--theme-fg)]"
              >
                {monthLabel(calendarMonth, locale)}
              </motion.p>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${monthIndex}-${moduleFilter}`}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <CalendarMonth
                  month={calendarMonth}
                  tasks={filteredTasks}
                  onSelectDate={(date) => setSelectedDate(date)}
                  weekdays={weekdayNames}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}

      <AnimatePresence>
        {selectedDate ? (
          <DayPreviewModal
            date={selectedDate}
            tasks={tasksForDate(filteredTasks, selectedDate)}
            onClose={() => setSelectedDate(null)}
            locale={locale}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}
