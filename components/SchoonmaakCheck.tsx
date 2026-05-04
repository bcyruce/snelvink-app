"use client";

import InlineAddInput from "@/components/InlineAddInput";
import SupercellButton from "@/components/SupercellButton";
import UpgradePromptModal from "@/components/UpgradePromptModal";
import { useTranslation } from "@/hooks/useTranslation";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { Camera, Check, Pencil, Trash2, X } from "lucide-react";
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
  /**
   * Wanneer gezet, opereert de module op rijen met dit `custom_module_id`
   * in plaats van standaard schoonmaak-locaties. Records worden geschreven
   * naar `haccp_records` met `module_type = "custom_list"`.
   */
  customModuleId?: string;
  /** Custom heeft een eigen titel (module-naam) in plaats van "Schoonmaak". */
  title?: string;
  /** Wanneer gezet, selecteert de module direct de groep/locatie met dit id. */
  initialItemId?: string;
};

export default function SchoonmaakCheck({
  mode = "record",
  customModuleId,
  title,
  initialItemId,
}: Props) {
  const isCustom = !!customModuleId;
  const editBasePath = isCustom
    ? `/app/taken/custom/${customModuleId}/edit`
    : "/app/taken/schoonmaak/edit";
  const recordModuleType = isCustom ? "custom_list" : "schoonmaak";
  const router = useRouter();
  const { t } = useTranslation();
  const { user, profile, isFreePlan } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;
  const headingTitle = title ?? t("schoonmaak");
  const groupSingular = isCustom ? t("group") : t("location");
  const groupSingularLower = groupSingular.toLowerCase();
  const allowAddGroupInRecord = !(mode === "record" && isCustom);

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
    const baseQuery = supabase
      .from("haccp_locations")
      .select("id, name")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true });
    const { data, error } = await (isCustom
      ? baseQuery.eq("custom_module_id", customModuleId)
      : baseQuery.is("custom_module_id", null));

    if (error) {
      console.error("haccp_locations laden mislukt:", error);
      setErrorMessage(t("loadLocationsFailed"));
    } else {
      setLocations((data ?? []) as Location[]);
    }
    setLoadingLocations(false);
  }, [restaurantId, customModuleId, isCustom, t]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  // Selecteer automatisch de groep/locatie wanneer er via een herinnering een
  // initialItemId is meegegeven.
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current) return;
    if (mode !== "record" || !initialItemId) return;
    if (loadingLocations) return;
    const target = locations.find((l) => l.id === initialItemId);
    if (!target) return;
    autoSelectedRef.current = true;
    setSelectedLocation(target);
  }, [initialItemId, loadingLocations, locations, mode]);

  const handleAddLocation = useCallback(
    async (name: string) => {
      if (!restaurantId) return;

      const { data, error } = await supabase
        .from("haccp_locations")
        .insert({
          restaurant_id: restaurantId,
          name,
          custom_module_id: customModuleId ?? null,
        })
        .select("id, name")
        .single();

      if (error) {
        console.error("Locatie toevoegen mislukt:", error);
        setErrorMessage(t("locationAddFailed"));
        return;
      }
      if (data) {
        const next = data as Location;
        setLocations((prev) => [...prev, next]);
        if (mode === "record") {
          setSelectedLocation(next);
        }
      }
    },
    [restaurantId, mode, customModuleId, t],
  );

  const handleDeleteLocation = useCallback(
    async (location: Location) => {
      const ok = window.confirm(
        t("confirmDeleteLocation", { name: location.name }),
      );
      if (!ok) return;

      const { error } = await supabase
        .from("haccp_locations")
        .delete()
        .eq("id", location.id);

      if (error) {
        console.error("Verwijderen mislukt:", error);
        setErrorMessage(t("deleteFailed"));
        return;
      }
      setLocations((prev) => prev.filter((l) => l.id !== location.id));
    },
    [t],
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
        setErrorMessage(t("recordsLoadFailed"));
        setLoadingTasks(false);
        return;
      }

      const rows = (data ?? []) as CleaningTask[];

      // Eerste keer dat deze locatie geopend wordt → default taken seeden
      // (alleen voor de standaard schoonmaak module; custom Lijst start leeg).
      if (
        rows.length === 0 &&
        !seededLocationRef.current.has(location.id) &&
        !isCustom
      ) {
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
          setErrorMessage(t("standardTasksCreateFailed"));
        } else {
          setTasks((seeded ?? []) as CleaningTask[]);
        }
      } else {
        setTasks(rows);
      }

      setCheckedTaskIds(new Set());
      setLoadingTasks(false);
    },
    [restaurantId, isCustom, t],
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
            setErrorMessage(t("photoUploadFailed"));
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
          module_type: recordModuleType,
          custom_module_id: customModuleId ?? null,
          equipment_id: null,
          location_id: selectedLocation.id,
          location_name: selectedLocation.name,
          completed_tasks: completed,
          temperature: null,
          recorded_at: buildRecordedAt(recordedAtLocal),
          image_urls: uploadedUrls,
          opmerking: opmerking.trim() || null,
        });

      if (insertError) {
        console.error("Registratie opslaan mislukt:", insertError);
        setErrorMessage(t("saveFailed"));
        return;
      }

      router.push("/app/registreren");
    } catch (err) {
      console.error("Onverwachte fout bij opslaan:", err);
      setErrorMessage(t("unexpectedErrorRetry"));
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
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="mb-2">
          <h2 className="text-2xl font-black tracking-tight text-[var(--theme-fg)]">
            {headingTitle}
          </h2>
          <p className="mt-1 text-sm font-medium text-[var(--theme-muted)]">
            {t("manageItems")}
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3">
            <p className="text-center text-sm font-bold text-red-700">
              {errorMessage}
            </p>
          </div>
        ) : null}

        {!restaurantId ? (
          <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] px-5 py-8 text-center">
            <p className="text-base font-semibold text-[var(--theme-muted)]">
              {t("noRestaurantLinked")}
            </p>
          </div>
        ) : null}

        {/* ===== Locaties beheer ===== */}
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
            {isCustom ? t("groups") : t("locations")}
          </h3>

          {loadingLocations ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--theme-primary)] border-t-transparent" />
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {locations.map((loc, index) => (
                <li key={loc.id}>
                  <div 
                    className="group flex items-center gap-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4 transition-all hover:border-[var(--theme-primary)]/30 hover:shadow-md"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-primary)]/10">
                      <span className="text-lg font-black text-[var(--theme-primary)]">
                        {loc.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-base font-bold text-[var(--theme-fg)]">
                        {loc.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={`${editBasePath}/${loc.id}`}
                        aria-label={`${t("edit")} ${loc.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--theme-muted)] transition-colors hover:bg-[var(--theme-primary)]/10 hover:text-[var(--theme-primary)]"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteLocation(loc)}
                        aria-label={`${t("delete")} ${loc.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--theme-muted)] transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2">
            <InlineAddInput
              label={t("addLocation", { name: groupSingularLower })}
              placeholder={t("nameOfLocation", { name: groupSingularLower })}
              onAdd={handleAddLocation}
              disabled={!restaurantId}
            />
          </div>
        </section>
      </div>
    );
  }

  // =========================================================================
  // RECORD MODE: Full recording flow
  // =========================================================================
  return (
    <div className="flex flex-col gap-4">
      <UpgradePromptModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      >
        {t("basicPlanPhotoMessage")}
      </UpgradePromptModal>

      {/* Header */}
      <div className="mb-2">
        <h2 className="text-2xl font-black tracking-tight text-[var(--theme-fg)]">
          {headingTitle}
        </h2>
        <p className="mt-1 text-sm font-medium text-[var(--theme-muted)]">
          {t("selectToRecord")}
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3">
          <p className="text-center text-sm font-bold text-red-700">
            {errorMessage}
          </p>
        </div>
      ) : null}

      {!restaurantId ? (
        <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] px-5 py-8 text-center">
          <p className="text-base font-semibold text-[var(--theme-muted)]">
            {t("noRestaurantLinked")}
          </p>
        </div>
      ) : null}

      {/* ===== Locatie sectie ===== */}
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
          {t("chooseLocation", { name: groupSingularLower })}
        </h3>

        {selectedLocation ? (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-primary)]/10">
              <span className="text-base font-black text-[var(--theme-primary)]">
                {selectedLocation.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="min-w-0 flex-1 truncate text-base font-bold text-[var(--theme-fg)]">
              {selectedLocation.name}
            </span>
          </div>
        ) : loadingLocations ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--theme-primary)] border-t-transparent" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {locations.map((loc, index) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => setSelectedLocation(loc)}
                className="group flex items-center gap-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4 text-left transition-all hover:border-[var(--theme-primary)]/30 hover:shadow-md active:scale-[0.98]"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-primary)]/10">
                  <span className="text-lg font-black text-[var(--theme-primary)]">
                    {loc.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="min-w-0 flex-1 truncate text-base font-bold text-[var(--theme-fg)]">
                  {loc.name}
                </span>
              </button>
            ))}
            {allowAddGroupInRecord ? (
              <div className="mt-2">
                <InlineAddInput
                  label={t("addLocation", { name: groupSingularLower })}
                  placeholder={t("nameOfLocation", { name: groupSingularLower })}
                  onAdd={handleAddLocation}
                />
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* ===== Datum/tijd (alleen na locatie selectie) ===== */}
      {selectedLocation ? (
        <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
              {t("dateTimeLabel")}
            </span>
            <input
              type="datetime-local"
              value={recordedAtLocal}
              onChange={(e) => setRecordedAtLocal(e.target.value)}
              className="h-14 w-full min-w-0 rounded-xl border border-[var(--theme-card-border)] bg-white px-3 text-base font-semibold tabular-nums text-[var(--theme-fg)] outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20"
            />
          </label>
        </div>
      ) : null}

      {/* ===== Taken sectie ===== */}
      {selectedLocation ? (
        <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
              {isCustom ? t("items") : t("cleaningTasks")}
            </h3>
            <span className="rounded-full bg-[var(--theme-primary)]/10 px-2.5 py-1 text-xs font-bold text-[var(--theme-primary)]">
              {t("completedCount", { done: completedCount, total: tasks.length })}
            </span>
          </div>

          {loadingTasks ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--theme-primary)] border-t-transparent" />
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {tasks.map((task) => {
                const checked = checkedTaskIds.has(task.id);
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      aria-pressed={checked}
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all active:scale-[0.98]",
                        checked
                          ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                          : "border-[var(--theme-card-border)] bg-white text-[var(--theme-fg)] hover:border-[var(--theme-primary)]/30",
                      ].join(" ")}
                    >
                      <span className="min-w-0 flex-1 truncate text-base font-bold">{task.name}</span>
                      <span
                        className={[
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          checked
                            ? "bg-white text-emerald-500"
                            : "border-2 border-[var(--theme-card-border)] bg-white",
                        ].join(" ")}
                        aria-hidden
                      >
                        {checked ? (
                          <Check className="h-4 w-4" strokeWidth={3} />
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {/* ===== Opmerking + Foto + opslaan ===== */}
      {selectedLocation && !loadingTasks ? (
        <div className="flex flex-col gap-4">
          {/* Note Section */}
          <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
                {t("noteOptional")}
              </span>
              <textarea
                value={opmerking}
                onChange={(e) => setOpmerking(e.target.value)}
                placeholder={t("notePlaceholder")}
                rows={2}
                className="w-full resize-none rounded-xl border border-[var(--theme-card-border)] bg-white px-4 py-3 text-base font-medium text-[var(--theme-fg)] outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20"
              />
            </label>
          </div>

          {/* Photo Section */}
          <div className="rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4">
            <span className="mb-3 block text-xs font-bold uppercase tracking-wider text-[var(--theme-muted)]">
              {t("photosOptional")}
            </span>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoChange}
            />

            <button
              type="button"
              onClick={handlePickPhotos}
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
                      onClick={() => removePhoto(i)}
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
          <SupercellButton
            size="lg"
            variant="success"
            onClick={handleSave}
            disabled={!canSave}
            aria-busy={isSaving}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl text-lg font-black normal-case"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t("saving")}
              </span>
            ) : (
              <>
                <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
                {t("save")} ({completedCount})
              </>
            )}
          </SupercellButton>

          {completedCount === 0 ? (
            <p className="text-center text-xs font-medium text-[var(--theme-muted)]">
              {t("selectAtLeastOneTask")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
