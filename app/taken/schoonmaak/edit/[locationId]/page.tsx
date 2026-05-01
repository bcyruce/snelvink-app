"use client";

import FrequencySelector from "@/components/FrequencySelector";
import InlineAddInput from "@/components/InlineAddInput";
import SupercellButton from "@/components/SupercellButton";
import { useUser, UserProvider } from "@/hooks/useUser";
import {
  normalizeSchedule,
  scheduleToJson,
  validateSchedule,
  type FrequencySchedule,
} from "@/lib/schedules";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Location = {
  id: string;
  name: string;
  schedule?: unknown;
};

type CleaningTask = {
  id: string;
  name: string;
  location_id: string;
};

function LocationEditContent() {
  const router = useRouter();
  const params = useParams<{ locationId: string }>();
  const locationId = params?.locationId ?? "";
  const { profile } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;

  const [location, setLocation] = useState<Location | null>(null);
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [schedule, setSchedule] = useState<FrequencySchedule | null>(null);

  useEffect(() => {
    async function loadLocation() {
      if (!locationId) return;

      const { data, error } = await supabase
        .from("haccp_locations")
        .select("id, name, schedule")
        .eq("id", locationId)
        .single();

      if (error || !data) {
        console.error("Location not found:", error);
        setErrorMessage("Locatie niet gevonden.");
        setLoading(false);
        return;
      }

      setLocation(data);
      setName(data.name);
      setSchedule(normalizeSchedule(data.schedule));
      setLoading(false);
    }

    loadLocation();
  }, [locationId]);

  useEffect(() => {
    async function loadTasks() {
      if (!locationId || !restaurantId) return;

      setLoadingTasks(true);
      const { data, error } = await supabase
        .from("haccp_cleaning_tasks")
        .select("id, name, location_id")
        .eq("restaurant_id", restaurantId)
        .eq("location_id", locationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to load tasks:", error);
      } else {
        setTasks(data ?? []);
      }
      setLoadingTasks(false);
    }

    loadTasks();
  }, [locationId, restaurantId]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Vul een naam in.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const scheduleError = validateSchedule(schedule);
    if (scheduleError) {
      setErrorMessage(scheduleError);
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("haccp_locations")
      .update({ name: trimmedName, schedule: scheduleToJson(schedule) })
      .eq("id", locationId);

    if (error) {
      console.error("Save failed:", error);
      setErrorMessage("Opslaan mislukt.");
      setSaving(false);
      return;
    }

    router.push("/taken/schoonmaak");
  }, [name, schedule, locationId, router]);

  const handleAddTask = useCallback(
    async (taskName: string) => {
      const restaurantId = profile?.restaurant_id ?? "";
      if (!restaurantId) {
        setErrorMessage("Geen restaurant gekoppeld.");
        return;
      }

      const { data, error } = await supabase
        .from("haccp_cleaning_tasks")
        .insert({
          restaurant_id: restaurantId,
          location_id: locationId,
          name: taskName,
        })
        .select("id, name, location_id")
        .single();

      if (error) {
        console.error("Failed to add task:", error);
        setErrorMessage("Taak toevoegen mislukt.");
        return;
      }

      if (data) {
        setTasks((prev) => [...prev, data]);
      }
    },
    [locationId, profile],
  );

  const handleRenameTask = useCallback(async (task: CleaningTask) => {
    const newName = window.prompt("Nieuwe naam voor de taak", task.name);
    if (!newName?.trim() || newName.trim() === task.name) return;

    const { error } = await supabase
      .from("haccp_cleaning_tasks")
      .update({ name: newName.trim() })
      .eq("id", task.id);

    if (error) {
      console.error("Failed to rename task:", error);
      setErrorMessage("Hernoemen mislukt.");
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, name: newName.trim() } : t))
    );
  }, []);

  const handleDeleteTask = useCallback(async (task: CleaningTask) => {
    const ok = window.confirm(`"${task.name}" verwijderen?`);
    if (!ok) return;

    const { error } = await supabase
      .from("haccp_cleaning_tasks")
      .delete()
      .eq("id", task.id);

    if (error) {
      console.error("Failed to delete task:", error);
      setErrorMessage("Verwijderen mislukt.");
      return;
    }

    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-semibold text-gray-600">
          Laden...
        </p>
      </div>
    );
  }

  if (!location) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 pb-32 pt-8 sm:px-6">
        <div className="mx-auto max-w-md">
          <p className="text-center text-red-600">Locatie niet gevonden.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-32 pt-8 sm:px-6">
      <div className="mx-auto max-w-md">
        <SupercellButton
          type="button"
          size="lg"
          variant="neutral"
          onClick={() => router.push("/taken/schoonmaak")}
          className="mb-8 flex h-20 w-full items-center justify-center gap-3 text-2xl"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          Terug
        </SupercellButton>

        <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-slate-900">
          Locatie bewerken
        </h1>

        {errorMessage ? (
          <p className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-col gap-6">
          {/* Location name */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Locatienaam
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-[72px] w-full rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-5 text-2xl font-black text-slate-900 outline-none focus:border-blue-500 focus:border-b-blue-700"
            />
          </label>

          {/* Tasks section */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Schoonmaaktaken
            </span>

            {loadingTasks ? (
              <p className="text-center text-slate-500">Taken laden...</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <span className="flex-1 font-semibold text-slate-800 truncate">
                      {task.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRenameTask(task)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <InlineAddInput
              label="Taak toevoegen"
              placeholder="Naam van de taak"
              onAdd={handleAddTask}
            />
          </div>

          <FrequencySelector value={schedule} onChange={setSchedule} />

          {/* Save button */}
          <SupercellButton
            type="button"
            size="lg"
            variant="success"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="min-h-[72px] w-full text-2xl"
          >
            {saving ? "Opslaan..." : "Opslaan"}
          </SupercellButton>
        </div>
      </div>
    </main>
  );
}

export default function LocationEditPage() {
  return (
    <UserProvider>
      <LocationEditContent />
    </UserProvider>
  );
}
