"use client";

import ExportModal, { type ExportFormat } from "@/components/ExportModal";
import SupercellButton from "@/components/SupercellButton";
import { useTranslation } from "@/hooks/useTranslation";
import {
  exportHistoryAsCsv,
  exportHistoryAsPdf,
  type ExportHistoryRow,
} from "@/lib/historyExport";
import { supabase } from "@/lib/supabase";
import { loadLayout, type TaskModule } from "@/lib/taskModules";
import { useUser } from "@/hooks/useUser";
import { AlertCircle, ChevronRight, Download, Eye, Filter, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

type HaccpModuleType =
  | "koeling"
  | "kerntemperatuur"
  | "ontvangst"
  | "schoonmaak"
  | "custom_number"
  | "custom_boolean"
  | "custom_list";

type HaccpRecordRow = {
  id: string;
  user_id: string | null;
  recorded_at: string;
  module_type: HaccpModuleType;
  temperature: number | null;
  status: "goedgekeurd" | "afgekeurd" | null;
  reason: string | null;
  reasons: string[] | null;
  product_name: string | null;
  location_name: string | null;
  completed_tasks: string[] | null;
  image_urls: string[] | null;
  opmerking: string | null;
  correction_action: string | null;
  custom_module_id: string | null;
  haccp_equipments:
    | {
        name: string | null;
        limit_temp: number | null;
        unit: string | null;
      }
    | {
        name: string | null;
        limit_temp: number | null;
        unit: string | null;
      }[]
    | null;
  custom_modules:
    | { name: string | null }
    | { name: string | null }[]
    | null;
};

type ReportRow = {
  id: string;
  created_at: string;
  apparaat: string;
  taskName: string;
  userName: string;
  valueOrStatus: string;
  isOverLimit: boolean;
  status: "approved" | "rejected" | null;
  taskModuleId: string;
  detailFields: { key: string; label: string; value: string }[];
  source: "haccp" | "custom";
  photoUrls: string[];
};

function haccpTaskModuleId(row: HaccpRecordRow): string {
  if (
    row.module_type === "custom_number" ||
    row.module_type === "custom_boolean" ||
    row.module_type === "custom_list"
  ) {
    return row.custom_module_id ?? row.module_type;
  }
  return row.module_type;
}

type CustomModuleLogValue = {
  field_id: string;
  name: string;
  value: number;
  unit: string;
  remark: string | null;
};

type CustomModuleLogData = {
  module_name?: string;
  values?: CustomModuleLogValue[];
  photo_urls?: string[];
};

type CustomModuleLogRow = {
  id: string;
  created_at: string;
  module_id: string | null;
  custom_module_id: string | null;
  log_data: unknown;
};

function moduleLabel(
  type: HaccpModuleType,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (type === "koeling") return t("koeling");
  if (type === "kerntemperatuur") return t("kerntemperatuur");
  if (type === "ontvangst") return t("ontvangst");
  if (type === "schoonmaak") return t("schoonmaak");
  if (type === "custom_number") return t("moduleTypeNumber");
  if (type === "custom_boolean") return t("moduleTypeBoolean");
  if (type === "custom_list") return t("moduleTypeList");
  return type;
}

function customModuleName(row: HaccpRecordRow): string | null {
  const c = row.custom_modules;
  if (!c) return null;
  const entry = Array.isArray(c) ? c[0] : c;
  return entry?.name ?? null;
}

function equipmentName(
  row: HaccpRecordRow,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  const e = row.haccp_equipments;
  if (!e) return t("unknownEquipment");
  if (Array.isArray(e)) return e[0]?.name ?? t("unknownEquipment");
  return e.name ?? t("unknownEquipment");
}

function equipmentLimit(row: HaccpRecordRow): number | null {
  const e = row.haccp_equipments;
  if (!e) return null;
  const entry = Array.isArray(e) ? e[0] : e;
  return typeof entry?.limit_temp === "number" ? entry.limit_temp : null;
}

function equipmentUnit(row: HaccpRecordRow): string {
  const e = row.haccp_equipments;
  if (!e) return "°C";
  const entry = Array.isArray(e) ? e[0] : e;
  return entry?.unit && entry.unit.length > 0 ? entry.unit : "°C";
}

function describeHaccpRow(
  row: HaccpRecordRow,
  t: ReturnType<typeof useTranslation>["t"],
): {
  apparaat: string;
  taskName: string;
  valueOrStatus: string;
} {
  const customName = customModuleName(row);

  if (row.module_type === "ontvangst" || row.module_type === "custom_boolean") {
    const productName = row.product_name ?? t("unknownItem");
    const status =
      row.status === "goedgekeurd"
        ? t("goedgekeurd")
        : row.status === "afgekeurd"
          ? t("afgekeurd")
          : t("unknown");
    return {
      apparaat: productName,
      taskName: customName ?? moduleLabel(row.module_type, t),
      valueOrStatus: status,
    };
  }
  if (row.module_type === "schoonmaak" || row.module_type === "custom_list") {
    const location = row.location_name ?? t("unknownGroup");
    const tasks = row.completed_tasks ?? [];
    return {
      apparaat: location,
      taskName: customName ?? moduleLabel(row.module_type, t),
      valueOrStatus: tasks.length > 0 ? tasks.join(", ") : "—",
    };
  }
  // Koeling / kerntemperatuur / custom_number
  const unit = equipmentUnit(row);
  return {
    apparaat: equipmentName(row, t),
    taskName:
      row.module_type === "koeling"
        ? t("temperatureRegistration")
        : (customName ?? moduleLabel(row.module_type, t)),
    valueOrStatus:
      typeof row.temperature === "number"
        ? `${Number(row.temperature).toFixed(1)} ${unit}`
        : "—",
  };
}

function formatLogTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function groupDateLabel(
  iso: string,
  t: ReturnType<typeof useTranslation>["t"],
  locale: string,
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return t("unknownDate");

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return t("today");
  if (sameDay(d, yesterday)) return t("yesterday");

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

function groupRowsByDate(
  rows: ReportRow[],
  t: ReturnType<typeof useTranslation>["t"],
  locale: string,
): { label: string; rows: ReportRow[] }[] {
  const groups = new Map<string, ReportRow[]>();

  rows.forEach((row) => {
    const label = groupDateLabel(row.created_at, t, locale);
    groups.set(label, [...(groups.get(label) ?? []), row]);
  });

  return Array.from(groups.entries()).map(([label, groupedRows]) => ({
    label,
    rows: groupedRows,
  }));
}

function isCustomLogData(value: unknown): value is CustomModuleLogData {
  if (!value || typeof value !== "object") return false;
  const maybe = value as CustomModuleLogData;
  return Array.isArray(maybe.values);
}

function statusLabel(
  status: "goedgekeurd" | "afgekeurd" | null,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  if (status === "goedgekeurd") return t("goedgekeurd");
  if (status === "afgekeurd") return t("afgekeurd");
  return "—";
}

function buildHaccpDetailFields(
  row: HaccpRecordRow,
  valueOrStatus: string,
  t: ReturnType<typeof useTranslation>["t"],
): { key: string; label: string; value: string }[] {
  const fields: { key: string; label: string; value: string }[] = [
    { key: "valueStatus", label: t("valueStatus"), value: valueOrStatus || "—" },
  ];

  if (
    (row.module_type === "koeling" ||
      row.module_type === "kerntemperatuur" ||
      row.module_type === "custom_number") &&
    typeof row.temperature === "number"
  ) {
    fields.push({
      key: "temperature",
      label: t("temperature"),
      value: String(row.temperature),
    });
  }

  if (row.module_type === "ontvangst" || row.module_type === "custom_boolean") {
    fields.push({
      key: "status",
      label: t("status"),
      value: statusLabel(row.status, t),
    });
    const selectedReasons =
      Array.isArray(row.reasons) && row.reasons.length > 0
        ? row.reasons.join(", ")
        : row.reason ?? "";
    if (selectedReasons.trim().length > 0) {
      fields.push({
        key: "selectedReasons",
        label: t("selectedReasons", { count: Array.isArray(row.reasons) ? row.reasons.length : 1 }),
        value: selectedReasons,
      });
    }
  }

  if (row.module_type === "schoonmaak" || row.module_type === "custom_list") {
    const selectedItems = row.completed_tasks ?? [];
    fields.push({
      key: "items",
      label: t("items"),
      value: selectedItems.length > 0 ? selectedItems.join(", ") : t("noItemsChecked"),
    });
  }

  if (row.correction_action && row.correction_action.trim().length > 0) {
    fields.push({
      key: "correctiveAction",
      label: t("correctiveAction"),
      value: row.correction_action,
    });
  }

  // Keep remarks at the end so users always find it last.
  if (row.opmerking && row.opmerking.trim().length > 0) {
    fields.push({
      key: "remarks",
      label: t("remarks"),
      value: row.opmerking,
    });
  }

  return fields;
}

const FREE_HISTORY_MS = 30 * 24 * 60 * 60 * 1000;

function toInputDate(date: Date): string {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function HistoryList() {
  const router = useRouter();
  const { translateHaccpText, t, language } = useTranslation();
  const { profile, restaurant, isFreePlan } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;
  const locale = language === "en" ? "en-GB" : "nl-NL";

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailRow, setDetailRow] = useState<ReportRow | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [taskModules, setTaskModules] = useState<TaskModule[]>([]);
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [filterTaskModuleId, setFilterTaskModuleId] = useState<string>("all");

  useEffect(() => {
    setTaskModules(loadLayout());
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    if (!restaurantId) {
      setRows([]);
      setLoading(false);
      return;
    }

    const sinceIso = new Date(Date.now() - FREE_HISTORY_MS).toISOString();

    const haccpBase = supabase
      .from("haccp_records")
      .select(
        "id, user_id, recorded_at, module_type, temperature, status, reason, reasons, product_name, location_name, completed_tasks, image_urls, opmerking, correction_action, custom_module_id, haccp_equipments ( name, limit_temp, unit ), custom_modules ( name )",
      )
      .eq("restaurant_id", restaurantId);

    const customBase = supabase
      .from("custom_module_logs")
      .select("id, created_at, module_id, custom_module_id, log_data")
      .eq("restaurant_id", restaurantId);

    const [haccpRes, customRes] = await Promise.all([
      isFreePlan ? haccpBase.gte("recorded_at", sinceIso) : haccpBase,
      isFreePlan ? customBase.gte("created_at", sinceIso) : customBase,
    ]);

    if (haccpRes.error) {
      console.error("haccp_records ophalen mislukt:", haccpRes.error);
    }
    if (customRes.error) {
      console.error("custom_module_logs ophalen mislukt:", customRes.error);
    }

    const haccpData = (haccpRes.data as HaccpRecordRow[] | null) ?? [];
    const userIds = Array.from(
      new Set(
        haccpData
          .map((row) => row.user_id)
          .filter((value): value is string => typeof value === "string"),
      ),
    );
    const userNameById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      if (profileError) {
        console.error("Gebruikers laden mislukt:", profileError);
      } else {
        for (const row of profileRows ?? []) {
          const item = row as {
            id: string;
            full_name: string | null;
            email: string | null;
          };
          const display = item.full_name?.trim() || item.email?.trim() || "Onbekend";
          userNameById.set(item.id, display);
        }
      }
    }

    const haccpRows =
      haccpData.map((row) => {
        const { apparaat, taskName, valueOrStatus } =
          describeHaccpRow(row, t);
        const limit = equipmentLimit(row);
        const isOverLimit =
          (row.module_type === "koeling" ||
            row.module_type === "kerntemperatuur" ||
            row.module_type === "custom_number") &&
          typeof row.temperature === "number" &&
          typeof limit === "number" &&
          Number(row.temperature) > limit;
        return {
          id: `h-${row.id}`,
          created_at: row.recorded_at,
          apparaat,
          taskName,
          userName: row.user_id ? (userNameById.get(row.user_id) ?? "Onbekend") : "Onbekend",
          valueOrStatus,
          isOverLimit,
          status: ((): "approved" | "rejected" | null => {
            if (
              row.module_type !== "ontvangst" &&
              row.module_type !== "custom_boolean"
            ) {
              return null;
            }
            if (row.status === "goedgekeurd") return "approved";
            if (row.status === "afgekeurd") return "rejected";
            return null;
          })(),
          taskModuleId: haccpTaskModuleId(row),
          detailFields: buildHaccpDetailFields(row, valueOrStatus, t),
          source: "haccp" as const,
          photoUrls: row.image_urls ?? [],
        };
      });

    const customRows =
      (customRes.data as CustomModuleLogRow[] | null)?.flatMap((row) => {
        const logData = row.log_data;
        if (!isCustomLogData(logData)) return [];

        const moduleName =
          logData.module_name ?? t("custom");
        const photoUrls = Array.isArray(logData.photo_urls)
          ? logData.photo_urls.filter(
              (value): value is string => typeof value === "string",
            )
          : [];

        return (logData.values ?? []).map((value, index) => ({
          id: `custom-${row.id}-${value.field_id}-${index}`,
          created_at: row.created_at,
          apparaat: value.name ?? t("moduleTypeNumber"),
          taskName: moduleName,
          userName: "Onbekend",
          valueOrStatus: `${value.value} ${value.unit ?? ""}`.trim(),
          isOverLimit: false,
          status: null,
          taskModuleId: row.custom_module_id ?? row.module_id ?? "custom",
          detailFields: [
            {
              key: "valueStatus",
              label: t("valueStatus"),
              value: `${value.value} ${value.unit ?? ""}`.trim() || "—",
            },
            ...(value.remark && value.remark.trim().length > 0
              ? [{ key: "remarks", label: t("remarks"), value: value.remark }]
              : []),
          ],
          source: "custom" as const,
          photoUrls,
        }));
      }) ?? [];

    const merged = [
      ...haccpRows,
      ...customRows,
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    setRows(merged);
    setLoading(false);
  }, [restaurantId, isFreePlan, t]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const defaultEndDate = toInputDate(new Date());
  const defaultStartDate = toInputDate(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );
  const exportTaskOptions = useMemo(
    () =>
      taskModules.map((module) => ({
        value: module.id,
        label: translateHaccpText(module.name),
      })),
    [taskModules, translateHaccpText],
  );

  const handleExportDownload = useCallback(
    async ({
      startDate,
      endDate,
      format,
      includePhotos,
      taskFilter,
    }: {
      startDate: string;
      endDate: string;
      format: ExportFormat;
      includePhotos: boolean;
      taskFilter: string;
    }) => {
      setIsExporting(true);
      try {
        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T23:59:59`);

        const exportRows: ExportHistoryRow[] = rows
          .filter((row) => {
            const timestamp = new Date(row.created_at).getTime();
            return (
              !Number.isNaN(timestamp) &&
              timestamp >= start.getTime() &&
              timestamp <= end.getTime() &&
              (taskFilter === "all" || row.taskModuleId === taskFilter)
            );
          })
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          )
          .map((row) => {
            const remarkValue =
              row.detailFields.find((field) => field.key === "remarks")?.value ?? "";
            return {
              createdAt: row.created_at,
              category: translateHaccpText(row.taskName),
              item: translateHaccpText(row.apparaat),
              valueOrStatus: translateHaccpText(row.valueOrStatus),
              userName: row.userName,
              remarks: remarkValue ? translateHaccpText(remarkValue) : "",
              photoUrls: row.photoUrls,
            };
          });

        if (format === "csv") {
          exportHistoryAsCsv(exportRows, {
            restaurantName: restaurant?.name ?? "Restaurant",
            startDate,
            endDate,
          });
        } else {
          await exportHistoryAsPdf(
            exportRows,
            {
              restaurantName: restaurant?.name ?? "Restaurant",
              startDate,
              endDate,
            },
            includePhotos,
          );
        }

        setShowExportModal(false);
      } catch (error) {
        console.error("Exporteren mislukt:", error);
      } finally {
        setIsExporting(false);
      }
    },
    [restaurant?.name, rows, translateHaccpText, t],
  );

  const filteredRows = useMemo(() => {
    const startMs = filterStartDate
      ? new Date(`${filterStartDate}T00:00:00`).getTime()
      : null;
    const endMs = filterEndDate
      ? new Date(`${filterEndDate}T23:59:59.999`).getTime()
      : null;
    return rows.filter((row) => {
      if (filterTaskModuleId !== "all" && row.taskModuleId !== filterTaskModuleId) {
        return false;
      }
      if (startMs === null && endMs === null) return true;
      const ts = new Date(row.created_at).getTime();
      if (Number.isNaN(ts)) return false;
      if (startMs !== null && ts < startMs) return false;
      if (endMs !== null && ts > endMs) return false;
      return true;
    });
  }, [rows, filterStartDate, filterEndDate, filterTaskModuleId]);

  const filtersActive =
    filterStartDate !== "" ||
    filterEndDate !== "" ||
    filterTaskModuleId !== "all";

  const handleResetFilters = () => {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterTaskModuleId("all");
  };

  const groupedRows = groupRowsByDate(filteredRows, t, locale);

  return (
    <div className="mt-2 print:mt-0">
      <ExportModal
        open={showExportModal}
        initialStartDate={defaultStartDate}
        initialEndDate={defaultEndDate}
        taskOptions={exportTaskOptions}
        isExporting={isExporting}
        onClose={() => {
          if (isExporting) return;
          setShowExportModal(false);
        }}
        onSubmit={handleExportDownload}
      />

      <h1 className="hidden print:mb-6 print:block print:text-4xl print:font-black print:tracking-tight print:text-black">
        {t("haccpLogbookTitle")}
      </h1>

      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl print:text-black">
          {isFreePlan ? t("latest30Days") : t("navGeschiedenis")}
        </h2>
      </div>

      <SupercellButton
        type="button"
        size="lg"
        variant="primary"
        onClick={() => setShowExportModal(true)}
        textCase="normal"
        className="mb-4 flex h-20 w-full items-center justify-center gap-3 text-xl print:hidden"
      >
        <Download className="h-7 w-7 shrink-0" strokeWidth={2.5} aria-hidden />
        Exporteer
      </SupercellButton>

      <SupercellButton
        type="button"
        size="lg"
        variant="neutral"
        onClick={() => router.push("/geschiedenis/onvoltooid")}
        textCase="normal"
        className="mb-4 flex h-16 w-full items-center justify-center gap-3 text-base print:hidden"
      >
        <AlertCircle className="h-5 w-5 shrink-0 text-red-500" strokeWidth={2.5} aria-hidden />
        <span className="font-black">{t("viewIncompleteTasks")}</span>
      </SupercellButton>

      <section
        aria-label={t("filterRecords")}
        className="mb-4 rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white p-4 print:hidden"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <Filter
                className="h-4 w-4 text-blue-600"
                strokeWidth={2.5}
                aria-hidden
              />
            </span>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
              {t("filterRecords")}
            </h3>
          </div>
          {filtersActive ? (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-600 transition-colors hover:bg-slate-100 active:scale-95"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={2.75} aria-hidden />
              {t("resetFilters")}
            </button>
          ) : null}
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
              onChange={(event) => setFilterEndDate(event.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t("task")}
            </span>
            <select
              value={filterTaskModuleId}
              onChange={(event) => setFilterTaskModuleId(event.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
            >
              <option value="all">{t("allTasks")}</option>
              {exportTaskOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="mb-4 flex items-center justify-end gap-3 print:hidden">
        <SupercellButton
          type="button"
          size="sm"
          variant="neutral"
          onClick={() => void fetchLogs()}
          disabled={loading}
          textCase="normal"
          className="min-h-[44px] shrink-0 rounded-xl px-4 py-2 text-sm"
        >
          {t("refresh")}
        </SupercellButton>
      </div>

      {loading && rows.length === 0 ? (
        <p className="text-center text-sm font-bold text-slate-500">{t("loading")}</p>
      ) : null}

      {!loading && !restaurantId ? (
        <p className="rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white px-4 py-6 text-center font-bold text-slate-500 print:border print:border-black print:bg-white print:text-black">
          {t("noRestaurantLinked")}
        </p>
      ) : null}

      {!loading && restaurantId && rows.length === 0 ? (
        <p className="rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white px-4 py-6 text-center font-bold text-slate-500 print:border print:border-black print:bg-white print:text-black">
          {isFreePlan
            ? t("noRegistrationsLast30Days")
            : t("noRegistrationsFound")}
        </p>
      ) : null}

      {!loading && restaurantId && rows.length > 0 && filteredRows.length === 0 ? (
        <p className="rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white px-4 py-6 text-center font-bold text-slate-500 print:hidden">
          {t("noRegistrationsForFilter")}
        </p>
      ) : null}

      {filteredRows.length > 0 ? (
        <>
          <div className="space-y-3 print:hidden">
            {groupedRows.map((group) => (
              <section
                key={`mobile-${group.label}`}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                  {group.label}
                </div>
                <ul className="divide-y divide-slate-100">
                  {group.rows.map((row) => (
                    <li key={`mobile-${row.id}`}>
                      <button
                        type="button"
                        onClick={() => setDetailRow(row)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition active:bg-slate-50"
                      >
                        <span className="flex h-11 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 text-[13px] font-black tabular-nums leading-none text-slate-700">
                          {formatLogTime(row.created_at, locale)}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-black leading-tight text-slate-900">
                            {translateHaccpText(row.apparaat)}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {translateHaccpText(row.taskName)}
                          </span>
                        </span>

                        <span
                          className={[
                            "shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-black",
                            row.isOverLimit || row.status === "rejected"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : row.status === "approved"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-800",
                          ].join(" ")}
                        >
                          {translateHaccpText(row.valueOrStatus)}
                        </span>

                        {row.photoUrls.length > 0 ? (
                          <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-blue-700">
                            {row.photoUrls.length}
                          </span>
                        ) : null}

                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-slate-400"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white print:block print:rounded-none print:border print:border-black print:bg-white">
            <table className="min-w-[760px] w-full border-collapse text-left print:min-w-0 print:bg-white">
            <thead>
              <tr className="bg-blue-500 print:bg-white">
                <th className="border-b-2 border-blue-700 px-4 py-4 text-sm font-black uppercase tracking-wide text-white print:border-black print:text-black">
                  {t("time")}
                </th>
                <th className="border-b-2 border-blue-700 px-4 py-4 text-sm font-black uppercase tracking-wide text-white print:border-black print:text-black">
                  {t("task")}
                </th>
                <th className="border-b-2 border-blue-700 px-4 py-4 text-sm font-black uppercase tracking-wide text-white print:border-black print:text-black">
                  {t("equipment")}
                </th>
                <th className="border-b-2 border-blue-700 px-4 py-4 text-sm font-black uppercase tracking-wide text-white print:border-black print:text-black">
                  {t("valueStatus")}
                </th>
                <th className="border-b-2 border-blue-700 px-4 py-4 text-sm font-black uppercase tracking-wide text-white print:border-black print:text-black">
                  {t("details")}
                </th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.map((group) => (
                <Fragment key={group.label}>
                  <tr>
                    <td
                      colSpan={5}
                      className="border-b-2 border-slate-200 bg-slate-100 px-4 py-3 text-base font-black uppercase tracking-wide text-slate-700 print:border-black print:bg-white print:text-black"
                    >
                      {group.label}
                    </td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-5 text-base font-black tabular-nums text-slate-900 print:border-black print:text-black">
                        {formatLogTime(row.created_at, locale)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-5 text-base font-bold text-slate-900 print:border-black print:text-black">
                        {translateHaccpText(row.taskName)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-5 text-base font-semibold text-slate-600 print:border-black print:text-black">
                        {translateHaccpText(row.apparaat)}
                      </td>
                      <td
                        className={[
                          "whitespace-nowrap border-b border-slate-100 px-4 py-5 text-base font-black print:border-black print:text-black",
                          row.isOverLimit
                            ? "text-red-600"
                            : "text-slate-900",
                        ].join(" ")}
                      >
                        {translateHaccpText(row.valueOrStatus)}
                        {row.isOverLimit ? (
                          <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-black uppercase tracking-wide text-red-700 print:bg-white print:text-black">
                            {t("overLimit")}
                          </span>
                        ) : null}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-5 text-base text-slate-700 print:border-black print:text-black">
                        <SupercellButton
                          type="button"
                          size="sm"
                          variant="primary"
                          onClick={() => setDetailRow(row)}
                          textCase="normal"
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm print:hidden"
                        >
                          <Eye
                            className="h-4 w-4"
                            strokeWidth={2.5}
                            aria-hidden
                          />
                          Details
                        {row.photoUrls.length > 0 ? (
                            <span className="ml-1 rounded-full bg-blue-700 px-2 py-0.5 text-xs font-black tabular-nums">
                            {row.photoUrls.length}
                          </span>
                        ) : null}
                        </SupercellButton>

                        <div className="hidden print:block">
                          <ul className="space-y-1">
                            {row.detailFields.map((field, index) => (
                              <li
                                key={`${row.id}-print-detail-${index}`}
                                className="text-sm text-black"
                              >
                                <span className="font-bold">{field.label}: </span>
                                <span>{translateHaccpText(field.value)}</span>
                              </li>
                            ))}
                          </ul>
                          {row.photoUrls.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {row.photoUrls.map((url, i) => (
                                <img
                                  key={`${row.id}-print-${i}`}
                                  src={url}
                                  alt={t("photoAlt", { number: i + 1 })}
                                  className="h-[3cm] w-auto max-w-[6cm] rounded-none border border-black object-cover"
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
            </table>
          </div>
        </>
      ) : null}

      {isFreePlan && restaurantId ? (
        <p className="mt-4 text-center text-xs text-slate-500 print:hidden">
          {t("freeHistoryLimit")}
        </p>
      ) : null}

      <DetailModal
        row={detailRow}
        onClose={() => setDetailRow(null)}
        translate={translateHaccpText}
        t={t}
        locale={locale}
      />
    </div>
  );
}

type DetailModalProps = {
  row: ReportRow | null;
  onClose: () => void;
  translate: (text: string) => string;
  t: ReturnType<typeof useTranslation>["t"];
  locale: string;
};

function DetailModal({ row, onClose, translate, t, locale }: DetailModalProps) {
  useEffect(() => {
    if (!row) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [row, onClose]);

  if (!row) return null;

  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(row.created_at));

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-[2px] print:hidden sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="toast-slide-up flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {translate(row.taskName)}
            </p>
            <h2
              id="detail-modal-title"
              className="mt-1 truncate text-2xl font-black tracking-tight text-slate-900"
            >
              {translate(row.apparaat)}
            </h2>
            <p className="mt-1 text-sm font-semibold capitalize text-slate-500">
              {dateLabel}
            </p>
          </div>
          <SupercellButton
            type="button"
            size="icon"
            variant="neutral"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-b-[4px]"
          >
            <X className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </SupercellButton>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div
            className={[
              "rounded-2xl px-5 py-4",
              row.isOverLimit
                ? "border-2 border-red-300 bg-red-50"
                : "bg-slate-50",
            ].join(" ")}
          >
            <p
              className={[
                "text-xs font-bold uppercase tracking-wide",
                row.isOverLimit ? "text-red-700" : "text-slate-500",
              ].join(" ")}
            >
              {t("valueStatus")}
            </p>
            <p
              className={[
                "mt-1 text-2xl font-black",
                row.isOverLimit ? "text-red-600" : "text-slate-900",
              ].join(" ")}
            >
              {translate(row.valueOrStatus)}
              {row.isOverLimit ? (
                <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 align-middle text-xs font-black uppercase tracking-wide text-red-700">
                  {t("overLimit")}
                </span>
              ) : null}
            </p>
          </div>

          <section className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {t("details")}
            </h3>
            <div className="mt-2 space-y-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
              {row.detailFields.map((field, index) => (
                <div
                  key={`${row.id}-detail-field-${index}`}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {field.label}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-900">
                    {field.value ? translate(field.value) : "—"}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {row.photoUrls.length > 0 ? (
            <section className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("photos")} ({row.photoUrls.length})
              </h3>
              <div className="mt-3 flex flex-col gap-4">
                {row.photoUrls.map((url, i) => (
                  <a
                    key={`${row.id}-detail-${i}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 shadow-sm transition-transform active:scale-[0.99]"
                  >
                    <img
                      src={url}
                      alt={t("photoAlt", { number: i + 1 })}
                      className="h-72 w-full object-cover sm:h-80"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <SupercellButton
            type="button"
            size="lg"
            variant="neutral"
            onClick={onClose}
            className="min-h-[56px] w-full text-lg normal-case"
          >
            {t("close")}
          </SupercellButton>
        </div>
      </div>
    </div>
  );
}
