"use client";

import SupercellButton from "@/components/SupercellButton";
import UpgradePromptModal from "@/components/UpgradePromptModal";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { Eye, Printer, X } from "lucide-react";
import { Fragment, useCallback, useEffect, useState } from "react";

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
  valueOrStatus: string;
  remarks: string;
  correctionAction: string | null;
  isOverLimit: boolean;
  ontvangstStatus: "goedgekeurd" | "afgekeurd" | null;
  ontvangstReasons: string[];
  source: "haccp" | "custom";
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
  photo_urls?: string[];
};

type CustomModuleLogRow = {
  id: string;
  created_at: string;
  module_id: string | null;
  custom_module_id: string | null;
  log_data: unknown;
};

function moduleLabel(type: HaccpModuleType): string {
  if (type === "koeling") return "Koeling";
  if (type === "kerntemperatuur") return "Kerntemperatuur";
  if (type === "ontvangst") return "Ontvangst";
  if (type === "schoonmaak") return "Schoonmaak";
  if (type === "custom_number") return "Getal";
  if (type === "custom_boolean") return "Ja/Nee";
  if (type === "custom_list") return "Lijst";
  return type;
}

function customModuleName(row: HaccpRecordRow): string | null {
  const c = row.custom_modules;
  if (!c) return null;
  const entry = Array.isArray(c) ? c[0] : c;
  return entry?.name ?? null;
}

