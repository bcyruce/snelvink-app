"use client";

import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import SupercellButton from "@/components/SupercellButton";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { getModuleIcon } from "@/lib/taskModules";
import { ArrowLeft, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { createElement, useCallback, useEffect, useState } from "react";

type ModuleType = "temperature" | "boolean" | "list";

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
  acceptedReasons?: string[];
  rejectedReasons?: string[];
};

type ListItemConfig = {
  id: string;
  name: string;
};

type ListSettings = {
  items: ListItemConfig[];
  hasRemark: boolean;
  hasPhoto: boolean;
};

type CustomModule = {
  id: string;
  name: string;
  icon: string;
  moduleType: ModuleType;
  settings: NumberInputConfig[] | BooleanInputConfig[] | ListSettings;
};

type RowItem = {
  id: string;
  name: string;
};

function normalizeModuleType(value: unknown): ModuleType {
  if (value === "boolean") return "boolean";
  if (value === "list") return "list";
  return "temperature";
}

function parseNumber(settings: unknown): NumberInputConfig[] {
  if (Array.isArray(settings)) return settings as NumberInputConfig[];
  if (settings && typeof settings === "object") {
    const inputs = (settings as { inputs?: unknown }).inputs;
    if (Array.isArray(inputs)) return inputs as NumberInputConfig[];
  }
  return [];
}

function parseBoolean(settings: unknown): BooleanInputConfig[] {
  if (Array.isArray(settings)) return settings as BooleanInputConfig[];
  if (settings && typeof settings === "object") {
    const inputs = (settings as { inputs?: unknown }).inputs;
    if (Array.isArray(inputs)) return inputs as BooleanInputConfig[];
  }
  return [];
}

function parseList(settings: unknown): ListSettings {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return { items: [], hasRemark: false, hasPhoto: false };
  }
  const src = settings as Partial<ListSettings>;
  const parsedItems = Array.isArray(src.items) ? src.items : [];
  const ensuredItems = parsedItems.some((item) => item.name === "其他" || item.name === "Anders")
    ? parsedItems
    : [...parsedItems, { id: "list-other", name: "其他" }];
  return {
    items: ensuredItems,
    hasRemark: src.hasRemark === true,
    hasPhoto: src.hasPhoto === true,
  };
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getAddLabel(moduleType: ModuleType): string {
  if (moduleType === "temperature") return "Veld toevoegen";
  if (moduleType === "boolean") return "Controle toevoegen";
  return "Item toevoegen";
}

function getEmptyLabel(moduleType: ModuleType): string {
  if (moduleType === "temperature") return "Nog geen velden";
  if (moduleType === "boolean") return "Nog geen controles";
  return "Nog geen items";
}

function getSeedName(moduleType: ModuleType, index: number): string {
  if (moduleType === "temperature") return `Veld ${index}`;
  if (moduleType === "boolean") return `Controle ${index}`;
  return `Item ${index}`;
}

function parseReasonInput(raw: string, fallback: string[]): string[] {
  const values = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  const withOther = values.includes("其他") || values.includes("Anders")
    ? values
    : [...values, "其他"];
  return withOther.length > 0 ? withOther : fallback;
}

