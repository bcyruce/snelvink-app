"use client";

import UpgradePromptModal from "@/components/UpgradePromptModal";
import { useTranslation } from "@/hooks/useTranslation";
import { useLongPress } from "@/hooks/useLongPress";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import {
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
  last_temp: number | null;
};

type Props = {
  moduleType: ModuleType;
  /** Titel bovenaan de pagina, bv. "Koeling". */
  title: string;
  /** Standaardtemperatuur als een nieuw apparaat geen geschiedenis heeft. */
  defaultTemperature: number;
  /** Naam voor het automatisch aangemaakte eerste apparaat. */
  firstEquipmentName: string;
};

const MAX_PHOTOS = 5;
const STORAGE_BUCKET = "haccp_photos";

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Formatteer een Date naar het formaat dat <input type="datetime-local">
 * verwacht: "YYYY-MM-DDTHH:mm" (lokale tijd, geen TZ).
 */
function formatLocalDateTime(d: Date): string {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  );
}

/**
 * Zet een "YYYY-MM-DDTHH:mm" string om in een ISO timestamp voor Supabase.
 * Valt terug op "nu" als de invoer onvolledig is.
 */
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
}: Props) {
  const { t } = useTranslation();
  const { user, profile, isFreePlan } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;

  // ---------- view state ----------
  const [view, setView] = useState<"list" | "record">("list");
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loadingEquipments, setLoadingEquipments] = useState(true);
  const [isManaging, setIsManaging] = useState(false);
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
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ---------- derived ----------
  const tempColorClass = "text-black"; // expliciete eis: nul-zwart
  const canSave = !isSaving && !!restaurantId && !!activeEquipment;

  // ---------- load equipments ----------
  const loadEquipments = useCallback(async () => {
    if (!restaurantId) return;
    setLoadingEquipments(true);
    setErrorMessage(null);
    const { data, error } = await supabase
      .from("haccp_equipments")
      .select("id, name, type, last_temp")
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

    // Eerste keer dat dit restaurant deze module opent → 1 apparaat aanmaken.
    if (rows.length === 0 && !ensuredDefaultRef.current) {
      ensuredDefaultRef.current = true;
      const { data: created, error: insertError } = await supabase
        .from("haccp_equipments")
        .insert({
          restaurant_id: restaurantId,
          name: firstEquipmentName,
          type: moduleType,
          last_temp: null,
        })
        .select("id, name, type, last_temp")
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
  }, [loadEquipments]);

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
      })
      .select("id, name, type, last_temp")
      .single();

    if (error) {
      console.error("Apparaat toevoegen mislukt:", error);
      setErrorMessage("Apparaat toevoegen mislukt.");
      return;
    }
    if (data) setEquipments((prev) => [...prev, data as Equipment]);
  }, [restaurantId, moduleType, equipments.length, firstEquipmentName]);

  const handleRenameEquipment = useCallback(
    async (eq: Equipment) => {
      const proposed = window.prompt("Nieuwe naam voor het apparaat", eq.name);
      if (!proposed) return;
      const name = proposed.trim();
      if (!name || name === eq.name) return;

      const { error } = await supabase
        .from("haccp_equipments")
        .update({ name })
        .eq("id", eq.id);

      if (error) {
        console.error("Hernoemen mislukt:", error);
        setErrorMessage("Hernoemen mislukt.");
        return;
      }
      setEquipments((prev) =>
        prev.map((p) => (p.id === eq.id ? { ...p, name } : p)),
      );
    },
    [],
  );

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
      setTemperature(
        typeof eq.last_temp === "number" ? eq.last_temp : defaultTemperature,
      );
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
      // unmount cleanup van eventueel openstaande object-URLs
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
    // input resetten zodat dezelfde file nogmaals kan worden gekozen
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
        // niet fataal, log alleen
        console.warn("last_temp updaten mislukt:", updateError);
      }

      // Lokale lijst alvast bijwerken zodat de gebruiker de nieuwe last_temp ziet.
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

      {view === "list" ? (
        <ListView
          title={title}
          equipments={equipments}
          loading={loadingEquipments}
          isManaging={isManaging}
          onToggleManaging={() => setIsManaging((v) => !v)}
          onPick={enterRecord}
          onAdd={handleAddEquipment}
          onRename={handleRenameEquipment}
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
          incOnePress={incOnePress}
          incTenthPress={incTenthPress}
          decOnePress={decOnePress}
          decTenthPress={decTenthPress}
          onSetTemperature={setTemperature}
          photoFiles={photoFiles}
          photoPreviews={photoPreviews}
          onPickPhotos={handlePickPhotos}
          onPhotoChange={handlePhotoChange}
          onRemovePhoto={removePhoto}
          photoInputRef={photoInputRef}
          isSaving={isSaving}
          canSave={canSave}
          onCancel={exitRecord}
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
  isManaging: boolean;
  onToggleManaging: () => void;
  onPick: (eq: Equipment) => void;
  onAdd: () => void;
  onRename: (eq: Equipment) => void;
  onDelete: (eq: Equipment) => void;
  errorMessage: string | null;
  restaurantReady: boolean;
};

function ListView({
  title,
  equipments,
  loading,
  isManaging,
  onToggleManaging,
  onPick,
  onAdd,
  onRename,
  onDelete,
  errorMessage,
  restaurantReady,
}: ListViewProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
          {title}
        </h2>
        <button
          type="button"
          onClick={onToggleManaging}
          aria-pressed={isManaging}
          className={`h-12 rounded-2xl px-4 text-base font-black shadow-sm transition-transform active:scale-95 ${
            isManaging ? "bg-green-600 text-white" : "bg-gray-900 text-white"
          }`}
        >
          {isManaging ? "Klaar" : "Wijzigen"}
        </button>
      </div>

      {!restaurantReady ? (
        <p className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 text-center text-gray-600">
          Geen restaurant gekoppeld aan je account.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {loading ? (
        <p className="text-center text-gray-500">Apparaten laden…</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {equipments.map((eq) => (
            <li key={eq.id}>
              {isManaging ? (
                <div className="flex items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <span className="flex-1 truncate text-xl font-bold text-gray-900">
                    {eq.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRename(eq)}
                    aria-label={`Hernoem ${eq.name}`}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition-transform active:scale-90"
                  >
                    <Pencil className="h-5 w-5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(eq)}
                    aria-label={`Verwijder ${eq.name}`}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500 text-white transition-transform active:scale-90"
                  >
                    <Trash2 className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onPick(eq)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gray-100 px-5 py-6 text-left text-2xl font-black text-gray-900 shadow-sm transition-transform active:scale-[0.98]"
                >
                  <span className="flex-1 truncate">{eq.name}</span>
                  <span className="text-base font-bold text-gray-500">
                    {typeof eq.last_temp === "number"
                      ? `${eq.last_temp.toFixed(1)} °C`
                      : "—"}
                  </span>
                  <ChevronRight
                    className="h-7 w-7 text-gray-500"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onAdd}
        disabled={!restaurantReady}
        className="flex h-20 w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-white text-xl font-black text-gray-700 shadow-sm transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
        Apparaat toevoegen
      </button>
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
  incOnePress: ReturnType<typeof useLongPress>;
  incTenthPress: ReturnType<typeof useLongPress>;
  decOnePress: ReturnType<typeof useLongPress>;
  decTenthPress: ReturnType<typeof useLongPress>;
  onSetTemperature: (v: number) => void;
  photoFiles: File[];
  photoPreviews: string[];
  onPickPhotos: () => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
  isSaving: boolean;
  canSave: boolean;
  onCancel: () => void;
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
  incOnePress,
  incTenthPress,
  decOnePress,
  decTenthPress,
  onSetTemperature,
  photoFiles,
  photoPreviews,
  onPickPhotos,
  onPhotoChange,
  onRemovePhoto,
  photoInputRef,
  isSaving,
  canSave,
  onCancel,
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
        <span className="text-sm font-bold uppercase tracking-wide text-gray-500">
          Datum &amp; tijd van meting
        </span>
        <input
          type="datetime-local"
          value={recordedAtLocal}
          onChange={(e) => onRecordedAtChange(e.target.value)}
          className="h-20 w-full rounded-2xl border-2 border-gray-300 bg-white px-5 text-center text-2xl font-black tabular-nums text-gray-900 shadow-sm outline-none focus:border-gray-900 sm:text-3xl"
        />
      </label>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="h-12 rounded-2xl bg-gray-200 px-4 text-base font-black text-gray-800 transition-transform active:scale-95"
        >
          ← Terug naar lijst
        </button>
        <h3 className="flex-1 truncate text-right text-2xl font-extrabold text-gray-900">
          {equipment?.name ?? title}
        </h3>
      </div>

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
          <button
            type="button"
            {...incOnePress}
            aria-label="Eén graad hoger (houd ingedrukt voor sneller)"
            className="flex h-24 flex-[2] select-none items-center justify-center rounded-3xl bg-gray-900 text-4xl font-black text-white shadow-md transition-transform active:scale-95"
          >
            + 1°
          </button>
          <button
            type="button"
            {...incTenthPress}
            aria-label="0,1 graad hoger (houd ingedrukt voor sneller)"
            className="flex h-24 flex-1 select-none items-center justify-center rounded-3xl bg-gray-200 text-2xl font-black text-gray-800 shadow-md transition-transform active:scale-95"
          >
            + 0,1°
          </button>
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
              className={`w-full rounded-2xl border-2 border-gray-300 bg-white px-2 py-3 text-center text-7xl font-black tabular-nums leading-none shadow-inner outline-none focus:border-gray-900 ${tempColorClass}`}
              aria-label="Temperatuur handmatig invoeren"
            />
          ) : (
            <button
              type="button"
              onClick={startManual}
              aria-label={`Huidige temperatuur ${tempLabel}, tik om handmatig in te voeren`}
              className={`w-full rounded-2xl px-2 py-2 text-center text-8xl font-black tabular-nums leading-none ${tempColorClass}`}
            >
              {tempLabel}
            </button>
          )}
        </div>

        <div className="flex w-full items-stretch gap-3">
          <button
            type="button"
            {...decOnePress}
            aria-label="Eén graad lager (houd ingedrukt voor sneller)"
            className="flex h-24 flex-[2] select-none items-center justify-center rounded-3xl bg-gray-900 text-4xl font-black text-white shadow-md transition-transform active:scale-95"
          >
            − 1°
          </button>
          <button
            type="button"
            {...decTenthPress}
            aria-label="0,1 graad lager (houd ingedrukt voor sneller)"
            className="flex h-24 flex-1 select-none items-center justify-center rounded-3xl bg-gray-200 text-2xl font-black text-gray-800 shadow-md transition-transform active:scale-95"
          >
            − 0,1°
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-gray-500">
        Houd een knop ingedrukt om snel aan te passen. Tik op het getal om
        handmatig in te voeren.
      </p>

      {/* Foto-knop */}
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
        className="flex h-20 w-full items-center justify-center gap-3 rounded-2xl border-2 border-gray-300 bg-white text-xl font-bold text-gray-900 shadow-sm transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Camera className="h-7 w-7" aria-hidden />
        {photoSlotsLeft <= 0
          ? `Maximaal ${MAX_PHOTOS} foto's`
          : photoFiles.length > 0
            ? `Foto toevoegen (${photoFiles.length}/${MAX_PHOTOS})`
            : "Foto maken of kiezen (max 5)"}
      </button>

      {photoPreviews.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {photoPreviews.map((url, i) => (
            <div key={url} className="relative">
              <img
                src={url}
                alt={`Foto ${i + 1}`}
                className="h-28 w-full rounded-xl border border-gray-200 object-cover shadow-sm"
              />
              <button
                type="button"
                onClick={() => onRemovePhoto(i)}
                aria-label={`Foto ${i + 1} verwijderen`}
                className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white shadow-md ring-4 ring-white transition-transform active:scale-90"
              >
                <X className="h-4 w-4" strokeWidth={3} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Save */}
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave}
        aria-busy={isSaving}
        className="flex h-24 w-full items-center justify-center gap-3 rounded-2xl bg-green-600 text-2xl font-black text-white shadow-md transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSaving ? (
          "Opslaan…"
        ) : (
          <>
            <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
            Opslaan
          </>
        )}
      </button>
    </div>
  );
}

// =========================================================================
// helpers
// =========================================================================
function roundTenth(n: number): number {
  // Vermijd 0.30000000000000004 enz.
  return Math.round(n * 10) / 10;
}
