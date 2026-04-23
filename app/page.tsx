"use client";

import BottomNav, { type BottomNavTab } from "@/components/BottomNav";
import HistoryList from "@/components/HistoryList";
import SettingsTab from "@/components/SettingsTab";
import SortableModuleCard from "@/components/SortableModuleCard";
import UndoToast from "@/components/UndoToast";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import {
  DEFAULT_MODULES,
  loadLayout,
  saveLayout,
  type TaskModule,
} from "@/lib/taskModules";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

const VALID_TABS: readonly BottomNavTab[] = ["tasks", "history", "settings"];

function isBottomNavTab(value: string | null): value is BottomNavTab {
  return value !== null && (VALID_TABS as readonly string[]).includes(value);
}

type PendingDelete = {
  module: TaskModule;
  index: number;
};

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useUser();

  const initialTab: BottomNavTab = (() => {
    const t = searchParams.get("tab");
    return isBottomNavTab(t) ? t : "tasks";
  })();

  const [activeTab, setActiveTab] = useState<BottomNavTab>(initialTab);
  const [modules, setModules] = useState<TaskModule[]>(DEFAULT_MODULES);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const pendingDeleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    setModules(loadLayout());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveLayout(modules);
  }, [modules, isHydrated]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    return () => {
      if (pendingDeleteTimerRef.current) {
        clearTimeout(pendingDeleteTimerRef.current);
      }
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setModules((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setModules((items) => {
        const index = items.findIndex((m) => m.id === id);
        if (index === -1) return items;
        const removed = items[index];
        if (pendingDeleteTimerRef.current) {
          clearTimeout(pendingDeleteTimerRef.current);
        }
        setPendingDelete({ module: removed, index });
        return items.filter((m) => m.id !== id);
      });
    },
    [],
  );

  const handleUndoDelete = useCallback(() => {
    if (!pendingDelete) return;
    const { module: restored, index } = pendingDelete;
    setModules((items) => {
      if (items.some((m) => m.id === restored.id)) return items;
      const next = items.slice();
      const safeIndex = Math.min(index, next.length);
      next.splice(safeIndex, 0, restored);
      return next;
    });
    if (pendingDeleteTimerRef.current) {
      clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }
    setPendingDelete(null);
  }, [pendingDelete]);

  const handleDismissDelete = useCallback(() => {
    setPendingDelete(null);
    if (pendingDeleteTimerRef.current) {
      clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }
  }, []);

  const toggleEditing = useCallback(() => {
    setIsEditing((v) => !v);
  }, []);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-semibold text-gray-600">
          SnelVink laden...
        </p>
      </div>
    );
  }

  return (
    <>
      <VerifyEmailBanner />
      <section className="relative px-6 pb-24 pt-20 sm:px-10 sm:pb-28 sm:pt-28">
        {activeTab === "tasks" ? (
          <button
            type="button"
            onClick={toggleEditing}
            aria-pressed={isEditing}
            className={[
              "absolute right-6 top-6 z-20 h-12 rounded-2xl px-4 text-base font-black shadow-md transition-transform active:scale-95 sm:right-10 sm:top-10 sm:h-14 sm:px-5 sm:text-lg",
              isEditing
                ? "bg-green-600 text-white"
                : "bg-gray-900 text-white",
            ].join(" ")}
          >
            {isEditing ? "Klaar" : "Wijzigen"}
          </button>
        ) : null}

        <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight text-gray-900">
          SnelVink
        </h1>
        <p className="mt-5 text-lg text-gray-600 sm:text-xl">
          De keuken is open.
        </p>

        <div key={activeTab} className="tab-panel-enter">
          {activeTab === "tasks" ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={modules.map((m) => m.id)}
                strategy={rectSortingStrategy}
              >
                <div className="mt-8 grid grid-cols-2 gap-5 sm:gap-6">
                  {modules.map((m, i) => (
                    <SortableModuleCard
                      key={m.id}
                      module={m}
                      isEditing={isEditing}
                      wiggleClass={
                        i % 2 === 0 ? "animate-wiggle-a" : "animate-wiggle-b"
                      }
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : null}

          {activeTab === "history" ? <HistoryList /> : null}

          {activeTab === "settings" ? <SettingsTab /> : null}
        </div>
      </section>

      {pendingDelete ? (
        <UndoToast
          message={`"${pendingDelete.module.name}" verwijderd`}
          actionLabel="Ongedaan"
          durationMs={5000}
          onUndo={handleUndoDelete}
          onDismiss={handleDismissDelete}
        />
      ) : null}

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </>
  );
}

function HomeLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <p className="text-center text-lg font-semibold text-gray-600">
        SnelVink laden...
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <UserProvider>
      <Suspense fallback={<HomeLoading />}>
        <HomeContent />
      </Suspense>
    </UserProvider>
  );
}
