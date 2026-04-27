"use client";

import BottomNav, { type BottomNavTab } from "@/components/BottomNav";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import { getModuleIcon } from "@/lib/taskModules";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Check, Wrench } from "lucide-react";
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

type CustomModule = {
  id: string;
  name: string;
  icon: string;
  settings: NumberInputConfig[];
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
  return Array.isArray(settings) ? settings.filter(isNumberInputConfig) : [];
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function CustomModuleContent() {
  const router = useRouter();
  const params = useParams<{ customId: string }>();
  const customId = params?.customId ?? "";
  const { user, profile, isLoading } = useUser();

  const [module, setModule] = useState<CustomModule | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>(
    {},
  );
  const [isModuleLoading, setIsModuleLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
        .select("id, name, icon, settings")
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

      const settings = parseSettings(data.settings);
      setModule({
        id: String(data.id),
        name: data.name ?? "Aangepast onderdeel",
        icon: data.icon ?? "thermometer",
        settings,
      });
      setValues(
        Object.fromEntries(
          settings.map((setting) => [setting.id, setting.defaultValue]),
        ),
      );
      setEnabledFields(
        Object.fromEntries(settings.map((setting) => [setting.id, true])),
      );
      setRemarks(
        Object.fromEntries(
          settings
            .filter((setting) => setting.hasRemark)
            .map((setting) => [setting.id, ""]),
        ),
      );
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

  const updateValue = useCallback(
    (field: NumberInputConfig, direction: "up" | "down") => {
      setValues((current) => {
        const currentValue = current[field.id] ?? field.defaultValue;
        const delta = direction === "up" ? field.step : -field.step;
        return {
          ...current,
          [field.id]: roundTenth(currentValue + delta),
        };
      });
    },
    [],
  );

  const setManualValue = useCallback(
    (field: NumberInputConfig, rawValue: string) => {
      const parsed = Number.parseFloat(rawValue);
      setValues((current) => ({
        ...current,
        [field.id]: Number.isFinite(parsed) ? parsed : field.defaultValue,
      }));
    },
    [],
  );

  const toggleField = useCallback((fieldId: string) => {
    setEnabledFields((current) => ({
      ...current,
      [fieldId]: !(current[fieldId] ?? true),
    }));
  }, []);

  const toggleAllFields = useCallback((checked: boolean) => {
    setEnabledFields((current) =>
      Object.fromEntries(
        (module?.settings.map((setting) => setting.id) ?? Object.keys(current)).map(
          (fieldId) => [fieldId, checked],
        ),
      ),
    );
  }, [module?.settings]);

  const handleSave = useCallback(async () => {
    if (!module || !user || isSaving) return;
    if (!profile?.restaurant_id) {
      setErrorMessage("Geen restaurant gekoppeld aan je account.");
      return;
    }

    const selectedSettings = module.settings.filter(
      (setting) => enabledFields[setting.id] ?? true,
    );

    if (selectedSettings.length === 0) {
      setErrorMessage("Vink minstens één veld aan om op te slaan.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const logData = {
      module_name: module.name,
      values: selectedSettings.map((setting) => ({
        field_id: setting.id,
        name: setting.name,
        value: values[setting.id] ?? setting.defaultValue,
        unit: setting.unit,
        remark: setting.hasRemark ? remarks[setting.id] ?? "" : null,
      })),
    };

    const { error } = await supabase.from("custom_module_logs").insert({
      restaurant_id: profile.restaurant_id,
      user_id: user.id,
      module_id: module.id,
      custom_module_id: module.id,
      log_data: logData,
    });

    if (error) {
      console.error("Custom module log opslaan mislukt:", error);
      setErrorMessage(`Opslaan mislukt: ${error.message}`);
      setIsSaving(false);
      return;
    }

    setToastMessage("Registratie opgeslagen");
    window.setTimeout(() => {
      router.push("/taken");
    }, 650);
  }, [
    module,
    profile?.restaurant_id,
    user,
    values,
    remarks,
    enabledFields,
    isSaving,
    router,
  ]);

  if (isLoading || !user || isModuleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-semibold text-slate-500">
          SnelVink laden...
        </p>
      </div>
    );
  }

  const handleBottomNav = (tab: BottomNavTab) => {
    if (tab === "tasks") router.push("/");
    else router.push(`/?tab=${tab}`);
  };

  const hasFields = (module?.settings.length ?? 0) > 0;
  const selectedCount = module
    ? module.settings.filter((setting) => enabledFields[setting.id] ?? true)
        .length
    : 0;
  const allFieldsSelected = hasFields && selectedCount === module?.settings.length;

  return (
    <>
      <VerifyEmailBanner />
      <section className="px-6 pb-36 pt-8 sm:px-10 sm:pb-40 sm:pt-12">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-6 flex min-h-[72px] w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 text-2xl font-black text-white shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          Terug
        </button>

        {module ? (
          <div className="mt-4 flex flex-col gap-6">
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
                  Aangepast onderdeel
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

            {module.settings.length > 0 ? (
              <>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
                  <div>
                    <p className="text-base font-black text-slate-900">
                      Vink aan om te registreren
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {selectedCount}/{module.settings.length} velden geselecteerd
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAllFields(!allFieldsSelected)}
                    aria-pressed={allFieldsSelected}
                    aria-label={
                      allFieldsSelected
                        ? "Alle velden uitvinken"
                        : "Alle velden aanvinken"
                    }
                    className={[
                      "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 transition-all active:scale-95",
                      allFieldsSelected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white text-transparent",
                    ].join(" ")}
                  >
                    <Check className="h-8 w-8" strokeWidth={3} aria-hidden />
                  </button>
                </div>

                {module.settings.map((setting) => {
                const value = values[setting.id] ?? setting.defaultValue;
                const enabled = enabledFields[setting.id] ?? true;

                return (
                  <div
                    key={setting.id}
                    className={[
                      "mb-6 rounded-3xl border p-6 shadow-sm transition-all duration-300",
                      enabled
                        ? "border-slate-100 bg-white"
                        : "border-slate-200 bg-slate-50 opacity-75",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="pt-2 text-xl font-bold text-slate-900">
                        {setting.name}
                      </h2>
                      <button
                        type="button"
                        onClick={() => toggleField(setting.id)}
                        aria-pressed={enabled}
                        aria-label={
                          enabled
                            ? `${setting.name} niet registreren`
                            : `${setting.name} registreren`
                        }
                        className={[
                          "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 transition-all active:scale-95",
                          enabled
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 bg-white text-transparent",
                        ].join(" ")}
                      >
                        <Check className="h-8 w-8" strokeWidth={3} aria-hidden />
                      </button>
                    </div>

                    <div className="mt-5 flex items-center gap-3">
                      <button
                        type="button"
                        disabled={!enabled}
                        onClick={() => updateValue(setting, "down")}
                        className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-4xl font-black text-slate-700 transition-all enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`${setting.name} verlagen`}
                      >
                        -
                      </button>

                      <div className="min-w-0 flex-1 text-center">
                        <label className="block">
                          <span className="sr-only">
                            Waarde voor {setting.name}
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            disabled={!enabled}
                            step={setting.step || "any"}
                            value={value}
                            onChange={(event) =>
                              setManualValue(setting, event.target.value)
                            }
                            className="w-full appearance-none border-0 bg-transparent text-center text-5xl font-black tabular-nums text-slate-900 outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                          <span className="ml-1 text-3xl">{setting.unit}</span>
                        </label>
                      </div>

                      <button
                        type="button"
                        disabled={!enabled}
                        onClick={() => updateValue(setting, "up")}
                        className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-4xl font-black text-blue-600 transition-all enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`${setting.name} verhogen`}
                      >
                        +
                      </button>
                    </div>

                    {setting.hasRemark ? (
                      <textarea
                        value={remarks[setting.id] ?? ""}
                        disabled={!enabled}
                        onChange={(event) =>
                          setRemarks((current) => ({
                            ...current,
                            [setting.id]: event.target.value,
                          }))
                        }
                        placeholder="Opmerking toevoegen..."
                        rows={3}
                        className="mt-5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-semibold text-slate-900 outline-none transition-opacity focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    ) : null}
                  </div>
                );
                })}
              </>
            ) : (
              <div className="rounded-3xl border border-slate-100 bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-xl font-bold text-slate-900">
                  Geen velden ingesteld
                </p>
                <p className="mt-2 text-base font-medium text-slate-500">
                  Dit onderdeel heeft nog geen invoervelden.
                </p>
              </div>
            )}
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

      {module ? (
        <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || module.settings.length === 0 || selectedCount === 0}
            className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 py-5 text-xl font-bold text-white shadow-sm transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              "Opslaan..."
            ) : (
              <>
                <Check className="h-6 w-6" strokeWidth={3} aria-hidden />
                Opslaan
              </>
            )}
          </button>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="fixed bottom-[calc(10.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-6">
          <p className="rounded-2xl bg-slate-900 px-5 py-4 text-center text-base font-bold text-white shadow-sm">
            {toastMessage}
          </p>
        </div>
      ) : null}

      <BottomNav active="tasks" onChange={handleBottomNav} />
    </>
  );
}

export default function CustomModulePage() {
  return (
    <UserProvider>
      <CustomModuleContent />
    </UserProvider>
  );
}
