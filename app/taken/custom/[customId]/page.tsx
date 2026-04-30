"use client";

import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import SupercellButton from "@/components/SupercellButton";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import { getModuleIcon } from "@/lib/taskModules";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { createElement, useCallback, useEffect, useState } from "react";

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
  hasPhoto: boolean;
};

type CustomModuleType = "temperature" | "boolean" | "list";

type CustomModule = {
  id: string;
  name: string;
  icon: string;
  moduleType: CustomModuleType;
  hasPhoto: boolean;
  settings: NumberInputConfig[] | BooleanInputConfig[] | ListSettings;
};

function isNumberInputConfig(value: unknown): value is NumberInputConfig {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<NumberInputConfig>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.step === "number" &&
    typeof item.defaultValue === "number" &&
    typeof item.unit === "string" &&
    typeof item.hasRemark === "boolean"
  );
}

function parseSettings(settings: unknown): NumberInputConfig[] {
  if (Array.isArray(settings)) return settings.filter(isNumberInputConfig);
  if (settings && typeof settings === "object") {
    const inputs = (settings as { inputs?: unknown }).inputs;
    if (Array.isArray(inputs)) return inputs.filter(isNumberInputConfig);
  }
  return [];
}

function isBooleanInputConfig(value: unknown): value is BooleanInputConfig {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<BooleanInputConfig>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.hasRemark === "boolean"
  );
}

function parseBooleanSettings(settings: unknown): BooleanInputConfig[] {
  if (Array.isArray(settings)) return settings.filter(isBooleanInputConfig);
  if (settings && typeof settings === "object") {
    const inputs = (settings as { inputs?: unknown }).inputs;
    if (Array.isArray(inputs)) return inputs.filter(isBooleanInputConfig);
  }
  return [];
}

function parseListSettings(settings: unknown): ListSettings {
  const fallback: ListSettings = {
    items: [],
    hasRemark: false,
    hasPhoto: false,
  };
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return fallback;
  }
  const maybe = settings as Partial<ListSettings>;
  return {
    items: Array.isArray(maybe.items)
      ? maybe.items.filter(
          (item): item is ListItemConfig =>
            !!item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.name === "string",
        )
      : [],
    hasRemark: maybe.hasRemark === true,
    hasPhoto: maybe.hasPhoto === true,
  };
}

function parseHasPhoto(settings: unknown): boolean {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return false;
  }
  return (settings as { hasPhoto?: unknown }).hasPhoto === true;
}

function normalizeModuleType(value: unknown): CustomModuleType {
  if (value === "boolean") return "boolean";
  if (value === "list") return "list";
  return "temperature";
}

