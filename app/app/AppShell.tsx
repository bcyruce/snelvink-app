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
  fetchActiveCustomModuleTiles,
  fetchRestaurantTaskModulesLayout,
  loadLayout,
  mergeLayoutWithDbCustomModules,
  mergeServerAndLocalLayout,
  saveLayout,
  upsertRestaurantTaskModulesLayout,
  type TaskModule,
} from "@/lib/taskModules";
import { menuTabPath } from "@/lib/menuTabPath";
import { supabase } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";
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
import { Construction, Pencil, Plus, User, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type PendingDelete = {
  module: TaskModule;
  index: number;
};

function restoreDeletedModule(
  items: TaskModule[],
  deleted: PendingDelete,
): TaskModule[] {
  if (items.some((m) => m.id === deleted.module.id)) return items;
  const next = items.slice();
  const safeIndex = Math.min(deleted.index, next.length);
  next.splice(safeIndex, 0, deleted.module);
  return next;
}

function HomeContent({ activeTab }: { activeTab: MenuTab }) {
  const router = useRouter();
  const { user, isLoading, profile } = useUser();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [modules, setModules] = useState<TaskModule[]>(() => loadLayout());
  const [hydratedRestaurantId, setHydratedRestaurantId] = useState<string | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<TaskModule | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const pendingDeleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const persistModuleDelete = useCallback(
    async (deleted: PendingDelete): Promise<boolean> => {
      if (!deleted.module.isCustom) return true;
      const restaurantId = profile?.restaurant_id;
      if (!restaurantId) return false;

      const { error } = await supabase
        .from("custom_modules")
        .update({ is_active: false })
        .eq("id", deleted.module.id)
        .eq("restaurant_id", restaurantId);

      if (error) {
        console.warn("Custom module deactiveren mislukt:", error.message);
        return false;
      }
      return true;
    },
    [profile?.restaurant_id],
  );

  useEffect(() => {
    saveLayout(modules);
  }, [modules]);

  useEffect(() => {
    if (!user?.id || !profile?.restaurant_id) return;

    let cancelled = false;

    void (async () => {
      const restaurantId = profile.restaurant_id;

      const [fromServer, dbCustomTiles] = await Promise.all([
        fetchRestaurantTaskModulesLayout(supabase, restaurantId),
        fetchActiveCustomModuleTiles(supabase, restaurantId),
      ]);
      if (cancelled) return;

      const local = loadLayout();
      const merged = mergeServerAndLocalLayout(fromServer, local);
      const withCustoms = mergeLayoutWithDbCustomModules(merged, dbCustomTiles);
      setModules(withCustoms);
      saveLayout(withCustoms);

      if (!cancelled) setHydratedRestaurantId(restaurantId);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.restaurant_id]);

  useEffect(() => {
    if (!profile?.restaurant_id) return;
    if (hydratedRestaurantId !== profile.restaurant_id) return;
    void upsertRestaurantTaskModulesLayout(
      supabase,
      profile.restaurant_id,
      modules,
    );
  }, [modules, hydratedRestaurantId, profile?.restaurant_id]);

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
      if (pendingDelete) {
        const previousDelete = pendingDelete;
        void (async () => {
          const persisted = await persistModuleDelete(previousDelete);
          if (!persisted) {
            setModules((items) => restoreDeletedModule(items, previousDelete));
          }
        })();
      }

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
    [pendingDelete, persistModuleDelete],
  );

  const handleUndoDelete = useCallback(() => {
    if (!pendingDelete) return;
    setModules((items) => restoreDeletedModule(items, pendingDelete));
    if (pendingDeleteTimerRef.current) {
      clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }
    setPendingDelete(null);
  }, [pendingDelete]);

  const handleDismissDelete = useCallback(() => {
    const finalizedDelete = pendingDelete;
    setPendingDelete(null);
    if (pendingDeleteTimerRef.current) {
      clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }
    if (!finalizedDelete) return;

    void (async () => {
      const persisted = await persistModuleDelete(finalizedDelete);
      if (!persisted) {
        setModules((items) => restoreDeletedModule(items, finalizedDelete));
      }
    })();
  }, [pendingDelete, persistModuleDelete]);

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
          <div className="flex items-center justify-between pb-3 pt-4">
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: theme.muted }}
            >
              {t("navTaken")}
            </span>
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                toggleEditing();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              animate={{
                background: isEditing ? theme.primary : "transparent",
                color: isEditing ? "#fff" : theme.primary,
              }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={[
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                !isEditing && "border border-neutral-200",
                densePressClass,
              ].filter(Boolean).join(" ")}
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
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
                  {modules.map((m) => (
                    <SortableModuleCard
                      key={m.id}
                      module={m}
                      isEditing={isEditing}
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
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-2xl text-sm font-medium border-2 border-dashed"
                  style={{
                    borderColor: theme.cardBorder,
                    color: theme.muted,
                  }}
                >
                  <Plus className="h-8 w-8" strokeWidth={1.5} />
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
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: `${theme.primary}10` }}
                >
                  <Users className="h-8 w-8" style={{ color: theme.primary }} strokeWidth={1.75} />
                </div>
                <h2 className="text-lg font-semibold" style={{ color: theme.fg }}>
                  {t("navPersoneel")}
                </h2>
                <p className="mt-2 max-w-xs text-sm" style={{ color: theme.muted }}>
                  {t("staffIntro")}
                </p>
                <div
                  className="mt-6 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium"
                  style={{ background: `${theme.primary}10`, color: theme.primary }}
                >
                  <Construction className="h-4 w-4" strokeWidth={2} />
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
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: `${theme.primary}10` }}
                >
                  <User className="h-8 w-8" style={{ color: theme.primary }} strokeWidth={1.75} />
                </div>
                <h2 className="text-lg font-semibold" style={{ color: theme.fg }}>
                  {t("navProfiel")}
                </h2>
                <p className="mt-2 max-w-xs text-sm" style={{ color: theme.muted }}>
                  {t("profileIntro")}
                </p>
                <div
                  className="mt-6 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium"
                  style={{ background: `${theme.primary}10`, color: theme.primary }}
                >
                  <Construction className="h-4 w-4" strokeWidth={2} />
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

      <FloatingMenu active={activeTab} onChange={(tab) => router.push(menuTabPath(tab))} />
    </>
  );
}

type AppShellProps = {
  activeTab: MenuTab;
};

export default function AppShell({ activeTab }: AppShellProps) {
  return (
    <UserProvider>
      <HomeContent activeTab={activeTab} />
    </UserProvider>
  );
}
