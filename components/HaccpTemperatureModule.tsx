"use client";

import InlineAddInput from "@/components/InlineAddInput";
import SupercellButton from "@/components/SupercellButton";
import UpgradePromptModal from "@/components/UpgradePromptModal";
import { useTranslation } from "@/hooks/useTranslation";
import { useLongPress } from "@/hooks/useLongPress";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronRight,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ModuleType = "koeling" | "kerntemperatuur" | "custom_number";

type Equipment = {
  id: string;
  name: string;
  type: string;
  default_temp: number | null;
  last_temp: number | null;
  limit_temp: number | null;
  step: number | null;
  unit: string | null;
};

type Props = {
  moduleType: ModuleType;
  title: string;
  defaultTemperature: number;
  firstEquipmentName: string;
  mode?: "manage" | "record";
  /**
   * Wanneer gezet, opereert de module op rijen met dit `custom_module_id`
   * in plaats van filteren op `type`. Records worden geschreven naar
   * `haccp_records` met `module_type = "custom_number"` en hetzelfde
   * `custom_module_id`.
   */
  customModuleId?: string;
  /**
   * "double" → +1/+0.1 + −1/−0.1 (koeling/kerntemperatuur).
   * "single" → +<step><unit>/−<step><unit> per item (custom Getal).
   */
  stepLayout?: "double" | "single";
};

const MAX_PHOTOS = 5;
const STORAGE_BUCKET = "haccp_photos";

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatLocalDateTime(d: Date): string {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  );
}