function equipmentName(row: HaccpRecordRow): string {
  const e = row.haccp_equipments;
  if (!e) return "Onbekend apparaat";
  if (Array.isArray(e)) return e[0]?.name ?? "Onbekend apparaat";
  return e.name ?? "Onbekend apparaat";
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

function describeHaccpRow(row: HaccpRecordRow): {
  apparaat: string;
  taskName: string;
  valueOrStatus: string;
  remarks: string;
} {
  const customName = customModuleName(row);

  if (row.module_type === "ontvangst" || row.module_type === "custom_boolean") {
    const productName = row.product_name ?? "Onbekend item";
    const status =
      row.status === "goedgekeurd"
        ? "Goedgekeurd"
        : row.status === "afgekeurd"
          ? "Afgekeurd"
          : "Onbekend";
    const reasonsList =
      Array.isArray(row.reasons) && row.reasons.length > 0
        ? row.reasons.join(", ")
        : (row.reason ?? "");
    return {
      apparaat: productName,
      taskName: customName ?? moduleLabel(row.module_type),
      valueOrStatus: status,
      remarks: reasonsList,
    };
  }
  if (row.module_type === "schoonmaak" || row.module_type === "custom_list") {
    const location = row.location_name ?? "Onbekende groep";
    const tasks = row.completed_tasks ?? [];
    return {
      apparaat: location,
      taskName: customName ?? moduleLabel(row.module_type),
      valueOrStatus: tasks.length > 0 ? "Voltooid" : "Geen items aangevinkt",
      remarks: tasks.length > 0 ? tasks.join(", ") : "",
    };
  }
  // Koeling / kerntemperatuur / custom_number
  const unit = equipmentUnit(row);
  return {
    apparaat: equipmentName(row),
    taskName:
      row.module_type === "koeling"
        ? "Temperatuur check"
        : (customName ?? moduleLabel(row.module_type)),
    valueOrStatus:
      typeof row.temperature === "number"
        ? `${Number(row.temperature).toFixed(1)} ${unit}`
        : "—",
    remarks: row.opmerking ?? "",
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
  const [detailRow, setDetailRow] = useState<ReportRow | null>(null);

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
        "id, recorded_at, module_type, temperature, status, reason, reasons, product_name, location_name, completed_tasks, image_urls, opmerking, correction_action, custom_module_id, haccp_equipments ( name, limit_temp, unit ), custom_modules ( name )",
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

    const haccpRows =
      (haccpRes.data as HaccpRecordRow[] | null)?.map((row) => {
        const { apparaat, taskName, valueOrStatus, remarks } =
          describeHaccpRow(row);
        const limit = equipmentLimit(row);
        const isOverLimit =
          (row.module_type === "koeling" ||
            row.module_type === "kerntemperatuur" ||
            row.module_type === "custom_number") &&
          typeof row.temperature === "number" &&
          typeof limit === "number" &&
          Number(row.temperature) > limit;
        const isStatusType =
          row.module_type === "ontvangst" ||
          row.module_type === "custom_boolean";
        const ontvangstReasons = isStatusType
          ? Array.isArray(row.reasons) && row.reasons.length > 0
            ? row.reasons
            : row.reason
              ? row.reason
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0)
              : []
          : [];
        return {
          id: `h-${row.id}`,
          created_at: row.recorded_at,
          apparaat,
          taskName,
          valueOrStatus,
          remarks,
          correctionAction: row.correction_action ?? null,
          isOverLimit,
          ontvangstStatus: isStatusType ? row.status : null,
          ontvangstReasons,
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
        const photoUrls = Array.isArray(logData.photo_urls)
          ? logData.photo_urls.filter(
              (value): value is string => typeof value === "string",
            )
          : [];

        return (logData.values ?? []).map((value, index) => ({
          id: `custom-${row.id}-${value.field_id}-${index}`,
          created_at: row.created_at,
          apparaat: value.name ?? "Getalveld",
          taskName: moduleName,
          valueOrStatus: `${value.value} ${value.unit ?? ""}`.trim(),
          remarks: value.remark ?? "",
          correctionAction: null,
          isOverLimit: false,
          ontvangstStatus: null,
          ontvangstReasons: [],
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
    <div className="mt-2 print:mt-0">
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

      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl print:text-black">
          {isFreePlan ? "Laatste 30 dagen" : "Geschiedenis"}
        </h2>
      </div>

      <SupercellButton
        type="button"
        size="lg"
        variant="primary"
        onClick={handlePrintClick}
        textCase="normal"
        className="mb-5 flex h-20 w-full items-center justify-center gap-3 text-xl print:hidden"
      >
        <Printer className="h-7 w-7 shrink-0" strokeWidth={2.5} aria-hidden />
        Genereer NVWA Rapport
      </SupercellButton>

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
          Vernieuwen
        </SupercellButton>
      </div>

      {loading && rows.length === 0 ? (
        <p className="text-center text-sm font-bold text-slate-500">Laden…</p>
      ) : null}

      {!loading && !restaurantId ? (
        <p className="rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white px-4 py-6 text-center font-bold text-slate-500 print:border print:border-black print:bg-white print:text-black">
          Geen restaurant gekoppeld aan je account.
        </p>
      ) : null}

      {!loading && restaurantId && rows.length === 0 ? (
        <p className="rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white px-4 py-6 text-center font-bold text-slate-500 print:border print:border-black print:bg-white print:text-black">
          {isFreePlan
            ? "Geen registraties in de afgelopen 30 dagen."
            : "Geen registraties gevonden."}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white print:rounded-none print:border print:border-black print:bg-white">
          <table className="min-w-[760px] w-full border-collapse text-left print:min-w-0 print:bg-white">
            <thead>
              <tr className="bg-blue-500 print:bg-white">
                <th className="border-b-2 border-blue-700 px-4 py-4 text-sm font-black uppercase tracking-wide text-white print:border-black print:text-black">
                  Tijd
                </th>
                <th className="border-b-2 border-blue-700 px-4 py-4 text-sm font-black uppercase tracking-wide text-white print:border-black print:text-black">
                  Apparaat
                </th>
                <th className="border-b-2 border-blue-700 px-4 py-4 text-sm font-black uppercase tracking-wide text-white print:border-black print:text-black">
                  Taak
                </th>
                <th className="border-b-2 border-blue-700 px-4 py-4 text-sm font-black uppercase tracking-wide text-white print:border-black print:text-black">
                  Waarde/Status
                </th>
                <th className="border-b-2 border-blue-700 px-4 py-4 text-sm font-black uppercase tracking-wide text-white print:border-black print:text-black">
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
                      className="border-b-2 border-slate-200 bg-slate-100 px-4 py-3 text-base font-black uppercase tracking-wide text-slate-700 print:border-black print:bg-white print:text-black"
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
                            Boven limiet
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
                          <p className="font-medium text-black">
                            {row.remarks
                              ? translateHaccpText(row.remarks)
                              : "—"}
                          </p>
                          {row.correctionAction ? (
                            <p className="mt-1 font-bold text-black">
                              Corrigerende maatregel:{" "}
                              {translateHaccpText(row.correctionAction)}
                            </p>
                          ) : null}
                          {row.photoUrls.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
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
                        </div>
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

      <DetailModal
        row={detailRow}
        onClose={() => setDetailRow(null)}
        translate={translateHaccpText}
      />
    </div>
  );
}

type DetailModalProps = {
  row: ReportRow | null;
  onClose: () => void;
  translate: (text: string) => string;
};

function DetailModal({ row, onClose, translate }: DetailModalProps) {
  useEffect(() => {
    if (!row) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [row, onClose]);

  if (!row) return null;

  const dateLabel = new Intl.DateTimeFormat("nl-NL", {
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
            aria-label="Sluiten"
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
              Waarde / status
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
                  Boven limiet
                </span>
              ) : null}
            </p>
          </div>

          {row.ontvangstReasons.length > 0 ? (
            <section className="mt-5">
              <h3
                className={[
                  "text-xs font-bold uppercase tracking-wide",
                  row.ontvangstStatus === "afgekeurd"
                    ? "text-red-700"
                    : "text-emerald-700",
                ].join(" ")}
              >
                Geselecteerde redenen ({row.ontvangstReasons.length})
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {row.ontvangstReasons.map((reason, i) => (
                  <li
                    key={`${row.id}-reason-${i}`}
                    className={[
                      "rounded-full border-2 px-3 py-1 text-sm font-bold",
                      row.ontvangstStatus === "afgekeurd"
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-emerald-300 bg-emerald-50 text-emerald-700",
                    ].join(" ")}
                  >
                    {translate(reason)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {row.correctionAction ? (
            <section className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-red-700">
                Corrigerende maatregel
              </h3>
              <p className="mt-2 whitespace-pre-wrap rounded-2xl border-2 border-red-200 bg-red-50 px-5 py-4 text-base font-semibold leading-relaxed text-red-800 shadow-sm">
                {translate(row.correctionAction)}
              </p>
            </section>
          ) : null}

          <section className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Opmerkingen
            </h3>
            <p className="mt-2 whitespace-pre-wrap rounded-2xl border border-slate-100 bg-white px-5 py-4 text-base font-semibold leading-relaxed text-slate-800 shadow-sm">
              {row.remarks ? translate(row.remarks) : "Geen opmerkingen."}
            </p>
          </section>

          {row.photoUrls.length > 0 ? (
            <section className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Foto&apos;s ({row.photoUrls.length})
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
                      alt={`Foto ${i + 1} bij registratie`}
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
            Sluiten
          </SupercellButton>
        </div>
      </div>
    </div>
  );
}
