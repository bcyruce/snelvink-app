"use client";

import FrequencySelector from "@/components/FrequencySelector";
import SupercellButton from "@/components/SupercellButton";
import { useUser, UserProvider } from "@/hooks/useUser";
import {
  normalizeSchedule,
  scheduleToJson,
  validateSchedule,
  type FrequencySchedule,
} from "@/lib/schedules";
import { supabase } from "@/lib/supabase";
import { ArrowLeft } from "lucide-react";
import { notFound, useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Equipment = {
  id: string;
  name: string;
  type: "koeling" | "kerntemperatuur";
  default_temp?: number | null;
  last_temp?: number | null;
  limit_temp?: number | null;
  schedule?: unknown;
};

function EquipmentEditContent() {
  const router = useRouter();
  const params = useParams<{ moduleId: string; equipmentId: string }>();
  const moduleIdParam = (params?.moduleId ?? "").toLowerCase();
  const equipmentId = params?.equipmentId ?? "";
  useUser();

  const isValidModule =
    moduleIdParam === "koeling" || moduleIdParam === "kerntemperatuur";

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [hasDefaultValue, setHasDefaultValue] = useState(false);
  const [defaultValue, setDefaultValue] = useState(7);
  const [defaultValueText, setDefaultValueText] = useState("7");
  const [limitTemp, setLimitTemp] = useState(7);
  const [limitTempText, setLimitTempText] = useState("7");
  const [schedule, setSchedule] = useState<FrequencySchedule | null>(null);

  const moduleTitle =
    moduleIdParam === "koeling" ? "Koeling" : "Kerntemperatuur";
  const defaultTemp = moduleIdParam === "koeling" ? 7 : 75;
  const unit = "°C";

  useEffect(() => {
    async function loadEquipment() {
      if (!isValidModule) {
        setLoading(false);
        return;
      }
      if (!equipmentId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("haccp_equipments")
        .select("*")
        .eq("id", equipmentId)
        .eq("type", moduleIdParam)
        .maybeSingle();

      if (error || !data) {
        console.error("Equipment not found:", error);
        setErrorMessage("Apparaat niet gevonden.");
        setLoading(false);
        return;
      }

      const row = data as Equipment;
      setEquipment(row);
      setName(row.name);
      const storedDefault = row.default_temp;
      setHasDefaultValue(
        storedDefault !== null && storedDefault !== undefined,
      );
      const initialDefault =
        typeof storedDefault === "number"
          ? storedDefault
          : typeof row.last_temp === "number"
            ? row.last_temp
            : defaultTemp;
      setDefaultValue(initialDefault);
      setDefaultValueText(String(initialDefault));
      const initialLimit =
        typeof row.limit_temp === "number" ? row.limit_temp : defaultTemp;
      setLimitTemp(initialLimit);
      setLimitTempText(String(initialLimit));
      setSchedule(normalizeSchedule(row.schedule));
      setLoading(false);
    }

    void loadEquipment();
  }, [equipmentId, moduleIdParam, defaultTemp, isValidModule]);

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

    const updates: Record<string, unknown> = {
      name: trimmedName,
      default_temp: hasDefaultValue ? defaultValue : null,
      limit_temp: limitTemp,
      schedule: scheduleToJson(schedule),
    };

    let { error } = await supabase
      .from("haccp_equipments")
      .update(updates)
      .eq("id", equipmentId);

    if (error) {
      const msg = error.message ?? "";
      const maybeMissingOptionalCols =
        /default_temp|limit_temp|column|does not exist|42703|PGRST204/i.test(
          msg,
        );
      if (maybeMissingOptionalCols) {
        const minimal = {
          name: trimmedName,
        };
        ({ error } = await supabase
          .from("haccp_equipments")
          .update(minimal)
          .eq("id", equipmentId));
      }
    }

    if (error) {
      console.error("Save failed:", error);
      setErrorMessage("Opslaan mislukt.");
      setSaving(false);
      return;
    }

    router.push(`/taken/${moduleIdParam}`);
  }, [
    name,
    hasDefaultValue,
    defaultValue,
    limitTemp,
    schedule,
    equipmentId,
    moduleIdParam,
    router,
  ]);

  if (!isValidModule) {
    notFound();
  }

  const commitDefaultValue = () => {
    const parsed = Number.parseFloat(defaultValueText.replace(",", "."));
    if (Number.isFinite(parsed)) {
      const rounded = Math.round(parsed * 10) / 10;
      setDefaultValue(rounded);
      setDefaultValueText(String(rounded));
    } else {
      setDefaultValueText(String(defaultValue));
    }
  };

  const commitLimitTemp = () => {
    const parsed = Number.parseFloat(limitTempText.replace(",", "."));
    if (Number.isFinite(parsed)) {
      const rounded = Math.round(parsed * 10) / 10;
      setLimitTemp(rounded);
      setLimitTempText(String(rounded));
    } else {
      setLimitTempText(String(limitTemp));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-semibold text-gray-600">
          Laden...
        </p>
      </div>
    );
  }

  if (!equipment) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 pb-32 pt-8 sm:px-6">
        <div className="mx-auto max-w-md space-y-4">
          <SupercellButton
            type="button"
            size="lg"
            variant="neutral"
            onClick={() => router.push(`/taken/${moduleIdParam}`)}
            className="flex h-20 w-full items-center justify-center gap-3 text-2xl"
          >
            <ArrowLeft className="h-7 w-7" strokeWidth={2.5} aria-hidden />
            Terug
          </SupercellButton>
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center font-bold text-red-700">
            {errorMessage ?? "Apparaat niet gevonden."}
          </p>
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
          onClick={() => router.push(`/taken/${moduleIdParam}`)}
          className="mb-8 flex h-20 w-full items-center justify-center gap-3 text-2xl"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          Terug
        </SupercellButton>

        <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-slate-900">
          {moduleTitle} - Bewerken
        </h1>

        {errorMessage ? (
          <p className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-col gap-6">
          {/* Name */}
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Naam apparaat
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-[72px] w-full rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-5 text-2xl font-black text-slate-900 outline-none focus:border-blue-500 focus:border-b-blue-700"
            />
          </label>

          {/* Default value */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-bold text-slate-800">
                Standaardwaarde instellen
              </span>
              <button
                type="button"
                onClick={() => setHasDefaultValue(!hasDefaultValue)}
                className={[
                  "relative flex h-8 w-14 shrink-0 items-center rounded-full border-2 transition-colors",
                  hasDefaultValue
                    ? "border-blue-700 bg-blue-500"
                    : "border-slate-400 bg-slate-200",
                ].join(" ")}
                aria-pressed={hasDefaultValue}
              >
                <span
                  className={[
                    "absolute top-0.5 h-5 w-5 rounded-full border-2 border-slate-300 bg-white transition-transform",
                    hasDefaultValue ? "translate-x-7" : "translate-x-1",
                  ].join(" ")}
                />
              </button>
            </div>

            <p className="text-sm text-slate-500">
              {hasDefaultValue
                ? `Bij elke nieuwe registratie start de waarde op ${defaultValue.toFixed(1)} ${unit}.`
                : "Bij elke nieuwe registratie start de waarde op de laatst opgeslagen meting."}
            </p>

            {hasDefaultValue ? (
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Standaardwaarde ({unit})
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={defaultValueText}
                  onChange={(e) => setDefaultValueText(e.target.value)}
                  onBlur={commitDefaultValue}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitDefaultValue();
                    }
                  }}
                  className="min-h-[72px] w-full rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-5 text-center text-3xl font-black tabular-nums text-blue-600 outline-none focus:border-blue-500 focus:border-b-blue-700"
                />
              </label>
            ) : null}
          </div>

          {/* Limit temperature */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-bold text-slate-800">
                Limiet temperatuur
              </span>
            </div>

            <p className="text-sm text-slate-500">
              Boven deze temperatuur moet een corrigerende maatregel worden
              ingevuld.
            </p>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Limiet ({unit})
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={limitTempText}
                onChange={(e) => setLimitTempText(e.target.value)}
                onBlur={commitLimitTemp}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitLimitTemp();
                  }
                }}
                className="min-h-[72px] w-full rounded-2xl border-2 border-b-4 border-slate-300 bg-white px-5 text-center text-3xl font-black tabular-nums text-blue-600 outline-none focus:border-blue-500 focus:border-b-blue-700"
              />
            </label>
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

export default function EquipmentEditPage() {
  return (
    <UserProvider>
      <EquipmentEditContent />
    </UserProvider>
  );
}