function CustomModuleManageContent() {
  const router = useRouter();
  const params = useParams<{ customId: string }>();
  const customId = params?.customId ?? "";
  const { user, profile, isLoading } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;

  const [module, setModule] = useState<CustomModule | null>(null);
  const [isModuleLoading, setIsModuleLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load custom module
  useEffect(() => {
    if (!user) return;
    if (!customId) {
      setModule(null);
      setErrorMessage("Onderdeel niet gevonden.");
      setIsModuleLoading(false);
      return;
    }

    let ignore = false;

    async function loadCustomModule() {
      setIsModuleLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("custom_modules")
        .select("id, name, icon, module_type, settings")
        .eq("id", customId)
        .maybeSingle();

      if (ignore) return;

      if (error) {
        console.error("Custom module laden mislukt:", error);
        setErrorMessage("Onderdeel laden mislukt. Probeer opnieuw.");
        setModule(null);
        setIsModuleLoading(false);
        return;
      }

      if (!data) {
        setModule(null);
        setErrorMessage("Onderdeel niet gevonden.");
        setIsModuleLoading(false);
        return;
      }

      const moduleType = normalizeModuleType(data.module_type);
      const settings =
        moduleType === "boolean"
          ? parseBooleanSettings(data.settings)
          : moduleType === "list"
            ? parseListSettings(data.settings)
            : parseSettings(data.settings);
      setModule({
        id: String(data.id),
        name: data.name ?? "Aangepast onderdeel",
        icon: data.icon ?? "thermometer",
        moduleType,
        hasPhoto: parseHasPhoto(data.settings),
        settings,
      });
      setIsModuleLoading(false);
    }

    void loadCustomModule();

    return () => {
      ignore = true;
    };
  }, [customId, user]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  // CRUD operations for items
  const handleAddItem = useCallback(async () => {
    if (!module || !restaurantId) return;

    const input = window.prompt("Naam van het nieuwe item");
    if (!input) return;
    const name = input.trim();
    if (!name) return;

    const newItem = {
      id: crypto.randomUUID(),
      name,
      ...(module.moduleType === "temperature" && {
        step: 1,
        defaultValue: 0,
        unit: "°C",
        hasRemark: true,
      }),
      ...(module.moduleType === "boolean" && {
        hasRemark: true,
      }),
    };

    let newSettings: unknown;
    if (module.moduleType === "list") {
      const listSettings = module.settings as ListSettings;
      newSettings = {
        ...listSettings,
        items: [...listSettings.items, { id: newItem.id, name: newItem.name }],
      };
    } else {
      const arraySettings = module.settings as (NumberInputConfig | BooleanInputConfig)[];
      newSettings = { inputs: [...arraySettings, newItem], hasPhoto: module.hasPhoto };
    }

    const { error } = await supabase
      .from("custom_modules")
      .update({ settings: newSettings })
      .eq("id", module.id);

    if (error) {
      console.error("Item toevoegen mislukt:", error);
      setErrorMessage("Item toevoegen mislukt.");
      return;
    }

    // Update local state
    if (module.moduleType === "list") {
      setModule({
        ...module,
        settings: newSettings as ListSettings,
      });
    } else {
      setModule({
        ...module,
        settings: (newSettings as { inputs: (NumberInputConfig | BooleanInputConfig)[] }).inputs,
      });
    }
  }, [module, restaurantId]);

  const handleRenameItem = useCallback(async (itemId: string, currentName: string) => {
    if (!module || !restaurantId) return;

    const proposed = window.prompt("Nieuwe naam voor het item", currentName);
    if (!proposed) return;
    const name = proposed.trim();
    if (!name || name === currentName) return;

    let newSettings: unknown;
    if (module.moduleType === "list") {
      const listSettings = module.settings as ListSettings;
      newSettings = {
        ...listSettings,
        items: listSettings.items.map((item) =>
          item.id === itemId ? { ...item, name } : item,
        ),
      };
    } else {
      const arraySettings = module.settings as (NumberInputConfig | BooleanInputConfig)[];
      newSettings = {
        inputs: arraySettings.map((item) =>
          item.id === itemId ? { ...item, name } : item,
        ),
        hasPhoto: module.hasPhoto,
      };
    }

    const { error } = await supabase
      .from("custom_modules")
      .update({ settings: newSettings })
      .eq("id", module.id);

    if (error) {
      console.error("Hernoemen mislukt:", error);
      setErrorMessage("Hernoemen mislukt.");
      return;
    }

    // Update local state
    if (module.moduleType === "list") {
      setModule({
        ...module,
        settings: newSettings as ListSettings,
      });
    } else {
      setModule({
        ...module,
        settings: (newSettings as { inputs: (NumberInputConfig | BooleanInputConfig)[] }).inputs,
      });
    }
  }, [module, restaurantId]);

  const handleDeleteItem = useCallback(async (itemId: string, itemName: string) => {
    if (!module || !restaurantId) return;

    const ok = window.confirm(`"${itemName}" verwijderen?`);
    if (!ok) return;

    let newSettings: unknown;
    if (module.moduleType === "list") {
      const listSettings = module.settings as ListSettings;
      newSettings = {
        ...listSettings,
        items: listSettings.items.filter((item) => item.id !== itemId),
      };
    } else {
      const arraySettings = module.settings as (NumberInputConfig | BooleanInputConfig)[];
      newSettings = {
        inputs: arraySettings.filter((item) => item.id !== itemId),
        hasPhoto: module.hasPhoto,
      };
    }

    const { error } = await supabase
      .from("custom_modules")
      .update({ settings: newSettings })
      .eq("id", module.id);

    if (error) {
      console.error("Verwijderen mislukt:", error);
      setErrorMessage("Verwijderen mislukt.");
      return;
    }

    // Update local state
    if (module.moduleType === "list") {
      setModule({
        ...module,
        settings: newSettings as ListSettings,
      });
    } else {
      setModule({
        ...module,
        settings: (newSettings as { inputs: (NumberInputConfig | BooleanInputConfig)[] }).inputs,
      });
    }
  }, [module, restaurantId]);

  const handleMenuNav = (tab: MenuTab) => {
    if (tab === "registreren") router.push("/registreren");
    else if (tab === "taken") router.push("/");
    else router.push(`/?tab=${tab}`);
  };

  if (isLoading || !user || isModuleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-semibold text-slate-500">
          SnelVink laden...
        </p>
      </div>
    );
  }

  // Get items to display based on module type
  const getItems = (): { id: string; name: string; description?: string }[] => {
    if (!module) return [];
    if (module.moduleType === "list") {
      const listSettings = module.settings as ListSettings;
      return listSettings.items;
    }
    if (module.moduleType === "temperature") {
      const numberSettings = module.settings as NumberInputConfig[];
      return numberSettings.map((s) => ({
        id: s.id,
        name: s.name,
        description: `${s.defaultValue} ${s.unit}, stap: ${s.step}`,
      }));
    }
    const booleanSettings = module.settings as BooleanInputConfig[];
    return booleanSettings.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.hasRemark ? "Met opmerking" : "Zonder opmerking",
    }));
  };

  const items = getItems();
  const itemLabel = module?.moduleType === "temperature" ? "Apparaat" : module?.moduleType === "boolean" ? "Product" : "Taak";

  return (
    <>
      <VerifyEmailBanner />
      <section className="px-6 pb-36 pt-8 sm:px-10 sm:pb-40 sm:pt-12">
        <SupercellButton
          variant="neutral"
          onClick={() => router.push("/")}
          size="lg"
          className="mb-6 flex min-h-[72px] w-full items-center justify-center gap-3 text-2xl"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          Terug
        </SupercellButton>

        {module ? (
          <div className="mt-4 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm ring-1 ring-slate-100">
                {createElement(getModuleIcon(module.icon), {
                  className: "h-8 w-8",
                  strokeWidth: 2.5,
                  "aria-hidden": true,
                })}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Beheer
                </p>
                <h1 className="truncate text-3xl font-black tracking-tight text-slate-900">
                  {module.name}
                </h1>
              </div>
            </div>

            {errorMessage ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-base font-bold text-red-700">
                {errorMessage}
              </p>
            ) : null}

            {/* Items List */}
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                {module.moduleType === "temperature" ? "Apparaten" : module.moduleType === "boolean" ? "Producten" : "Taken"}
              </h2>

              {items.length === 0 ? (
                <p className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-center text-slate-500 shadow-sm">
                  Nog geen items toegevoegd.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {items.map((item) => (
                    <li key={item.id}>
                      <div className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                        <div className="flex flex-1 flex-col gap-1">
                          <span className="text-xl font-bold text-slate-900 truncate">
                            {item.name}
                          </span>
                          {item.description ? (
                            <span className="text-sm font-medium text-slate-500">
                              {item.description}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 border-l border-slate-100 pl-3">
                          <button
                            type="button"
                            onClick={() => handleRenameItem(item.id, item.name)}
                            aria-label={`Hernoem ${item.name}`}
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 active:bg-slate-200"
                          >
                            <Pencil className="h-5 w-5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            aria-label={`Verwijder ${item.name}`}
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-red-500 transition-colors hover:bg-red-50 active:bg-red-100"
                          >
                            <Trash2 className="h-5 w-5" aria-hidden />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <SupercellButton
                size="lg"
                variant="neutral"
                onClick={handleAddItem}
                disabled={!restaurantId}
                className="flex min-h-[80px] w-full items-center justify-center gap-3 border-2 border-dashed border-slate-200 text-xl normal-case"
              >
                <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
                {itemLabel} toevoegen
              </SupercellButton>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center justify-center gap-5 rounded-3xl border border-slate-100 bg-white px-6 py-16 text-center shadow-sm">
            <Wrench
              className="h-16 w-16 text-slate-400"
              strokeWidth={2}
              aria-hidden
            />
            <p className="text-xl font-bold text-slate-900">
              Onderdeel niet gevonden
            </p>
            <p className="max-w-sm text-base text-slate-500">
              Dit onderdeel bestaat niet meer of is niet beschikbaar.
            </p>
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
