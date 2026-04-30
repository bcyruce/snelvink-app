"use client";

import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import SupercellButton from "@/components/SupercellButton";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import { getModuleIcon } from "@/lib/taskModules";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Camera, Check, Wrench, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { createElement, useCallback, useEffect, useRef, useState } from "react";

const STORAGE_BUCKET = "haccp_photos";
const MAX_PHOTOS = 5;

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

type CustomModuleType = "temperature" | "boolean" | "list";
type BooleanValue = "goedgekeurd" | "afgekeurd";

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

/**
 * Lees getalvelden uit settings. Backwards-compatible:
 *   - Oude vorm: settings is een array (NumberInputConfig[]).
 *   - Nieuwe vorm: settings is een object `{ inputs: [...], hasPhoto }`.
 */
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

/**
 * Haal de `hasPhoto`-vlag uit settings. Geldt voor zowel het oude (array)
 * als nieuwe (object) formaat. Voor de oude vorm is fotodelen altijd uit.
 */
function parseHasPhoto(settings: unknown): boolean {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return true;
  }
  const value = (settings as { hasPhoto?: unknown }).hasPhoto;
  return value === undefined ? true : value === true;
}

function normalizeModuleType(value: unknown): CustomModuleType {
  if (value === "boolean") return "boolean";
  if (value === "list") return "list";
  return "temperature";
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatLocalDateTime(date: Date): string {
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  );
}

