"use client";

import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import SupercellButton from "@/components/SupercellButton";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import { useLongPress } from "@/hooks/useLongPress";
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
    return false;
  }
  return (settings as { hasPhoto?: unknown }).hasPhoto === true;
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
  const [listChecked, setListChecked] = useState<Record<string, boolean>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [listRemark, setListRemark] = useState("");
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>(
    {},
  );
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
        setEnabledFields(
          Object.fromEntries(numberSettings.map((setting) => [setting.id, true])),
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
        setEnabledFields(
          Object.fromEntries(booleanSettings.map((setting) => [setting.id, true])),
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
        setEnabledFields({});
        setRemarks({});
      }
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

  const toggleField = useCallback((fieldId: string) => {
    setEnabledFields((current) => ({
      ...current,
      [fieldId]: !(current[fieldId] ?? true),
    }));
  }, []);

  const toggleAllFields = useCallback((checked: boolean) => {
    setEnabledFields((current) =>
      Object.fromEntries(
        (module && Array.isArray(module.settings)
          ? module.settings.map((setting) => setting.id)
          : Object.keys(current)
        ).map((fieldId) => [fieldId, checked]),
      ),
    );
  }, [module?.settings]);

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
      const selectedSettings = (module.settings as NumberInputConfig[]).filter(
        (setting) => enabledFields[setting.id] ?? true,
      );

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
      const selectedSettings = (module.settings as BooleanInputConfig[]).filter(
        (setting) => enabledFields[setting.id] ?? true,
      );

      if (selectedSettings.length === 0) {
        setErrorMessage("Vink minstens één veld aan om op te slaan.");
        return;
      }

      logValues = selectedSettings.map((setting) => ({
        field_id: setting.id,
        name: setting.name,
        value:
          booleanValues[setting.id] === "goedgekeurd"
            ? "Goedgekeurd"
            : booleanValues[setting.id] === "afgekeurd"
              ? "Afgekeurd"
              : "Niet gekozen",
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
      router.push("/registreren");
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
    enabledFields,
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
  const selectedCount = fieldSettings.filter(
    (setting) => enabledFields[setting.id] ?? true,
  ).length;
  const listCheckedCount =
    listSettings?.items.filter((item) => listChecked[item.id]).length ?? 0;
  const allFieldsSelected =
    fieldSettings.length > 0 && selectedCount === fieldSettings.length;

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
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
                    <div>
                      <p className="text-base font-black text-slate-900">
                        Vink aan om te registreren
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {selectedCount}/{fieldSettings.length} velden geselecteerd
                      </p>
                    </div>
                    <SupercellButton
                      variant={allFieldsSelected ? "primary" : "neutral"}
                      size="icon"
                      onClick={() => toggleAllFields(!allFieldsSelected)}
                      aria-pressed={allFieldsSelected}
                      aria-label={
                        allFieldsSelected
                          ? "Alle velden uitvinken"
                          : "Alle velden aanvinken"
                      }
                      className="h-16 w-16 shrink-0"
                    >
                      <Check className="h-8 w-8" strokeWidth={3} aria-hidden />
                    </SupercellButton>
                  </div>
                ) : null}

                {module.moduleType === "temperature" &&
                  (fieldSettings as NumberInputConfig[]).map((setting) => (
                    <NumberFieldCard
                      key={setting.id}
                      setting={setting}
                      value={values[setting.id] ?? setting.defaultValue}
                      enabled={enabledFields[setting.id] ?? true}
                      onToggleEnabled={() => toggleField(setting.id)}
                      onChangeValue={(next) =>
                        setValues((cur) => ({ ...cur, [setting.id]: next }))
                      }
                      remark={remarks[setting.id] ?? ""}
                      onChangeRemark={(text) =>
                        setRemarks((cur) => ({ ...cur, [setting.id]: text }))
                      }
                    />
                  ))}

                {module.moduleType === "boolean" &&
                  (fieldSettings as BooleanInputConfig[]).map((setting) => {
                    const enabled = enabledFields[setting.id] ?? true;
                    const selected = booleanValues[setting.id];

                    return (
                      <div
                        key={setting.id}
                        className={[
                          "mb-6 rounded-3xl border p-5 shadow-sm transition-all duration-300",
                          enabled
                            ? "border-slate-100 bg-white"
                            : "border-slate-200 bg-slate-50 opacity-75",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <h2 className="pt-2 text-xl font-bold text-slate-900">
                            {setting.name}
                          </h2>
                          <SupercellButton
                            variant={enabled ? "primary" : "neutral"}
                            size="icon"
                            onClick={() => toggleField(setting.id)}
                            aria-pressed={enabled}
                            aria-label={
                              enabled
                                ? `${setting.name} niet registreren`
                                : `${setting.name} registreren`
                            }
                            className="h-14 w-14 shrink-0"
                          >
                            <Check className="h-8 w-8" strokeWidth={3} aria-hidden />
                          </SupercellButton>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            disabled={!enabled}
                            onClick={() =>
                              setBooleanValues((current) => ({
                                ...current,
                                [setting.id]: "goedgekeurd",
                              }))
                            }
                            aria-pressed={selected === "goedgekeurd"}
                            className={[
                              "flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-b-4 transition-all disabled:cursor-not-allowed disabled:opacity-40",
                              selected === "goedgekeurd"
                                ? "border-emerald-700 bg-emerald-500 text-white"
                                : "border-emerald-300 bg-emerald-50 text-emerald-700 active:bg-emerald-100",
                            ].join(" ")}
                          >
                            <Check className="h-9 w-9" strokeWidth={3} aria-hidden />
                            <span className="text-lg font-black">Goedgekeurd</span>
                          </button>
                          <button
                            type="button"
                            disabled={!enabled}
                            onClick={() =>
                              setBooleanValues((current) => ({
                                ...current,
                                [setting.id]: "afgekeurd",
                              }))
                            }
                            aria-pressed={selected === "afgekeurd"}
                            className={[
                              "flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-b-4 transition-all disabled:cursor-not-allowed disabled:opacity-40",
                              selected === "afgekeurd"
                                ? "border-red-700 bg-red-500 text-white"
                                : "border-red-300 bg-red-50 text-red-700 active:bg-red-100",
                            ].join(" ")}
                          >
                            <X className="h-9 w-9" strokeWidth={3} aria-hidden />
                            <span className="text-lg font-black">Afgekeurd</span>
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

                {module.moduleType === "list" && listSettings ? (
                  <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
                    <h3 className="mb-3 text-lg font-black text-emerald-800">
                      Items afvinken
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {listSettings.items.map((item) => {
                        const checked = listChecked[item.id] === true;
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() =>
                                setListChecked((current) => ({
                                  ...current,
                                  [item.id]: !checked,
                                }))
                              }
                              aria-pressed={checked}
                              className={[
                                "flex w-full items-center justify-between gap-3 rounded-xl border-2 border-b-4 px-4 py-4 text-left text-lg font-bold transition-all",
                                checked
                                  ? "border-emerald-700 bg-emerald-500 text-white"
                                  : "border-emerald-200 bg-white text-slate-800 active:bg-emerald-50",
                              ].join(" ")}
                            >
                              <span className="flex-1 truncate">{item.name}</span>
                              {checked ? (
                                <Check
                                  className="h-6 w-6 shrink-0"
                                  strokeWidth={3}
                                  aria-hidden
                                />
                              ) : (
                                <span className="h-6 w-6 shrink-0 rounded-full border-2 border-current opacity-30" />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    {listCheckedCount > 0 ? (
                      <p className="mt-4 text-sm font-bold text-emerald-800">
                        {listCheckedCount} item
                        {listCheckedCount === 1 ? "" : "s"} aangevinkt
                      </p>
                    ) : null}

                    {listSettings.hasRemark ? (
                      <textarea
                        value={listRemark}
                        onChange={(event) => setListRemark(event.target.value)}
                        placeholder="Opmerking toevoegen..."
                        rows={3}
                        className="mt-4 w-full resize-none rounded-2xl border-2 border-emerald-200 bg-white px-4 py-4 text-base font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                      />
                    ) : null}
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

// =========================================================================
// NumberFieldCard — koeling-stijl invoer voor één getalveld in een
// Aangepast onderdeel. Verticale layout met één + boven en één - onder
// de waarde. Tap op de waarde voor handmatige invoer. Long-press op de
// knoppen herhaalt automatisch.
// =========================================================================
type NumberFieldCardProps = {
  setting: NumberInputConfig;
  value: number;
  enabled: boolean;
  onToggleEnabled: () => void;
  onChangeValue: (next: number) => void;
  remark: string;
  onChangeRemark: (text: string) => void;
};

function NumberFieldCard({
  setting,
  value,
  enabled,
  onToggleEnabled,
  onChangeValue,
  remark,
  onChangeRemark,
}: NumberFieldCardProps) {
  const [isManual, setIsManual] = useState(false);
  const [manualText, setManualText] = useState(String(value));
  const manualInputRef = useRef<HTMLInputElement>(null);

  const step = setting.step > 0 ? setting.step : 0.1;
  const unit = setting.unit ?? "";

  const incPress = useLongPress({
    onTrigger: () => onChangeValue(roundTenth(value + step)),
    disabled: !enabled,
  });
  const decPress = useLongPress({
    onTrigger: () => onChangeValue(roundTenth(value - step)),
    disabled: !enabled,
  });

  useEffect(() => {
    if (isManual) {
      manualInputRef.current?.focus();
      manualInputRef.current?.select?.();
    }
  }, [isManual]);

  const startManual = () => {
    if (!enabled) return;
    setManualText(value.toFixed(1));
    setIsManual(true);
  };
  const commitManual = () => {
    const parsed = Number.parseFloat(manualText.replace(",", "."));
    if (Number.isFinite(parsed)) onChangeValue(roundTenth(parsed));
    setIsManual(false);
  };

  const stepLabel = `${step}`.replace(".", ",");

  return (
    <div
      className={[
        "mb-6 rounded-3xl border p-5 shadow-sm transition-all duration-300",
        enabled
          ? "border-slate-100 bg-white"
          : "border-slate-200 bg-slate-50 opacity-75",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="pt-2 text-xl font-bold text-slate-900">
          {setting.name}
        </h2>
        <SupercellButton
          variant={enabled ? "primary" : "neutral"}
          size="icon"
          onClick={onToggleEnabled}
          aria-pressed={enabled}
          aria-label={
            enabled
              ? `${setting.name} niet registreren`
              : `${setting.name} registreren`
          }
          className="h-14 w-14 shrink-0"
        >
          <Check className="h-8 w-8" strokeWidth={3} aria-hidden />
        </SupercellButton>
      </div>

      <div className="mx-auto mt-5 flex w-full max-w-md flex-col items-center gap-3">
        <SupercellButton
          size="lg"
          variant="neutral"
          {...incPress}
          aria-label={`${setting.name} verhogen met ${stepLabel} ${unit}`}
          className="flex min-h-[80px] w-full select-none items-center justify-center rounded-3xl text-3xl normal-case"
        >
          + {stepLabel}
          {unit ? ` ${unit}` : ""}
        </SupercellButton>

        <div className="flex w-full min-h-[5.5rem] items-center justify-center py-1">
          {isManual ? (
            <input
              ref={manualInputRef}
              type="number"
              inputMode="decimal"
              step="any"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              onBlur={commitManual}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitManual();
                }
                if (e.key === "Escape") setIsManual(false);
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-2 py-3 text-center text-6xl font-black tabular-nums leading-none text-slate-900 shadow-sm outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
              aria-label={`Waarde voor ${setting.name} handmatig invoeren`}
            />
          ) : (
            <SupercellButton
              size="lg"
              variant="neutral"
              onClick={startManual}
              disabled={!enabled}
              aria-label={`Huidige waarde ${value.toFixed(1)}${unit}, tik om handmatig in te voeren`}
              className="min-h-[88px] w-full rounded-3xl border border-slate-100 px-2 py-3 text-center text-6xl tabular-nums leading-none text-slate-900 normal-case"
            >
              {value.toFixed(1)}
              {unit ? <span className="ml-2 text-3xl">{unit}</span> : null}
            </SupercellButton>
          )}
        </div>

        <SupercellButton
          size="lg"
          variant="neutral"
          {...decPress}
          aria-label={`${setting.name} verlagen met ${stepLabel} ${unit}`}
          className="flex min-h-[80px] w-full select-none items-center justify-center rounded-3xl text-3xl normal-case"
        >
          − {stepLabel}
          {unit ? ` ${unit}` : ""}
        </SupercellButton>
      </div>

      {setting.hasRemark ? (
        <textarea
          value={remark}
          disabled={!enabled}
          onChange={(event) => onChangeRemark(event.target.value)}
          placeholder="Opmerking toevoegen..."
          rows={3}
          className="mt-5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-lg font-semibold text-slate-900 outline-none transition-opacity focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-40"
        />
      ) : null}
    </div>
  );
}

export default function CustomModulePage() {
  return (
    <UserProvider>
      <CustomModuleContent />
    </UserProvider>
  );
}
