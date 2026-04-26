"use client";

import UpgradePromptModal from "@/components/UpgradePromptModal";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { ImageIcon, Printer } from "lucide-react";
import { Fragment, useCallback, useEffect, useState } from "react";

type TemperatureLogRow = {
  id: string;
  created_at: string;
  equipment_name: string;
  temperature: number;
  photo_url?: string | null;
};

type CleaningLogRow = {
  id: string;
  created_at: string;
  task_name: string;
  is_completed: boolean;
};

type HaccpModuleType =
  | "koeling"
  | "kerntemperatuur"
  | "ontvangst"
  | "schoonmaak";

type HaccpRecordRow = {
  id: string;
  recorded_at: string;
  module_type: HaccpModuleType;
  temperature: number | null;
  status: "goedgekeurd" | "afgekeurd" | null;
  reason: string | null;
  product_name: string | null;
  location_name: string | null;
  completed_tasks: string[] | null;
  image_urls: string[] | null;
  haccp_equipments: { name: string | null } | { name: string | null }[] | null;
};

type ReportRow = {
  id: string;
  created_at: string;
  apparaat: string;
  taskName: string;
  valueOrStatus: string;
  remarks: string;
  source: "temperature" | "cleaning" | "haccp" | "custom";
  photoUrls: string[];
};

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
};

type CustomModuleLogRow = {
  id: string;
  created_at: string;
  custom_module_id: string | null;
  log_data: unknown;
};

function moduleLabel(type: HaccpModuleType): string {
  if (type === "koeling") return "Koeling";
  if (type === "kerntemperatuur") return "Kerntemperatuur";
  if (type === "ontvangst") return "Ontvangst";
  if (type === "schoonmaak") return "Schoonmaak";
  return type;
}

function equipmentName(row: HaccpRecordRow): string {
  const e = row.haccp_equipments;
  if (!e) return "Onbekend apparaat";
  if (Array.isArray(e)) return e[0]?.name ?? "Onbekend apparaat";
  return e.name ?? "Onbekend apparaat";
}

function describeHaccpRow(row: HaccpRecordRow): {
  apparaat: string;
  taskName: string;
  valueOrStatus: string;
  remarks: string;
} {
  if (row.module_type === "ontvangst") {
    const productName = row.product_name ?? "Onbekend product";
    const status =
      row.status === "goedgekeurd"
        ? "Goedgekeurd"
        : row.status === "afgekeurd"
          ? "Afgekeurd"
          : "Onbekend";
    return {
      apparaat: productName,
      taskName: "Ontvangst",
      valueOrStatus: status,
      remarks: row.reason ?? "",
    };
  }
  if (row.module_type === "schoonmaak") {
    const location = row.location_name ?? "Onbekende locatie";
    const tasks = row.completed_tasks ?? [];
    return {
      apparaat: location,
      taskName: "Schoonmaak",
      valueOrStatus: tasks.length > 0 ? "Voltooid" : "Geen taken aangevinkt",
      remarks: tasks.length > 0 ? tasks.join(", ") : "",
    };
  }
  return {
    apparaat: equipmentName(row),
    taskName:
      row.module_type === "koeling"
        ? "Temperatuur check"
        : moduleLabel(row.module_type),
    valueOrStatus:
      typeof row.temperature === "number"
        ? `${Number(row.temperature).toFixed(1)} °C`
        : "—",
    remarks: "",
  };
}

function formatLogTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function groupDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Onbekende datum";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Vandaag";
  if (sameDay(d, yesterday)) return "Gisteren";

  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

