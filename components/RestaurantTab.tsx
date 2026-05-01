"use client";

import SupercellButton from "@/components/SupercellButton";
import { useUser } from "@/hooks/useUser";
import {
  normalizeClosedDays,
  normalizeOpeningHours,
  type OpeningHours,
} from "@/lib/restaurantHours";
import { WEEKDAYS, type Weekday } from "@/lib/schedules";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, CalendarClock, ChevronRight, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

export default function RestaurantTab() {
  const { profile, restaurant, refresh } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;
  const isOwner =
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.role === "eigenaar";

  const initialHours = useMemo(
    () => normalizeOpeningHours(restaurant?.opening_hours),
    [restaurant?.opening_hours],
  );
  const initialClosedDays = useMemo(
    () => normalizeClosedDays(restaurant?.closed_days),
    [restaurant?.closed_days],
  );
  const [view, setView] = useState<"overview" | "hours">("overview");

  if (view === "overview") {
    return (
      <div className="mt-2 flex flex-col gap-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-slate-500">
            Mijn restaurant
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {restaurant?.name ?? "Restaurant"}
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Beheer je restaurantgegevens en instellingen.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setView("hours")}
          className="flex min-h-[88px] w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-4 text-left shadow-sm transition-transform active:scale-[0.98]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CalendarClock className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xl font-black text-slate-900">
              Openingstijden
            </span>
            <span className="mt-1 block text-sm font-semibold text-slate-500">
              Openingstijden en sluitingsdagen beheren
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
        </button>

        {!isOwner ? (
          <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
            Alleen de eigenaar kan restaurantinstellingen aanpassen.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <RestaurantHoursForm
      key={JSON.stringify({ initialHours, initialClosedDays, restaurantId })}
      restaurantName={restaurant?.name ?? "Restaurant"}
      restaurantId={restaurantId}
      isOwner={isOwner}
      initialHours={initialHours}
      initialClosedDays={initialClosedDays}
      onSaved={refresh}
      onBack={() => setView("overview")}
    />
  );
}

function RestaurantHoursForm({
  restaurantName,
  restaurantId,
  isOwner,
  initialHours,
  initialClosedDays,
  onSaved,
  onBack,
}: {
  restaurantName: string;
  restaurantId: string | null;
  isOwner: boolean;
  initialHours: OpeningHours;
  initialClosedDays: string[];
  onSaved: () => Promise<void>;
  onBack: () => void;
}) {
  const [hours, setHours] = useState<OpeningHours>(initialHours);
  const [closedDays, setClosedDays] = useState<string[]>(initialClosedDays);
  const [newClosedDay, setNewClosedDay] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateDay = (weekday: Weekday, next: Partial<OpeningHours[Weekday]>) => {
    setHours((prev) => ({
      ...prev,
      [weekday]: { ...prev[weekday], ...next },
    }));
  };

  const addClosedDay = () => {
    if (!newClosedDay) return;
    setClosedDays((prev) =>
      prev.includes(newClosedDay) ? prev : [...prev, newClosedDay].sort(),
    );
    setNewClosedDay("");
  };

  const removeClosedDay = (day: string) => {
    setClosedDays((prev) => prev.filter((item) => item !== day));
  };

  const handleSave = async () => {
    if (!restaurantId || !isOwner) return;
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from("restaurants")
      .update({
        opening_hours: hours,
        closed_days: closedDays,
      })
      .eq("id", restaurantId);

    if (error) {
      console.error("Openingstijden opslaan mislukt:", error);
      setMessage("Opslaan mislukt.");
      setSaving(false);
      return;
    }

    await onSaved();
    setMessage("Restaurantinstellingen opgeslagen.");
    setSaving(false);
  };

  return (
    <div className="mt-2 flex flex-col gap-5">
      <SupercellButton
        type="button"
        size="lg"
        variant="neutral"
        onClick={onBack}
        className="flex min-h-[72px] w-full items-center justify-center gap-3 text-xl"
      >
        <ArrowLeft className="h-5 w-5" />
        Terug naar restaurant
      </SupercellButton>

      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-sm font-black uppercase tracking-wide text-slate-500">
          Openingstijden
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">
          {restaurantName}
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Stel hier de openingstijden in. Dagelijkse taken worden niet gepland op
          dagen waarop het restaurant gesloten is.
        </p>
        {!isOwner ? (
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
            Alleen de eigenaar kan openingstijden aanpassen.
          </p>
        ) : null}
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
          Openingstijden
        </h3>
        {WEEKDAYS.map((day) => {
          const config = hours[day.value];
          return (
            <div
              key={day.value}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-black text-slate-900">{day.label}</span>
                <button
                  type="button"
                  disabled={!isOwner}
                  onClick={() => updateDay(day.value, { open: !config.open })}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-black",
                    config.open
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-500",
                    !isOwner ? "opacity-60" : "",
                  ].join(" ")}
                >
                  {config.open ? "Open" : "Gesloten"}
                </button>
              </div>

              {config.open ? (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase text-slate-400">
                      Van
                    </span>
                    <input
                      type="time"
                      value={config.from}
                      disabled={!isOwner}
                      onChange={(event) =>
                        updateDay(day.value, { from: event.target.value })
                      }
                      className="min-h-[48px] rounded-xl border border-slate-200 px-3 font-bold disabled:bg-slate-50"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase text-slate-400">
                      Tot
                    </span>
                    <input
                      type="time"
                      value={config.to}
                      disabled={!isOwner}
                      onChange={(event) =>
                        updateDay(day.value, { to: event.target.value })
                      }
                      className="min-h-[48px] rounded-xl border border-slate-200 px-3 font-bold disabled:bg-slate-50"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">
          Sluitingsdagen
        </h3>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          {closedDays.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">
              Geen extra sluitingsdagen ingesteld.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {closedDays.map((day) => (
                <li
                  key={day}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                >
                  <span className="font-bold text-slate-800">{day}</span>
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => removeClosedDay(day)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                      aria-label={`${day} verwijderen`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {isOwner ? (
            <div className="mt-4 flex items-center gap-2">
              <input
                type="date"
                value={newClosedDay}
                onChange={(event) => setNewClosedDay(event.target.value)}
                className="min-h-[48px] min-w-0 flex-1 rounded-xl border border-slate-200 px-3 font-bold"
              />
              <button
                type="button"
                onClick={addClosedDay}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"
                aria-label="Sluitingsdag toevoegen"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {message ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-slate-600 shadow-sm">
          {message}
        </p>
      ) : null}

      {isOwner ? (
        <SupercellButton
          type="button"
          size="lg"
          variant="success"
          onClick={handleSave}
          disabled={saving || !restaurantId}
          className="flex min-h-[72px] w-full items-center justify-center gap-2 text-xl"
        >
          <Save className="h-5 w-5" />
          {saving ? "Opslaan..." : "Opslaan"}
        </SupercellButton>
      ) : null}
    </div>
  );
}
