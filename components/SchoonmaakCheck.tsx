"use client";

import { useUser } from "@/hooks/useUser";
import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const CLEANING_TASKS = [
  { id: "vloer-afvoer", label: "Vloer & Afvoer" },
  { id: "werkbanken", label: "Werkbanken" },
  { id: "snijplanken", label: "Snijplanken" },
  { id: "afzuigkap", label: "Afzuigkap" },
] as const;

type TaskStatus = "approved" | "rejected" | null;
type TaskStatusMap = Record<(typeof CLEANING_TASKS)[number]["id"], TaskStatus>;

const INITIAL_STATUS: TaskStatusMap = {
  "vloer-afvoer": null,
  werkbanken: null,
  snijplanken: null,
  afzuigkap: null,
};

export default function SchoonmaakCheck() {
  const { profile } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;

  const [taskStatus, setTaskStatus] = useState<TaskStatusMap>(INITIAL_STATUS);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const setStatus = (taskId: keyof TaskStatusMap, nextStatus: Exclude<TaskStatus, null>) => {
    setTaskStatus((prev) => ({
      ...prev,
      [taskId]: prev[taskId] === nextStatus ? null : nextStatus,
    }));
  };

  const handleSave = async () => {
    const hasInteraction = Object.values(taskStatus).some((v) => v !== null);
    if (!hasInteraction || !restaurantId) return;

    setIsSaving(true);
    setShowSuccess(false);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setTaskStatus(INITIAL_STATUS);
      setShowSuccess(true);
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => {
        setShowSuccess(false);
        successTimerRef.current = null;
      }, 3000);
    } catch (err) {
      console.error("Schoonmaak opslaan mislukt:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasInteraction = Object.values(taskStatus).some((v) => v !== null);

  const baseToggleButton =
    "h-16 flex-1 rounded-2xl border-2 px-3 text-lg font-bold transition-transform active:scale-95";

  const inactiveToggle =
    "border-transparent bg-white text-gray-500";

  return (
    <div className="relative mt-4 pb-6">
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        Schoonmaak
      </h2>
      <p className="mb-5 text-sm text-gray-500">Tik per taak op Ja of Nee.</p>

      <ul className="space-y-4">
        {CLEANING_TASKS.map((task) => {
          const status = taskStatus[task.id];
          const isRejected = status === "rejected";
          const isApproved = status === "approved";

          return (
            <li key={task.id} className="rounded-3xl bg-gray-100 p-4">
              <p className="mb-4 text-xl font-black text-gray-900">{task.label}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStatus(task.id, "rejected")}
                  aria-pressed={isRejected}
                  className={[
                    baseToggleButton,
                    isRejected
                      ? "border-red-300 bg-red-100 text-red-700"
                      : inactiveToggle,
                  ].join(" ")}
                >
                  <span className="flex items-center justify-center gap-2">
                    <X className="h-5 w-5" aria-hidden />
                    Nee
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(task.id, "approved")}
                  aria-pressed={isApproved}
                  className={[
                    baseToggleButton,
                    isApproved
                      ? "border-green-300 bg-green-100 text-green-700"
                      : inactiveToggle,
                  ].join(" ")}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Check className="h-5 w-5" aria-hidden />
                    Ja
                  </span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 z-20 -mx-6 mt-6 border-t border-gray-200 bg-white/95 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-sm supports-[backdrop-filter]:bg-white/80">
        {showSuccess ? (
          <p
            className="mb-3 text-center text-lg font-semibold text-green-600"
            role="status"
            aria-live="polite"
          >
            Geregistreerd!
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasInteraction || !restaurantId}
          aria-busy={isSaving}
          className="h-24 w-full rounded-2xl bg-green-600 text-2xl font-bold text-white shadow-md transition-transform hover:bg-green-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Opslaan..." : "Opslaan"}
        </button>
      </div>
    </div>
  );
}
