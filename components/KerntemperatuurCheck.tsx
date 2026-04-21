"use client";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "snelvink-kerntemperatuur-temperature";
const DEFAULT_TEMP = 75.0;

function parseStoredTemperature(raw: string | null): number | null {
  if (raw === null || raw === "") return null;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

export default function KerntemperatuurCheck() {
  const { profile } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;

  const [temperature, setTemperature] = useState(DEFAULT_TEMP);
  const [storageReady, setStorageReady] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showRegistered, setShowRegistered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const registeredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    try {
      const stored = parseStoredTemperature(
        typeof window !== "undefined"
          ? window.localStorage.getItem(STORAGE_KEY)
          : null,
      );
      if (stored !== null) {
        setTemperature(stored);
      }
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(temperature));
    } catch {
      // ignore quota / private mode
    }
  }, [temperature, storageReady]);

  useEffect(() => {
    if (!isEditing) return;
    inputRef.current?.focus();
    inputRef.current?.select?.();
  }, [isEditing]);

  useEffect(() => {
    return () => {
      if (registeredTimerRef.current) {
        clearTimeout(registeredTimerRef.current);
      }
    };
  }, []);

  const commitEdit = useCallback(() => {
    const parsed = Number.parseFloat(editText.replace(",", "."));
    if (Number.isFinite(parsed)) {
      setTemperature(parsed);
    }
    setIsEditing(false);
  }, [editText]);

  const cancelToDisplay = useCallback(() => {
    setIsEditing(false);
  }, []);

  const startEditing = useCallback(() => {
    setEditText(temperature.toFixed(1));
    setIsEditing(true);
  }, [temperature]);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelToDisplay();
    }
  };

  const adjust = (delta: number) => {
    setTemperature((t) => t + delta);
  };

  const persistLocalBackup = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(temperature));
    } catch {
      // ignore quota / private mode
    }
  };

  const handleSave = async () => {
    if (!restaurantId) {
      console.error("Geen restaurant gekoppeld aan dit profiel.");
      return;
    }

    persistLocalBackup();

    setIsSaving(true);
    setShowRegistered(false);
    try {
      const { error } = await supabase.from("temperature_logs").insert([
        {
          equipment_name: "Kerntemperatuur",
          temperature,
          restaurant_id: restaurantId,
        },
      ]);

      if (error) {
        console.error("Opslaan naar Supabase mislukt:", error);
        return;
      }

      setShowRegistered(true);
      if (registeredTimerRef.current) {
        clearTimeout(registeredTimerRef.current);
      }
      registeredTimerRef.current = setTimeout(() => {
        setShowRegistered(false);
        registeredTimerRef.current = null;
      }, 3000);
    } catch (err) {
      console.error("Opslaan mislukt:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const parsedPreview = Number.parseFloat(editText.replace(",", "."));
  const activeValue =
    isEditing && Number.isFinite(parsedPreview) ? parsedPreview : temperature;
  const tempColor =
    activeValue >= 75 ? "text-green-500" : "text-red-500";

  const buttonClass =
    "h-24 w-full rounded-2xl bg-gray-200 text-xl font-black tracking-wide text-gray-800 shadow-md transition-transform active:scale-95 sm:text-2xl";

  const center = isEditing ? (
    <input
      ref={inputRef}
      type="number"
      inputMode="decimal"
      step="any"
      value={editText}
      onChange={(e) => setEditText(e.target.value)}
      onBlur={commitEdit}
      onKeyDown={onInputKeyDown}
      className={`w-full max-w-full rounded-2xl border-2 border-gray-300 bg-white px-2 py-3 text-center text-7xl font-black tabular-nums leading-none shadow-inner outline-none focus:border-gray-500 sm:px-3 ${tempColor}`}
      aria-label="Temperatuur handmatig invoeren"
    />
  ) : (
    <button
      type="button"
      onClick={startEditing}
      className={`w-full cursor-pointer rounded-2xl border-2 border-transparent px-2 py-2 text-center text-7xl font-black tabular-nums leading-none transition-colors hover:border-gray-200 hover:bg-gray-50 ${tempColor}`}
      aria-label={`Huidige temperatuur ${temperature.toFixed(1)} °C, tik om handmatig in te voeren`}
    >
      {temperature.toFixed(1)}°C
    </button>
  );

  return (
    <div className="mt-10 flex flex-col gap-6">
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
        Kerntemperatuur (Verhitting)
      </h2>

      <p className="text-center text-sm text-gray-500">
        Klik op het getal om handmatig in te voeren
      </p>

      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
        <div className="flex w-full justify-center gap-3">
          <button
            type="button"
            onClick={() => adjust(1)}
            className={`${buttonClass} min-w-0 flex-1`}
            aria-label="Eén graad hoger"
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => adjust(0.1)}
            className={`${buttonClass} min-w-0 flex-1`}
            aria-label="Nul komma één hoger"
          >
            +0,1
          </button>
        </div>

        <div
          className="flex w-full min-h-[5.5rem] items-center justify-center py-2"
          aria-live="polite"
        >
          {center}
        </div>

        <div className="flex w-full justify-center gap-3">
          <button
            type="button"
            onClick={() => adjust(-1)}
            className={`${buttonClass} min-w-0 flex-1`}
            aria-label="Eén graad lager"
          >
            −1
          </button>
          <button
            type="button"
            onClick={() => adjust(-0.1)}
            className={`${buttonClass} min-w-0 flex-1`}
            aria-label="Nul komma één lager"
          >
            −0,1
          </button>
        </div>
      </div>

      {showRegistered ? (
        <p
          className="text-center text-lg font-semibold text-green-600"
          role="status"
          aria-live="polite"
        >
          Geregistreerd!
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !restaurantId}
        aria-busy={isSaving}
        className="h-24 w-full rounded-2xl bg-green-600 text-2xl font-bold text-white shadow-md transition-transform hover:bg-green-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSaving ? "Laden..." : "Opslaan"}
      </button>
    </div>
  );
}