function buildRecordedAt(local: string): string {
  const parsed = new Date(local);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function CustomModuleContent() {
  const router = useRouter();
  const params = useParams<{ customId: string }>();
  const customId = params?.customId ?? "";
  const { user, profile, isLoading, isFreePlan } = useUser();

  const [module, setModule] = useState<CustomModule | null>(null);
  const [recordedAtLocal, setRecordedAtLocal] = useState(() =>
    formatLocalDateTime(new Date()),
  );
  const [values, setValues] = useState<Record<string, number>>({});
  const [booleanValues, setBooleanValues] = useState<
    Record<string, BooleanValue | null>
  >({});
  const [booleanReasons, setBooleanReasons] = useState<Record<string, string[]>>({});
  const [booleanCustomReason, setBooleanCustomReason] = useState<Record<string, string>>({});
  const [listChecked, setListChecked] = useState<Record<string, boolean>>({});
  const [listCustomItem, setListCustomItem] = useState("");
  const [generalRemark, setGeneralRemark] = useState("");
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [listRemark, setListRemark] = useState("");
  const [isModuleLoading, setIsModuleLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

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
      setRecordedAtLocal(formatLocalDateTime(new Date()));
      setPhotoFiles([]);
      setPhotoPreviews((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });

      if (moduleType === "temperature" && Array.isArray(settings)) {
        const numberSettings = settings as NumberInputConfig[];
        setValues(
          Object.fromEntries(
            numberSettings.map((setting) => [setting.id, setting.defaultValue]),
          ),
        );
        setRemarks(
          Object.fromEntries(
            numberSettings
              .filter((setting) => setting.hasRemark)
              .map((setting) => [setting.id, ""]),
          ),
        );
      } else if (moduleType === "boolean" && Array.isArray(settings)) {
        const booleanSettings = settings as BooleanInputConfig[];
        setBooleanValues(
          Object.fromEntries(booleanSettings.map((setting) => [setting.id, null])),
        );
        setBooleanReasons(
          Object.fromEntries(booleanSettings.map((setting) => [setting.id, []])),
        );
        setBooleanCustomReason(
          Object.fromEntries(booleanSettings.map((setting) => [setting.id, ""])),
        );
        setRemarks(
          Object.fromEntries(
            booleanSettings
              .filter((setting) => setting.hasRemark)
              .map((setting) => [setting.id, ""]),
          ),
        );
      } else {
        const listSettings = settings as ListSettings;
        setListChecked(
          Object.fromEntries(listSettings.items.map((item) => [item.id, false])),
        );
        setListRemark("");
        setListCustomItem("");
        setRemarks({});
      }
      setGeneralRemark("");
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

  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePickPhotos = useCallback(() => {
    if (photoFiles.length >= MAX_PHOTOS) return;
    photoInputRef.current?.click();
  }, [photoFiles.length]);

  const handlePhotoChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) return;
      const room = MAX_PHOTOS - photoFiles.length;
      const accepted = files.slice(0, room);
      const newPreviews = accepted.map((file) => URL.createObjectURL(file));
      setPhotoFiles((prev) => [...prev, ...accepted]);
      setPhotoPreviews((prev) => [...prev, ...newPreviews]);
      event.target.value = "";
    },
    [photoFiles.length],
  );

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return next;
    });
  }, []);

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

  const handleSave = useCallback(async () => {
    if (!module || !user || isSaving) return;
    if (!profile?.restaurant_id) {
      setErrorMessage("Geen restaurant gekoppeld aan je account.");
      return;
    }

    const recordedAt = buildRecordedAt(recordedAtLocal);
    let logValues:
      | Array<{
          field_id: string;
          name: string;
          value: number | string;
          unit: string;
          remark: string | null;
        }>
      | null = null;

    if (module.moduleType === "temperature" && Array.isArray(module.settings)) {
      const selectedSettings = module.settings as NumberInputConfig[];

      if (selectedSettings.length === 0) {
        setErrorMessage("Vink minstens één veld aan om op te slaan.");
        return;
      }

      logValues = selectedSettings.map((setting) => ({
        field_id: setting.id,
        name: setting.name,
        value: values[setting.id] ?? setting.defaultValue,
        unit: setting.unit,
        remark: setting.hasRemark ? remarks[setting.id] ?? "" : null,
      }));
    }

    if (module.moduleType === "boolean" && Array.isArray(module.settings)) {
      const selectedSettings = module.settings as BooleanInputConfig[];

      if (selectedSettings.length === 0) {
        setErrorMessage("Vink minstens één veld aan om op te slaan.");
        return;
      }

      logValues = selectedSettings.map((setting) => ({
        field_id: setting.id,
        name: setting.name,
        value: (() => {
          const base =
            booleanValues[setting.id] === "goedgekeurd"
              ? "Goedgekeurd"
              : booleanValues[setting.id] === "afgekeurd"
                ? "Afgekeurd"
                : "Niet gekozen";
          const reasons = [...(booleanReasons[setting.id] ?? [])];
          const customReason = (booleanCustomReason[setting.id] ?? "").trim();
          if (
            customReason &&
            (reasons.includes("其他") || reasons.includes("Anders"))
          ) {
            reasons.push(customReason);
          }
          return reasons.length > 0 ? `${base} (${reasons.join(", ")})` : base;
        })(),
        unit: "",
        remark: setting.hasRemark ? remarks[setting.id] ?? "" : null,
      }));
    }

    if (module.moduleType === "list" && !Array.isArray(module.settings)) {
      const listConfig = module.settings;
      const checkedItems = listConfig.items.filter(
        (item) => listChecked[item.id],
      );

      if (checkedItems.length === 0) {
        setErrorMessage("Vink minstens één item aan om op te slaan.");
        return;
      }

      logValues = checkedItems.map((item) => ({
        field_id: item.id,
        name: item.name,
        value: "Afgevinkt",
        unit: "",
        remark: listConfig.hasRemark ? listRemark : null,
      }));
      if (listCustomItem.trim()) {
        logValues.push({
          field_id: "list-custom",
          name: "其他",
          value: listCustomItem.trim(),
          unit: "",
          remark: null,
        });
      }
    }

    if (!logValues) return;

    setIsSaving(true);
    setErrorMessage(null);

    const uploadedPhotoUrls: string[] = [];
    if (module.hasPhoto && !isFreePlan && photoFiles.length > 0) {
      try {
        for (const file of photoFiles) {
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `custom/${profile.restaurant_id}/${module.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, { cacheControl: "3600", upsert: false });
          if (uploadError) {
            console.error("Foto upload mislukt:", uploadError);
            setErrorMessage("Foto upload mislukt. Probeer opnieuw.");
            setIsSaving(false);
            return;
          }
          const { data: publicData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(path);
          if (publicData.publicUrl) uploadedPhotoUrls.push(publicData.publicUrl);
        }
      } catch (uploadErr) {
        console.error("Onverwachte fout bij foto upload:", uploadErr);
        setErrorMessage("Foto upload mislukt. Probeer opnieuw.");
        setIsSaving(false);
        return;
      }
    }

    const logData = {
      module_name: module.name,
      module_type: module.moduleType,
      recorded_at: recordedAt,
      values: logValues,
      remark: generalRemark.trim() || null,
      photo_urls: uploadedPhotoUrls,
    };

    const { error } = await supabase.from("custom_module_logs").insert({
      restaurant_id: profile.restaurant_id,
      user_id: user.id,
      module_id: module.id,
      custom_module_id: module.id,
      log_data: logData,
      logged_at: recordedAt,
      created_at: recordedAt,
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
    recordedAtLocal,
    values,
    booleanValues,
    listChecked,
    listRemark,
    remarks,
    isSaving,
    isFreePlan,
    photoFiles,
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

  const handleMenuNav = (tab: MenuTab) => {
    if (tab === "registreren") router.push("/registreren");
    else if (tab === "taken") router.push("/");
    else router.push(`/?tab=${tab}`);
  };

  const fieldSettings =
    module && Array.isArray(module.settings) ? module.settings : [];
  const listSettings =
    module && !Array.isArray(module.settings) ? module.settings : null;
  const hasFields =
    module?.moduleType === "list"
      ? (listSettings?.items.length ?? 0) > 0
      : fieldSettings.length > 0;
  const selectedCount = fieldSettings.length;
  const listCheckedCount =
    listSettings?.items.filter((item) => listChecked[item.id]).length ?? 0;

  return (
    <>
      <VerifyEmailBanner />
      <section className="px-6 pb-36 pt-8 sm:px-10 sm:pb-40 sm:pt-12">
        <SupercellButton
          variant="neutral"
          onClick={() => router.push("/registreren")}
          size="lg"
          className="mb-6 flex min-h-[72px] w-full items-center justify-center gap-3 text-2xl"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          Terug
        </SupercellButton>

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

            <label className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Datum &amp; tijd
              </span>
              <input
                type="datetime-local"
                value={recordedAtLocal}
                onChange={(event) => setRecordedAtLocal(event.target.value)}
                className="min-h-[72px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-2xl font-black tabular-nums text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
              />
            </label>

            {errorMessage ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-base font-bold text-red-700">
                {errorMessage}
              </p>
            ) : null}

            {hasFields ? (
              <>
                {module.moduleType !== "list" ? (
                  <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500">
                      {selectedCount}/{fieldSettings.length} velden
                    </p>
                  </div>
                ) : null}

                {module.moduleType === "temperature" &&
                  (fieldSettings as NumberInputConfig[]).map((setting) => {
                    const value = values[setting.id] ?? setting.defaultValue;

                    return (
                      <div
                        key={setting.id}
                        className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <h2 className="pt-2 text-xl font-bold text-slate-900">
                            {setting.name}
                          </h2>
                        </div>

                        <div className="mt-5 flex items-center gap-3">
                          <SupercellButton
                            variant="neutral"
                            size="icon"
                            onClick={() => updateValue(setting, "down")}
                            className="h-14 w-14 shrink-0"
                            aria-label={`${setting.name} verlagen`}
                          >
                            -
                          </SupercellButton>

                          <div className="min-w-0 flex-1 text-center">
                            <label className="block">
                              <span className="sr-only">
                                Waarde voor {setting.name}
                              </span>
                              <input
                                type="number"
                                inputMode="decimal"
                                step={setting.step || "any"}
                                value={value}
                                onChange={(event) =>
                                  setManualValue(setting, event.target.value)
                                }
                                className="w-full appearance-none border-0 bg-transparent text-center text-3xl font-black tabular-nums text-slate-900 outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <span className="ml-1 text-3xl">
                                {setting.unit}
                              </span>
                            </label>
                          </div>

                          <SupercellButton
                            variant="primary"
                            size="icon"
                            onClick={() => updateValue(setting, "up")}
                            className="h-14 w-14 shrink-0"
                            aria-label={`${setting.name} verhogen`}
                          >
                            +
                          </SupercellButton>
                        </div>

                        {setting.hasRemark ? (
                          <textarea
                            value={remarks[setting.id] ?? ""}
                            onChange={(event) =>
                              setRemarks((current) => ({
                                ...current,
                                [setting.id]: event.target.value,
                              }))
                            }
                            placeholder="Opmerking toevoegen..."
                            rows={3}
                            className="mt-5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-semibold text-slate-900 outline-none transition-opacity focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                          />
                        ) : null}
                      </div>
                    );
                  })}

                {module.moduleType === "boolean" &&
                  (fieldSettings as BooleanInputConfig[]).map((setting) => {
                    const selected = booleanValues[setting.id];
                    const reasonOptions =
                      selected === "goedgekeurd"
                        ? (setting.acceptedReasons ?? ["Goedgekeurd", "其他"])
                        : selected === "afgekeurd"
                          ? (setting.rejectedReasons ?? ["Afgekeurd", "其他"])
                          : [];
                    const selectedReasons = booleanReasons[setting.id] ?? [];
                    const useCustomReason = selectedReasons.includes("其他") || selectedReasons.includes("Anders");

                    return (
                      <div
                        key={setting.id}
                        className="mb-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <h2 className="pt-2 text-xl font-bold text-slate-900">
                            {setting.name}
                          </h2>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <SupercellButton
                            variant={selected === "goedgekeurd" ? "success" : "neutral"}
                            size="lg"
                            onClick={() =>
                              setBooleanValues((current) => ({
                                ...current,
                                [setting.id]: "goedgekeurd",
                              }))
                            }
                            className="min-h-[88px] text-xl"
                          >
                            Goedgekeurd
                          </SupercellButton>
                          <SupercellButton
                            variant={selected === "afgekeurd" ? "danger" : "neutral"}
                            size="lg"
                            onClick={() =>
                              setBooleanValues((current) => ({
                                ...current,
                                [setting.id]: "afgekeurd",
                              }))
                            }
                            className="min-h-[88px] text-xl"
                          >
                            Afgekeurd
                          </SupercellButton>
                        </div>

                        {reasonOptions.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {reasonOptions.map((reason) => {
                              const active = selectedReasons.includes(reason);
                              return (
                                <SupercellButton
                                  key={`${setting.id}-${reason}`}
                                  size="sm"
                                  variant={active ? "primary" : "neutral"}
                                  onClick={() =>
                                    setBooleanReasons((current) => {
                                      const next = new Set(current[setting.id] ?? []);
                                      if (next.has(reason)) next.delete(reason);
                                      else next.add(reason);
                                      return { ...current, [setting.id]: Array.from(next) };
                                    })
                                  }
                                  className="text-sm normal-case"
                                >
                                  {reason}
                                </SupercellButton>
                              );
                            })}
                          </div>
                        ) : null}

                        {useCustomReason ? (
                          <input
                            type="text"
                            value={booleanCustomReason[setting.id] ?? ""}
                            onChange={(event) =>
                              setBooleanCustomReason((current) => ({
                                ...current,
                                [setting.id]: event.target.value,
                              }))
                            }
                            placeholder="Eigen reden..."
                            className="mt-3 min-h-[56px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                          />
                        ) : null}

                        {setting.hasRemark ? (
                          <textarea
                            value={remarks[setting.id] ?? ""}
                            onChange={(event) =>
                              setRemarks((current) => ({
                                ...current,
                                [setting.id]: event.target.value,
                              }))
                            }
                            placeholder="Opmerking toevoegen..."
                            rows={3}
                            className="mt-5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-semibold text-slate-900 outline-none transition-opacity focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                          />
                        ) : null}
                      </div>
                    );
                  })}

                {module.moduleType === "list" && listSettings ? (
                  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3">
                      {listSettings.items.map((item) => {
                        const checked = listChecked[item.id] === true;
                        return (
                          <SupercellButton
                            key={item.id}
                            size="lg"
                            onClick={() =>
                              setListChecked((current) => ({
                                ...current,
                                [item.id]: !checked,
                              }))
                            }
                            aria-pressed={checked}
                            variant={checked ? "success" : "neutral"}
                            className="flex min-h-[72px] w-full items-center gap-4 px-5 text-left text-xl normal-case"
                          >
                            <span
                              className={[
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 transition-colors",
                                checked
                                  ? "border-green-600 bg-green-600 text-white"
                                  : "border-slate-300 bg-white text-transparent",
                              ].join(" ")}
                              aria-hidden
                            >
                              <Check className="h-6 w-6" strokeWidth={3} />
                            </span>
                            <span className="flex-1">{item.name}</span>
                          </SupercellButton>
                        );
                      })}
                    </div>

                    {listSettings.hasRemark ? (
                      <textarea
                        value={listRemark}
                        onChange={(event) => setListRemark(event.target.value)}
                        placeholder="Opmerking toevoegen..."
                        rows={3}
                        className="mt-5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                      />
                    ) : null}
                    <input
                      type="text"
                      value={listCustomItem}
                      onChange={(event) => setListCustomItem(event.target.value)}
                      placeholder="其他... (eigen item)"
                      className="mt-4 min-h-[56px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
                    />
                  </div>
                ) : null}
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

            {module.hasPhoto ? (
              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      Foto&apos;s
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {isFreePlan
                        ? "Upgrade naar Basic om foto's toe te voegen."
                        : `Optioneel · max ${MAX_PHOTOS} foto's`}
                    </p>
                  </div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Camera className="h-6 w-6" strokeWidth={2.25} aria-hidden />
                  </span>
                </div>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoChange}
                />

                <SupercellButton
                  variant="primary"
                  size="lg"
                  onClick={handlePickPhotos}
                  disabled={
                    isSaving ||
                    isFreePlan ||
                    photoFiles.length >= MAX_PHOTOS
                  }
                  className="flex min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-blue-200 px-6 py-8 text-center text-lg normal-case"
                >
                  <Camera
                    className="h-12 w-12"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                  {isFreePlan
                    ? "Foto's beschikbaar in Basic"
                    : photoFiles.length === 0
                      ? "Tik om een foto te maken of te kiezen"
                      : photoFiles.length >= MAX_PHOTOS
                        ? `Maximaal ${MAX_PHOTOS} foto's`
                        : `Foto toevoegen (${photoFiles.length}/${MAX_PHOTOS})`}
                </SupercellButton>

                {photoPreviews.length > 0 ? (
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {photoPreviews.map((url, index) => (
                      <div key={url} className="relative">
                        <img
                          src={url}
                          alt={`Foto ${index + 1}`}
                          className="h-32 w-full rounded-2xl border border-slate-100 object-cover shadow-sm"
                        />
                        <SupercellButton
                          variant="danger"
                  size="icon"
                          onClick={() => handleRemovePhoto(index)}
                          aria-label={`Foto ${index + 1} verwijderen`}
                  className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full border-b-[4px] ring-4 ring-white"
                        >
                          <X className="h-4 w-4" strokeWidth={3} aria-hidden />
                        </SupercellButton>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            <textarea
              value={generalRemark}
              onChange={(event) => setGeneralRemark(event.target.value)}
              placeholder="Opmerking toevoegen..."
              rows={3}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-semibold text-slate-900 outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
            />
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
          <SupercellButton
            variant="primary"
            size="lg"
            onClick={handleSave}
            disabled={
              isSaving ||
              !hasFields ||
              (module.moduleType === "list"
                ? listCheckedCount === 0
                : selectedCount === 0)
            }
            className="h-14 w-full text-xl"
          >
            {isSaving ? (
              "Opslaan..."
            ) : (
              <>
                <Check className="h-6 w-6" strokeWidth={3} aria-hidden />
                Opslaan
              </>
            )}
          </SupercellButton>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="fixed bottom-[calc(10.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-6">
          <p className="rounded-2xl bg-slate-900 px-5 py-4 text-center text-base font-bold text-white shadow-sm">
            {toastMessage}
          </p>
        </div>
      ) : null}

      <FloatingMenu active="registreren" onChange={handleMenuNav} />
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
