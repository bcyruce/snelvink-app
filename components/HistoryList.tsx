"use client";

import { supabase } from "@/lib/supabase";
import { Printer } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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

type ReportRow = {
  id: string;
  created_at: string;
  itemName: string;
  valueOrStatus: string;
  source: "temperature" | "cleaning";
};

function formatLogDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function HistoryList() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const sinceIso = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [tempRes, cleanRes] = await Promise.all([
      supabase
        .from("temperature_logs")
        .select("id, created_at, equipment_name, temperature")
        .gte("created_at", sinceIso),
      supabase
        .from("cleaning_logs")
        .select("id, created_at, task_name, is_completed")
        .gte("created_at", sinceIso),
    ]);

    if (tempRes.error) {
      console.error("temperature_logs ophalen mislukt:", tempRes.error);
    }
    if (cleanRes.error) {
      console.error("cleaning_logs ophalen mislukt:", cleanRes.error);
    }

    const tempRows =
      (tempRes.data as TemperatureLogRow[] | null)?.map((row) => ({
        id: `t-${row.id}`,
        created_at: row.created_at,
        itemName: row.equipment_name ?? "Onbekend apparaat",
        valueOrStatus: `${Number(row.temperature).toFixed(1)} °C`,
        source: "temperature" as const,
      })) ?? [];

    const cleaningRows =
      (cleanRes.data as CleaningLogRow[] | null)?.map((row) => ({
        id: `c-${row.id}`,
        created_at: row.created_at,
        itemName: row.task_name ?? "Onbekende taak",
        valueOrStatus: row.is_completed ? "Voltooid" : "Niet voltooid",
        source: "cleaning" as const,
      })) ?? [];

    const merged = [...tempRows, ...cleaningRows].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    setRows(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="mt-12 border-t border-gray-200 pt-10 print:mt-0 print:border-none print:pt-0">
      <h1 className="hidden print:mb-6 print:block print:text-4xl print:font-black print:tracking-tight print:text-black">
        HACCP Logboek - SnelVink
      </h1>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl print:text-black">
          NVWA Rapport (Laatste 30 dagen)
        </h2>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="mb-6 flex h-24 w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 text-2xl font-black text-white shadow-md transition-transform hover:bg-blue-700 active:scale-[0.99] print:hidden"
      >
        <Printer className="h-8 w-8 shrink-0" strokeWidth={2.25} aria-hidden />
        Genereer NVWA Rapport
      </button>

      <div className="mb-4 flex items-center justify-end gap-3 print:hidden">
        <button
          type="button"
          onClick={() => void fetchLogs()}
          disabled={loading}
          className="shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-none transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Vernieuwen
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <p className="text-center text-sm text-gray-500">Laden…</p>
      ) : null}

      {!loading && rows.length === 0 ? (
        <p className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-gray-600 print:border print:border-black print:bg-white print:text-black">
          Geen registraties in de afgelopen 30 dagen.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white print:rounded-none print:border-black print:bg-white">
          <table className="w-full border-collapse text-left print:bg-white">
            <thead>
              <tr className="bg-gray-50 print:bg-white">
                <th className="border-b border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 print:border-black print:text-black">
                  Datum
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 print:border-black print:text-black">
                  Apparaat / Taak
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-sm font-bold text-gray-900 print:border-black print:text-black">
                  Waarde / Status
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="border-b border-gray-200 px-4 py-3 text-sm text-gray-800 print:border-black print:text-black">
                    {formatLogDateTime(row.created_at)}
                  </td>
                  <td className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 print:border-black print:text-black">
                    {row.itemName}
                  </td>
                  <td className="border-b border-gray-200 px-4 py-3 text-sm text-gray-800 print:border-black print:text-black">
                    {row.valueOrStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
