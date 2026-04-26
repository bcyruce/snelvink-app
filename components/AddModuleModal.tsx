"use client";

import {
  AVAILABLE_ICONS,
  DEFAULT_MODULES,
  getModuleIcon,
  type TaskModule,
} from "@/lib/taskModules";
import { X } from "lucide-react";
import { createElement, useCallback, useEffect, useRef, useState } from "react";

type AddModuleTab = "standard" | "custom";

type AddModuleModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (module: TaskModule) => void;
  onUpdate?: (module: TaskModule) => void;
  existingModuleIds: string[];
  editingModule?: TaskModule | null;
};

export default function AddModuleModal({
  open,
  onClose,
  onCreate,
  onUpdate,
  existingModuleIds,
  editingModule = null,
}: AddModuleModalProps) {
  const [activeTab, setActiveTab] = useState<AddModuleTab>("standard");
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState<string>(AVAILABLE_ICONS[0]);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editingModule !== null;

  useEffect(() => {
    if (open) {
      setActiveTab(isEditing ? "custom" : "standard");
      setName(editingModule?.name ?? "");
      setIconKey(editingModule?.icon ?? AVAILABLE_ICONS[0]);
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

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) return;

      if (editingModule) {
        onUpdate?.({
          ...editingModule,
          name: trimmed,
          icon: iconKey,
          isCustom: true,
        });
        return;
      }

      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newModule: TaskModule = {
        id,
        name: trimmed,
        icon: iconKey,
        isCustom: true,
        href: `/taken/custom/${id}`,
      };
      onCreate(newModule);
    },
    [editingModule, name, iconKey, onCreate, onUpdate],
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
        className="toast-slide-up max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white px-6 pb-8 pt-6 shadow-sm sm:rounded-3xl sm:pb-6"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2
            id="add-module-title"
            className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
          >
            {isEditing ? "Module bewerken" : "Nieuwe module"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-transform active:scale-95"
          >
            <X className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          </button>
        </div>

        {!isEditing ? (
          <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            {(["standard", "custom"] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={[
                    "min-h-[64px] rounded-xl py-3 text-lg font-bold transition-all",
                    active
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500",
                  ].join(" ")}
                >
                  {tab === "standard" ? "Standaard" : "Aangepast"}
                </button>
              );
            })}
          </div>
        ) : null}

        {activeTab === "standard" && !isEditing ? (
          <div className="flex flex-col gap-3">
            {DEFAULT_MODULES.map((preset) => {
              const alreadyAdded = existingIds.has(preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-disabled={alreadyAdded}
                  onClick={() => {
                    if (alreadyAdded) {
                      window.alert("Dit onderdeel is al toegevoegd");
                      return;
                    }
                    onCreate({ ...preset });
                  }}
                  className={[
                    "flex min-h-[80px] w-full items-center gap-4 rounded-2xl border px-5 text-left text-xl font-black shadow-sm transition-transform active:scale-[0.98]",
                    alreadyAdded
                      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                      : "border-slate-100 bg-white text-slate-900",
                  ].join(" ")}
                >
                  {createElement(getModuleIcon(preset.icon), {
                    className: "h-8 w-8 shrink-0",
                    strokeWidth: 2.25,
                    "aria-hidden": true,
                  })}
                  <span className="flex-1">{preset.name}</span>
                  {alreadyAdded ? (
                    <span className="text-sm font-bold text-slate-400">
                      Toegevoegd
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="module-name"
                className="text-base font-bold text-slate-800"
              >
                Naam van de module
              </label>
              <input
                id="module-name"
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bijv. Allergenen"
                maxLength={40}
                className="min-h-[64px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-xl font-bold text-slate-900 shadow-sm outline-none transition-colors focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
              />
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-base font-bold text-slate-800">
                Kies een icoon
              </span>
              <div className="grid grid-cols-4 gap-3">
                {AVAILABLE_ICONS.map((key) => {
                  const selected = key === iconKey;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setIconKey(key)}
                      aria-pressed={selected}
                      className={[
                        "flex min-h-[64px] items-center justify-center rounded-2xl border transition-transform active:scale-95",
                        selected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-100 bg-white text-slate-700 shadow-sm",
                      ].join(" ")}
                    >
                      {createElement(getModuleIcon(key), {
                        className: "h-7 w-7",
                        strokeWidth: 2.25,
                        "aria-hidden": true,
                      })}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={!isValid}
                className="min-h-[64px] w-full rounded-2xl bg-green-600 px-6 py-5 text-xl font-black text-white shadow-sm transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEditing ? "Wijzigingen opslaan" : "Opslaan"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[64px] w-full rounded-2xl bg-slate-100 text-lg font-bold text-slate-800 transition-transform active:scale-95"
              >
                Annuleren
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
