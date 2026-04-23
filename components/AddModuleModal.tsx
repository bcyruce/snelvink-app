"use client";

import {
  AVAILABLE_ICONS,
  getModuleIcon,
  type TaskModule,
} from "@/lib/taskModules";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type AddModuleModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (module: TaskModule) => void;
};

export default function AddModuleModal({
  open,
  onClose,
  onCreate,
}: AddModuleModalProps) {
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState<string>(AVAILABLE_ICONS[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setIconKey(AVAILABLE_ICONS[0]);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

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
      const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const module: TaskModule = {
        id,
        name: trimmed,
        icon: iconKey,
        isCustom: true,
        href: `/taken/custom/${id}`,
      };
      onCreate(module);
    },
    [name, iconKey, onCreate],
  );

  if (!open) return null;

  const isValid = name.trim().length > 0;

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
        className="toast-slide-up w-full max-w-md rounded-t-3xl bg-white px-6 pb-8 pt-6 shadow-2xl sm:rounded-3xl sm:pb-6"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2
            id="add-module-title"
            className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl"
          >
            Nieuwe module
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition-transform active:scale-90"
          >
            <X className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="module-name"
              className="text-base font-bold text-gray-800"
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
              className="h-16 w-full rounded-2xl border-2 border-gray-300 bg-white px-4 text-xl font-bold text-gray-900 outline-none transition-colors focus:border-gray-900"
            />
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-base font-bold text-gray-800">
              Kies een icoon
            </span>
            <div className="grid grid-cols-4 gap-3">
              {AVAILABLE_ICONS.map((key) => {
                const Icon = getModuleIcon(key);
                const selected = key === iconKey;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setIconKey(key)}
                    aria-pressed={selected}
                    className={[
                      "flex h-16 items-center justify-center rounded-2xl border-2 transition-transform active:scale-95",
                      selected
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-gray-50 text-gray-700",
                    ].join(" ")}
                  >
                    <Icon
                      className="h-7 w-7"
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="submit"
              disabled={!isValid}
              className="h-16 w-full rounded-2xl bg-green-600 text-xl font-black text-white shadow-md transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Opslaan
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-14 w-full rounded-2xl bg-gray-100 text-lg font-bold text-gray-800 transition-transform active:scale-95"
            >
              Annuleren
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
