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
  onDelete: (id: string) => void;
  onEdit: (module: TaskModule) => void;
};

const DEFAULT_MODULE_IDS = new Set(DEFAULT_MODULES.map((module) => module.id));

export default function SortableModuleCard({
  module,
  isEditing,
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
    background: "rgba(255, 255, 255, 0.9)",
    border: "1px solid rgba(0, 0, 0, 0.06)",
    backdropFilter: "blur(12px)",
  };

  const controlBaseClass =
    "absolute z-10 flex h-9 w-9 origin-center transform items-center justify-center rounded-full shadow-md ring-2 ring-white transition-all duration-200 ease-out";
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
    className: "h-8 w-8",
    strokeWidth: 1.5,
    style: { color: theme.primary },
    "aria-hidden": true,
  });

  const content = (
    <>
      <span className="inline-flex">{moduleIcon}</span>
      <span
        className="line-clamp-2 text-sm font-semibold leading-tight"
        style={{ color: theme.fg }}
      >
        {moduleName}
      </span>
    </>
  );

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
      <div className="relative">
        {isEditing ? (
          <motion.div
            className="relative flex min-h-[120px] w-full flex-col items-center justify-center gap-2.5 rounded-2xl px-4 text-center shadow-sm"
            style={cardStyle}
            animate={isDragging ? { scale: 1.03, boxShadow: "0 12px 24px rgba(0,0,0,0.12)" } : { scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {content}
          </motion.div>
        ) : (
          <MotionLink
            href={module.href}
            className="group relative flex min-h-[120px] w-full flex-col items-center justify-center gap-2.5 rounded-2xl px-4 text-center shadow-sm"
            style={cardStyle}
            whileHover={{
              y: -2,
              boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            {content}
          </MotionLink>
        )}

        <SupercellButton
          type="button"
          size="iconSm"
          variant="danger"
          onClick={() => onDelete(module.id)}
          aria-label={`${t("remove")} ${moduleName}`}
          tabIndex={isEditing ? 0 : -1}
          className={`${controlBaseClass} -left-2 -top-2 ${controlVisibilityClass}`}
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
        </SupercellButton>

        <SupercellButton
          ref={setActivatorNodeRef}
          type="button"
          size="iconSm"
          variant="neutral"
          aria-label={`${t("move")} ${moduleName}`}
          className={`${controlBaseClass} -right-2 -top-2 cursor-grab ${controlVisibilityClass} active:cursor-grabbing`}
          {...listeners}
          {...attributes}
          tabIndex={isEditing ? 0 : -1}
        >
          <GripVertical className="h-4 w-4" strokeWidth={2} style={{ color: theme.muted }} aria-hidden />
        </SupercellButton>

        {isCustomModule ? (
          <SupercellButton
            type="button"
            size="iconSm"
            variant="primary"
            onClick={() => onEdit(module)}
            aria-label={`${t("edit")} ${moduleName}`}
            tabIndex={isEditing ? 0 : -1}
            className={`${controlBaseClass} -right-2 -bottom-2 ${controlVisibilityClass}`}
          >
            <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />
          </SupercellButton>
        ) : null}
      </div>
    </div>
  );
}
