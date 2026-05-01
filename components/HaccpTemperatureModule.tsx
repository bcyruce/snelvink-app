"use client";

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
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ModuleType = "koeling" | "kerntemperatuur";

type Equipment = {
  id: string;
  name: string;
  type: ModuleType;
  default_temp: number | null;
  last_temp: number | null;
  limit_temp: number | null;
};

type Props = {
  moduleType: ModuleType;
  title: string;
  defaultTemperature: number;
  firstEquipmentName: string;
  mode?: "manage" | "record";
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
}: Props) {
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
    const { data, error } = await supabase
      .from("haccp_equipments")
      .select("id, name, type, default_temp, last_temp, limit_temp")
      .eq("restaurant_id", restaurantId)
      .eq("type", moduleType)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("haccp_equipments laden mislukt:", error);
      setErrorMessage("Apparaten laden mislukt. Probeer opnieuw.");
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
          type: moduleType,
          last_temp: null,
          limit_temp: null,
        })
        .select("id, name, type, default_temp, last_temp, limit_temp")
        .single();

      if (insertError) {
        console.error("Standaard apparaat aanmaken mislukt:", insertError);
        setErrorMessage("Kon geen standaard apparaat aanmaken.");
      } else if (created) {
        setEquipments([created as Equipment]);
      }
    } else {
      setEquipments(rows);
    }
    setLoadingEquipments(false);
  }, [restaurantId, moduleType, firstEquipmentName]);

  useEffect(() => {
    void loadEquipments();
  }, [loadEquipments, restaurantId]);

  // ---------- equipment CRUD ----------
  const handleAddEquipment = useCallback(async () => {
    if (!restaurantId) return;
    const proposed = window.prompt(
      "Naam van het nieuwe apparaat",
      `${firstEquipmentName.replace(/\s*\d+$/, "")} ${equipments.length + 1}`,
    );
    if (!proposed) return;
    const name = proposed.trim();
    if (!name) return;

    const { data, error } = await supabase
      .from("haccp_equipments")
      .insert({
        restaurant_id: restaurantId,
        name,
        type: moduleType,
        last_temp: null,
        limit_temp: null,
      })
      .select("id, name, type, default_temp, last_temp, limit_temp")
      .single();

    if (error) {
      console.error("Apparaat toevoegen mislukt:", error);
      setErrorMessage("Apparaat toevoegen mislukt.");
      return;
    }
    if (data) setEquipments((prev) => [...prev, data as Equipment]);
  }, [restaurantId, moduleType, equipments.length, firstEquipmentName]);

  const handleDeleteEquipment = useCallback(
    async (eq: Equipment) => {
      const ok = window.confirm(
        `"${eq.name}" verwijderen? De historie blijft bewaard.`,
      );
      if (!ok) return;

      const { error } = await supabase
        .from("haccp_equipments")
        .delete()
        .eq("id", eq.id);

      if (error) {
        console.error("Verwijderen mislukt:", error);
        setErrorMessage("Verwijderen mislukt.");
        return;
      }
      setEquipments((prev) => prev.filter((p) => p.id !== eq.id));
    },
    [],
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
            setErrorMessage("Foto upload mislukt. Probeer opnieuw.");
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
          module_type: moduleType,
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
        setErrorMessage("Opslaan mislukt. Probeer opnieuw.");
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
      setErrorMessage("Onverwachte fout. Probeer opnieuw.");
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
          moduleType={moduleType}
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
          incOnePress={incOnePress}
          incTenthPress={incTenthPress}
          decOnePress={decOnePress}
          decTenthPress={decTenthPress}
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
  moduleType: ModuleType;
  onPick: (eq: Equipment) => void;
  onAdd: () => void;
  onDelete: (eq: Equipment) => void;
  errorMessage: string | null;
  restaurantReady: boolean;
};

