"use client";

import { supabase } from "@/lib/supabase";
import { CheckCircle, Circle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const TASKS = [
  { id: "werkbanken", label: "Werkbanken en snijplanken" },
  { id: "vloer", label: "Vloer vegen en dweilen" },
  { id: "afval", label: "Afvalbakken legen" },
  { id: "spoelbakken", label: "Spoelbakken reinigen" },
] as const;

export default function SchoonmaakCheck() {
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());
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

  const toggle = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    const rows = TASKS.filter((t) => completed.has(t.id)).map((t) => ({
      task_name: t.label,
      is_completed: true as const,
    }));

    if (rows.length === 0) return;

    setIsSaving(true);
    setShowSuccess(false);

    try {
      const { error } = await supabase.from("cleaning_logs").insert(rows);

      if (error) {
        console.error("Schoonmaak opslaan mislukt:", error);
        return;
      }

      setCompleted(new Set());
      setShowSuccess(true);
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => {
        setShowSuccess(false);
        successTimerRef.current = null;
      }, 4000);
    } catch (err) {
      console.error("Schoonmaak opslaan mislukt:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasSelection = completed.size > 0;

  return (
    <div className="relative mt-2 pb-6">
      <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">
        Schoonmaak Einde Dag
      </h2>

      <ul className="list-none p-0">
        {TASKS.map((task) => {
          const done = completed.has(task.id);
          return (
            <li key={task.id} className="mb-0">
              <button
                type="button"
                onClick={() => toggle(task.id)}
                aria-pressed={done}
                className={[
                  "mb-3 flex w-full items-center gap-4 rounded-2xl border px-4 py-6 text-left transition-all duration-200 active:scale-95",
                  done
                    ? "border-green-600 bg-green-600 text-white shadow-none"
                    : "border-gray-200 bg-white text-gray-900 shadow-none",
                ].join(" ")}
              >
                <span className="shrink-0 [&_svg]:block" aria-hidden>
                  {done ? (
                    <CheckCircle
                      className="h-8 w-8 text-white"
                      strokeWidth={2}
                    />
                  ) : (
                    <Circle
                      className="h-8 w-8 text-gray-400"
                      strokeWidth={2}
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1 text-lg font-semibold leading-snug sm:text-xl">
                  {task.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 z-20 -mx-6 mt-6 border-t border-gray-200 bg-white/95 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-sm supports-[backdrop-filter]:bg-white/80">
        {showSuccess ? (
          <p
            className="mb-3 text-center text-base font-semibold text-green-600 sm:text-lg"
            role="status"
            aria-live="polite"
          >
            Schoonmaak succesvol opgeslagen!
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasSelection}
          aria-busy={isSaving}
          className="h-24 w-full rounded-2xl bg-green-600 text-xl font-bold text-white shadow-md transition-transform hover:bg-green-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:text-2xl"
        >
          {isSaving ? "Laden..." : "Lijst Opslaan"}
        </button>
      </div>
    </div>
  );
}