function CustomModuleManageContent() {
  const router = useRouter();
  const params = useParams<{ customId: string }>();
  const customId = params?.customId ?? "";
  const { user, isLoading } = useUser();

  const [module, setModule] = useState<CustomModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, router, user]);

  const loadModule = useCallback(async () => {
    if (!customId) return;
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("custom_modules")
      .select("id, name, icon, module_type, settings")
      .eq("id", customId)
      .maybeSingle();

    if (error) {
      setErrorMessage("Onderdeel laden mislukt.");
      setLoading(false);
      return;
    }

    if (!data) {
      setModule(null);
      setLoading(false);
      return;
    }

    const moduleType = normalizeModuleType(data.module_type);
    const settings =
      moduleType === "boolean"
        ? parseBoolean(data.settings)
        : moduleType === "list"
          ? parseList(data.settings)
          : parseNumber(data.settings);

    setModule({
      id: String(data.id),
      name: data.name ?? "Aangepast onderdeel",
      icon: data.icon ?? "thermometer",
      moduleType,
      settings,
    });
    setLoading(false);
  }, [customId]);

  useEffect(() => {
    if (user) void loadModule();
  }, [loadModule, user]);

  const saveSettings = useCallback(
    async (nextSettings: NumberInputConfig[] | BooleanInputConfig[] | ListSettings) => {
      if (!module) return false;
      setSaving(true);
      setErrorMessage(null);

      const payload =
        module.moduleType === "list" ? nextSettings : { inputs: nextSettings };

      const { error } = await supabase
        .from("custom_modules")
        .update({ settings: payload })
        .eq("id", module.id);

      setSaving(false);
      if (error) {
        setErrorMessage("Opslaan mislukt.");
        return false;
      }

      setModule((prev) => (prev ? { ...prev, settings: nextSettings } : prev));
      return true;
    },
    [module],
  );

  const handleEditRow = useCallback(
    async (row: RowItem) => {
      if (!module) return;
      const input = window.prompt("Nieuwe naam", row.name);
      if (!input) return;
      const name = input.trim();
      if (!name || name === row.name) return;

      if (module.moduleType === "list") {
        const current = module.settings as ListSettings;
        const next: ListSettings = {
          ...current,
          items: current.items.map((item) =>
            item.id === row.id ? { ...item, name } : item,
          ),
        };
        await saveSettings(next);
        return;
      }

      if (module.moduleType === "temperature") {
        const current = module.settings as NumberInputConfig[];
        const target = current.find((item) => item.id === row.id);
        if (!target) return;
        const defaultRaw = window.prompt("Standaardwaarde", String(target.defaultValue));
        if (defaultRaw === null) return;
        const unitRaw = window.prompt("Eenheid", target.unit);
        if (unitRaw === null) return;
        const stepRaw = window.prompt("Stapgrootte (+/-)", String(target.step));
        if (stepRaw === null) return;

        const defaultValue = Number.parseFloat(defaultRaw);
        const step = Number.parseFloat(stepRaw);
        const next = current.map((item) =>
          item.id === row.id
            ? {
                ...item,
                name,
                defaultValue: Number.isFinite(defaultValue) ? defaultValue : item.defaultValue,
                unit: unitRaw.trim() || item.unit,
                step: Number.isFinite(step) && step > 0 ? step : item.step,
              }
            : item,
        );
        await saveSettings(next);
        return;
      }

      const current = module.settings as BooleanInputConfig[];
      const target = current.find((item) => item.id === row.id);
      if (!target) return;
      const acceptedRaw = window.prompt(
        "Acceptatie-redenen (komma gescheiden, incl. 其他/Anders)",
        (target.acceptedReasons ?? ["Goedgekeurd", "其他"]).join(", "),
      );
      if (acceptedRaw === null) return;
      const rejectedRaw = window.prompt(
        "Afkeur-redenen (komma gescheiden, incl. 其他/Anders)",
        (target.rejectedReasons ?? ["Afgekeurd", "其他"]).join(", "),
      );
      if (rejectedRaw === null) return;

      const next = current.map((item) =>
        item.id === row.id
          ? {
              ...item,
              name,
              acceptedReasons: parseReasonInput(acceptedRaw, ["Goedgekeurd", "其他"]),
              rejectedReasons: parseReasonInput(rejectedRaw, ["Afgekeurd", "其他"]),
            }
          : item,
      );
      await saveSettings(next);
    },
    [module, saveSettings],
  );

  const handleDeleteRow = useCallback(
    async (row: RowItem) => {
      if (!module) return;
      const ok = window.confirm(`"${row.name}" verwijderen?`);
      if (!ok) return;

      if (module.moduleType === "list") {
        const current = module.settings as ListSettings;
        const next: ListSettings = {
          ...current,
          items: current.items.filter((item) => item.id !== row.id),
        };
        await saveSettings(next);
        return;
      }

      const current = module.settings as Array<NumberInputConfig | BooleanInputConfig>;
      const next = current.filter((item) => item.id !== row.id);
      await saveSettings(next as NumberInputConfig[] | BooleanInputConfig[]);
    },
    [module, saveSettings],
  );

  const handleAddRow = useCallback(async () => {
    if (!module) return;

    if (module.moduleType === "list") {
      const current = module.settings as ListSettings;
      const next: ListSettings = {
        ...current,
        items: [...current.items, { id: createId("list"), name: getSeedName("list", current.items.length + 1) }],
      };
      await saveSettings(next);
      return;
    }

    if (module.moduleType === "boolean") {
      const current = module.settings as BooleanInputConfig[];
      const next: BooleanInputConfig[] = [
        ...current,
        {
          id: createId("boolean"),
          name: getSeedName("boolean", current.length + 1),
          hasRemark: false,
          acceptedReasons: ["Goedgekeurd", "其他"],
          rejectedReasons: ["Afgekeurd", "其他"],
        },
      ];
      await saveSettings(next);
      return;
    }

    const current = module.settings as NumberInputConfig[];
    const next: NumberInputConfig[] = [
      ...current,
      {
        id: createId("number"),
        name: getSeedName("temperature", current.length + 1),
        step: 1,
        defaultValue: 0,
        unit: "C",
        hasRemark: false,
      },
    ];
    await saveSettings(next);
  }, [module, saveSettings]);

  const handleMenuNav = (tab: MenuTab) => {
    if (tab === "registreren") router.push("/registreren");
    else if (tab === "taken") router.push("/");
    else router.push(`/?tab=${tab}`);
  };

  if (isLoading || !user || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-semibold text-slate-500">SnelVink laden...</p>
      </div>
    );
  }

  const rows: RowItem[] = module
    ? module.moduleType === "list"
      ? (module.settings as ListSettings).items
      : (module.settings as Array<NumberInputConfig | BooleanInputConfig>).map((item) => ({
          id: item.id,
          name: item.name,
        }))
    : [];

  return (
    <>
      <VerifyEmailBanner />
      <section className="px-6 pb-24 pt-20 sm:px-10 sm:pb-28 sm:pt-28">
        <SupercellButton
          type="button"
          size="lg"
          variant="neutral"
          onClick={() => router.push("/")}
          className="mb-8 flex h-20 w-full items-center justify-center gap-3 text-2xl"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          Terug
        </SupercellButton>

        {module ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
                {createElement(getModuleIcon(module.icon), {
                  className: "h-7 w-7",
                  strokeWidth: 2.25,
                  "aria-hidden": true,
                })}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Beheer aangepast onderdeel
                </p>
                <h1 className="truncate text-3xl font-black tracking-tight text-slate-900">
                  {module.name}
                </h1>
              </div>
            </div>

            {errorMessage ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              Deze pagina is alleen voor beheer. Registreren doe je via <strong>Registreren</strong>.
            </p>

            {rows.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex min-h-[80px] items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm"
                  >
                    <span className="flex-1 truncate text-xl font-bold text-slate-900">
                      {row.name}
                    </span>
                    <SupercellButton
                      size="icon"
                      variant="neutral"
                      onClick={() => void handleEditRow(row)}
                      aria-label={`Hernoem ${row.name}`}
                      className="flex h-16 w-16 items-center justify-center p-2"
                    >
                      <Pencil className="h-5 w-5" aria-hidden />
                    </SupercellButton>
                    <SupercellButton
                      size="icon"
                      variant="danger"
                      onClick={() => void handleDeleteRow(row)}
                      aria-label={`Verwijder ${row.name}`}
                      className="flex h-16 w-16 items-center justify-center p-2"
                    >
                      <Trash2 className="h-5 w-5" aria-hidden />
                    </SupercellButton>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-3xl border border-slate-100 bg-white px-6 py-10 text-center shadow-sm">
                <p className="text-xl font-bold text-slate-900">{getEmptyLabel(module.moduleType)}</p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Voeg hieronder je eerste item toe.
                </p>
              </div>
            )}

            <SupercellButton
              size="lg"
              variant="neutral"
              disabled={saving}
              onClick={() => void handleAddRow()}
              className="flex min-h-[80px] w-full items-center justify-center gap-3 border-2 border-dashed border-slate-200 text-xl normal-case"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
              {getAddLabel(module.moduleType)}
            </SupercellButton>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center justify-center gap-5 rounded-3xl border border-slate-100 bg-white px-6 py-16 text-center shadow-sm">
            <Wrench className="h-16 w-16 text-slate-400" strokeWidth={2} aria-hidden />
            <p className="text-xl font-bold text-slate-900">Onderdeel niet gevonden</p>
          </div>
        )}
      </section>

      <FloatingMenu active="taken" onChange={handleMenuNav} />
    </>
  );
}

export default function CustomModuleManagePage() {
  return (
    <UserProvider>
      <CustomModuleManageContent />
    </UserProvider>
  );
}
