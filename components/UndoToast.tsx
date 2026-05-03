"use client";

import SupercellButton from "@/components/SupercellButton";
import { motion } from "framer-motion";
import { Undo2 } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  const startRef = useRef<number>(Date.now());
  const rafRef = useRef<number | null>(null);
  const dismissedRef = useRef(false);

  useLayoutEffect(() => {
    setPortalEl(document.body);
  }, []);

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

  const shell = (
    <motion.div
      initial={{ y: "120%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "120%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.55 }}
      className="fixed left-1/2 z-[105] w-[min(calc(100%-2rem),28rem)] -translate-x-1/2 print:hidden"
      style={{
        bottom: "max(8rem, calc(env(safe-area-inset-bottom, 0px) + 6rem))",
      }}
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
            <motion.span
              animate={{ rotate: [0, -20, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.4 }}
              className="inline-flex"
            >
              <Undo2 className="h-5 w-5" strokeWidth={2.75} aria-hidden />
            </motion.span>
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
    </motion.div>
  );

  if (!portalEl) return null;
  return createPortal(shell, portalEl);
}
