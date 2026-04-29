"use client";

import AddModuleModal from "@/components/AddModuleModal";
import BottomNav, { type BottomNavTab } from "@/components/BottomNav";
import HistoryList from "@/components/HistoryList";
import SettingsTab from "@/components/SettingsTab";
import SortableModuleCard from "@/components/SortableModuleCard";
import ThemePicker from "@/components/ThemePicker";
import UndoToast from "@/components/UndoToast";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import { useTheme } from "@/hooks/useTheme";
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
import { Pencil, Plus } from "lucide-react";
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
  const { theme } = useTheme();

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
        <p className="text-center text-lg font-bold" style={{ color: theme.muted }}>
          SnelVink laden...
        </p>
      </div>
    );
  }

  return (
    <>
      <VerifyEmailBanner />
      
      {/* 深色 Header */}
      <header 
        className="px-5 pt-6 pb-5"
        style={{ background: theme.primary }}
      >
        <div className="flex items-center justify-between">
          {/* 标题 */}
          <div>
            <div style={{
              fontSize: 34,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "0.06em",
              lineHeight: 1,
              fontFamily: "'Trebuchet MS', sans-serif",
              textTransform: "uppercase",
            }}>
              SNEL<span style={{ opacity: 0.5, marginLeft: "0.1em" }}>VINK</span>
            </div>
            <div style={{
              fontSize: 9.5,
              fontWeight: 600,
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.15em",
              marginTop: 3,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}>
              Meten · Vinken · Weten
            </div>
          </div>

          {/* 调色盘按钮 */}
          <ThemePicker />
        </div>
      </header>

      <section
        className="relative px-4 pb-28 pt-0"
        style={{ background: theme.bg }}
        onClick={handleBackgroundClick}
      >
        {/* Taken + Wijzigen 行 */}
        {activeTab === "tasks" && (
          <div className="flex items-center justify-between pt-4 pb-3">
            <span 
              className="text-[11px] font-black uppercase tracking-widest"
              style={{ color: theme.muted }}
            >
              Taken
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); toggleEditing(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black transition-all"
              style={{
                background: isEditing ? theme.primary : "transparent",
                border: `1.5px solid ${isEditing ? theme.primary : theme.cardBorder}`,
                color: isEditing ? "#fff" : theme.primary,
                letterSpacing: "0.04em",
              }}
            >
              <Pencil className="h-3 w-3" strokeWidth={2.5} />
              {isEditing ? "Klaar" : "Wijzigen"}
            </button>
          </div>
        )}

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
                <div className="grid grid-cols-2 gap-3">
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
              <button
                type="button"
                onClick={handleOpenAddModule}
                className="mt-3 flex min-h-[140px] w-full flex-col items-center justify-center gap-3 rounded-2xl text-base font-black transition-transform active:scale-95"
                style={{
                  background: "rgba(0,0,0,0.04)",
                  border: `1.5px dashed ${theme.cardBorder}`,
                  color: theme.muted,
                }}
              >
                <Plus className="h-10 w-10" strokeWidth={1.75} />
                Toevoegen
              </button>
            </div>
          ) : null}

          {activeTab === "history" ? (
            <div onClick={stopEditingExit} className="pt-4">
              <HistoryList />
            </div>
          ) : null}

          {activeTab === "settings" ? (
            <div onClick={stopEditingExit} className="pt-4">
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
