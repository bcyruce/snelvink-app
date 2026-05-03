"use client";

import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import {
  iconPressMotionProps,
  listContainerVariants,
  listItemVariants,
  modalBackdropVariants,
} from "@/lib/uiMotion";
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
  const { t } = useTranslation();
  const router = useRouter();
  const [modules] = useState<TaskModule[]>(() => loadLayout());

  const handleSelectModule = (module: TaskModule) => {
    onClose();
    if (module.isCustom) {
      router.push(`/app/registreren/custom/${module.id}`);
    } else {
      router.push(`/app/registreren/${module.id}`);
    }
  };

  const moduleName = (module: TaskModule) => {
    if (module.id === "koeling") return t("koeling");
    if (module.id === "ontvangst") return t("ontvangst");
    if (module.id === "schoonmaak") return t("schoonmaak");
    if (module.id === "kerntemperatuur") return t("kerntemperatuur");
    return module.name;
  };

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
            variants={modalBackdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-50 bg-black/50"
            style={{ backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.7 }}
            transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.7 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 600) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-3xl"
            style={{
              background: theme.cardBg,
              boxShadow: "0 -4px 32px rgba(0,0,0,0.15)",
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="h-1.5 w-12 rounded-full"
                style={{ background: theme.cardBorder }}
              />
            </div>

            <div className="flex items-center justify-between px-5 py-3">
              <h2
                className="text-xl font-black"
                style={{ color: theme.fg }}
              >
                {t("chooseModule")}
              </h2>
              <motion.button
                {...iconPressMotionProps}
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
                style={{ background: `${theme.muted}20` }}
                aria-label={t("close")}
              >
                <X className="h-5 w-5" style={{ color: theme.muted }} />
              </motion.button>
            </div>

            {/* Module List */}
            <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: "calc(85vh - 100px)" }}>
              <motion.ul
                className="flex flex-col gap-2"
                variants={listContainerVariants}
                initial="initial"
                animate="animate"
              >
                {modules.map((module) => {
                  const Icon = getModuleIcon(module.icon);
                  return (
                    <motion.li key={module.id} variants={listItemVariants}>
                      <motion.button
                        type="button"
                        onClick={() => handleSelectModule(module)}
                        whileHover={{
                          scale: 1.015,
                          x: 2,
                          boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                        }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 400, damping: 24 }}
                        className="group flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left"
                        style={{
                          background: theme.bg,
                          border: `1.5px solid ${theme.cardBorder}`,
                        }}
                      >
                        <motion.div
                          whileHover={{ rotate: -6, scale: 1.08 }}
                          transition={{ type: "spring", stiffness: 380, damping: 18 }}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                          style={{ background: `${theme.primary}15` }}
                        >
                          <Icon
                            className="h-6 w-6"
                            style={{ color: theme.primary }}
                            strokeWidth={2.5}
                          />
                        </motion.div>
                        <span
                          className="flex-1 text-lg font-bold"
                          style={{ color: theme.fg }}
                        >
                          {moduleName(module)}
                        </span>
                        <ChevronRight
                          className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                          style={{ color: theme.muted }}
                          strokeWidth={2.5}
                        />
                      </motion.button>
                    </motion.li>
                  );
                })}
              </motion.ul>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