function groupRowsByDate(
  rows: ReportRow[],
): { label: string; rows: ReportRow[] }[] {
  const groups = new Map<string, ReportRow[]>();

  rows.forEach((row) => {
    const label = groupDateLabel(row.created_at);
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

const FREE_HISTORY_MS = 30 * 24 * 60 * 60 * 1000;

export default function HistoryList() {
  const { translateHaccpText } = useTranslation();
  const { profile, isFreePlan } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrintUpgradeModal, setShowPrintUpgradeModal] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    if (!restaurantId) {
      setRows([]);
      setLoading(false);
      return;
    }

    const sinceIso = new Date(Date.now() - FREE_HISTORY_MS).toISOString();

    const tempBase = supabase
      .from("temperature_logs")
      .select("id, created_at, equipment_name, temperature, photo_url")
      .eq("restaurant_id", restaurantId);

    const cleanBase = supabase
      .from("cleaning_logs")
      .select("id, created_at, task_name, is_completed")
      .eq("restaurant_id", restaurantId);

    const haccpBase = supabase
      .from("haccp_records")
      .select(
        "id, recorded_at, module_type, temperature, status, reason, product_name, location_name, completed_tasks, image_urls, haccp_equipments ( name )",
      )
      .eq("restaurant_id", restaurantId);

    const customBase = supabase
      .from("custom_module_logs")
      .select("id, created_at, custom_module_id, log_data")
      .eq("restaurant_id", restaurantId);

    const [tempRes, cleanRes, haccpRes, customRes] = await Promise.all([
      isFreePlan ? tempBase.gte("created_at", sinceIso) : tempBase,
      isFreePlan ? cleanBase.gte("created_at", sinceIso) : cleanBase,
      isFreePlan ? haccpBase.gte("recorded_at", sinceIso) : haccpBase,
      isFreePlan ? customBase.gte("created_at", sinceIso) : customBase,
    ]);

    if (tempRes.error) {
      console.error("temperature_logs ophalen mislukt:", tempRes.error);
    }
    if (cleanRes.error) {
      console.error("cleaning_logs ophalen mislukt:", cleanRes.error);
    }
    if (haccpRes.error) {
      console.error("haccp_records ophalen mislukt:", haccpRes.error);
    }
    if (customRes.error) {
      console.error("custom_module_logs ophalen mislukt:", customRes.error);
    }

    const tempRows =
      (tempRes.data as TemperatureLogRow[] | null)?.map((row) => ({
        id: `t-${row.id}`,
        created_at: row.created_at,
        apparaat: row.equipment_name ?? "Onbekend apparaat",
        taskName: "Temperatuur check",
        valueOrStatus: `${Number(row.temperature).toFixed(1)} °C`,
        remarks: "",
        source: "temperature" as const,
        photoUrls: row.photo_url ? [row.photo_url] : [],
      })) ?? [];

    const cleaningRows =
      (cleanRes.data as CleaningLogRow[] | null)?.map((row) => ({
        id: `c-${row.id}`,
        created_at: row.created_at,
        apparaat: row.task_name ?? "Onbekende taak",
        taskName: "Schoonmaak",
        valueOrStatus: row.is_completed ? "Voltooid" : "Niet voltooid",
        remarks: "",
        source: "cleaning" as const,
        photoUrls: [],
      })) ?? [];

    const haccpRows =
      (haccpRes.data as HaccpRecordRow[] | null)?.map((row) => {
        const { apparaat, taskName, valueOrStatus, remarks } =
          describeHaccpRow(row);
        return {
          id: `h-${row.id}`,
          created_at: row.recorded_at,
          apparaat,
          taskName,
          valueOrStatus,
          remarks,
          source: "haccp" as const,
          photoUrls: row.image_urls ?? [],
        };
      }) ?? [];

    const customRows =
      (customRes.data as CustomModuleLogRow[] | null)?.flatMap((row) => {
        const logData = row.log_data;
        if (!isCustomLogData(logData)) return [];

        const moduleName =
          logData.module_name ?? "Aangepast onderdeel";

        return (logData.values ?? []).map((value, index) => ({
          id: `custom-${row.id}-${value.field_id}-${index}`,
          created_at: row.created_at,
          apparaat: value.name ?? "Getalveld",
          taskName: moduleName,
          valueOrStatus: `${value.value} ${value.unit ?? ""}`.trim(),
          remarks: value.remark ?? "",
          source: "custom" as const,
          photoUrls: [],
        }));
      }) ?? [];

    const merged = [
      ...tempRows,
      ...cleaningRows,
      ...haccpRows,
      ...customRows,
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    setRows(merged);
    setLoading(false);
  }, [restaurantId, isFreePlan]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const handlePrintClick = () => {
    if (isFreePlan) {
      setShowPrintUpgradeModal(true);
      return;
    }
    window.print();
  };

  const groupedRows = groupRowsByDate(rows);

  return (
    <div className="mt-12 border-t border-slate-200 pt-10 print:mt-0 print:border-none print:pt-0">
      <UpgradePromptModal
        open={showPrintUpgradeModal}
        onClose={() => setShowPrintUpgradeModal(false)}
      >
        Alleen beschikbaar voor Basic-abonnement. Upgrade om het NVWA-rapport te
        genereren en te printen.
      </UpgradePromptModal>

      <h1 className="hidden print:mb-6 print:block print:text-4xl print:font-black print:tracking-tight print:text-black">
        HACCP Logboek - SnelVink
      </h1>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl print:text-black">
          {isFreePlan
            ? "NVWA Rapport (Laatste 30 dagen)"
            : "NVWA Rapport (volledige historie)"}
        </h2>
      </div>

      <button
        type="button"
        onClick={handlePrintClick}
        className="mb-6 flex h-24 w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 text-2xl font-black text-white shadow-sm transition-transform hover:bg-blue-700 active:scale-[0.99] print:hidden"
      >
        <Printer className="h-8 w-8 shrink-0" strokeWidth={2.25} aria-hidden />
        Genereer NVWA Rapport
      </button>

      <div className="mb-4 flex items-center justify-end gap-3 print:hidden">
        <button
          type="button"
          onClick={() => void fetchLogs()}
          disabled={loading}
          className="min-h-[48px] shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Vernieuwen
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <p className="text-center text-sm text-slate-500">Laden…</p>
      ) : null}

      {!loading && !restaurantId ? (
        <p className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-center text-slate-500 shadow-sm print:border print:border-black print:bg-white print:text-black">
          Geen restaurant gekoppeld aan je account.
        </p>
      ) : null}

      {!loading && restaurantId && rows.length === 0 ? (
        <p className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-center text-slate-500 shadow-sm print:border print:border-black print:bg-white print:text-black">
          {isFreePlan
            ? "Geen registraties in de afgelopen 30 dagen."
            : "Geen registraties gevonden."}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm print:rounded-none print:border-black print:bg-white print:shadow-none">
          <table className="min-w-[760px] w-full border-collapse text-left print:min-w-0 print:bg-white">
            <thead>
              <tr className="bg-slate-50 print:bg-white">
                <th className="border-b border-slate-200 px-4 py-4 text-sm font-black uppercase tracking-wide text-slate-600 print:border-black print:text-black">
                  Tijd
                </th>
                <th className="border-b border-slate-200 px-4 py-4 text-sm font-black uppercase tracking-wide text-slate-600 print:border-black print:text-black">
                  Apparaat
                </th>
                <th className="border-b border-slate-200 px-4 py-4 text-sm font-black uppercase tracking-wide text-slate-600 print:border-black print:text-black">
                  Taak
                </th>
                <th className="border-b border-slate-200 px-4 py-4 text-sm font-black uppercase tracking-wide text-slate-600 print:border-black print:text-black">
                  Waarde/Status
                </th>
                <th className="border-b border-slate-200 px-4 py-4 text-sm font-black uppercase tracking-wide text-slate-600 print:border-black print:text-black">
                  Opmerkingen
                </th>
              </tr>
            </thead>
            <tbody>
              {groupedRows.map((group) => (
                <Fragment key={group.label}>
                  <tr>
                    <td
                      colSpan={5}
                      className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-base font-black text-slate-900 print:border-black print:bg-white print:text-black"
                    >
                      {group.label}
                    </td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-5 text-base font-black tabular-nums text-slate-900 print:border-black print:text-black">
                        {formatLogTime(row.created_at)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-5 text-base font-bold text-slate-900 print:border-black print:text-black">
                        {translateHaccpText(row.apparaat)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-5 text-base font-semibold text-slate-600 print:border-black print:text-black">
                        {translateHaccpText(row.taskName)}
                      </td>
                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-5 text-base font-black text-slate-900 print:border-black print:text-black">
                        {translateHaccpText(row.valueOrStatus)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-5 text-base text-slate-700 print:border-black print:text-black">
                        <p className="font-medium">
                          {row.remarks
                            ? translateHaccpText(row.remarks)
                            : "—"}
                        </p>

                        {row.photoUrls.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2 print:hidden">
                            {row.photoUrls.map((url, i) => (
                              <a
                                key={`${row.id}-link-${i}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 underline decoration-blue-400 underline-offset-2 transition-colors hover:bg-blue-100 active:scale-95"
                              >
                                <ImageIcon
                                  className="h-4 w-4"
                                  strokeWidth={2.25}
                                  aria-hidden
                                />
                                foto {i + 1}
                              </a>
                            ))}
                          </div>
                        ) : null}

                        {row.photoUrls.length > 0 ? (
                          <div className="mt-2 hidden flex-wrap gap-2 print:flex">
                            {row.photoUrls.map((url, i) => (
                              <img
                                key={`${row.id}-print-${i}`}
                                src={url}
                                alt={`Foto ${i + 1} bij registratie`}
                                className="h-[3cm] w-auto max-w-[6cm] rounded-none border border-black object-cover"
                              />
                            ))}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {isFreePlan && restaurantId ? (
        <p className="mt-4 text-center text-xs text-slate-500 print:hidden">
          Gratis versie toont maximaal 30 dagen historie.
        </p>
      ) : null}
    </div>
  );
}
