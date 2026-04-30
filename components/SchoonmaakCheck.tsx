"use client";

import SupercellButton from "@/components/SupercellButton";
import UpgradePromptModal from "@/components/UpgradePromptModal";
import { useTranslation } from "@/hooks/useTranslation";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { Camera, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_PHOTOS = 5;
const STORAGE_BUCKET = "haccp_photos";
const DEFAULT_CLEANING_TASKS = ["Vloer & Afvoer", "Werkbanken"];

type Location = { id: string; name: string };
type CleaningTask = { id: string; name: string };

function pad2(n: number) {
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

type Props = {
  mode?: "manage" | "record";
};

export default function SchoonmaakCheck({ mode = "record" }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, profile, isFreePlan } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;

  // ---------- state ----------
  const [recordedAtLocal, setRecordedAtLocal] = useState<string>(() =>
    formatLocalDateTime(new Date()),
  );

  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  );

  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [checkedTaskIds, setCheckedTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [opmerking, setOpmerking] = useState("");
  // voorkomt dat we voor één locatie meerdere keren de defaults seeden
  const seededLocationRef = useRef<Set<string>>(new Set());

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);

  // ---------- locations ----------
  const loadLocations = useCallback(async () => {
    if (!restaurantId) return;
    setLoadingLocations(true);
    setErrorMessage(null);
    const { data, error } = await supabase
      .from("haccp_locations")
      .select("id, name")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("haccp_locations laden mislukt:", error);
      setErrorMessage("Locaties laden mislukt. Probeer opnieuw.");
    } else {
      setLocations((data ?? []) as Location[]);
    }
    setLoadingLocations(false);
  }, [restaurantId]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const handleAddLocation = useCallback(async () => {
    if (!restaurantId) return;
    const input = window.prompt("Naam van de nieuwe locatie");
    if (!input) return;
    const name = input.trim();
    if (!name) return;

    const { data, error } = await supabase
      .from("haccp_locations")
      .insert({ restaurant_id: restaurantId, name })
      .select("id, name")
      .single();

    if (error) {
      console.error("Locatie toevoegen mislukt:", error);
      setErrorMessage("Locatie toevoegen mislukt.");
      return;
    }
    if (data) {
      const next = data as Location;
      setLocations((prev) => [...prev, next]);
      if (mode === "record") {
        setSelectedLocation(next);
      }
    }
  }, [restaurantId, mode]);

  const handleDeleteLocation = useCallback(
    async (location: Location) => {
      const ok = window.confirm(
        `"${location.name}" verwijderen? Alle taken in deze locatie worden ook verwijderd.`,
      );
      if (!ok) return;

      const { error } = await supabase
        .from("haccp_locations")
        .delete()
        .eq("id", location.id);

      if (error) {
        console.error("Verwijderen mislukt:", error);
        setErrorMessage("Verwijderen mislukt.");
        return;
      }
      setLocations((prev) => prev.filter((l) => l.id !== location.id));
    },
    [],
  );

  // ---------- tasks ----------
  const loadTasks = useCallback(
    async (location: Location) => {
      if (!restaurantId) return;
      setLoadingTasks(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("haccp_cleaning_tasks")
        .select("id, name")
        .eq("restaurant_id", restaurantId)
        .eq("location_id", location.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("haccp_cleaning_tasks laden mislukt:", error);
        setErrorMessage("Taken laden mislukt. Probeer opnieuw.");
        setLoadingTasks(false);
        return;
      }

      const rows = (data ?? []) as CleaningTask[];

      // Eerste keer dat deze locatie geopend wordt → default taken seeden.
      if (rows.length === 0 && !seededLocationRef.current.has(location.id)) {
        seededLocationRef.current.add(location.id);

        const { data: seeded, error: seedError } = await supabase
          .from("haccp_cleaning_tasks")
          .insert(
            DEFAULT_CLEANING_TASKS.map((name) => ({
              restaurant_id: restaurantId,
              location_id: location.id,
              name,
            })),
          )
          .select("id, name");

        if (seedError) {
          console.error("Standaard taken aanmaken mislukt:", seedError);
          setErrorMessage("Standaard taken aanmaken mislukt.");
        } else {
          setTasks((seeded ?? []) as CleaningTask[]);
        }
      } else {
        setTasks(rows);
      }

      setCheckedTaskIds(new Set());
      setLoadingTasks(false);
    },
    [restaurantId],
  );

  // Laad taken bij wisselen locatie
  useEffect(() => {
    if (selectedLocation) {
      void loadTasks(selectedLocation);
    } else {
      setTasks([]);
      setCheckedTaskIds(new Set());
    }
  }, [selectedLocation, loadTasks]);

  const toggleTask = (taskId: string) => {
    setCheckedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // ---------- reset helpers ----------
  const resetLocation = () => {
    setSelectedLocation(null);
    setCheckedTaskIds(new Set());
    setOpmerking("");
  };

  // ---------- photos ----------
  useEffect(() => {
    return () => {
      photoPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const completedCount = checkedTaskIds.size;
  const canSave =
    !!restaurantId && !!selectedLocation && completedCount > 0 && !isSaving;

  const handleSave = async () => {
    if (!canSave || !restaurantId || !selectedLocation) return;

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const completed = tasks
        .filter((ta) => checkedTaskIds.has(ta.id))
        .map((ta) => ta.name);

      const uploadedUrls: string[] = [];
      if (!isFreePlan && photoFiles.length > 0) {
        for (const file of photoFiles) {
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `schoonmaak/${restaurantId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
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

      const { error: insertError } = await supabase
        .from("haccp_records")
        .insert({
          restaurant_id: restaurantId,
          user_id: user?.id ?? null,
          module_type: "schoonmaak",
          equipment_id: null,
          location_name: selectedLocation.name,
          completed_tasks: completed,
          temperature: null,
          recorded_at: buildRecordedAt(recordedAtLocal),
          image_urls: uploadedUrls,
          opmerking: opmerking.trim() || null,
        });

      if (insertError) {
        console.error("Registratie opslaan mislukt:", insertError);
        setErrorMessage("Opslaan mislukt. Probeer opnieuw.");
        return;
      }

      router.push("/registreren");
    } catch (err) {
      console.error("Onverwachte fout bij opslaan:", err);
      setErrorMessage("Onverwachte fout. Probeer opnieuw.");
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // Render
  // =========================================================================
  const photoSlotsLeft = MAX_PHOTOS - photoFiles.length;

  // =========================================================================
  // MANAGE MODE: Only show location and task list with edit/delete buttons
  // =========================================================================
  if (mode === "manage") {
    return (
      <div className="mt-2 flex flex-col gap-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Schoonmaak
        </h2>

        {errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {!restaurantId ? (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-600">
            Geen restaurant gekoppeld aan je account.
          </p>
        ) : null}

        {/* ===== Locaties beheer ===== */}
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Locaties
          </h3>

          {loadingLocations ? (
            <p className="text-center text-slate-500">Locaties laden…</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {locations.map((loc) => (
                <li key={loc.id}>
                  <div className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xl font-bold text-slate-900 truncate">
                        {loc.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 border-l border-slate-100 pl-3">
                      <a
                        href={`/taken/schoonmaak/edit/${loc.id}`}
                        aria-label={`Bewerk ${loc.name}`}
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 active:bg-slate-200"
                      >
                        <Pencil className="h-5 w-5" aria-hidden />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteLocation(loc)}
                        aria-label={`Verwijder ${loc.name}`}
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
            onClick={handleAddLocation}
            disabled={!restaurantId}
            className="flex min-h-[80px] w-full items-center justify-center gap-3 border-2 border-dashed border-slate-200 text-xl normal-case"
          >
            <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
            Locatie toevoegen
          </SupercellButton>
        </section>
      </div>
    );
  }

  // =========================================================================
  // RECORD MODE: Full recording flow
  // =========================================================================
  return (
    <div className="mt-2 flex flex-col gap-6">
      <UpgradePromptModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      >
        {t("basicPlanPhotoMessage")}
      </UpgradePromptModal>

      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
        Schoonmaak
      </h2>

      {errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {!restaurantId ? (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-600">
          Geen restaurant gekoppeld aan je account.
        </p>
      ) : null}

      {/* ===== Locatie sectie ===== */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Kies een locatie
          </h3>
          {selectedLocation ? (
            <SupercellButton
              size="sm"
              variant="neutral"
              onClick={resetLocation}
              className="flex h-10 items-center gap-1.5 rounded-full border-b-[4px] px-3 text-sm normal-case"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              Wijzigen
            </SupercellButton>
          ) : null}
        </div>

        {selectedLocation ? (
          <p className="truncate rounded-2xl bg-slate-100 px-5 py-5 text-2xl font-black text-slate-900 shadow-sm">
            {selectedLocation.name}
          </p>
        ) : loadingLocations ? (
          <p className="text-center text-slate-500">Locaties laden…</p>
        ) : (
          <div className="flex flex-col gap-3">
            {locations.map((loc) => (
              <SupercellButton
                key={loc.id}
                size="lg"
                variant="neutral"
                onClick={() => setSelectedLocation(loc)}
                className="flex h-20 w-full items-center justify-between text-left text-2xl normal-case"
              >
                <span className="flex-1 truncate">{loc.name}</span>
              </SupercellButton>
            ))}
            <SupercellButton
              size="lg"
              variant="neutral"
              onClick={handleAddLocation}
              className="flex h-20 w-full items-center justify-center gap-3 border-2 border-dashed border-slate-300 text-xl normal-case"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} aria-hidden />
              Locatie toevoegen
            </SupercellButton>
          </div>
        )}
      </section>

      {/* ===== Datum/tijd (alleen na locatie selectie) ===== */}
      {selectedLocation ? (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Datum &amp; tijd
          </span>
          <input
            type="datetime-local"
            value={recordedAtLocal}
            onChange={(e) => setRecordedAtLocal(e.target.value)}
            className="h-20 w-full rounded-2xl border-2 border-slate-300 bg-white px-5 text-center text-2xl font-black tabular-nums text-slate-900 shadow-sm outline-none focus:border-slate-900 sm:text-3xl"
          />
        </label>
      ) : null}

      {/* ===== Taken sectie ===== */}
      {selectedLocation ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Schoonmaaktaken
            </h3>
            <span className="text-sm font-bold text-slate-500">
              {completedCount}/{tasks.length} voltooid
            </span>
          </div>

          {loadingTasks ? (
            <p className="text-center text-slate-500">Taken laden…</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {tasks.map((task) => {
                const checked = checkedTaskIds.has(task.id);
                return (
                  <li key={task.id}>
                    <SupercellButton
                      size="lg"
                      variant={checked ? "success" : "neutral"}
                      onClick={() => toggleTask(task.id)}
                      aria-pressed={checked}
                      className="flex h-20 w-full items-center justify-between gap-3 px-5 text-left text-xl normal-case"
                    >
                      <span className="flex-1 truncate">{task.name}</span>
                      <span
                        className={[
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          checked
                            ? "bg-white text-green-600"
                            : "border-2 border-slate-300 bg-white text-slate-300",
                        ].join(" ")}
                        aria-hidden
                      >
                        {checked ? (
                          <Check className="h-6 w-6" strokeWidth={3} />
                        ) : null}
                      </span>
                    </SupercellButton>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {/* ===== Opmerking + Foto + opslaan ===== */}
      {selectedLocation && !loadingTasks ? (
        <section className="flex flex-col gap-4">
          {/* Opmerking */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Opmerking (optioneel)
            </span>
            <textarea
              value={opmerking}
              onChange={(e) => setOpmerking(e.target.value)}
              placeholder="Voeg een opmerking toe..."
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-lg font-semibold text-slate-900 shadow-sm outline-none resize-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10"
            />
          </label>

          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Foto&apos;s (optioneel)
          </h3>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoChange}
          />

          <SupercellButton
            size="lg"
            variant="neutral"
            onClick={handlePickPhotos}
            disabled={isSaving || photoSlotsLeft <= 0}
            className="flex h-20 w-full items-center justify-center gap-3 border-2 border-slate-300 text-xl normal-case"
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
                    className="h-28 w-full rounded-xl border border-slate-200 object-cover shadow-sm"
                  />
                  <SupercellButton
                    size="icon"
                    variant="danger"
                    onClick={() => removePhoto(i)}
                    aria-label={`Foto ${i + 1} verwijderen`}
                    className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full border-b-[4px] ring-4 ring-white"
                  >
                    <X className="h-4 w-4" strokeWidth={3} aria-hidden />
                  </SupercellButton>
                </div>
              ))}
            </div>
          ) : null}

          <SupercellButton
            size="lg"
            variant="success"
            onClick={handleSave}
            disabled={!canSave}
            aria-busy={isSaving}
            className="flex h-24 w-full items-center justify-center gap-3 text-2xl normal-case"
          >
            {isSaving ? (
              "Opslaan…"
            ) : (
              <>
                <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
                Opslaan ({completedCount})
              </>
            )}
          </SupercellButton>

          {completedCount === 0 ? (
            <p className="text-center text-sm text-slate-500">
              Vink minstens één taak aan om op te slaan.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
