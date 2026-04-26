"use client";

import { getModuleIcon, type TaskModule } from "@/lib/taskModules";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import Link from "next/link";
import { createElement } from "react";

type SortableModuleCardProps = {
  module: TaskModule;
  isEditing: boolean;
  wiggleClass: string;
  onDelete: (id: string) => void;
};

export default function SortableModuleCard({
  module,
  isEditing,
  wiggleClass,
  onDelete,
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

  if (!isEditing) {
    return (
      <div ref={setNodeRef} style={outerStyle}>
        <Link
          href={module.href}
          className={`${cardClass} transition-transform active:scale-95`}
        >
          {createElement(getModuleIcon(module.icon), {
            className: "h-11 w-11",
            strokeWidth: 2.25,
            "aria-hidden": true,
          })}
          <span className="line-clamp-2 leading-tight">{module.name}</span>
        </Link>
      </div>
    );
  }

  const animationClass = isDragging ? "" : wiggleClass;

  return (
    <div ref={setNodeRef} style={outerStyle} className="touch-none">
      <div className={animationClass}>
        <div className={cardClass}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(module.id);
            }}
            aria-label={`Verwijder ${module.name}`}
            className="absolute -left-3 -top-3 z-10 flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-sm ring-4 ring-[#F7F9FC] transition-transform active:scale-95"
          >
            <Trash2 className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          </button>

          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Verplaats ${module.name}`}
            className="absolute -right-3 -top-3 z-10 flex h-16 w-16 cursor-grab items-center justify-center rounded-full bg-slate-900 text-white shadow-sm ring-4 ring-[#F7F9FC] active:cursor-grabbing"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          </button>

          {createElement(getModuleIcon(module.icon), {
            className: "h-11 w-11",
            strokeWidth: 2.25,
            "aria-hidden": true,
          })}
          <span className="line-clamp-2 leading-tight">{module.name}</span>
        </div>
      </div>
    </div>
  );
}
