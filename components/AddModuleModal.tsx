"use client";

import SupercellButton from "@/components/SupercellButton";
import {
  AVAILABLE_ICONS,
  DEFAULT_MODULES,
  getModuleIcon,
  type TaskModule,
} from "@/lib/taskModules";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { useTranslation } from "@/hooks/useTranslation";
import {
  listContainerVariants,
  listItemVariants,
  modalBackdropVariants,
  modalSheetVariants,
} from "@/lib/uiMotion";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { createElement, useCallback, useEffect, useRef, useState } from "react";

type AddModuleTab = "standard" | "custom";
type ModuleType = "number" | "boolean" | "list";

type AddModuleModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (module: TaskModule) => void;
  onCustomModuleAdded: (module: TaskModule) => void;
  onUpdate?: (module: TaskModule) => void;
  existingModuleIds: string[];
  editingModule?: TaskModule | null;
};

function moduleTypeToDatabaseValue(type: ModuleType): string {
  if (type === "boolean") return "boolean";
  if (type === "list") return "list";
  return "temperature";
}

export default function AddModuleModal({
  open,
  onClose,
  onCreate,
  onCustomModuleAdded,
  onUpdate,
  existingModuleIds,
  editingModule = null,
}: AddModuleModalProps) {
  const { user, profile } = useUser();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AddModuleTab>("standard");
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState<string>(AVAILABLE_ICONS[0]);
  const [moduleType, setModuleType] = useState<ModuleType>("number");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editingModule !== null;

  useEffect(() => {
    if (open) {
      setActiveTab(isEditing ? "custom" : "standard");
      setName(editingModule?.name ?? "");
      setIconKey(editingModule?.icon ?? AVAILABLE_ICONS[0]);
      setModuleType("number");
      setErrorMessage(null);
      setIsSaving(false);
      if (isEditing) {
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    }
  }, [open, editingModule, isEditing]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const resetCustomForm = useCallback(() => {
    setName("");
    setIconKey(AVAILABLE_ICONS[0]);
    setModuleType("number");
    setErrorMessage(null);
  }, []);

  const handleSaveCustomModule = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) {
        setErrorMessage(t("customModuleNameRequired"));
        return;
      }

      if (editingModule) {
        onUpdate?.({
          ...editingModule,
          name: trimmed,
          icon: iconKey,
          isCustom: true,
        });
        return;
      }

      const restaurantId = profile?.restaurant_id ?? null;
      if (!restaurantId) {
        setErrorMessage(t("noRestaurantLinked"));
        return;
      }

      setIsSaving(true);
      setErrorMessage(null);

      // Settings is empty - items will be added in the management screen
      const settings = {};

      try {
        const { data, error } = await supabase
          .from("custom_modules")
          .insert({
            restaurant_id: restaurantId,
            user_id: user?.id ?? null,
            name: trimmed,
            icon: iconKey,
            module_type: moduleTypeToDatabaseValue(moduleType),
            settings,
            is_active: true,
          })
          .select("id, name, icon")
          .single();

        if (error) {
          console.error("Custom module opslaan mislukt:", error);
          setErrorMessage(t("customModuleSaveFailed", { message: error.message }));
          return;
        }

        const savedModule: TaskModule = {
          id: String(data.id),
          name: data.name ?? trimmed,
          icon: data.icon ?? iconKey,
          isCustom: true,
          href: `/app/taken/custom/${data.id}`,
        };

        resetCustomForm();
        onCustomModuleAdded(savedModule);
        onClose();
      } catch (error) {
        console.error("Onverwachte fout bij opslaan custom module:", error);
        setErrorMessage(
          error instanceof Error
            ? t("unexpectedError", { message: error.message })
            : t("unexpectedErrorRetry"),
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      editingModule,
      name,
      iconKey,
      moduleType,
      user,
      profile?.restaurant_id,
      onCustomModuleAdded,
      onClose,
      onUpdate,
      resetCustomForm,
      t,
    ],
  );

  const isValid = name.trim().length > 0;
  const existingIds = new Set(existingModuleIds);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="modal"
          variants={modalBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-module-title"
          onClick={onClose}
          style={{ backdropFilter: "blur(3px)" }}
        >
          <motion.div
            variants={modalSheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-neutral-200 bg-white px-5 pb-8 pt-5 sm:rounded-2xl sm:pb-6"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2
                id="add-module-title"
                className="text-xl font-semibold tracking-tight text-neutral-900"
              >
                {isEditing ? t("moduleEdit") : t("newModule")}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("close")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <X className="h-5 w-5 text-neutral-600" strokeWidth={2} aria-hidden />
              </button>
            </div>

            {!isEditing ? (
              <div className="mb-5 flex rounded-full bg-neutral-100 p-1">
                {(["standard", "custom"] as const).map((tab) => {
                  const active = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className="flex-1 rounded-full py-2 text-sm font-medium transition-all duration-200"
                      style={{
                        background: active ? "#fff" : "transparent",
                        color: active ? "var(--theme-primary)" : "#737373",
                        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                      }}
                    >
                      {tab === "standard" ? t("standard") : t("custom")}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <AnimatePresence mode="wait">
              {activeTab === "standard" && !isEditing ? (
                <motion.div
                  key="standard"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="flex flex-col gap-3"
                    variants={listContainerVariants}
                    initial="initial"
                    animate="animate"
                  >
                    {DEFAULT_MODULES.map((preset) => {
                      const alreadyAdded = existingIds.has(preset.id);
                      return (
                        <motion.div key={preset.id} variants={listItemVariants}>
                          <button
                            type="button"
                            aria-disabled={alreadyAdded}
                            disabled={alreadyAdded}
                            onClick={() => {
                              if (alreadyAdded) {
                                window.alert(t("moduleAlreadyAdded"));
                                return;
                              }
                              onCreate({ ...preset });
                            }}
                            className="flex w-full items-center gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-4 text-left transition-all duration-200 hover:bg-neutral-50 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div 
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                              style={{ background: "var(--theme-primary)15" }}
                            >
                              {createElement(getModuleIcon(preset.icon), {
                                className: "h-5 w-5",
                                strokeWidth: 1.75,
                                style: { color: "var(--theme-primary)" },
                                "aria-hidden": true,
                              })}
                            </div>
                            <span className="flex-1 font-medium text-neutral-900">
                              {preset.id === "koeling"
                                ? t("koeling")
                                : preset.id === "kerntemperatuur"
                                  ? t("kerntemperatuur")
                                  : preset.id === "ontvangst"
                                    ? t("ontvangst")
                                    : preset.id === "schoonmaak"
                                      ? t("schoonmaak")
                                      : preset.name}
                            </span>
                            {alreadyAdded ? (
                              <span className="text-xs font-medium text-neutral-400">
                                {t("alreadyAdded")}
                              </span>
                            ) : null}
                          </button>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </motion.div>
              ) : (
                <motion.form
                  key="custom"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSaveCustomModule}
                  className="flex flex-col gap-6"
                >
                  <AnimatePresence>
                    {errorMessage ? (
                      <motion.p
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 360, damping: 24 }}
                        className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700"
                      >
                        {errorMessage}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>

                  <section className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="module-name"
                        className="text-sm font-medium text-neutral-700"
                      >
                        {t("moduleName")}
                      </label>
                      <input
                        id="module-name"
                        ref={inputRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("moduleNamePlaceholder")}
                        maxLength={40}
                        className="h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-base font-medium text-neutral-900 outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20"
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <span className="text-sm font-medium text-neutral-700">
                        {t("chooseIcon")}
                      </span>
                      <motion.div
                        className="grid grid-cols-4 gap-3"
                        variants={listContainerVariants}
                        initial="initial"
                        animate="animate"
                      >
                        {AVAILABLE_ICONS.map((key) => {
                          const selected = key === iconKey;
                          return (
                            <motion.div key={key} variants={listItemVariants}>
                              <button
                                type="button"
                                onClick={() => setIconKey(key)}
                                aria-pressed={selected}
                                className="flex h-12 w-full items-center justify-center rounded-xl border transition-all duration-200"
                                style={{
                                  background: selected ? "var(--theme-primary)" : "#fff",
                                  borderColor: selected ? "var(--theme-primary)" : "#e5e5e5",
                                  color: selected ? "#fff" : "var(--theme-primary)",
                                }}
                              >
                                {createElement(getModuleIcon(key), {
                                  className: "h-5 w-5",
                                  strokeWidth: 1.75,
                                  "aria-hidden": true,
                                })}
                              </button>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </div>
                  </section>

                  <section className="flex flex-col gap-3">
                    <span className="text-sm font-medium text-neutral-700">
                      {t("moduleType")}
                    </span>
                    <div className="flex flex-col gap-2">
                      {[
                        ["number", t("moduleTypeNumber")],
                        ["boolean", t("moduleTypeBoolean")],
                        ["list", t("moduleTypeList")],
                      ].map(([value, label]) => {
                        const active = moduleType === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setModuleType(value as ModuleType)}
                            aria-pressed={active}
                            className="flex w-full items-center rounded-xl border px-4 py-3 text-left transition-all duration-200"
                            style={{
                              background: active ? "var(--theme-primary)10" : "#fff",
                              borderColor: active ? "var(--theme-primary)" : "#e5e5e5",
                              color: active ? "var(--theme-primary)" : "#171717",
                            }}
                          >
                            <span className="font-medium">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <p className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
                    {t("customModuleHelp")}
                  </p>

                  <div className="flex flex-col gap-3 pt-2">
                    <SupercellButton
                      type="submit"
                      size="lg"
                      variant="success"
                      disabled={!isValid || isSaving}
                      className="w-full"
                    >
                      {isSaving
                        ? t("saving")
                        : isEditing
                          ? t("savingChanges")
                          : t("save")}
                    </SupercellButton>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full rounded-full py-3 text-sm font-medium text-neutral-500 hover:bg-neutral-100 transition-colors"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}


