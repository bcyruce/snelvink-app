"use client";

import AddModuleModal from "@/components/AddModuleModal";
import BottomNav, { type BottomNavTab } from "@/components/BottomNav";
import HistoryList from "@/components/HistoryList";
import SettingsTab from "@/components/SettingsTab";
import SortableModuleCard from "@/components/SortableModuleCard";
import SupercellButton from "@/components/SupercellButton";
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
import { Plus } from "lucide-react";
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<TaskModule | null>(null);
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

  const handleBackgroundClick = useCallback(() => {
    setIsEditing((current) => (current ? false : current));
  }, []);

  const stopEditingExit = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
  }, []);

  const handleCreateModule = useCallback((module: TaskModule) => {
    setModules((items) => [...items, module]);
    setIsAddModalOpen(false);
    setEditingModule(null);
  }, []);

  const handleUpdateModule = useCallback((updatedModule: TaskModule) => {
    setModules((items) =>
      items.map((item) => (item.id === updatedModule.id ? updatedModule : item)),
    );
    setIsAddModalOpen(false);
    setEditingModule(null);
  }, []);

  const handleOpenAddModule = useCallback(() => {
    setEditingModule(null);
    setIsAddModalOpen(true);
  }, []);

  const handleEditModule = useCallback((module: TaskModule) => {
    setEditingModule(module);
    setIsAddModalOpen(true);
  }, []);

  const handleCloseModuleModal = useCallback(() => {
    setIsAddModalOpen(false);
    setEditingModule(null);
  }, []);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-bold text-slate-500">
          SnelVink laden...
        </p>
      </div>
    );
  }

  return (
    <>
      <VerifyEmailBanner />
      <section
        className="relative px-5 pb-28 pt-8 sm:px-8 sm:pb-32 sm:pt-12"
        onClick={handleBackgroundClick}
      >
        <header className="mb-8 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
              HACCP
            </p>
            <h1 className="mt-1 text-5xl font-black tracking-tight text-slate-900 sm:text-6xl">
              SnelVink
            </h1>
            
          </div>

          {activeTab === "tasks" ? (
            <div
              className="shrink-0"
              onClick={(event) => event.stopPropagation()}
            >
              <SupercellButton
                type="button"
                size="md"
                variant={isEditing ? "success" : "neutral"}
                onClick={toggleEditing}
                aria-pressed={isEditing}
                textCase="normal"
                className="min-h-[56px] px-5 text-base"
              >
                {isEditing ? "Klaar" : "Wijzigen"}
              </SupercellButton>
            </div>
          ) : null}
        </header>

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
                <div className="grid grid-cols-2 gap-4 sm:gap-5">
                  {modules.map((m, i) => (
                    <SortableModuleCard
                      key={m.id}
                      module={m}
                      isEditing={isEditing}
                      wiggleClass={
                        i % 2 === 0 ? "animate-wiggle-a" : "animate-wiggle-b"
                      }
                      onDelete={handleDelete}
                      onEdit={handleEditModule}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : null}

          {activeTab === "tasks" && isEditing ? (
            <div onClick={(event) => event.stopPropagation()}>
              <SupercellButton
                type="button"
                size="lg"
                variant="primary"
                onClick={handleOpenAddModule}
                textCase="normal"
                className="mt-5 flex min-h-[88px] w-full flex-col items-center justify-center gap-2 py-6 text-lg"
              >
                <Plus className="h-8 w-8" strokeWidth={2.75} aria-hidden />
                Toevoegen
              </SupercellButton>
            </div>
          ) : null}

          {activeTab === "history" ? (
            <div onClick={stopEditingExit}>
              <HistoryList />
            </div>
          ) : null}

          {activeTab === "settings" ? (
            <div onClick={stopEditingExit}>
              <SettingsTab />
            </div>
          ) : null}
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

      <AddModuleModal
        open={isAddModalOpen}
        onClose={handleCloseModuleModal}
        onCreate={handleCreateModule}
        onCustomModuleAdded={handleCreateModule}
        onUpdate={handleUpdateModule}
        existingModuleIds={modules.map((module) => module.id)}
        editingModule={editingModule}
      />

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </>
  );
}

function HomeLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <p className="text-center text-lg font-semibold text-slate-500">
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
