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
import { Trash2, X } from "lucide-react";
import { createElement, useCallback, useEffect, useRef, useState } from "react";

type AddModuleTab = "standard" | "custom";
type ModuleType = "number" | "boolean" | "list";

type NumberInputConfig = {
  id: string;
  name: string;
  step: number;
  defaultValue: number;
  unit: string;
  hasRemark: boolean;
};

type BooleanInputConfig = {
  id: string;
  name: string;
  hasRemark: boolean;
};

type ListItemConfig = {
  id: string;
  name: string;
};

type ListSettings = {
  items: ListItemConfig[];
  hasRemark: boolean;
};

type AddModuleModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (module: TaskModule) => void;
  onCustomModuleAdded: (module: TaskModule) => void;
  onUpdate?: (module: TaskModule) => void;
  existingModuleIds: string[];
  editingModule?: TaskModule | null;
};

function createNumberInput(index: number): NumberInputConfig {
  return {
    id: `number-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `Getalveld ${index}`,
    step: 1,
    defaultValue: 0,
    unit: "°C",
    hasRemark: false,
  };
}

function createBooleanInput(index: number): BooleanInputConfig {
  return {
    id: `boolean-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `Controle ${index}`,
    hasRemark: false,
  };
}

function createListItem(index: number): ListItemConfig {
  return {
    id: `list-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `Item ${index}`,
  };
}

function moduleTypeToDatabaseValue(type: ModuleType): string {
  if (type === "boolean") return "boolean";
  if (type === "list") return "list";
  return "temperature";
}

function formatStep(step: number): string {
  if (!Number.isFinite(step)) return "0";
  return Number.isInteger(step) ? String(step) : String(step).replace(".", ",");
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
  const [activeTab, setActiveTab] = useState<AddModuleTab>("standard");
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState<string>(AVAILABLE_ICONS[0]);
  const [moduleType, setModuleType] = useState<ModuleType>("number");
  const [numberInputs, setNumberInputs] = useState<NumberInputConfig[]>([]);
  const [booleanInputs, setBooleanInputs] = useState<BooleanInputConfig[]>([]);
  const [listItems, setListItems] = useState<ListItemConfig[]>([]);
  const [listHasRemark, setListHasRemark] = useState(false);
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
      setNumberInputs([createNumberInput(1)]);
      setBooleanInputs([createBooleanInput(1)]);
      setListItems([createListItem(1)]);
      setListHasRemark(false);
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
    setNumberInputs([createNumberInput(1)]);
    setBooleanInputs([createBooleanInput(1)]);
    setListItems([createListItem(1)]);
    setListHasRemark(false);
    setErrorMessage(null);
  }, []);

  const handleSaveCustomModule = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) {
        setErrorMessage("Vul een naam voor het onderdeel in.");
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
        setErrorMessage("Geen restaurant gekoppeld aan je account.");
        return;
      }

      setIsSaving(true);
      setErrorMessage(null);

      const trimmedNumberInputs = numberInputs
        .map((input) => ({ ...input, name: input.name.trim() }))
        .filter((input) => input.name.length > 0);
      const trimmedBooleanInputs = booleanInputs
        .map((input) => ({ ...input, name: input.name.trim() }))
        .filter((input) => input.name.length > 0);
      const trimmedListItems = listItems
        .map((item) => ({ ...item, name: item.name.trim() }))
        .filter((item) => item.name.length > 0);

      if (moduleType === "number" && trimmedNumberInputs.length === 0) {
        setErrorMessage("Voeg minstens één veld toe.");
        setIsSaving(false);
        return;
      }
      if (moduleType === "boolean" && trimmedBooleanInputs.length === 0) {
        setErrorMessage("Voeg minstens één veld toe.");
        setIsSaving(false);
        return;
      }
      if (moduleType === "list" && trimmedListItems.length === 0) {
        setErrorMessage("Voeg minstens één item toe.");
        setIsSaving(false);
        return;
      }

      // Settings worden opgeslagen als object zodat we naast de configuratie
      // ook flags kwijt kunnen. Het lezen kan nog steeds
      // overweg met de oude (array-)vorm.
      const settings =
        moduleType === "boolean"
          ? { inputs: trimmedBooleanInputs }
          : moduleType === "list"
            ? {
                items: trimmedListItems,
                hasRemark: listHasRemark,
              }
            : { inputs: trimmedNumberInputs };

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
          setErrorMessage(`Opslaan mislukt: ${error.message}`);
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
            ? `Onverwachte fout: ${error.message}`
            : "Onverwachte fout. Probeer opnieuw.",
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      editingModule,
      name,
      iconKey,
      numberInputs,
      booleanInputs,
      listItems,
      listHasRemark,
      moduleType,
      user?.id,
      profile?.restaurant_id,
      onCustomModuleAdded,
      onClose,
      onUpdate,
      resetCustomForm,
    ],
  );

  const handleAddNumberInput = useCallback(() => {
    setNumberInputs((current) => [
      ...current,
      createNumberInput(current.length + 1),
    ]);
  }, []);

  const handleRemoveNumberInput = useCallback((id: string) => {
    setNumberInputs((current) => current.filter((input) => input.id !== id));
  }, []);

  const handleUpdateNumberInput = useCallback(
    (id: string, updates: Partial<NumberInputConfig>) => {
      setNumberInputs((current) =>
        current.map((input) =>
          input.id === id ? { ...input, ...updates } : input,
        ),
      );
    },
    [],
  );

  const handleAddBooleanInput = useCallback(() => {
    setBooleanInputs((current) => [
      ...current,
      createBooleanInput(current.length + 1),
    ]);
  }, []);

  const handleRemoveBooleanInput = useCallback((id: string) => {
    setBooleanInputs((current) => current.filter((input) => input.id !== id));
  }, []);

  const handleUpdateBooleanInput = useCallback(
    (id: string, updates: Partial<BooleanInputConfig>) => {
      setBooleanInputs((current) =>
        current.map((input) =>
          input.id === id ? { ...input, ...updates } : input,
        ),
      );
    },
    [],
  );

  const handleAddListItem = useCallback(() => {
    setListItems((current) => [...current, createListItem(current.length + 1)]);
  }, []);

  const handleRemoveListItem = useCallback((id: string) => {
    setListItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const handleUpdateListItem = useCallback((id: string, name: string) => {
    setListItems((current) =>
      current.map((item) => (item.id === id ? { ...item, name } : item)),
    );
  }, []);

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
            {isEditing ? "Module bewerken" : "Nieuwe module"}
          </h2>
          <SupercellButton
            size="icon"
            variant="neutral"
            onClick={onClose}
            aria-label="Sluiten"
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
                  {tab === "standard" ? "Standaard" : "Aangepast"}
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
                      window.alert("Dit onderdeel is al toegevoegd");
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
                  <span className="flex-1">{preset.name}</span>
                  {alreadyAdded ? (
                    <span className="text-sm font-bold text-slate-400">
                      Toegevoegd
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
                  Naam onderdeel
                </label>
                <input
                  id="module-name"
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Bijv. Kerntemperatuur soep"
                  maxLength={40}
                  className="min-h-[64px] w-full rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-4 text-xl font-bold text-slate-900 outline-none transition-colors focus:border-blue-500 focus:border-b-blue-700"
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
                Type onderdeel
              </span>
              <div className="grid grid-cols-1 gap-3">
                {[
                  ["number", "Getal/Temperatuur"],
                  ["boolean", "Ja/Nee"],
                  ["list", "Lijst"],
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

            {moduleType === "number" ? (
              <NumberInputsBuilder
                numberInputs={numberInputs}
                onAdd={handleAddNumberInput}
                onRemove={handleRemoveNumberInput}
                onUpdate={handleUpdateNumberInput}
              />
            ) : null}

            {moduleType === "boolean" ? (
              <BooleanInputsBuilder
                booleanInputs={booleanInputs}
                onAdd={handleAddBooleanInput}
                onRemove={handleRemoveBooleanInput}
                onUpdate={handleUpdateBooleanInput}
              />
            ) : null}

            {moduleType === "list" ? (
              <ListBuilder
                listItems={listItems}
                hasRemark={listHasRemark}
                onAdd={handleAddListItem}
                onRemove={handleRemoveListItem}
                onUpdate={handleUpdateListItem}
                onToggleRemark={() => setListHasRemark((current) => !current)}
              />
            ) : null}

            <div className="flex flex-col gap-3 pt-2">
              <SupercellButton
                type="submit"
                size="lg"
                variant="success"
                disabled={!isValid || isSaving}
                className="min-h-[64px] w-full text-xl normal-case"
              >
                {isSaving
                  ? "Bezig met opslaan..."
                  : isEditing
                    ? "Wijzigingen opslaan"
                    : "Opslaan"}
              </SupercellButton>
              <SupercellButton
                type="button"
                size="lg"
                variant="neutral"
                onClick={onClose}
                className="min-h-[64px] w-full text-lg normal-case"
              >
                Annuleren
              </SupercellButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

type NumberInputsBuilderProps = {
  numberInputs: NumberInputConfig[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<NumberInputConfig>) => void;
};

function NumberInputsBuilder({
  numberInputs,
  onAdd,
  onRemove,
  onUpdate,
}: NumberInputsBuilderProps) {
  return (
    <section className="flex flex-col gap-4">
      <SupercellButton
        type="button"
        size="sm"
        variant="primary"
        onClick={onAdd}
        className="self-start text-lg normal-case"
      >
        + Getalveld toevoegen
      </SupercellButton>

      <div className="flex flex-col gap-4">
        {numberInputs.map((input) => {
          const stepLabel = formatStep(input.step);

          return (
            <div
              key={input.id}
              className="relative rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-slate-50 p-5"
            >
              <div className="flex items-start gap-3">
                <label className="flex flex-1 flex-col gap-2">
                  <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    Naam veld
                  </span>
                  <input
                    type="text"
                    value={input.name}
                    onChange={(e) =>
                      onUpdate(input.id, { name: e.target.value })
                    }
                    className="min-h-[64px] w-full rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-4 text-xl font-black text-slate-900 outline-none focus:border-blue-500 focus:border-b-blue-700"
                  />
                </label>

                <SupercellButton
                  type="button"
                  size="icon"
                  variant="danger"
                  onClick={() => onRemove(input.id)}
                  aria-label={`${input.name} verwijderen`}
                  className="mt-7 flex h-16 w-16 shrink-0 items-center justify-center"
                >
                  <Trash2 className="h-6 w-6" strokeWidth={2.5} aria-hidden />
                </SupercellButton>
              </div>

              <div className="mt-5 rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white p-4">
                <p className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">
                  Voorbeeld
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex min-h-[72px] flex-1 items-center justify-center rounded-xl border-2 border-slate-300 border-b-4 bg-slate-100 px-3 text-2xl font-black tabular-nums text-slate-700">
                    - {stepLabel}
                  </div>
                  <div className="min-w-0 flex-[1.4] text-center">
                    <p className="truncate text-5xl font-black tabular-nums text-blue-600">
                      {input.defaultValue}
                      {input.unit}
                    </p>
                  </div>
                  <div className="flex min-h-[72px] flex-1 items-center justify-center rounded-xl border-2 border-slate-300 border-b-4 bg-slate-100 px-3 text-2xl font-black tabular-nums text-slate-700">
                    + {stepLabel}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <label className="flex min-w-0 flex-col gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    Stapgrootte
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={input.step}
                    onChange={(e) =>
                      onUpdate(input.id, {
                        step: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="min-h-[56px] w-full rounded-xl border-2 border-b-4 border-slate-300 bg-white px-3 text-base font-black text-slate-900 outline-none focus:border-blue-500 focus:border-b-blue-700"
                  />
                </label>

                <label className="flex min-w-0 flex-col gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    Standaardwaarde
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={input.defaultValue}
                    onChange={(e) =>
                      onUpdate(input.id, {
                        defaultValue: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="min-h-[56px] w-full rounded-xl border-2 border-b-4 border-slate-300 bg-white px-3 text-base font-black text-slate-900 outline-none focus:border-blue-500 focus:border-b-blue-700"
                  />
                </label>

                <label className="flex min-w-0 flex-col gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    Eenheid
                  </span>
                  <input
                    type="text"
                    value={input.unit}
                    onChange={(e) =>
                      onUpdate(input.id, { unit: e.target.value })
                    }
                    className="min-h-[56px] w-full rounded-xl border-2 border-b-4 border-slate-300 bg-white px-3 text-base font-black text-slate-900 outline-none focus:border-blue-500 focus:border-b-blue-700"
                  />
                </label>
              </div>

              <SupercellButton
                type="button"
                size="sm"
                variant={input.hasRemark ? "danger" : "primary"}
                onClick={() =>
                  onUpdate(input.id, { hasRemark: !input.hasRemark })
                }
                className="mt-5 text-left text-lg normal-case"
              >
                {input.hasRemark
                  ? "- Opmerking verwijderen"
                  : "+ Opmerking toevoegen"}
              </SupercellButton>

              {input.hasRemark ? (
                <textarea
                  disabled
                  rows={3}
                  placeholder="Opmerking"
                  className="mt-3 w-full resize-none rounded-2xl border-2 border-slate-300 border-b-4 bg-white px-4 py-4 text-lg font-semibold text-slate-400"
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

type BooleanInputsBuilderProps = {
  booleanInputs: BooleanInputConfig[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<BooleanInputConfig>) => void;
};

function BooleanInputsBuilder({
  booleanInputs,
  onAdd,
  onRemove,
  onUpdate,
}: BooleanInputsBuilderProps) {
  return (
    <section className="flex flex-col gap-4">
      <SupercellButton
        type="button"
        size="sm"
        variant="primary"
        onClick={onAdd}
        className="self-start text-lg normal-case"
      >
        + Controle toevoegen
      </SupercellButton>

      <div className="flex flex-col gap-4">
        {booleanInputs.map((input) => (
          <div
            key={input.id}
            className="rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-slate-50 p-5"
          >
            <div className="flex items-start gap-3">
              <label className="flex flex-1 flex-col gap-2">
                <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Naam controle
                </span>
                <input
                  type="text"
                  value={input.name}
                  onChange={(event) =>
                    onUpdate(input.id, { name: event.target.value })
                  }
                  placeholder="Bijv. Frituurolie helder?"
                  className="min-h-[64px] w-full rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-4 text-xl font-black text-slate-900 outline-none focus:border-blue-500 focus:border-b-blue-700"
                />
              </label>

              <SupercellButton
                type="button"
                size="icon"
                variant="danger"
                onClick={() => onRemove(input.id)}
                aria-label={`${input.name} verwijderen`}
                className="mt-7 flex h-16 w-16 shrink-0 items-center justify-center"
              >
                <Trash2 className="h-6 w-6" strokeWidth={2.5} aria-hidden />
              </SupercellButton>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="flex min-h-[72px] items-center justify-center rounded-2xl border-2 border-emerald-700 border-b-4 bg-emerald-500 px-4 text-xl font-black text-white">
                Goedgekeurd
              </div>
              <div className="flex min-h-[72px] items-center justify-center rounded-2xl border-2 border-red-700 border-b-4 bg-red-500 px-4 text-xl font-black text-white">
                Afgekeurd
              </div>
            </div>

            <SupercellButton
              type="button"
              size="sm"
              variant={input.hasRemark ? "danger" : "primary"}
              onClick={() =>
                onUpdate(input.id, { hasRemark: !input.hasRemark })
              }
              className="mt-5 text-left text-lg normal-case"
            >
              {input.hasRemark
                ? "- Opmerking verwijderen"
                : "+ Opmerking toevoegen"}
            </SupercellButton>
          </div>
        ))}
      </div>
    </section>
  );
}

type ListBuilderProps = {
  listItems: ListItemConfig[];
  hasRemark: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, name: string) => void;
  onToggleRemark: () => void;
};

function ListBuilder({
  listItems,
  hasRemark,
  onAdd,
  onRemove,
  onUpdate,
  onToggleRemark,
}: ListBuilderProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-slate-50 p-5">
      <SupercellButton
        type="button"
        size="sm"
        variant="primary"
        onClick={onAdd}
        className="self-start text-lg normal-case"
      >
        + Item toevoegen
      </SupercellButton>

      <div className="flex flex-col gap-3">
        {listItems.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <input
              type="text"
              value={item.name}
              onChange={(event) => onUpdate(item.id, event.target.value)}
              placeholder="Bijv. Afzuigkap reinigen"
              className="min-h-[64px] min-w-0 flex-1 rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-4 text-lg font-black text-slate-900 outline-none focus:border-blue-500 focus:border-b-blue-700"
            />
            <SupercellButton
              type="button"
              size="icon"
              variant="danger"
              onClick={() => onRemove(item.id)}
              aria-label={`${item.name} verwijderen`}
              className="flex h-16 w-16 shrink-0 items-center justify-center"
            >
              <Trash2 className="h-6 w-6" strokeWidth={2.5} aria-hidden />
            </SupercellButton>
          </div>
        ))}
      </div>

      <SupercellButton
        type="button"
        size="sm"
        variant={hasRemark ? "danger" : "primary"}
        onClick={onToggleRemark}
        className="text-left text-lg normal-case"
      >
        {hasRemark ? "- Opmerking verwijderen" : "+ Opmerking toevoegen"}
      </SupercellButton>
    </section>
  );
}
