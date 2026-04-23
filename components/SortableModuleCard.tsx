"use client";

import { getModuleIcon, type TaskModule } from "@/lib/taskModules";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import Link from "next/link";

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

  const Icon = getModuleIcon(module.icon);

  const outerStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.9 : 1,
  };

  const cardClass =
    "relative flex h-40 w-full flex-col items-center justify-center gap-3 rounded-3xl bg-gray-100 px-4 text-center text-xl font-black text-gray-900 shadow-sm";

  if (!isEditing) {
    return (
      <div ref={setNodeRef} style={outerStyle}>
        <Link
          href={module.href}
          className={`${cardClass} transition-transform active:scale-95`}
        >
          <Icon className="h-11 w-11" strokeWidth={2.25} aria-hidden />
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
            className="absolute -left-2 -top-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white shadow-lg ring-4 ring-white transition-transform active:scale-90"
          >
            <Trash2 className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          </button>

          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Verplaats ${module.name}`}
            className="absolute -right-2 -top-2 z-10 flex h-12 w-12 cursor-grab items-center justify-center rounded-full bg-gray-900 text-white shadow-lg ring-4 ring-white active:cursor-grabbing"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          </button>

          <Icon className="h-11 w-11" strokeWidth={2.25} aria-hidden />
          <span className="line-clamp-2 leading-tight">{module.name}</span>
        </div>
      </div>
    </div>
  );
}
