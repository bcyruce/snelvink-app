"use client";

import InlineAddInput from "@/components/InlineAddInput";
import SupercellButton from "@/components/SupercellButton";
import UpgradePromptModal from "@/components/UpgradePromptModal";
import { useTranslation } from "@/hooks/useTranslation";
import { useLongPress } from "@/hooks/useLongPress";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import {
  listContainerVariants,
  listItemVariants,
  cardPressMotionProps,
  iconPressMotionProps,
  modalSheetVariants,
} from "@/lib/uiMotion";
import { AnimatePresence, motion } from "framer-motion";
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
  min_value: number | null;
  max_value: number | null;
  require_correction_out_of_range: boolean | null;
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
  /**
   * Wanneer gezet, springt de module direct in de record-view voor het
   * apparaat met dit id (na het laden van de lijst).
   */
  initialItemId?: string;
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
  initialItemId,
}: Props) {
  const isCustom = !!customModuleId;
  const editBasePath = isCustom
    ? `/app/taken/custom/${customModuleId}/edit`
    : `/app/taken/${moduleType}/edit`;
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
  const minValue =
    typeof activeEquipment?.min_value === "number" ? activeEquipment.min_value : null;
  const maxValue =
    typeof activeEquipment?.max_value === "number" ? activeEquipment.max_value : null;
  const isOutOfRange =
    (minValue !== null && temperature < minValue) ||
    (maxValue !== null && temperature > maxValue);
  const isOverLimit = limitTemp !== null && temperature > limitTemp;
  const needsCorrectionAction = isCustom
    ? activeEquipment?.require_correction_out_of_range === true && isOutOfRange
    : isOverLimit;
  const tempColorClass = needsCorrectionAction ? "text-red-600" : "text-slate-900";
  const correctionRequired =
    needsCorrectionAction && correctionAction.trim().length === 0;
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
        "id, name, type, default_temp, last_temp, limit_temp, min_value, max_value, require_correction_out_of_range, step, unit",
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
          min_value: null,
          max_value: null,
          require_correction_out_of_range: false,
          custom_module_id: customModuleId ?? null,
        })
        .select(
          "id, name, type, default_temp, last_temp, limit_temp, min_value, max_value, require_correction_out_of_range, step, unit",
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
          min_value: null,
          max_value: null,
          require_correction_out_of_range: false,
          custom_module_id: customModuleId ?? null,
        })
        .select(
          "id, name, type, default_temp, last_temp, limit_temp, min_value, max_value, require_correction_out_of_range, step, unit",
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

  // Spring direct naar de record-view wanneer initialItemId is meegegeven.
  const autoEnteredRef = useRef(false);
  useEffect(() => {
    if (autoEnteredRef.current) return;
    if (mode !== "record" || !initialItemId) return;
    if (loadingEquipments) return;
    const target = equipments.find((e) => e.id === initialItemId);
    if (!target) return;
    autoEnteredRef.current = true;
    enterRecord(target);
  }, [initialItemId, loadingEquipments, equipments, mode, enterRecord]);

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
          correction_action: needsCorrectionAction
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
          isCustomNumber={isCustom}
          isOverLimit={isOverLimit}
          isOutOfRange={isOutOfRange}
          limitTemp={limitTemp}
          minValue={minValue}
          maxValue={maxValue}
          needsCorrectionAction={needsCorrectionAction}
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
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="mb-2">
        <h2 className="text-2xl font-black tracking-tight text-[var(--theme-fg)]">
          {title}
        </h2>
        <p className="mt-1 text-sm font-medium text-[var(--theme-muted)]">
          {mode === "manage" ? t("manageItems") : t("selectToRecord")}
        </p>
      </div>

      {!restaurantReady ? (
        <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] px-5 py-8 text-center">
          <p className="text-base font-semibold text-[var(--theme-muted)]">
            {t("noRestaurantLinked")}
          </p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3">
          <p className="text-center text-sm font-bold text-red-700">
            {errorMessage}
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 rounded-full border-3 border-[var(--theme-primary)] border-t-transparent"
          />
        </div>
      ) : (
        <motion.ul
          className="flex flex-col gap-2"
          variants={listContainerVariants}
          initial="initial"
          animate="animate"
        >
          <AnimatePresence>
            {equipments.map((eq) => (
              <motion.li
                key={eq.id}
                layout
                variants={listItemVariants}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
              >
                <motion.div
                  {...cardPressMotionProps}
                  className="group flex items-center gap-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4"
                >
                  {/* Record mode: click to record */}
                  {mode === "record" ? (
                    <button
                      type="button"
                      onClick={() => onPick(eq)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-primary)]/10"
                      >
                        <span className="text-lg font-black text-[var(--theme-primary)]">
                          {eq.name.charAt(0).toUpperCase()}
                        </span>
                      </motion.div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-base font-bold text-[var(--theme-fg)]">
                          {eq.name}
                        </span>
                        {eq.last_temp !== null ? (
                          <span className="text-sm font-medium text-[var(--theme-muted)]">
                            {t("lastValue")}: {eq.last_temp.toFixed(1)}
                            {eq.unit ?? "°C"}
                          </span>
                        ) : null}
                      </div>
                      <motion.span
                        initial={{ x: 0 }}
                        whileHover={{ x: 4 }}
                        className="inline-flex"
                      >
                        <ChevronRight
                          className="h-5 w-5 shrink-0 text-[var(--theme-muted)]"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                      </motion.span>
                    </button>
                  ) : (
                    /* Manage mode: display name with edit/delete buttons */
                    <>
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-primary)]/10"
                      >
                        <span className="text-lg font-black text-[var(--theme-primary)]">
                          {eq.name.charAt(0).toUpperCase()}
                        </span>
                      </motion.div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-base font-bold text-[var(--theme-fg)]">
                          {eq.name}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Right: edit and delete buttons - only in manage mode */}
                  {mode === "manage" ? (
                    <div className="flex items-center gap-1">
                      <motion.a
                        href={`${editBasePath}/${eq.id}`}
                        aria-label={`${t("edit")} ${eq.name}`}
                        {...iconPressMotionProps}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--theme-muted)] transition-colors hover:bg-[var(--theme-primary)]/10 hover:text-[var(--theme-primary)]"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </motion.a>
                      <motion.button
                        type="button"
                        onClick={() => onDelete(eq)}
                        aria-label={`${t("delete")} ${eq.name}`}
                        {...iconPressMotionProps}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--theme-muted)] transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </motion.button>
                    </div>
                  ) : null}
                </motion.div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      {/* Add button only in manage mode */}
      {mode === "manage" ? (
        <div className="mt-2">
          <InlineAddInput
            label={t("addProduct", { name: t("equipment").toLowerCase() })}
            placeholder={t("equipmentName")}
            onAdd={onAdd}
            disabled={!restaurantReady}
          />
        </div>
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
  isCustomNumber: boolean;
  isOverLimit: boolean;
  isOutOfRange: boolean;
  limitTemp: number | null;
  minValue: number | null;
  maxValue: number | null;
  needsCorrectionAction: boolean;
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
  isCustomNumber,
  isOverLimit,
  isOutOfRange,
  limitTemp,
  minValue,
  maxValue,
  needsCorrectionAction,
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
  const rangeLabel = (() => {
    if (!isCustomNumber) return "";
    if (minValue !== null && maxValue !== null) {
      return `${minValue.toFixed(1)} - ${maxValue.toFixed(1)} ${unitLabel}`;
    }
    if (minValue !== null) return `>= ${minValue.toFixed(1)} ${unitLabel}`;
    if (maxValue !== null) return `<= ${maxValue.toFixed(1)} ${unitLabel}`;
    return "";
  })();
  const warningText = isCustomNumber
    ? isOutOfRange
      ? `Waarde valt buiten het ingestelde bereik (${rangeLabel || "-"})`
      : "Corrigerende maatregel is verplicht."
    : t("valueOverLimit", { value: limitTemp?.toFixed(1) ?? "0.0", unit: unitLabel });

  return (
    <motion.div
      className="flex flex-col gap-5"
      variants={modalSheetVariants}
      initial="initial"
      animate="animate"
    >
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, type: "spring", stiffness: 300, damping: 25 }}
        className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4"
      >
        <h3 className="text-center text-xl font-black text-[var(--theme-fg)]">
          {equipment?.name ?? title}
        </h3>
        {isCustomNumber && rangeLabel ? (
          <p className="mt-1 text-center text-sm font-semibold text-[var(--theme-muted)]">
            Bereik: {rangeLabel}
          </p>
        ) : null}
        {!isCustomNumber && limitTemp !== null ? (
          <p className="mt-1 text-center text-sm font-semibold text-[var(--theme-muted)]">
            {t("limitLabel", { value: limitTemp.toFixed(1), unit: unitLabel })}
          </p>
        ) : null}
      </motion.div>

      {/* Date/Time Input */}
      <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
            {t("measurementDateTimeLabel")}
          </span>
          <input
            type="datetime-local"
            value={recordedAtLocal}
            onChange={(e) => onRecordedAtChange(e.target.value)}
            className="h-14 w-full rounded-xl border border-[var(--theme-card-border)] bg-white px-4 text-center text-lg font-bold tabular-nums text-[var(--theme-fg)] outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20"
          />
        </label>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3">
          <p className="text-center text-sm font-bold text-red-700">
            {errorMessage}
          </p>
        </div>
      ) : null}

      {/* Temperature Control Card */}
      <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3">
          {/* Increase buttons */}
          {stepLayout === "double" ? (
            <div className="flex w-full items-stretch gap-2">
              <SupercellButton
                size="lg"
                variant="neutral"
                {...incOnePress}
                aria-label={t("increaseOneDegreeFast")}
                className="flex h-16 flex-[2] select-none items-center justify-center rounded-xl text-2xl font-black normal-case"
              >
                +1°
              </SupercellButton>
              <SupercellButton
                size="lg"
                variant="neutral"
                {...incTenthPress}
                aria-label={t("increaseTenthDegreeFast")}
                className="flex h-16 flex-1 select-none items-center justify-center rounded-xl text-lg font-bold normal-case"
              >
                +0.1°
              </SupercellButton>
            </div>
          ) : (
            <SupercellButton
              size="lg"
              variant="neutral"
              {...incCustomPress}
              aria-label={t("increaseStepFast", { step: stepLabel, unit: unitLabel })}
              className="flex h-16 w-full select-none items-center justify-center rounded-xl text-xl font-black normal-case"
            >
              +{stepLabel}{unitLabel ? ` ${unitLabel}` : ""}
            </SupercellButton>
          )}

          {/* Temperature Display */}
          <div className="w-full py-3">
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
                className={`w-full rounded-2xl border-2 border-[var(--theme-primary)] bg-white px-4 py-6 text-center text-5xl font-black tabular-nums leading-none outline-none ${tempColorClass}`}
                aria-label={t("manualTemperatureInput")}
              />
            ) : (
              <button
                type="button"
                onClick={startManual}
                aria-label={t("currentTemperatureAria", { temp: tempLabel })}
                className={`w-full rounded-2xl border-2 border-transparent bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-6 text-center text-5xl font-black tabular-nums leading-none transition-all hover:border-[var(--theme-primary)]/30 active:scale-[0.98] ${needsCorrectionAction ? "text-red-600" : "text-[var(--theme-fg)]"}`}
              >
                {tempLabel}
              </button>
            )}
          </div>

          {/* Decrease buttons */}
          {stepLayout === "double" ? (
            <div className="flex w-full items-stretch gap-2">
              <SupercellButton
                size="lg"
                variant="neutral"
                {...decOnePress}
                aria-label={t("decreaseOneDegreeFast")}
                className="flex h-16 flex-[2] select-none items-center justify-center rounded-xl text-2xl font-black normal-case"
              >
                -1°
              </SupercellButton>
              <SupercellButton
                size="lg"
                variant="neutral"
                {...decTenthPress}
                aria-label={t("decreaseTenthDegreeFast")}
                className="flex h-16 flex-1 select-none items-center justify-center rounded-xl text-lg font-bold normal-case"
              >
                -0.1°
              </SupercellButton>
            </div>
          ) : (
            <SupercellButton
              size="lg"
              variant="neutral"
              {...decCustomPress}
              aria-label={t("decreaseStepFast", { step: stepLabel, unit: unitLabel })}
              className="flex h-16 w-full select-none items-center justify-center rounded-xl text-xl font-black normal-case"
            >
              -{stepLabel}{unitLabel ? ` ${unitLabel}` : ""}
            </SupercellButton>
          )}
        </div>
        <p className="mt-3 text-center text-xs font-medium text-[var(--theme-muted)]">
          {t("holdButtonHint")}
        </p>
      </div>

      {/* Limit Warning */}
      {needsCorrectionAction ? (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-2xl border-2 border-red-300 bg-red-50 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
              <AlertTriangle className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black text-red-700">
                {warningText}
              </p>
              <p className="mt-1 text-sm font-medium text-red-600">
                {t("correctiveActionRequiredHelp")}
              </p>
            </div>
          </div>
          <label className="mt-4 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-700">
              {t("correctiveAction")}
            </span>
            <textarea
              value={correctionAction}
              onChange={(e) => onCorrectionActionChange(e.target.value)}
              placeholder={t("correctiveActionPlaceholder")}
              rows={2}
              autoFocus
              className={[
                "w-full resize-none rounded-xl border-2 bg-white px-4 py-3 text-base font-semibold text-[var(--theme-fg)] outline-none transition-all focus:ring-2",
                correctionRequired
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                  : "border-slate-200 focus:border-[var(--theme-primary)] focus:ring-[var(--theme-primary)]/20",
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

      {/* Note Section */}
      <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
            {t("noteOptional")}
          </span>
          <textarea
            value={opmerking}
            onChange={(e) => onOpmerkingChange(e.target.value)}
            placeholder={t("notePlaceholder")}
            rows={2}
            className="w-full resize-none rounded-xl border border-[var(--theme-card-border)] bg-white px-4 py-3 text-base font-medium text-[var(--theme-fg)] outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20"
          />
        </label>
      </div>

      {/* Photo Section */}
      <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPhotoChange}
        />
        <button
          type="button"
          onClick={onPickPhotos}
          disabled={isSaving || photoSlotsLeft <= 0}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--theme-card-border)] bg-white text-base font-bold text-[var(--theme-muted)] transition-all hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] disabled:opacity-50"
        >
          <Camera className="h-5 w-5" aria-hidden />
          {photoSlotsLeft <= 0
            ? t("maxPhotos", { count: MAX_PHOTOS })
            : photoFiles.length > 0
              ? t("addPhotoProgress", { current: photoFiles.length, max: MAX_PHOTOS })
              : t("pickPhoto", { count: MAX_PHOTOS })}
        </button>

        {photoPreviews.length > 0 ? (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {photoPreviews.map((url, i) => (
              <div key={url} className="relative">
                <img
                  src={url}
                  alt={t("photoAlt", { number: i + 1 })}
                  className="h-20 w-full rounded-lg border border-[var(--theme-card-border)] object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemovePhoto(i)}
                  aria-label={t("removePhoto", { number: i + 1 })}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-transform hover:scale-110"
                >
                  <X className="h-3 w-3" strokeWidth={3} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 280, damping: 24 }}
      >
        <SupercellButton
          size="lg"
          variant="success"
          onClick={onSave}
          disabled={!canSave}
          aria-busy={isSaving}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-lg font-black normal-case"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-5 w-5 rounded-full border-2 border-white border-t-transparent"
              />
              {t("saving")}
            </span>
          ) : (
            <>
              <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
              {t("save")}
            </>
          )}
        </SupercellButton>
      </motion.div>
    </motion.div>
  );
}

// =========================================================================
// helpers
// =========================================================================
function roundTenth(n: number): number {
  return Math.round(n * 10) / 10;
}
