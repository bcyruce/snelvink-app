"use client";

import { supabase } from "@/lib/supabase";
import { Circle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type TemperatureLogRow = {
  id: string;
  created_at: string;
  equipment_name: string;
  temperature: number;
};

const RECENT_MS = 2 * 60 * 1000;

function formatLogTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  if (diffMs >= 0 && diffMs < RECENT_MS) return "Net weg";
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function HistoryList() {
  const [rows, setRows] = useState<TemperatureLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("temperature_logs")
      .select("id, created_at, equipment_name, temperature")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Metingen ophalen mislukt:", error);
      setRows([]);
    } else {
      setRows((data as TemperatureLogRow[] | null) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchLogs();

    const channel = supabase
      .channel("temperature_logs_inserts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "temperature_logs",
        },
        () => {
          void fetchLogs();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchLogs]);

  return (
    <div className="mt-12 border-t border-gray-200 pt-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          Laatste Metingen
        </h2>
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
        <p className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-gray-600">
          Nog geen metingen vandaag.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const temp = Number(row.temperature);
            const ok = Number.isFinite(temp) ? temp <= 7 : true;
            return (
              <li key={row.id}>
                <article className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-none">
                  <Circle
                    className={
                      ok
                        ? "h-3.5 w-3.5 shrink-0 fill-green-500 text-green-500"
                        : "h-3.5 w-3.5 shrink-0 fill-red-500 text-red-500"
                    }
                    strokeWidth={0}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-lg font-bold tabular-nums text-gray-900 sm:text-xl">
                        {Number.isFinite(temp) ? temp.toFixed(1) : "—"}°C
                      </span>
                      <span className="text-sm font-medium text-gray-500">
                        {formatLogTime(row.created_at)}
                      </span>
                    </div>
                    <p className="truncate text-sm font-medium text-gray-700">
                      {row.equipment_name}
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