function buildRecordedAt(local: string): string {
  const parsed = new Date(local);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

export default function HaccpTemperatureModule({
  moduleType,
  title,
  defaultTemperature,
  firstEquipmentName,
  mode = "record",
  customModuleId,
  stepLayout = "double",
}: Props) {
  const isCustom = !!customModuleId;
  const editBasePath = isCustom
    ? `/taken/custom/${customModuleId}/edit`
    : `/taken/${moduleType}/edit`;
  const recordModuleType = isCustom ? "custom_number" : moduleType;
  const { t } = useTranslation();
  const { user, profile, isFreePlan } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;

  // ---------- view state ----------
  const [view, setView] = useState<"list" | "record">("list");
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loadingEquipments, setLoadingEquipments] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const ensuredDefaultRef = useRef(false);

  // ---------- record state ----------
  const [activeEquipment, setActiveEquipment] = useState<Equipment | null>(
    null,
  );
  const [recordedAtLocal, setRecordedAtLocal] = useState<string>(() =>
    formatLocalDateTime(new Date()),
  );
  const [temperature, setTemperature] = useState<number>(defaultTemperature);
  const [opmerking, setOpmerking] = useState("");
  const [correctionAction, setCorrectionAction] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ---------- derived ----------
  const limitTemp =
    typeof activeEquipment?.limit_temp === "number"
      ? activeEquipment.limit_temp
      : null;
  const isOverLimit = limitTemp !== null && temperature > limitTemp;
  const tempColorClass = isOverLimit ? "text-red-600" : "text-slate-900";
  const correctionRequired = isOverLimit && correctionAction.trim().length === 0;
  const canSave =
    !isSaving && !!restaurantId && !!activeEquipment && !correctionRequired;

  // ---------- load equipments ----------
  const loadEquipments = useCallback(async () => {
    if (!restaurantId) return;
    setLoadingEquipments(true);
    setErrorMessage(null);
    const baseQuery = supabase
      .from("haccp_equipments")
      .select(
        "id, name, type, default_temp, last_temp, limit_temp, step, unit",
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true });
    const { data, error } = await (isCustom
      ? baseQuery.eq("custom_module_id", customModuleId)
      : baseQuery.eq("type", moduleType).is("custom_module_id", null));

    if (error) {
      console.error("haccp_equipments laden mislukt:", error);
      setErrorMessage(t("recordsLoadFailed"));
      setLoadingEquipments(false);
      return;
    }

    const rows = (data ?? []) as Equipment[];

    if (rows.length === 0 && !ensuredDefaultRef.current) {
      ensuredDefaultRef.current = true;
      const { data: created, error: insertError } = await supabase
        .from("haccp_equipments")
        .insert({
          restaurant_id: restaurantId,
          name: firstEquipmentName,
          type: isCustom ? "custom" : moduleType,
          last_temp: null,
          limit_temp: null,
          custom_module_id: customModuleId ?? null,
        })
        .select(
          "id, name, type, default_temp, last_temp, limit_temp, step, unit",
        )
        .single();

      if (insertError) {
        console.error("Standaard apparaat aanmaken mislukt:", insertError);
        setErrorMessage(t("equipmentAddFailed"));
      } else if (created) {
        setEquipments([created as Equipment]);
      }
    } else {
      setEquipments(rows);
    }
    setLoadingEquipments(false);
  }, [restaurantId, moduleType, firstEquipmentName, customModuleId, isCustom, t]);

  useEffect(() => {
    void loadEquipments();
  }, [loadEquipments, restaurantId]);

  // ---------- equipment CRUD ----------
  const handleAddEquipment = useCallback(
    async (name: string) => {
      if (!restaurantId) return;

      const { data, error } = await supabase
        .from("haccp_equipments")
        .insert({
          restaurant_id: restaurantId,
          name,
          type: isCustom ? "custom" : moduleType,
          last_temp: null,
          limit_temp: null,
          custom_module_id: customModuleId ?? null,
        })
        .select(
          "id, name, type, default_temp, last_temp, limit_temp, step, unit",
        )
        .single();

      if (error) {
        console.error("Apparaat toevoegen mislukt:", error);
        setErrorMessage(t("equipmentAddFailed"));
        return;
      }
      if (data) setEquipments((prev) => [...prev, data as Equipment]);
    },
    [restaurantId, moduleType, customModuleId, isCustom, t],
  );

  const handleDeleteEquipment = useCallback(
    async (eq: Equipment) => {
      const ok = window.confirm(
        t("confirmDeleteHistoryKept", { name: eq.name }),
      );
      if (!ok) return;

      const { error } = await supabase
        .from("haccp_equipments")
        .delete()
        .eq("id", eq.id);

      if (error) {
        console.error("Verwijderen mislukt:", error);
        setErrorMessage(t("deleteFailed"));
        return;
      }
      setEquipments((prev) => prev.filter((p) => p.id !== eq.id));
    },
    [t],
  );

  // ---------- enter recorder ----------
  const enterRecord = useCallback(
    (eq: Equipment) => {
      setActiveEquipment(eq);
      setRecordedAtLocal(formatLocalDateTime(new Date()));
      // Standaardwaarde heeft voorrang; anders de laatst gemeten waarde;
      // anders de module-default.
      const startTemp =
        typeof eq.default_temp === "number"
          ? eq.default_temp
          : typeof eq.last_temp === "number"
            ? eq.last_temp
            : defaultTemperature;
      setTemperature(startTemp);
      setOpmerking("");
      setCorrectionAction("");
      setPhotoFiles([]);
      setPhotoPreviews((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return [];
      });
      setView("record");
    },
    [defaultTemperature],
  );

  const exitRecord = useCallback(() => {
    setView("list");
    setActiveEquipment(null);
    setPhotoPreviews((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return [];
    });
    setPhotoFiles([]);
  }, []);

  useEffect(() => {
    return () => {
      photoPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- long-press +/- ----------
  // Voor de standaard koeling/kerntemperatuur weergave (twee stappen).
  const incOnePress = useLongPress({
    onTrigger: () => setTemperature((v) => roundTenth(v + 1)),
    disabled: isSaving,
  });
  const incTenthPress = useLongPress({
    onTrigger: () => setTemperature((v) => roundTenth(v + 0.1)),
    disabled: isSaving,
  });
  const decOnePress = useLongPress({
    onTrigger: () => setTemperature((v) => roundTenth(v - 1)),
    disabled: isSaving,
  });
  const decTenthPress = useLongPress({
    onTrigger: () => setTemperature((v) => roundTenth(v - 0.1)),
    disabled: isSaving,
  });
  // Voor custom Getal: gebruik de step van het actieve apparaat.
  const customStep =
    typeof activeEquipment?.step === "number" && activeEquipment.step > 0
      ? activeEquipment.step
      : 0.1;
  const incCustomPress = useLongPress({
    onTrigger: () => setTemperature((v) => roundTenth(v + customStep)),
    disabled: isSaving,
  });
  const decCustomPress = useLongPress({
    onTrigger: () => setTemperature((v) => roundTenth(v - customStep)),
    disabled: isSaving,
  });

  // ---------- photos ----------
  const handlePickPhotos = () => {
    if (isFreePlan) {
      setShowUpgradeModal(true);
      return;
    }
    if (photoFiles.length >= MAX_PHOTOS) return;
    photoInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const room = MAX_PHOTOS - photoFiles.length;
    const accepted = files.slice(0, room);
    const newPreviews = accepted.map((f) => URL.createObjectURL(f));
    setPhotoFiles((prev) => [...prev, ...accepted]);
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return next;
    });
  };

  // ---------- save ----------
  const handleSave = async () => {
    if (!restaurantId || !activeEquipment) return;

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const uploadedUrls: string[] = [];

      if (!isFreePlan && photoFiles.length > 0) {
        for (const file of photoFiles) {
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `${moduleType}/${restaurantId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, { cacheControl: "3600", upsert: false });
          if (uploadError) {
            console.error("Foto upload mislukt:", uploadError);
            setErrorMessage(t("photoUploadFailed"));
            return;
          }
          const { data } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(path);
          if (data.publicUrl) uploadedUrls.push(data.publicUrl);
        }
      }

      const recordedAt = buildRecordedAt(recordedAtLocal);

      const { error: insertError } = await supabase
        .from("haccp_records")
        .insert({
          restaurant_id: restaurantId,
          user_id: user?.id ?? null,
          module_type: recordModuleType,
          custom_module_id: customModuleId ?? null,
          equipment_id: activeEquipment.id,
          temperature,
          recorded_at: recordedAt,
          image_urls: uploadedUrls,
          opmerking: opmerking.trim() || null,
          correction_action: isOverLimit
            ? correctionAction.trim() || null
            : null,
        });

      if (insertError) {
        console.error("Registratie opslaan mislukt:", insertError);
        setErrorMessage(t("saveFailed"));
        return;
      }

      const { error: updateError } = await supabase
        .from("haccp_equipments")
        .update({ last_temp: temperature })
        .eq("id", activeEquipment.id);

      if (updateError) {
        console.warn("last_temp updaten mislukt:", updateError);
      }

      setEquipments((prev) =>
        prev.map((p) =>
          p.id === activeEquipment.id ? { ...p, last_temp: temperature } : p,
        ),
      );

      exitRecord();
    } catch (err) {
      console.error("Onverwachte fout bij opslaan:", err);
      setErrorMessage(t("unexpectedErrorRetry"));
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // Rendering
  // =========================================================================
  return (
    <div className="mt-2 flex flex-col gap-6">
      <UpgradePromptModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      >
        {t("basicPlanPhotoMessage")}
      </UpgradePromptModal>

      {view === "list" || mode === "manage" ? (
        <ListView
          title={title}
          equipments={equipments}
          loading={loadingEquipments}
          mode={mode}
          editBasePath={editBasePath}
          onPick={enterRecord}
          onAdd={handleAddEquipment}
          onDelete={handleDeleteEquipment}
          errorMessage={errorMessage}
          restaurantReady={!!restaurantId}
        />
      ) : (
        <RecordView
          title={title}
          equipment={activeEquipment}
          recordedAtLocal={recordedAtLocal}
          onRecordedAtChange={setRecordedAtLocal}
          temperature={temperature}
          tempColorClass={tempColorClass}
          isOverLimit={isOverLimit}
          limitTemp={limitTemp}
          correctionAction={correctionAction}
          onCorrectionActionChange={setCorrectionAction}
          correctionRequired={correctionRequired}
          stepLayout={stepLayout}
          incOnePress={incOnePress}
          incTenthPress={incTenthPress}
          decOnePress={decOnePress}
          decTenthPress={decTenthPress}
          incCustomPress={incCustomPress}
          decCustomPress={decCustomPress}
          onSetTemperature={setTemperature}
          opmerking={opmerking}
          onOpmerkingChange={setOpmerking}
          photoFiles={photoFiles}
          photoPreviews={photoPreviews}
          onPickPhotos={handlePickPhotos}
          onPhotoChange={handlePhotoChange}
          onRemovePhoto={removePhoto}
          photoInputRef={photoInputRef}
          isSaving={isSaving}
          canSave={canSave}
          onSave={handleSave}
          errorMessage={errorMessage}
        />
      )}
    </div>
  );
}

// =========================================================================
// LIST VIEW
// =========================================================================
type ListViewProps = {
  title: string;
  equipments: Equipment[];
  loading: boolean;
  mode: "manage" | "record";
  editBasePath: string;
  onPick: (eq: Equipment) => void;
  onAdd: (name: string) => Promise<void> | void;
  onDelete: (eq: Equipment) => void;
  errorMessage: string | null;
  restaurantReady: boolean;
};

function ListView({
  title,
  equipments,
  loading,
  mode,
  editBasePath,
  onPick,
  onAdd,
  onDelete,
  errorMessage,
  restaurantReady,
}: ListViewProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
        {title}
      </h2>

      {!restaurantReady ? (
        <p className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-center text-slate-500 shadow-sm">
          {t("noRestaurantLinked")}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {loading ? (
        <p className="text-center text-slate-500">{t("loadingEquipment")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {equipments.map((eq) => (
            <li key={eq.id}>
              <div className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                {/* Record mode: click to record */}
                {mode === "record" ? (
                  <button
                    type="button"
                    onClick={() => onPick(eq)}
                    className="flex flex-1 items-center gap-3 text-left transition-opacity active:opacity-70"
                  >
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xl font-bold text-slate-900 truncate">
                        {eq.name}
                      </span>
                    </div>
                    <ChevronRight
                      className="h-6 w-6 text-slate-400 shrink-0"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  </button>
                ) : (
                  /* Manage mode: display name with edit/delete buttons */
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-xl font-bold text-slate-900 truncate">
                      {eq.name}
                    </span>
                  </div>
                )}

                {/* Right: edit and delete buttons - only in manage mode */}
                {mode === "manage" ? (
                  <div className="flex items-center gap-2 border-l border-slate-100 pl-3">
                    <a
                      href={`${editBasePath}/${eq.id}`}
                      aria-label={`${t("edit")} ${eq.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 active:bg-slate-200"
                    >
                      <Pencil className="h-5 w-5" aria-hidden />
                    </a>
                    <button
                      type="button"
                      onClick={() => onDelete(eq)}
                      aria-label={`${t("delete")} ${eq.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-red-500 transition-colors hover:bg-red-50 active:bg-red-100"
                    >
                      <Trash2 className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add button only in manage mode */}
      {mode === "manage" ? (
        <InlineAddInput
          label={t("addProduct", { name: t("equipment").toLowerCase() })}
          placeholder={t("equipmentName")}
          onAdd={onAdd}
          disabled={!restaurantReady}
        />
      ) : null}
    </div>
  );
}

// =========================================================================
// RECORD VIEW
// =========================================================================
type RecordViewProps = {
  title: string;
  equipment: Equipment | null;
  recordedAtLocal: string;
  onRecordedAtChange: (v: string) => void;
  temperature: number;
  tempColorClass: string;
  isOverLimit: boolean;
  limitTemp: number | null;
  correctionAction: string;
  onCorrectionActionChange: (v: string) => void;
  correctionRequired: boolean;
  stepLayout: "double" | "single";
  incOnePress: ReturnType<typeof useLongPress>;
  incTenthPress: ReturnType<typeof useLongPress>;
  decOnePress: ReturnType<typeof useLongPress>;
  decTenthPress: ReturnType<typeof useLongPress>;
  incCustomPress: ReturnType<typeof useLongPress>;
  decCustomPress: ReturnType<typeof useLongPress>;
  onSetTemperature: (v: number) => void;
  opmerking: string;
  onOpmerkingChange: (v: string) => void;
  photoFiles: File[];
  photoPreviews: string[];
  onPickPhotos: () => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  isSaving: boolean;
  canSave: boolean;
  onSave: () => void;
  errorMessage: string | null;
};

function RecordView({
  title,
  equipment,
  recordedAtLocal,
  onRecordedAtChange,
  temperature,
  tempColorClass,
  isOverLimit,
  limitTemp,
  correctionAction,
  onCorrectionActionChange,
  correctionRequired,
  stepLayout,
  incOnePress,
  incTenthPress,
  decOnePress,
  decTenthPress,
  incCustomPress,
  decCustomPress,
  onSetTemperature,
  opmerking,
  onOpmerkingChange,
  photoFiles,
  photoPreviews,
  onPickPhotos,
  onPhotoChange,
  onRemovePhoto,
  photoInputRef,
  isSaving,
  canSave,
  onSave,
  errorMessage,
}: RecordViewProps) {
  const { t } = useTranslation();
  // Manueel typen via klik op de temperatuur
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [manualText, setManualText] = useState("");
  const manualInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isManualEdit) {
      manualInputRef.current?.focus();
      manualInputRef.current?.select?.();
    }
  }, [isManualEdit]);

  const startManual = () => {
    setManualText(temperature.toFixed(1));
    setIsManualEdit(true);
  };
  const commitManual = () => {
    const parsed = Number.parseFloat(manualText.replace(",", "."));
    if (Number.isFinite(parsed)) onSetTemperature(roundTenth(parsed));
    setIsManualEdit(false);
  };

  const photoSlotsLeft = MAX_PHOTOS - photoFiles.length;

  const unitLabel =
    stepLayout === "single" && equipment?.unit ? equipment.unit : "°C";
  const tempLabel = useMemo(
    () => `${temperature.toFixed(1)}${unitLabel}`,
    [temperature, unitLabel],
  );
  const stepLabel = (() => {
    if (stepLayout !== "single") return "";
    const s =
      typeof equipment?.step === "number" && equipment.step > 0
        ? equipment.step
        : 0.1;
    return String(s).replace(".", ",");
  })();

  return (
    <div className="flex flex-col gap-6">
      {/* Datum & tijd van meting */}
      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
          {t("measurementDateTimeLabel")}
        </span>
        <input
          type="datetime-local"
          value={recordedAtLocal}
          onChange={(e) => onRecordedAtChange(e.target.value)}
          className="min-h-[80px] w-full rounded-2xl border border-slate-200 bg-white px-5 text-center text-2xl font-black tabular-nums text-slate-900 shadow-sm outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 sm:text-3xl"
        />
      </label>

      <h3 className="text-center text-2xl font-extrabold text-slate-900">
        {equipment?.name ?? title}
      </h3>

      {/* Limit info */}
      {limitTemp !== null ? (
        <p className="text-center text-sm font-semibold text-slate-500">
          {t("limitLabel", { value: limitTemp.toFixed(1), unit: unitLabel })}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {/*
        Temperatuur-blok – verticale layout:
          [ +1  ][+0.1]   <- groot & klein, allebei met long-press
              <temp>
          [ -1  ][-0.1]
      */}
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3">
        {stepLayout === "double" ? (
          <div className="flex w-full items-stretch gap-3">
            <SupercellButton
              size="lg"
              variant="neutral"
              {...incOnePress}
              aria-label={t("increaseOneDegreeFast")}
              className="flex min-h-[96px] flex-[2] select-none items-center justify-center rounded-3xl text-4xl normal-case"
            >
              + 1°
            </SupercellButton>
            <SupercellButton
              size="lg"
              variant="neutral"
              {...incTenthPress}
              aria-label={t("increaseTenthDegreeFast")}
              className="flex min-h-[96px] flex-1 select-none items-center justify-center rounded-3xl border border-slate-100 text-2xl normal-case"
            >
              + 0,1°
            </SupercellButton>
          </div>
        ) : (
          <SupercellButton
            size="lg"
            variant="neutral"
            {...incCustomPress}
            aria-label={t("increaseStepFast", { step: stepLabel, unit: unitLabel })}
            className="flex min-h-[96px] w-full select-none items-center justify-center rounded-3xl text-3xl normal-case"
          >
            + {stepLabel}
            {unitLabel ? ` ${unitLabel}` : ""}
          </SupercellButton>
        )}

        <div className="flex w-full min-h-[6rem] items-center justify-center py-2">
          {isManualEdit ? (
            <input
              ref={manualInputRef}
              type="number"
              inputMode="decimal"
              step="0.1"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              onBlur={commitManual}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitManual();
                }
                if (e.key === "Escape") setIsManualEdit(false);
              }}
              className={`w-full rounded-2xl border border-slate-200 bg-white px-2 py-3 text-center text-7xl font-black tabular-nums leading-none shadow-sm outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 ${tempColorClass}`}
              aria-label={t("manualTemperatureInput")}
            />
          ) : (
            <SupercellButton
              size="lg"
              variant="neutral"
              onClick={startManual}
              aria-label={t("currentTemperatureAria", { temp: tempLabel })}
              className={`min-h-[112px] w-full rounded-3xl border border-slate-100 px-2 py-4 text-center text-8xl tabular-nums leading-none normal-case ${tempColorClass}`}
            >
              {tempLabel}
            </SupercellButton>
          )}
        </div>

        {stepLayout === "double" ? (
          <div className="flex w-full items-stretch gap-3">
            <SupercellButton
              size="lg"
              variant="neutral"
              {...decOnePress}
              aria-label={t("decreaseOneDegreeFast")}
              className="flex min-h-[96px] flex-[2] select-none items-center justify-center rounded-3xl text-4xl normal-case"
            >
              − 1°
            </SupercellButton>
            <SupercellButton
              size="lg"
              variant="neutral"
              {...decTenthPress}
              aria-label={t("decreaseTenthDegreeFast")}
              className="flex min-h-[96px] flex-1 select-none items-center justify-center rounded-3xl border border-slate-100 text-2xl normal-case"
            >
              − 0,1°
            </SupercellButton>
          </div>
        ) : (
          <SupercellButton
            size="lg"
            variant="neutral"
            {...decCustomPress}
            aria-label={t("decreaseStepFast", { step: stepLabel, unit: unitLabel })}
            className="flex min-h-[96px] w-full select-none items-center justify-center rounded-3xl text-3xl normal-case"
          >
            − {stepLabel}
            {unitLabel ? ` ${unitLabel}` : ""}
          </SupercellButton>
        )}
      </div>

      <p className="text-center text-sm text-slate-500">
        {t("holdButtonHint")}
      </p>

      {/* Limit waarschuwing + corrigerende maatregel */}
      {isOverLimit && limitTemp !== null ? (
        <div
          role="alert"
          aria-live="polite"
          className="flex flex-col gap-3 rounded-2xl border-2 border-red-300 border-b-4 border-b-red-500 bg-red-50 px-5 py-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
              <AlertTriangle className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black text-red-700">
                {t("valueOverLimit", { value: limitTemp.toFixed(1), unit: unitLabel })}
              </p>
              <p className="mt-1 text-sm font-semibold text-red-700/90">
                {t("correctiveActionRequiredHelp")}
              </p>
            </div>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-red-700">
              {t("correctiveAction")}
            </span>
            <textarea
              value={correctionAction}
              onChange={(e) => onCorrectionActionChange(e.target.value)}
              placeholder={t("correctiveActionPlaceholder")}
              rows={3}
              autoFocus
              className={[
                "w-full resize-none rounded-2xl border-2 border-b-4 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:ring-4",
                correctionRequired
                  ? "border-red-400 border-b-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-slate-200 border-b-slate-300 focus:border-slate-900 focus:ring-slate-900/10",
              ].join(" ")}
              aria-invalid={correctionRequired}
              aria-required="true"
            />
            {correctionRequired ? (
              <span className="text-xs font-bold text-red-700">
                {t("correctiveActionRequired")}
              </span>
            ) : null}
          </label>
        </div>
      ) : null}

      {/* Opmerking */}
      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
          {t("noteOptional")}
        </span>
        <textarea
          value={opmerking}
          onChange={(e) => onOpmerkingChange(e.target.value)}
          placeholder={t("notePlaceholder")}
          rows={3}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-lg font-semibold text-slate-900 shadow-sm outline-none resize-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
        />
      </label>

      {/* Foto-knop */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onPhotoChange}
      />
      <SupercellButton
        size="lg"
        variant="neutral"
        onClick={onPickPhotos}
        disabled={isSaving || photoSlotsLeft <= 0}
        className="flex min-h-[80px] w-full items-center justify-center gap-3 border border-slate-200 text-xl normal-case"
      >
        <Camera className="h-7 w-7" aria-hidden />
        {photoSlotsLeft <= 0
          ? t("maxPhotos", { count: MAX_PHOTOS })
          : photoFiles.length > 0
            ? t("addPhotoProgress", { current: photoFiles.length, max: MAX_PHOTOS })
            : t("pickPhoto", { count: MAX_PHOTOS })}
      </SupercellButton>

      {photoPreviews.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {photoPreviews.map((url, i) => (
            <div key={url} className="relative">
              <img
                src={url}
                alt={t("photoAlt", { number: i + 1 })}
                className="h-28 w-full rounded-xl border border-slate-100 object-cover shadow-sm"
              />
              <SupercellButton
                size="icon"
                variant="danger"
                onClick={() => onRemovePhoto(i)}
                aria-label={t("removePhoto", { number: i + 1 })}
                className="absolute -right-3 -top-3 flex h-16 w-16 items-center justify-center rounded-full border-b-[4px] ring-4 ring-white"
              >
                <X className="h-4 w-4" strokeWidth={3} aria-hidden />
              </SupercellButton>
            </div>
          ))}
        </div>
      ) : null}

      {/* Save */}
      <SupercellButton
        size="lg"
        variant="success"
        onClick={onSave}
        disabled={!canSave}
        aria-busy={isSaving}
        className="flex min-h-[96px] w-full items-center justify-center gap-3 text-2xl normal-case"
      >
        {isSaving ? (
          t("saving")
        ) : (
          <>
            <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
            {t("save")}
          </>
        )}
      </SupercellButton>
    </div>
  );
}

// =========================================================================
// helpers
// =========================================================================
function roundTenth(n: number): number {
  return Math.round(n * 10) / 10;
}