function ListView({
  title,
  equipments,
  loading,
  mode,
  moduleType,
  onPick,
  onAdd,
  onDelete,
  errorMessage,
  restaurantReady,
}: ListViewProps) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
        {title}
      </h2>

      {!restaurantReady ? (
        <p className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-center text-slate-500 shadow-sm">
          Geen restaurant gekoppeld aan je account.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {loading ? (
        <p className="text-center text-slate-500">Apparaten laden…</p>
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
                      href={`/taken/${moduleType}/edit/${eq.id}`}
                      aria-label={`Bewerk ${eq.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 active:bg-slate-200"
                    >
                      <Pencil className="h-5 w-5" aria-hidden />
                    </a>
                    <button
                      type="button"
                      onClick={() => onDelete(eq)}
                      aria-label={`Verwijder ${eq.name}`}
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
        <SupercellButton
          size="lg"
          variant="neutral"
          onClick={onAdd}
          disabled={!restaurantReady}
          className="flex min-h-[80px] w-full items-center justify-center gap-3 border-2 border-dashed border-slate-200 text-xl normal-case"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          Apparaat toevoegen
        </SupercellButton>
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
  incOnePress: ReturnType<typeof useLongPress>;
  incTenthPress: ReturnType<typeof useLongPress>;
  decOnePress: ReturnType<typeof useLongPress>;
  decTenthPress: ReturnType<typeof useLongPress>;
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
  incOnePress,
  incTenthPress,
  decOnePress,
  decTenthPress,
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

  const tempLabel = useMemo(() => `${temperature.toFixed(1)}°C`, [temperature]);

  return (
    <div className="flex flex-col gap-6">
      {/* Datum & tijd van meting */}
      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Datum &amp; tijd van meting
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
          Limiet: {limitTemp.toFixed(1)} °C
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
        <div className="flex w-full items-stretch gap-3">
          <SupercellButton
            size="lg"
            variant="neutral"
            {...incOnePress}
            aria-label="Eén graad hoger (houd ingedrukt voor sneller)"
            className="flex min-h-[96px] flex-[2] select-none items-center justify-center rounded-3xl text-4xl normal-case"
          >
            + 1°
          </SupercellButton>
          <SupercellButton
            size="lg"
            variant="neutral"
            {...incTenthPress}
            aria-label="0,1 graad hoger (houd ingedrukt voor sneller)"
            className="flex min-h-[96px] flex-1 select-none items-center justify-center rounded-3xl border border-slate-100 text-2xl normal-case"
          >
            + 0,1°
          </SupercellButton>
        </div>

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
              aria-label="Temperatuur handmatig invoeren"
            />
          ) : (
            <SupercellButton
              size="lg"
              variant="neutral"
              onClick={startManual}
              aria-label={`Huidige temperatuur ${tempLabel}, tik om handmatig in te voeren`}
              className={`min-h-[112px] w-full rounded-3xl border border-slate-100 px-2 py-4 text-center text-8xl tabular-nums leading-none normal-case ${tempColorClass}`}
            >
              {tempLabel}
            </SupercellButton>
          )}
        </div>

        <div className="flex w-full items-stretch gap-3">
          <SupercellButton
            size="lg"
            variant="neutral"
            {...decOnePress}
            aria-label="Eén graad lager (houd ingedrukt voor sneller)"
            className="flex min-h-[96px] flex-[2] select-none items-center justify-center rounded-3xl text-4xl normal-case"
          >
            − 1°
          </SupercellButton>
          <SupercellButton
            size="lg"
            variant="neutral"
            {...decTenthPress}
            aria-label="0,1 graad lager (houd ingedrukt voor sneller)"
            className="flex min-h-[96px] flex-1 select-none items-center justify-center rounded-3xl border border-slate-100 text-2xl normal-case"
          >
            − 0,1°
          </SupercellButton>
        </div>
      </div>

      <p className="text-center text-sm text-slate-500">
        Houd een knop ingedrukt om snel aan te passen. Tik op het getal om
        handmatig in te voeren.
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
                Temperatuur boven limiet ({limitTemp.toFixed(1)} °C)
              </p>
              <p className="mt-1 text-sm font-semibold text-red-700/90">
                Vul een corrigerende maatregel in om door te gaan.
              </p>
            </div>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-red-700">
              Corrigerende maatregel
            </span>
            <textarea
              value={correctionAction}
              onChange={(e) => onCorrectionActionChange(e.target.value)}
              placeholder="Bijv. Koeling op stand 4 gezet, deur gecontroleerd…"
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
                Verplicht: vul een corrigerende maatregel in.
              </span>
            ) : null}
          </label>
        </div>
      ) : null}

      {/* Opmerking */}
      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Opmerking (optioneel)
        </span>
        <textarea
          value={opmerking}
          onChange={(e) => onOpmerkingChange(e.target.value)}
          placeholder="Voeg een opmerking toe..."
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
          ? `Maximaal ${MAX_PHOTOS} foto's`
          : photoFiles.length > 0
            ? `Foto toevoegen (${photoFiles.length}/${MAX_PHOTOS})`
            : "Foto maken of kiezen (max 5)"}
      </SupercellButton>

      {photoPreviews.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {photoPreviews.map((url, i) => (
            <div key={url} className="relative">
              <img
                src={url}
                alt={`Foto ${i + 1}`}
                className="h-28 w-full rounded-xl border border-slate-100 object-cover shadow-sm"
              />
              <SupercellButton
                size="icon"
                variant="danger"
                onClick={() => onRemovePhoto(i)}
                aria-label={`Foto ${i + 1} verwijderen`}
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
          "Opslaan…"
        ) : (
          <>
            <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
            Opslaan
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
