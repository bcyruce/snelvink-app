"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";

type RejectionReason =
  | "Verpakking Kapot"
  | "Temperatuur te hoog"
  | "Anders...";

export default function OntvangstCheck() {
  const [isSaving, setIsSaving] = useState(false);
  const [showRejectReasons, setShowRejectReasons] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(false);

  const saveLog = async (payload: {
    status: "approved" | "rejected";
    reason?: RejectionReason;
  }) => {
    setIsSaving(true);
    setError(false);
    setShowSuccess(false);

    try {
      const { error: insertError } = await supabase
        .from("delivery_logs")
        .insert([payload]);

      if (insertError) {
        console.error("Opslaan naar Supabase mislukt:", insertError);
        setError(true);
        return;
      }

      setShowSuccess(true);
    } catch (err) {
      console.error("Opslaan mislukt:", err);
      setError(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    await saveLog({ status: "approved" });
  };

  const handleRejectFlow = () => {
    setShowSuccess(false);
    setError(false);
    setShowRejectReasons(true);
  };

  const handleRejectReason = async (reason: RejectionReason) => {
    await saveLog({ status: "rejected", reason });
  };

  const primaryButtonClass =
    "h-32 w-full rounded-2xl text-3xl font-bold text-white shadow-md transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-70";

  const secondaryButtonClass =
    "h-24 w-full rounded-2xl bg-gray-200 text-2xl font-bold text-gray-900 shadow-md transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <div className="mt-10 flex flex-col gap-6">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        Levering Controleren
      </h2>

      {!showRejectReasons ? (
        <div className="flex w-full flex-col gap-4">
          <button
            type="button"
            onClick={handleApprove}
            disabled={isSaving}
            aria-busy={isSaving}
            className={`${primaryButtonClass} bg-green-600 hover:bg-green-700`}
          >
            Goedgekeurd
          </button>

          <button
            type="button"
            onClick={handleRejectFlow}
            disabled={isSaving}
            className={`${primaryButtonClass} bg-red-600 hover:bg-red-700`}
          >
            Afgekeurd
          </button>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-4">
          <button
            type="button"
            onClick={() => handleRejectReason("Verpakking Kapot")}
            disabled={isSaving}
            aria-busy={isSaving}
            className={secondaryButtonClass}
          >
            Verpakking Kapot
          </button>

          <button
            type="button"
            onClick={() => handleRejectReason("Temperatuur te hoog")}
            disabled={isSaving}
            aria-busy={isSaving}
            className={secondaryButtonClass}
          >
            Temperatuur te hoog
          </button>

          <button
            type="button"
            onClick={() => handleRejectReason("Anders...")}
            disabled={isSaving}
            aria-busy={isSaving}
            className={secondaryButtonClass}
          >
            Anders...
          </button>
        </div>
      )}

      {isSaving ? (
        <p className="text-center text-lg font-semibold text-gray-600" role="status">
          Laden...
        </p>
      ) : null}

      {showSuccess ? (
        <p
          className="text-center text-lg font-semibold text-green-600"
          role="status"
          aria-live="polite"
        >
          Opgeslagen!
        </p>
      ) : null}

      {error ? (
        <p className="text-center text-lg font-semibold text-red-600" role="alert">
          Opslaan mislukt. Probeer opnieuw.
        </p>
      ) : null}
    </div>
  );
}
