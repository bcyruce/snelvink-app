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
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clock,
  Layers,
  RotateCcw,
  Square,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  iconPressMotionProps,
  listContainerVariants,
  listItemVariants,
  modalBackdropVariants,
  modalSheetVariants,
} from "@/lib/uiMotion";

type ItemKind = "equipment" | "product" | "location";

type ScheduledItem = {
  id: string;
  title: string;
  moduleId: string;
  moduleLabel: string;
  itemKind: ItemKind;
  schedule: FrequencySchedule;
};

type RecordRow = {
  recorded_at: string;
  equipment_id: string | null;
  product_id: string | null;
  location_id: string | null;
};

type DismissedRow = {
  item_kind: ItemKind;
  item_id: string;
  occurrence_date: string;
  occurrence_time: string | null;
};

type IncompleteTask = {
  key: string;
  itemKind: ItemKind;
  itemId: string;
  date: string;
  time: string | null;
  title: string;
  moduleId: string;
  moduleLabel: string;
  requiredCount: number;
  completedCount: number;
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

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function toInputDate(date: Date): string {
  const next = startOfDay(date);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDateLabel(isoDate: string, locale: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

export default function IncompleteTasksList() {
  const router = useRouter();
  const { profile, restaurant, user } = useUser();
  const { t, language } = useTranslation();
  const locale = getLocale(language);
  const restaurantId = profile?.restaurant_id ?? null;

  const openingHours = useMemo(
    () => normalizeOpeningHours(restaurant?.opening_hours),
    [restaurant?.opening_hours],
  );
  const closedDays = useMemo(
    () => normalizeClosedDays(restaurant?.closed_days),
    [restaurant?.closed_days],
  );

  const [taskModules, setTaskModules] = useState<TaskModule[]>([]);
  const [items, setItems] = useState<ScheduledItem[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [dismissed, setDismissed] = useState<DismissedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const today = startOfDay(new Date());
  const defaultStartDate = toInputDate(addDays(today, -30));
  const defaultEndDate = toInputDate(today);

  const [filterStartDate, setFilterStartDate] = useState<string>(defaultStartDate);
  const [filterEndDate, setFilterEndDate] = useState<string>(defaultEndDate);
  const [filterModuleId, setFilterModuleId] = useState<string>("all");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [marking, setMarking] = useState(false);

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

  const loadAll = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    setErrorMessage(null);

    const horizon = startOfDay(addDays(new Date(), -365));

    const [equipments, products, locations, recordResult, dismissedResult] =
      await Promise.all([
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
        supabase
          .from("haccp_records")
          .select("recorded_at, equipment_id, product_id, location_id")
          .eq("restaurant_id", restaurantId)
          .gte("recorded_at", horizon.toISOString()),
        supabase
          .from("dismissed_planned_tasks")
          .select("item_kind, item_id, occurrence_date, occurrence_time")
          .eq("restaurant_id", restaurantId)
          .gte("occurrence_date", toIsoDate(horizon)),
      ]);

    // Core data must succeed.
    if (
      equipments.error ||
      products.error ||
      locations.error ||
      recordResult.error
    ) {
      console.error(
        "Onvoltooide taken laden mislukt:",
        equipments.error ??
          products.error ??
          locations.error ??
          recordResult.error,
      );
      setErrorMessage(t("incompleteTasksLoadFailed"));
      setLoading(false);
      return;
    }

    // The dismissed_planned_tasks table is optional. If the migration has not
    // been applied yet (PostgREST returns 42P01 / "relation ... does not
    // exist"), treat it as if there are no dismissed occurrences instead of
    // failing the whole page.
    if (dismissedResult.error) {
      console.warn(
        "dismissed_planned_tasks niet beschikbaar (migratie nog niet toegepast?). Pagina werkt verder zonder afgevinkte taken.",
        dismissedResult.error,
      );
    }

    const nextItems: ScheduledItem[] = [];

    for (const row of equipments.data ?? []) {
      const schedule = normalizeSchedule(row.schedule);
      if (!schedule) continue;
      const customName = customModuleName(row);
      const moduleId = row.custom_module_id
        ? String(row.custom_module_id)
        : String(row.type);
      nextItems.push({
        id: String(row.id),
        title: row.name ?? "Item",
        moduleId,
        moduleLabel:
          customName ??
          (row.type === "kerntemperatuur" ? t("kerntemperatuur") : t("koeling")),
        itemKind: "equipment",
        schedule,
      });
    }

    for (const row of products.data ?? []) {
      const schedule = normalizeSchedule(row.schedule);
      if (!schedule) continue;
      const customName = customModuleName(row);
      const moduleId = row.custom_module_id
        ? String(row.custom_module_id)
        : "ontvangst";
      nextItems.push({
        id: String(row.id),
        title: row.name ?? "Item",
        moduleId,
        moduleLabel: customName ?? t("ontvangst"),
        itemKind: "product",
        schedule,
      });
    }

    for (const row of locations.data ?? []) {
      const schedule = normalizeSchedule(row.schedule);
      if (!schedule) continue;
      const customName = customModuleName(row);
      const moduleId = row.custom_module_id
        ? String(row.custom_module_id)
        : "schoonmaak";
      nextItems.push({
        id: String(row.id),
        title: row.name ?? "Item",
        moduleId,
        moduleLabel: customName ?? t("schoonmaak"),
        itemKind: "location",
        schedule,
      });
    }

    setItems(nextItems);
    setRecords((recordResult.data ?? []) as RecordRow[]);
    setDismissed(
      dismissedResult.error
        ? []
        : ((dismissedResult.data ?? []) as DismissedRow[]),
    );
    setLoading(false);
  }, [restaurantId, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const isOpenDate = useCallback(
    (date: Date) => isRestaurantOpenOn(date, openingHours, closedDays),
    [openingHours, closedDays],
  );

  const incompleteTasks = useMemo<IncompleteTask[]>(() => {
    const startDate = parseInputDate(filterStartDate);
    const endDate = parseInputDate(filterEndDate);
    if (!startDate || !endDate) return [];

    const rangeStart = startOfDay(startDate);
    const rangeEndExclusive = startOfDay(addDays(endDate, 1));
    const todayExclusive = startOfDay(addDays(new Date(), 1));
    const horizonEnd =
      rangeEndExclusive < todayExclusive ? rangeEndExclusive : todayExclusive;

    if (rangeStart >= horizonEnd) return [];

    const dismissedKeys = new Set(
      dismissed.map(
        (row) =>
          `${row.item_kind}:${row.item_id}:${row.occurrence_date}:${row.occurrence_time ?? ""}`,
      ),
    );

    const result: IncompleteTask[] = [];

    for (const item of items) {
      const occurrences = generateScheduleOccurrences(
        item.schedule,
        rangeStart,
        horizonEnd,
        isOpenDate,
      );
      for (const occurrence of occurrences) {
        const time = occurrence.time ?? null;
        const key = `${item.itemKind}:${item.id}:${occurrence.date}:${time ?? ""}`;
        if (dismissedKeys.has(key)) continue;
        const completedCount = countRecordsForDate(item, records, occurrence.date);
        if (completedCount >= occurrence.requiredCount) continue;
        result.push({
          key,
          itemKind: item.itemKind,
          itemId: item.id,
          date: occurrence.date,
          time,
          title: item.title,
          moduleId: item.moduleId,
          moduleLabel: item.moduleLabel,
          requiredCount: occurrence.requiredCount,
          completedCount,
        });
      }
    }

    result.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (a.time ?? "").localeCompare(b.time ?? "");
    });

    return result;
  }, [items, records, dismissed, filterStartDate, filterEndDate, isOpenDate]);

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
    for (const task of incompleteTasks) {
      if (!knownIds.has(task.moduleId)) {
        orphans.set(task.moduleId, task.moduleLabel);
      }
    }
    for (const [id, label] of orphans) options.push({ id, label });
    return options.sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [taskModules, moduleLabelById, incompleteTasks, locale]);

  const visibleTasks = useMemo(() => {
    if (filterModuleId === "all") return incompleteTasks;
    return incompleteTasks.filter((task) => task.moduleId === filterModuleId);
  }, [incompleteTasks, filterModuleId]);

  useEffect(() => {
    setSelectedKeys((current) => {
      if (current.size === 0) return current;
      const visibleSet = new Set(visibleTasks.map((task) => task.key));
      const next = new Set<string>();
      for (const key of current) {
        if (visibleSet.has(key)) next.add(key);
      }
      return next.size === current.size ? current : next;
    });
  }, [visibleTasks]);

  const allVisibleSelected =
    visibleTasks.length > 0 &&
    visibleTasks.every((task) => selectedKeys.has(task.key));

  const toggleAll = () => {
    setSelectedKeys((current) => {
      if (allVisibleSelected) return new Set();
      const next = new Set(current);
      for (const task of visibleTasks) next.add(task.key);
      return next;
    });
  };

  const toggleOne = (key: string) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleResetFilters = () => {
    setFilterStartDate(defaultStartDate);
    setFilterEndDate(defaultEndDate);
    setFilterModuleId("all");
  };

  const handleConfirmMark = async () => {
    if (!restaurantId || selectedKeys.size === 0) return;
    const selectedTasks = visibleTasks.filter((task) =>
      selectedKeys.has(task.key),
    );
    if (selectedTasks.length === 0) return;

    setMarking(true);
    try {
      const payload = selectedTasks.map((task) => ({
        restaurant_id: restaurantId,
        user_id: user?.id ?? null,
        item_kind: task.itemKind,
        item_id: task.itemId,
        occurrence_date: task.date,
        occurrence_time: task.time,
      }));

      const { error } = await supabase
        .from("dismissed_planned_tasks")
        .insert(payload);

      if (error) {
        console.error("Markeren mislukt:", error);
        setErrorMessage(t("markCompletedFailed"));
        setMarking(false);
        return;
      }

      setSelectedKeys(new Set());
      setShowConfirm(false);
      await loadAll();
    } catch (error) {
      console.error("Markeren mislukt:", error);
      setErrorMessage(t("markCompletedFailed"));
    } finally {
      setMarking(false);
    }
  };

  const filtersActive =
    filterStartDate !== defaultStartDate ||
    filterEndDate !== defaultEndDate ||
    filterModuleId !== "all";

  return (
    <div className="mt-2">
      <div className="mb-4 flex items-center gap-3">
        <motion.button
          {...iconPressMotionProps}
          type="button"
          onClick={() => router.back()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white text-slate-700"
          aria-label={t("back")}
        >
          <motion.span
            initial={{ x: 0 }}
            whileHover={{ x: -3 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="inline-flex"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
          </motion.span>
        </motion.button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {t("incompleteTasksTitle")}
          </h1>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {t("incompleteTasksIntro")}
          </p>
        </div>
      </div>

      <section
        aria-label={t("filterRecords")}
        className="mb-4 rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
            {t("filterRecords")}
          </h3>
          <AnimatePresence>
            {filtersActive ? (
              <motion.button
                key="reset"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                whileHover={{ scale: 1.05, rotate: -3 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-600"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={2.75} aria-hidden />
                {t("resetFilters")}
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label className="col-span-1 flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t("from")}
            </span>
            <input
              type="date"
              value={filterStartDate}
              max={filterEndDate || undefined}
              onChange={(event) => setFilterStartDate(event.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
            />
          </label>
          <label className="col-span-1 flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t("to")}
            </span>
            <input
              type="date"
              value={filterEndDate}
              min={filterStartDate || undefined}
              max={defaultEndDate}
              onChange={(event) => setFilterEndDate(event.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t("task")}
            </span>
            <select
              value={filterModuleId}
              onChange={(event) => setFilterModuleId(event.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
            >
              <option value="all">{t("allTasks")}</option>
              {filterOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-500 border-t-transparent" />
        </div>
      ) : null}

      {!loading && errorMessage ? (
        <div className="mb-4 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-4 text-center text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!loading && !restaurantId ? (
        <p className="rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white px-4 py-6 text-center font-bold text-slate-500">
          {t("noRestaurantLinked")}
        </p>
      ) : null}

      {!loading && restaurantId && visibleTasks.length === 0 ? (
        <p className="rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white px-4 py-6 text-center font-bold text-slate-500">
          {filtersActive
            ? t("noIncompleteTasksForFilter")
            : t("noIncompleteTasks")}
        </p>
      ) : null}

      {!loading && restaurantId && visibleTasks.length > 0 ? (
        <>
          <div className="mb-3 overflow-hidden rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white">
            <motion.button
              type="button"
              onClick={toggleAll}
              whileHover={{ backgroundColor: "rgba(241,245,249,1)" }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="flex items-center gap-3">
                <AnimatePresence mode="wait" initial={false}>
                  {allVisibleSelected ? (
                    <motion.span
                      key="checked"
                      initial={{ scale: 0.6, rotate: -45, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0.6, rotate: 45, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 480, damping: 22 }}
                      className="inline-flex"
                    >
                      <CheckSquare
                        className="h-5 w-5 text-blue-600"
                        strokeWidth={2.5}
                      />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="unchecked"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 480, damping: 22 }}
                      className="inline-flex"
                    >
                      <Square className="h-5 w-5 text-slate-400" strokeWidth={2.5} />
                    </motion.span>
                  )}
                </AnimatePresence>
                <span className="text-sm font-black uppercase tracking-wider text-slate-700">
                  {allVisibleSelected ? t("deselectAll") : t("selectAll")}
                </span>
              </span>
              <motion.span
                key={`${selectedKeys.size}/${visibleTasks.length}`}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 460, damping: 22 }}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black tabular-nums text-slate-700"
              >
                {selectedKeys.size}/{visibleTasks.length}
              </motion.span>
            </motion.button>
          </div>

          <motion.ul
            className="flex flex-col gap-1.5"
            variants={listContainerVariants}
            initial="initial"
            animate="animate"
          >
            {visibleTasks.map((task) => {
              const checked = selectedKeys.has(task.key);
              const showRatio = task.requiredCount > 1;
              return (
                <motion.li
                  key={task.key}
                  variants={listItemVariants}
                  layout
                >
                  <motion.button
                    type="button"
                    onClick={() => toggleOne(task.key)}
                    whileHover={{ y: -2, boxShadow: "0 8px 22px rgba(0,0,0,0.08)" }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 380, damping: 24 }}
                    className={[
                      "group flex w-full items-stretch overflow-hidden rounded-xl border-2 text-left",
                      checked
                        ? "border-blue-300 bg-blue-50/60"
                        : "border-slate-200 border-b-4 border-b-slate-300 bg-white",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden
                      className={[
                        "w-1.5 shrink-0 transition-colors duration-200",
                        checked ? "bg-blue-400" : "bg-red-400",
                      ].join(" ")}
                    />
                    <div className="flex flex-1 items-start gap-3 p-3">
                      <motion.span
                        animate={
                          checked
                            ? { scale: [1, 1.25, 1], rotate: [0, -8, 0] }
                            : { scale: 1, rotate: 0 }
                        }
                        transition={{ duration: 0.35 }}
                        className={[
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                          checked
                            ? "bg-blue-600 text-white"
                            : "border-2 border-slate-300 bg-white text-transparent",
                        ].join(" ")}
                        aria-hidden
                      >
                        {checked ? (
                          <CheckSquare className="h-4 w-4" strokeWidth={3} />
                        ) : null}
                      </motion.span>

                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-base font-black leading-tight text-slate-900">
                          {task.title}
                        </h4>
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-500">
                          <Layers className="h-3 w-3 shrink-0" strokeWidth={2.75} />
                          <span className="truncate">{task.moduleLabel}</span>
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700">
                            <CalendarDays
                              className="h-3 w-3 shrink-0"
                              strokeWidth={2.75}
                            />
                            {formatDateLabel(task.date, locale)}
                          </span>
                          {task.time ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black tabular-nums text-slate-700">
                              <Clock
                                className="h-3 w-3 shrink-0"
                                strokeWidth={2.75}
                              />
                              {task.time}
                            </span>
                          ) : null}
                          {showRatio ? (
                            <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-black tabular-nums text-red-700">
                              {task.completedCount}/{task.requiredCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                </motion.li>
              );
            })}
          </motion.ul>
        </>
      ) : null}

      <AnimatePresence>
        {selectedKeys.size > 0 ? (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md"
          >
            <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
              <motion.span
                key={selectedKeys.size}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 460, damping: 22 }}
                className="text-sm font-black text-slate-700"
              >
                {t("selectedCount", { count: selectedKeys.size })}
              </motion.span>
              <SupercellButton
                type="button"
                size="lg"
                variant="primary"
                onClick={() => setShowConfirm(true)}
                textCase="normal"
                className="ml-auto h-12 flex-1 rounded-2xl text-base sm:flex-none sm:px-6"
              >
                <CheckCircle2
                  className="mr-2 inline h-5 w-5"
                  strokeWidth={2.5}
                  aria-hidden
                />
                {t("markAsCompleted")}
              </SupercellButton>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirm ? (
          <motion.div
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mark-confirm-title"
            onClick={() => {
              if (!marking) setShowConfirm(false);
            }}
          >
            <motion.div
              variants={modalSheetVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <AlertTriangle
                    className="h-5 w-5 text-amber-600"
                    strokeWidth={2.5}
                  />
                </span>
                <h2
                  id="mark-confirm-title"
                  className="text-lg font-black text-slate-900"
                >
                  {t("markCompletedWarningTitle")}
                </h2>
              </div>
              <motion.button
                {...iconPressMotionProps}
                type="button"
                onClick={() => {
                  if (!marking) setShowConfirm(false);
                }}
                aria-label={t("close")}
                disabled={marking}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-relaxed text-amber-900">
                {t("markCompletedWarning")}
              </p>
              <p className="mt-3 text-sm font-bold text-slate-700">
                {t("selectedCount", { count: selectedKeys.size })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-5 py-4">
              <SupercellButton
                type="button"
                size="lg"
                variant="neutral"
                onClick={() => setShowConfirm(false)}
                disabled={marking}
                className="h-14 rounded-2xl text-base normal-case"
              >
                {t("cancel")}
              </SupercellButton>
              <SupercellButton
                type="button"
                size="lg"
                variant="primary"
                onClick={() => void handleConfirmMark()}
                disabled={marking}
                aria-busy={marking}
                className="h-14 rounded-2xl text-base normal-case"
              >
                {marking ? t("marking") : t("confirm")}
              </SupercellButton>
            </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
