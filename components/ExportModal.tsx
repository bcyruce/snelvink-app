"use client";

import SupercellButton from "@/components/SupercellButton";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export type ExportFormat = "csv" | "pdf";

type ExportModalSubmitPayload = {
  startDate: string;
  endDate: string;
  format: ExportFormat;
  includePhotos: boolean;
};

type ExportModalProps = {
  open: boolean;
  initialStartDate: string;
  initialEndDate: string;
  isExporting: boolean;
  onClose: () => void;
  onSubmit: (payload: ExportModalSubmitPayload) => Promise<void> | void;
};

export default function ExportModal({
  open,
  initialStartDate,
  initialEndDate,
  isExporting,
  onClose,
  onSubmit,
}: ExportModalProps) {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [includePhotos, setIncludePhotos] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
    setFormat("csv");
    setIncludePhotos(true);
    setError(null);
  }, [open, initialStartDate, initialEndDate]);

  if (!open) return null;

  const handleSubmit = async () => {
    setError(null);
    if (!startDate || !endDate) {
      setError("Kies een startdatum en einddatum.");
      return;
    }
    if (startDate > endDate) {
      setError("Startdatum mag niet later zijn dan einddatum.");
      return;
    }
    await onSubmit({ startDate, endDate, format, includePhotos });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Sluiten"
        onClick={onClose}
        className="absolute inset-0 h-full w-full"
      />

      <section className="relative w-full max-w-xl rounded-t-3xl bg-white p-5 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />

        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-2xl font-black text-slate-900">Exporteer</h3>
          <SupercellButton
            type="button"
            size="icon"
            variant="neutral"
            onClick={onClose}
            aria-label="Sluiten"
            className="h-14 w-14 rounded-2xl"
          >
            <X className="h-6 w-6" strokeWidth={2.5} />
          </SupercellButton>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="export-start-date"
              className="block text-base font-black text-slate-700"
            >
              Startdatum
            </label>
            <input
              id="export-start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-14 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-lg font-bold text-slate-900 outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="export-end-date"
              className="block text-base font-black text-slate-700"
            >
              Einddatum
            </label>
            <input
              id="export-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-14 w-full rounded-2xl border-2 border-slate-300 bg-white px-4 text-lg font-bold text-slate-900 outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <p className="text-base font-black text-slate-700">Kies formaat</p>
            <div className="grid grid-cols-2 gap-3">
              <SupercellButton
                type="button"
                size="lg"
                variant={format === "csv" ? "primary" : "neutral"}
                onClick={() => setFormat("csv")}
                className="h-14 rounded-2xl text-lg normal-case"
              >
                CSV
              </SupercellButton>
              <SupercellButton
                type="button"
                size="lg"
                variant={format === "pdf" ? "primary" : "neutral"}
                onClick={() => setFormat("pdf")}
                className="h-14 rounded-2xl text-lg normal-case"
              >
                PDF
              </SupercellButton>
            </div>
          </div>

          {format === "pdf" ? (
            <div className="space-y-2">
              <p className="text-base font-black text-slate-700">
                Inclusief foto&apos;s (Bewijsmateriaal)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <SupercellButton
                  type="button"
                  size="lg"
                  variant={includePhotos ? "success" : "neutral"}
                  onClick={() => setIncludePhotos(true)}
                  className="h-14 rounded-2xl text-lg normal-case"
                >
                  Ja
                </SupercellButton>
                <SupercellButton
                  type="button"
                  size="lg"
                  variant={!includePhotos ? "danger" : "neutral"}
                  onClick={() => setIncludePhotos(false)}
                  className="h-14 rounded-2xl text-lg normal-case"
                >
                  Nee
                </SupercellButton>
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-base font-bold text-red-700">
            {error}
          </p>
        ) : null}

        <SupercellButton
          type="button"
          size="lg"
          variant="primary"
          onClick={() => void handleSubmit()}
          disabled={isExporting}
          aria-busy={isExporting}
          className="mt-5 h-16 w-full rounded-2xl text-xl normal-case"
        >
          {isExporting ? "Bezig met exporteren..." : "Download Rapport"}
        </SupercellButton>
      </section>
    </div>
  );
}
