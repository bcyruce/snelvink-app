"use client";

import SupercellButton from "@/components/SupercellButton";
import { Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type UndoToastProps = {
  message: string;
  actionLabel: string;
  durationMs?: number;
  onUndo: () => void;
  onDismiss: () => void;
};

export default function UndoToast({
  message,
  actionLabel,
  durationMs = 5000,
  onUndo,
  onDismiss,
}: UndoToastProps) {
  const [progress, setProgress] = useState(100);
  const startRef = useRef<number>(Date.now());
  const rafRef = useRef<number | null>(null);
  const dismissedRef = useRef(false);

  useEffect(() => {
    startRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(pct);
      if (elapsed >= durationMs) {
        if (!dismissedRef.current) {
          dismissedRef.current = true;
          onDismiss();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [durationMs, onDismiss]);

  const handleUndo = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    onUndo();
  };

  return (
    <div
      className="toast-slide-up fixed bottom-32 left-1/2 z-50 w-[min(calc(100%-2rem),28rem)] -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      <div className="overflow-hidden rounded-2xl border-2 border-slate-700 border-b-4 bg-slate-900">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <p className="flex-1 text-base font-bold text-white sm:text-lg">
            {message}
          </p>
          <SupercellButton
            type="button"
            size="sm"
            variant="primary"
            onClick={handleUndo}
            textCase="normal"
            className="flex h-12 items-center gap-2 rounded-xl px-4 text-base sm:text-lg"
          >
            <Undo2 className="h-5 w-5" strokeWidth={2.75} aria-hidden />
            {actionLabel}
          </SupercellButton>
        </div>
        <div className="h-1.5 w-full bg-slate-700">
          <div
            className="h-full bg-blue-500 transition-[width] duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
