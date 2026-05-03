"use client";

import SupercellButton from "@/components/SupercellButton";
import {
  DEFAULT_MODULES,
  getModuleIcon,
  type TaskModule,
} from "@/lib/taskModules";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { createElement } from "react";

const MotionLink = motion(Link);

type SortableModuleCardProps = {
  module: TaskModule;
  isEditing: boolean;
  wiggleClass: string;
  onDelete: (id: string) => void;
  onEdit: (module: TaskModule) => void;
};

const DEFAULT_MODULE_IDS = new Set(DEFAULT_MODULES.map((module) => module.id));

export default function SortableModuleCard({
  module,
  isEditing,
  wiggleClass,
  onDelete,
  onEdit,
}: SortableModuleCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id, disabled: !isEditing });

  const outerStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.9 : 1,
  };

  const cardStyle: React.CSSProperties = {
    background: theme.cardBg,
    border: `1.5px solid ${theme.cardBorder}`,
    backdropFilter: "blur(12px)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
  };

  const controlBaseClass =
    "absolute z-10 flex h-10 w-10 origin-center transform items-center justify-center rounded-full text-white ring-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]";
  const controlVisibilityClass = isEditing
    ? "scale-100 opacity-100"
    : "pointer-events-none scale-0 opacity-0";
  const isCustomModule = module.isCustom || !DEFAULT_MODULE_IDS.has(module.id);
  const moduleName =
    module.id === "koeling"
      ? t("koeling")
      : module.id === "kerntemperatuur"
        ? t("kerntemperatuur")
        : module.id === "ontvangst"
          ? t("ontvangst")
          : module.id === "schoonmaak"
            ? t("schoonmaak")
            : module.name;

  const moduleIcon = createElement(getModuleIcon(module.icon), {
    className: "h-10 w-10",
    strokeWidth: 1.75,
    style: { color: theme.primary },
    "aria-hidden": true,
  });

  const content = (
    <>
      <motion.span
        whileHover={{ scale: 1.08, rotate: -3 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
        className="inline-flex"
      >
        {moduleIcon}
      </motion.span>
      <span
        className="line-clamp-2 text-base font-black leading-tight"
        style={{ color: theme.fg }}
      >
        {moduleName}
      </span>
    </>
  );

  const animationClass = isEditing && !isDragging ? wiggleClass : "";
  const stopCardClick = (e: React.MouseEvent) => {
    if (isEditing) e.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={outerStyle}
      className={isEditing ? "touch-none" : undefined}
      onClick={stopCardClick}
    >
      <div className={animationClass}>
        <div className="relative">
          {isEditing ? (
            <motion.div
              className="relative flex min-h-[140px] w-full flex-col items-center justify-center gap-3 rounded-2xl px-4 text-center"
              style={cardStyle}
              animate={isDragging ? { scale: 1.05 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
            >
              {content}
            </motion.div>
          ) : (
            <MotionLink
              href={module.href}
              className="group relative flex min-h-[140px] w-full flex-col items-center justify-center gap-3 rounded-2xl px-4 text-center"
              style={cardStyle}
              whileHover={{
                y: -3,
                scale: 1.02,
                boxShadow: "0 10px 28px rgba(0,0,0,0.12)",
              }}
              whileTap={{ scale: 0.96, y: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 24 }}
            >
              {content}
            </MotionLink>
          )}

          <SupercellButton
            type="button"
            size="icon"
            variant="danger"
            onClick={() => onDelete(module.id)}
            aria-label={`${t("remove")} ${moduleName}`}
            tabIndex={isEditing ? 0 : -1}
            className={`${controlBaseClass} -left-2 -top-2 h-10 w-10 rounded-full ${controlVisibilityClass}`}
            style={{
              boxShadow: `0 0 0 4px ${theme.bg}`,
            }}
          >
            <Trash2 className="h-4 w-4" strokeWidth={2.75} aria-hidden />
          </SupercellButton>

          <SupercellButton
            ref={setActivatorNodeRef}
            type="button"
            size="icon"
            variant="neutral"
            aria-label={`${t("move")} ${moduleName}`}
            className={`${controlBaseClass} -right-2 -top-2 h-10 w-10 cursor-grab rounded-full ${controlVisibilityClass} active:cursor-grabbing`}
            style={{
              boxShadow: `0 0 0 4px ${theme.bg}`,
            }}
            {...listeners}
            {...attributes}
            tabIndex={isEditing ? 0 : -1}
          >
            <GripVertical className="h-4 w-4" strokeWidth={2.75} style={{ color: theme.muted }} aria-hidden />
          </SupercellButton>

          {isCustomModule ? (
            <SupercellButton
              type="button"
              size="icon"
              variant="primary"
              onClick={() => onEdit(module)}
              aria-label={`${t("edit")} ${moduleName}`}
              tabIndex={isEditing ? 0 : -1}
              className={`${controlBaseClass} -right-2 -bottom-2 h-10 w-10 rounded-full ${controlVisibilityClass}`}
              style={{
                boxShadow: `0 0 0 4px ${theme.bg}`,
              }}
            >
              <Pencil className="h-4 w-4" strokeWidth={2.75} aria-hidden />
            </SupercellButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
