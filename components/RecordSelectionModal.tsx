"use client";

import type { TaskModule } from "@/lib/taskModules";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type RecordSelectionModalProps = {
  open: boolean;
  modules: TaskModule[];
  onClose: () => void;
  onSelect: (module: TaskModule) => void;
};

export default function RecordSelectionModal({
  open,
  modules,
  onClose,
  onSelect,
}: RecordSelectionModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Sluiten"
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl border border-slate-200 bg-white p-5"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">Kies een taak</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {modules.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => onSelect(module)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-base font-black text-slate-900 transition-colors hover:bg-slate-100"
                >
                  <span>{module.name}</span>
                </button>
              ))}
            </div>
          </motion.section>
        </>
      ) : null}
    </AnimatePresence>
  );
}
