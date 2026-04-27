"use client";

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
    "relative flex min-h-[176px] w-full flex-col items-center justify-center gap-4 rounded-3xl border border-slate-100 bg-white px-5 text-center text-xl font-black text-slate-900 shadow-sm";
  const controlBaseClass =
    "absolute z-10 flex min-h-12 min-w-12 origin-center transform items-center justify-center rounded-full p-1.5 text-white shadow-sm ring-4 ring-[#F7F9FC] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]";
  const controlVisibilityClass = isEditing
    ? "scale-100 opacity-100"
    : "pointer-events-none scale-0 opacity-0";
  const isCustomModule = module.isCustom || !DEFAULT_MODULE_IDS.has(module.id);
  const moduleIcon = createElement(getModuleIcon(module.icon), {
    className: "h-11 w-11",
    strokeWidth: 2.25,
    "aria-hidden": true,
  });
  const content = (
    <>
      {moduleIcon}
      <span className="line-clamp-2 leading-tight">{module.name}</span>
    </>
  );

  const animationClass = isEditing && !isDragging ? wiggleClass : "";

  return (
    <div
      ref={setNodeRef}
      style={outerStyle}
      className={isEditing ? "touch-none" : undefined}
    >
      <div className={animationClass}>
        <div className="relative" data-module-card>
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

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(module.id);
            }}
            aria-label={`Verwijder ${module.name}`}
            tabIndex={isEditing ? 0 : -1}
            className={`${controlBaseClass} -left-2 -top-2 bg-red-500 ${controlVisibilityClass} active:scale-95`}
          >
            <Trash2 className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </button>

          {isCustomModule ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(module);
              }}
              aria-label={`Bewerk ${module.name}`}
              tabIndex={isEditing ? 0 : -1}
              className={`${controlBaseClass} ${isCustomModule ? "-right-2 bottom-3" : "-right-2 -top-2"} bg-blue-600 ${controlVisibilityClass} active:scale-95`}
            >
              <Pencil className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}

          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Verplaats ${module.name}`}
            className={`${controlBaseClass} -right-2 -top-2 cursor-grab bg-slate-900 ${controlVisibilityClass} active:cursor-grabbing`}
            {...listeners}
            {...attributes}
            tabIndex={isEditing ? 0 : -1}
          >
            <GripVertical className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </button>

        </div>
      </div>
    </div>
  );
}
