"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "nl" | "en";

const STORAGE_KEY = "snelvink-language";

export const translations = {
  nl: {
    // Core HACCP terms
    koeling: "Koeling",
    schoonmaak: "Schoonmaak",
    ontvangst: "Ontvangst",
    goedgekeurd: "Goedgekeurd",
    afgekeurd: "Afgekeurd",
    // Shared labels
    languageSectionTitle: "Taal / Language",
    languageSectionSubtitle: "Kies je app-taal",
    koelingOne: "Koeling 1",
    clickToEditTemperature: "Klik op het getal om handmatig in te voeren",
    manualTemperatureInput: "Temperatuur handmatig invoeren",
    currentTemperatureAria: "Huidige temperatuur {temp} °C, tik om handmatig in te voeren",
    increaseOneDegree: "Eén graad hoger",
    increaseTenthDegree: "Nul komma één hoger",
    decreaseOneDegree: "Eén graad lager",
    decreaseTenthDegree: "Nul komma één lager",
    registered: "Geregistreerd!",
    photoAdded: "Foto toegevoegd",
    takePhotoOptional: "Maak een foto (Optioneel)",
    photoPreviewAlt: "Voorbeeld van toegevoegde foto",
    saving: "Laden...",
    save: "Opslaan",
    basicPlanPhotoMessage:
      "Alleen beschikbaar voor Basic-abonnement. Upgrade om foto's toe te voegen als bewijs voor de NVWA.",
  },
  en: {
    // Core HACCP terms
    koeling: "Cooling",
    schoonmaak: "Cleaning",
    ontvangst: "Receiving",
    goedgekeurd: "Approved",
    afgekeurd: "Rejected",
    // Shared labels
    languageSectionTitle: "Taal / Language",
    languageSectionSubtitle: "Choose your app language",
    koelingOne: "Cooling 1",
    clickToEditTemperature: "Tap the number to enter manually",
    manualTemperatureInput: "Enter temperature manually",
    currentTemperatureAria: "Current temperature {temp} °C, tap to enter manually",
    increaseOneDegree: "Increase by one degree",
    increaseTenthDegree: "Increase by 0.1 degree",
    decreaseOneDegree: "Decrease by one degree",
    decreaseTenthDegree: "Decrease by 0.1 degree",
    registered: "Saved!",
    photoAdded: "Photo added",
    takePhotoOptional: "Take a photo (Optional)",
    photoPreviewAlt: "Preview of selected photo",
    saving: "Saving...",
    save: "Save",
    basicPlanPhotoMessage:
      "Only available on the Basic plan. Upgrade to add photos as evidence for the NVWA.",
  },
} as const;

type TranslationKey = keyof (typeof translations)["nl"];

const termAliases: Record<string, TranslationKey> = {
  koeling: "koeling",
  cooling: "koeling",
  schoonmaak: "schoonmaak",
  cleaning: "schoonmaak",
  ontvangst: "ontvangst",
  receiving: "ontvangst",
  goedgekeurd: "goedgekeurd",
  approved: "goedgekeurd",
  afgekeurd: "afgekeurd",
  rejected: "afgekeurd",
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  translateHaccpText: (input: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("nl");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "nl" || stored === "en") {
        setLanguageState(stored);
      }
    } catch {
      // ignore storage read failures
    }
  }, []);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch {
      // ignore storage write failures
    }
  };

  const value = useMemo<LanguageContextValue>(() => {
    const t = (key: TranslationKey, vars?: Record<string, string | number>) => {
      let template = translations[language][key] ?? translations.nl[key] ?? key;
      if (!vars) return template;
      Object.entries(vars).forEach(([varKey, varValue]) => {
        template = template.replace(`{${varKey}}`, String(varValue));
      });
      return template;
    };

    const translateHaccpText = (input: string) => {
      let output = input;
      Object.entries(termAliases).forEach(([alias, key]) => {
        const re = new RegExp(`\\b${alias}\\b`, "gi");
        output = output.replace(re, t(key));
      });
      return output;
    };

    return {
      language,
      setLanguage,
      t,
      translateHaccpText,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguageContext() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguageContext must be used inside LanguageProvider");
  }
  return ctx;
}
