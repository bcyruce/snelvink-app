"use client";

import SupercellButton from "@/components/SupercellButton";
import { useUser, UserProvider } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { notFound, useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Equipment = {
  id: string;
  name: string;
  type: "koeling" | "kerntemperatuur";
  default_temp: number | null;
  unit: string | null;
  step: number | null;
};

function EquipmentEditContent() {
  const router = useRouter();
  const params = useParams<{ moduleId: string; equipmentId: string }>();
  const moduleId = params?.moduleId ?? "";
  const equipmentId = params?.equipmentId ?? "";
  const { profile } = useUser();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [hasDefaultValue, setHasDefaultValue] = useState(false);
  const [defaultValue, setDefaultValue] = useState(7);
  const [unit, setUnit] = useState("°C");
  const [step, setStep] = useState(0.5);

  // Module title
  const moduleTitle = moduleId === "koeling" ? "Koeling" : "Kerntemperatuur";
  const defaultTemp = moduleId === "koeling" ? 7 : 75;

  useEffect(() => {
    async function loadEquipment() {
      if (!equipmentId) return;

      const { data, error } = await supabase
        .from("haccp_equipments")
        .select("id, name, type, default_temp, unit, step")
        .eq("id", equipmentId)
        .eq("type", moduleId)
        .single();

      if (error || !data) {
        console.error("Equipment not found:", error);
        setErrorMessage("Apparaat niet gevonden.");
        setLoading(false);
        return;
      }

      setEquipment(data);
      setName(data.name);
      setHasDefaultValue(data.default_temp !== null);
      setDefaultValue(data.default_temp ?? defaultTemp);
      setUnit(data.unit ?? "°C");
      setStep(data.step ?? 0.5);
      setLoading(false);
    }

    loadEquipment();
  }, [equipmentId, moduleId, defaultTemp]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Vul een naam in.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const updates: Record<string, unknown> = {
      name: trimmedName,
      default_temp: hasDefaultValue ? defaultValue : null,
      unit: unit.trim() || "°C",
      step: step || 0.5,
    };

    const { error } = await supabase
      .from("haccp_equipments")
      .update(updates)
      .eq("id", equipmentId);

    if (error) {
      console.error("Save failed:", error);
      setErrorMessage("Opslaan mislukt.");
      setSaving(false);
      return;
    }

    router.push(`/taken/${moduleId}`);
  }, [name, hasDefaultValue, defaultValue, unit, step, equipmentId, moduleId, router]);

  const adjustValue = (delta: number) => {
    setDefaultValue((v) => Math.round((v + delta) * 10) / 10);
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
    return notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-32 pt-8 sm:px-6">
      <div className="mx-auto max-w-md">
        <SupercellButton
          type="button"
          size="lg"
          variant="neutral"
          onClick={() => router.push(`/taken/${moduleId}`)}
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

          {/* Default value toggle */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="flex items-center justify-between gap-3">
              <span className="text-lg font-bold text-slate-800">
                Standaardwaarde instellen
              </span>
              <button
                type="button"
                onClick={() => setHasDefaultValue(!hasDefaultValue)}
                className={[
                  "relative flex h-8 w-14 shrink-0 items-center rounded-full border-2 transition-colors",
                  hasDefaultValue ? "border-blue-700 bg-blue-500" : "border-slate-400 bg-slate-200",
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
            </label>

            {hasDefaultValue ? (
              <>
                <p className="text-sm text-slate-500">
                  Bij elke nieuwe registratie start de waarde op {defaultValue}{unit}.
                </p>

                {/* Temperature preview (like record view) */}
                <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-slate-500">
                    Voorbeeld
                  </p>
                  <div className="flex items-center gap-3">
                    <SupercellButton
                      type="button"
                      size="lg"
                      variant="neutral"
                      onClick={() => adjustValue(-step)}
                      className="flex h-20 flex-1 items-center justify-center"
                    >
                      <Minus className="h-8 w-8" strokeWidth={2.5} aria-hidden />
                    </SupercellButton>

                    <div className="flex-[1.5] text-center">
                      <p className="text-5xl font-black tabular-nums text-blue-600">
                        {defaultValue.toFixed(1)}{unit}
                      </p>
                    </div>

                    <SupercellButton
                      type="button"
                      size="lg"
                      variant="neutral"
                      onClick={() => adjustValue(step)}
                      className="flex h-20 flex-1 items-center justify-center"
                    >
                      <Plus className="h-8 w-8" strokeWidth={2.5} aria-hidden />
                    </SupercellButton>
                  </div>
                </div>

                {/* Step and unit settings */}
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-slate-500">
                      Stapgrootte
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={step}
                      onChange={(e) => setStep(Number.parseFloat(e.target.value) || 0.5)}
                      className="min-h-[56px] w-full rounded-xl border-2 border-b-4 border-slate-300 bg-white px-3 text-center text-lg font-black text-slate-900 outline-none focus:border-blue-500"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-slate-500">
                      Eenheid
                    </span>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="min-h-[56px] w-full rounded-xl border-2 border-b-4 border-slate-300 bg-white px-3 text-center text-lg font-black text-slate-900 outline-none focus:border-blue-500"
                    />
                  </label>
                </div>
              </>
            ) : null}
          </div>

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
