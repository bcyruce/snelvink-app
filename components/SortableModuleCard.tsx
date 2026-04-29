"use client";

import SupercellButton from "@/components/SupercellButton";
import {
  DEFAULT_MODULES,
  getModuleIcon,
  type TaskModule,
} from "@/lib/taskModules";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { createElement } from "react";

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

  const cardClass =
    "relative flex min-h-[168px] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white px-4 text-center text-lg font-black text-slate-900";
  const controlBaseClass =
    "absolute z-10 flex h-10 w-10 origin-center transform items-center justify-center rounded-full text-white ring-4 ring-slate-100 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]";
  const controlVisibilityClass = isEditing
    ? "scale-100 opacity-100"
    : "pointer-events-none scale-0 opacity-0";
  const isCustomModule = module.isCustom || !DEFAULT_MODULE_IDS.has(module.id);
  const moduleIcon = createElement(getModuleIcon(module.icon), {
    className: "h-10 w-10 text-blue-600",
    strokeWidth: 2.5,
    "aria-hidden": true,
  });
  const content = (
    <>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-blue-200 border-b-4 border-b-blue-300 bg-blue-50">
        {moduleIcon}
      </div>
      <span className="line-clamp-2 text-base font-black leading-tight text-slate-900">
        {module.name}
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
            <div className={cardClass}>{content}</div>
          ) : (
            <Link
              href={module.href}
              className={`${cardClass} transition-transform active:scale-95`}
            >
              {content}
            </Link>
          )}

          <SupercellButton
            type="button"
            size="icon"
            variant="danger"
            onClick={() => onDelete(module.id)}
            aria-label={`Verwijder ${module.name}`}
            tabIndex={isEditing ? 0 : -1}
            className={`${controlBaseClass} -left-2 -top-2 h-10 w-10 rounded-full ${controlVisibilityClass}`}
          >
            <Trash2 className="h-4 w-4" strokeWidth={2.75} aria-hidden />
          </SupercellButton>

          <SupercellButton
            ref={setActivatorNodeRef}
            type="button"
            size="icon"
            variant="neutral"
            aria-label={`Verplaats ${module.name}`}
            className={`${controlBaseClass} -right-2 -top-2 h-10 w-10 cursor-grab rounded-full ${controlVisibilityClass} active:cursor-grabbing`}
            {...listeners}
            {...attributes}
            tabIndex={isEditing ? 0 : -1}
          >
            <GripVertical className="h-4 w-4 text-slate-700" strokeWidth={2.75} aria-hidden />
          </SupercellButton>

          {isCustomModule ? (
            <SupercellButton
              type="button"
              size="icon"
              variant="primary"
              onClick={() => onEdit(module)}
              aria-label={`Bewerk ${module.name}`}
              tabIndex={isEditing ? 0 : -1}
              className={`${controlBaseClass} -right-2 -bottom-2 h-10 w-10 rounded-full ${controlVisibilityClass}`}
            >
              <Pencil className="h-4 w-4" strokeWidth={2.75} aria-hidden />
            </SupercellButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
