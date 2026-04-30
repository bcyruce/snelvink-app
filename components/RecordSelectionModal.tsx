"use client";

import { useTheme } from "@/hooks/useTheme";
import { getModuleIcon, loadLayout, type TaskModule } from "@/lib/taskModules";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type RecordSelectionModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function RecordSelectionModal({
  open,
  onClose,
}: RecordSelectionModalProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const [modules, setModules] = useState<TaskModule[]>([]);

  useEffect(() => {
    setModules(loadLayout());
  }, [open]);

  const handleSelectModule = (module: TaskModule) => {
    onClose();
    // Navigate to the module's recording page with source=registreren
    if (module.isCustom) {
      router.push(`/registreren/custom/${module.id}?source=registreren`);
    } else {
      router.push(`/taken/${module.id}?source=registreren`);
    }
  };

  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50"
            style={{ backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          {/* Modal Panel - slides up from bottom */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-3xl"
            style={{
              background: theme.cardBg,
              boxShadow: "0 -4px 32px rgba(0,0,0,0.15)",
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="h-1.5 w-12 rounded-full"
                style={{ background: theme.cardBorder }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <h2
                className="text-xl font-black"
                style={{ color: theme.fg }}
              >
                Kies een module
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
                style={{ background: `${theme.muted}20` }}
                aria-label="Sluiten"
              >
                <X className="h-5 w-5" style={{ color: theme.muted }} />
              </button>
            </div>

            {/* Module List */}
            <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: "calc(85vh - 100px)" }}>
              <ul className="flex flex-col gap-2">
                {modules.map((module) => {
                  const Icon = getModuleIcon(module.icon);
                  return (
                    <li key={module.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectModule(module)}
                        className="flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left transition-all active:scale-[0.98]"
                        style={{
                          background: theme.bg,
                          border: `1.5px solid ${theme.cardBorder}`,
                        }}
                      >
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: `${theme.primary}15` }}
                        >
                          <Icon
                            className="h-6 w-6"
                            style={{ color: theme.primary }}
                            strokeWidth={2.5}
                          />
                        </div>
                        <span
                          className="flex-1 text-lg font-bold"
                          style={{ color: theme.fg }}
                        >
                          {module.name}
                        </span>
                        <ChevronRight
                          className="h-5 w-5"
                          style={{ color: theme.muted }}
                          strokeWidth={2.5}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
