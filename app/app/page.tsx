"use client";

import AddModuleModal from "@/components/AddModuleModal";
import AppHeader from "@/components/AppHeader";
import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import HistoryList from "@/components/HistoryList";
import RestaurantTab from "@/components/RestaurantTab";
import SettingsTab from "@/components/SettingsTab";
import SortableModuleCard from "@/components/SortableModuleCard";
import UndoToast from "@/components/UndoToast";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { densePressClass } from "@/lib/uiMotion";
import {
  loadLayout,
  saveLayout,
  type TaskModule,
} from "@/lib/taskModules";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
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
import { Construction, Pencil, Plus, User, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

const VALID_TABS: readonly MenuTab[] = [
  "vandaag",
  "taken",
  "geschiedenis",
  "personeel",
  "profiel",
  "restaurant",
  "instellingen",
];

function isMenuTab(value: string | null): value is MenuTab {
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
  const { t } = useTranslation();

  const initialTab: MenuTab = (() => {
    const t = searchParams.get("tab");
    return isMenuTab(t) ? t : "taken";
  })();

  const [activeTab, setActiveTab] = useState<MenuTab>(initialTab);
  const [modules, setModules] = useState<TaskModule[]>(() => loadLayout());
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
    saveLayout(modules);
  }, [modules]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/app/login");
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
      // Covers mouse + touch; avoids TouchSensor’s activation delay on taps.
      activationConstraint: { distance: 8 },
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
          {t("loadingApp")}
        </p>
      </div>
    );
  }

  return (
    <>
      <VerifyEmailBanner />

      <AppHeader />

      <section
        className="relative px-4 pb-28 pt-0"
        style={{ background: theme.bg }}
        onClick={handleBackgroundClick}
      >
        {/* Taken + Wijzigen 行 */}
        {activeTab === "taken" && (
          <div className="flex items-center justify-between pt-4 pb-3">
            <span 
              className="text-[11px] font-black uppercase tracking-widest"
              style={{ color: theme.muted }}
            >
              {t("navTaken")}
            </span>
            <motion.button
              onClick={(e) => { e.stopPropagation(); toggleEditing(); }}
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.92 }}
              animate={{
                background: isEditing ? theme.primary : "transparent",
                color: isEditing ? "#fff" : theme.primary,
                borderColor: isEditing ? theme.primary : theme.cardBorder,
              }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black border-[1.5px]",
                densePressClass,
              ].join(" ")}
              style={{ letterSpacing: "0.04em" }}
            >
              <motion.span
                animate={{ rotate: isEditing ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 20 }}
                className="inline-flex"
              >
                <Pencil className="h-3 w-3" strokeWidth={2.5} />
              </motion.span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isEditing ? "done" : "edit"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  {isEditing ? t("done") : t("edit")}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        )}

        <div key={activeTab} className="tab-panel-enter">
          {activeTab === "taken" ? (
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

          <AnimatePresence>
            {activeTab === "taken" && isEditing ? (
              <motion.div
                onClick={(event) => event.stopPropagation()}
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
              >
                <motion.button
                  type="button"
                  onClick={handleOpenAddModule}
                  whileHover={{
                    scale: 1.02,
                    y: -2,
                    boxShadow: "0 10px 28px rgba(0,0,0,0.08)",
                  }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 380, damping: 24 }}
                  className="mt-3 flex min-h-[140px] w-full flex-col items-center justify-center gap-3 rounded-2xl text-base font-black"
                  style={{
                    background: "rgba(0,0,0,0.04)",
                    border: `1.5px dashed ${theme.cardBorder}`,
                    color: theme.muted,
                  }}
                >
                  <motion.span
                    animate={{ rotate: [0, 90, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-flex"
                  >
                    <Plus className="h-10 w-10" strokeWidth={1.75} />
                  </motion.span>
                  {t("add")}
                </motion.button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {activeTab === "geschiedenis" ? (
            <div onClick={stopEditingExit} className="pt-4">
              <HistoryList />
            </div>
          ) : null}

          {activeTab === "instellingen" ? (
            <div onClick={stopEditingExit} className="pt-4">
              <SettingsTab />
            </div>
          ) : null}

          {/* Personeelsbeheer placeholder */}
          {activeTab === "personeel" ? (
            <div onClick={stopEditingExit} className="pt-4">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div
                  className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl"
                  style={{ background: `${theme.primary}15` }}
                >
                  <Users className="h-10 w-10" style={{ color: theme.primary }} strokeWidth={2} />
                </div>
                <h2 className="text-xl font-black" style={{ color: theme.fg }}>
                  {t("navPersoneel")}
                </h2>
                <p className="mt-2 text-sm font-medium" style={{ color: theme.muted }}>
                  {t("staffIntro")}
                </p>
                <div
                  className="mt-6 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold"
                  style={{ background: `${theme.primary}15`, color: theme.primary }}
                >
                  <Construction className="h-4 w-4" strokeWidth={2.5} />
                  {t("comingSoon")}
                </div>
              </div>
            </div>
          ) : null}

          {/* Mijn profiel placeholder */}
          {activeTab === "profiel" ? (
            <div onClick={stopEditingExit} className="pt-4">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div
                  className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl"
                  style={{ background: `${theme.primary}15` }}
                >
                  <User className="h-10 w-10" style={{ color: theme.primary }} strokeWidth={2} />
                </div>
                <h2 className="text-xl font-black" style={{ color: theme.fg }}>
                  {t("navProfiel")}
                </h2>
                <p className="mt-2 text-sm font-medium" style={{ color: theme.muted }}>
                  {t("profileIntro")}
                </p>
                <div
                  className="mt-6 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold"
                  style={{ background: `${theme.primary}15`, color: theme.primary }}
                >
                  <Construction className="h-4 w-4" strokeWidth={2.5} />
                  {t("comingSoon")}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "restaurant" ? (
            <div onClick={stopEditingExit} className="pt-4">
              <RestaurantTab />
            </div>
          ) : null}
        </div>
      </section>

      <AnimatePresence>
        {pendingDelete ? (
          <UndoToast
            key={pendingDelete.module.id}
            message={t("deletedMessage", { name: pendingDelete.module.name })}
            actionLabel={t("undo")}
            durationMs={5000}
            onUndo={handleUndoDelete}
            onDismiss={handleDismissDelete}
          />
        ) : null}
      </AnimatePresence>

      <AddModuleModal
        open={isAddModalOpen}
        onClose={handleCloseModuleModal}
        onCreate={handleCreateModule}
        onCustomModuleAdded={handleCreateModule}
        onUpdate={handleUpdateModule}
        existingModuleIds={modules.map((module) => module.id)}
        editingModule={editingModule}
      />

      <FloatingMenu
        active={activeTab}
        onChange={(tab) => {
          if (tab === "registreren") {
            router.push("/app/registreren");
          } else {
            setActiveTab(tab);
          }
        }}
      />
    </>
  );
}

function HomeLoading() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <p className="text-center text-lg font-semibold text-slate-500">
        {t("loadingApp")}
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
