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
          href: `/taken/custom/${data.id}`,
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

  if (!open) return null;

  const isValid = name.trim().length > 0;
  const existingIds = new Set(existingModuleIds);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-module-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="toast-slide-up max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-2 border-slate-200 bg-white px-6 pb-8 pt-6 sm:rounded-3xl sm:pb-6"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2
            id="add-module-title"
            className="text-3xl font-black tracking-tight text-slate-900"
          >
            {isEditing ? t("moduleEdit") : t("newModule")}
          </h2>
          <SupercellButton
            size="icon"
            variant="neutral"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
          >
            <X className="h-6 w-6" strokeWidth={2.75} aria-hidden />
          </SupercellButton>
        </div>

        {!isEditing ? (
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border-2 border-slate-200 bg-slate-100 p-1.5">
            {(["standard", "custom"] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <SupercellButton
                  key={tab}
                  size="md"
                  variant={active ? "primary" : "neutral"}
                  onClick={() => setActiveTab(tab)}
                  textCase="normal"
                  className="min-h-[56px] rounded-xl py-3 text-base"
                >
                  {tab === "standard" ? t("standard") : t("custom")}
                </SupercellButton>
              );
            })}
          </div>
        ) : null}

        {activeTab === "standard" && !isEditing ? (
          <div className="flex flex-col gap-3">
            {DEFAULT_MODULES.map((preset) => {
              const alreadyAdded = existingIds.has(preset.id);
              return (
                <SupercellButton
                  key={preset.id}
                  size="lg"
                  variant={alreadyAdded ? "neutral" : "primary"}
                  aria-disabled={alreadyAdded}
                  disabled={alreadyAdded}
                  onClick={() => {
                    if (alreadyAdded) {
                      window.alert(t("moduleAlreadyAdded"));
                      return;
                    }
                    onCreate({ ...preset });
                  }}
                  className="flex min-h-[80px] w-full items-center gap-4 px-5 text-left text-xl normal-case"
                >
                  {createElement(getModuleIcon(preset.icon), {
                    className: "h-8 w-8 shrink-0",
                    strokeWidth: 2.25,
                    "aria-hidden": true,
                  })}
                  <span className="flex-1">
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
                    <span className="text-sm font-bold text-slate-400">
                      {t("alreadyAdded")}
                    </span>
                  ) : null}
                </SupercellButton>
              );
            })}
          </div>
        ) : (
          <form onSubmit={handleSaveCustomModule} className="flex flex-col gap-6">
            {errorMessage ? (
              <p className="rounded-2xl border-2 border-red-300 border-b-4 border-b-red-400 bg-red-50 px-4 py-3 text-center text-base font-bold text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <section className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="module-name"
                  className="text-base font-bold text-slate-800"
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
                  className="min-h-[64px] w-full rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-4 text-xl font-bold text-slate-900 outline-none transition-colors focus:border-blue-500 focus:border-b-blue-700"
                />
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-base font-bold text-slate-800">
                  {t("chooseIcon")}
                </span>
                <div className="grid grid-cols-4 gap-3">
                  {AVAILABLE_ICONS.map((key) => {
                    const selected = key === iconKey;
                    return (
                      <SupercellButton
                        type="button"
                        size="icon"
                        variant={selected ? "primary" : "neutral"}
                        key={key}
                        onClick={() => setIconKey(key)}
                        aria-pressed={selected}
                        className="flex min-h-[64px] items-center justify-center"
                      >
                        {createElement(getModuleIcon(key), {
                          className: "h-7 w-7",
                          strokeWidth: 2.25,
                          "aria-hidden": true,
                        })}
                      </SupercellButton>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <span className="text-base font-bold text-slate-800">
                {t("moduleType")}
              </span>
              <div className="grid grid-cols-1 gap-3">
                {[
                  ["number", t("moduleTypeNumber")],
                  ["boolean", t("moduleTypeBoolean")],
                  ["list", t("moduleTypeList")],
                ].map(([value, label]) => {
                  const active = moduleType === value;
                  return (
                    <SupercellButton
                      key={value}
                      type="button"
                      size="lg"
                      variant={active ? "primary" : "neutral"}
                      onClick={() => setModuleType(value as ModuleType)}
                      aria-pressed={active}
                      className="min-h-[64px] px-5 text-left text-lg normal-case"
                    >
                      {label}
                    </SupercellButton>
                  );
                })}
              </div>
            </section>

            <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
              {t("customModuleHelp")}
            </p>

            <div className="flex flex-col gap-3 pt-2">
              <SupercellButton
                type="submit"
                size="lg"
                variant="success"
                disabled={!isValid || isSaving}
                className="min-h-[64px] w-full text-xl normal-case"
              >
                {isSaving
                  ? t("saving")
                  : isEditing
                    ? t("savingChanges")
                    : t("save")}
              </SupercellButton>
              <SupercellButton
                type="button"
                size="lg"
                variant="neutral"
                onClick={onClose}
                className="min-h-[64px] w-full text-lg normal-case"
              >
                {t("cancel")}
              </SupercellButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


