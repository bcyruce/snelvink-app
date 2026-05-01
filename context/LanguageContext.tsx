"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type Language = "nl" | "en";

const STORAGE_KEY = "snelvink-language";

export const translations = {
  nl: {
    // Core HACCP terms
    koeling: "Koeling",
    kerntemperatuur: "Kerntemperatuur",
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
    close: "Sluiten",
    loadingApp: "SnelVink laden...",
    loadingReminders: "Herinneringen laden...",
    menuOpen: "Menu openen",
    menuClose: "Menu sluiten",
    comingSoon: "Binnenkort",
    navRegistreren: "Registreren",
    navTaken: "Taken",
    navGeschiedenis: "Geschiedenis",
    navPersoneel: "Personeelsbeheer",
    navProfiel: "Mijn profiel",
    navRestaurant: "Mijn restaurant",
    navInstellingen: "Instellingen",
    registrerenTitle: "Registreren",
    newRegistration: "Nieuwe registratie",
    newRegistrationHint:
      "Tik op de knop hierboven om een nieuwe registratie te starten.",
    chooseModule: "Kies een module",
    reminders: "Herinneringen",
    today: "Vandaag",
    tomorrow: "Morgen",
    thisWeek: "Deze week",
    allPlanning: "Alle planning",
    todayAllDone: "Vandaag zijn alle taken voltooid.",
    noTasksTomorrow: "Morgen staan er geen taken gepland.",
    noTasksThisWeek: "Deze week staan er geen taken gepland.",
    remindersLoadFailed: "Herinneringen laden mislukt.",
    recordsLoadFailed: "Registraties laden mislukt.",
    filterByType: "Filter op type",
    all: "Alle",
    previousMonth: "Vorige maand",
    nextMonth: "Volgende maand",
    chooseMonth: "Maand kiezen",
    chooseYear: "Jaar kiezen",
    noPlannedTasksOnDay: "Geen geplande taken op deze dag.",
    months: "Januari|Februari|Maart|April|Mei|Juni|Juli|Augustus|September|Oktober|November|December",
    weekdaysShort: "Ma|Di|Wo|Do|Vr|Za|Zo",
    weekdaysFull: "Maandag|Dinsdag|Woensdag|Donderdag|Vrijdag|Zaterdag|Zondag",
    restaurantManageIntro: "Beheer je restaurantgegevens en instellingen.",
    openingHours: "Openingstijden",
    openingHoursManage: "Openingstijden en sluitingsdagen beheren",
    ownerOnlyRestaurantSettings:
      "Alleen de eigenaar kan restaurantinstellingen aanpassen.",
    backToRestaurant: "Terug naar restaurant",
    openingHoursIntro:
      "Stel hier de openingstijden in. Dagelijkse taken worden niet gepland op dagen waarop het restaurant gesloten is.",
    closedDays: "Sluitingsdagen",
    noClosedDays: "Geen extra sluitingsdagen ingesteld.",
    closedDayAdd: "Sluitingsdag toevoegen",
    closedDayRemove: "{date} verwijderen",
    from: "Van",
    to: "Tot",
    open: "Open",
    closed: "Gesloten",
    restaurantSettingsSaved: "Restaurantinstellingen opgeslagen.",
    saveFailed: "Opslaan mislukt.",
    frequency: "Frequentie",
    frequencyIntro:
      "Als deze taak niet periodiek is, klik dan direct op Nieuwe registratie in Registreren.",
    notPeriodic: "Niet periodiek",
    daily: "Dagelijks",
    weekly: "Wekelijks",
    monthly: "Maandelijks",
    yearly: "Jaarlijks",
    custom: "Aangepast",
    assignTimes: "Tijdstippen toewijzen?",
    yes: "Ja",
    no: "Nee",
    registrationTime: "{ordinal} registratietijd",
    registrationDate: "{ordinal} registratiedatum",
    optional: "Optioneel",
    addReminder: "Herinnering toevoegen",
    removeReminder: "Herinnering verwijderen",
    add: "Toevoegen",
    remove: "Verwijderen",
    move: "Verplaatsen",
    edit: "Wijzigen",
    done: "Klaar",
    ordinal1: "Eerste",
    ordinal2: "Tweede",
    ordinal3: "Derde",
    ordinal4: "Vierde",
    ordinal5: "Vijfde",
    ordinalN: "{n}e",
    theme: "Thema",
    changeTheme: "Thema wijzigen",
    staffIntro: "Beheer je teamleden en hun toegangsrechten",
    profileIntro: "Bekijk en bewerk je persoonlijke gegevens",
    deletedMessage: '"{name}" verwijderd',
    undo: "Ongedaan",
  },
  en: {
    // Core HACCP terms
    koeling: "Cooling",
    kerntemperatuur: "Core temperature",
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
    close: "Close",
    loadingApp: "Loading SnelVink...",
    loadingReminders: "Loading reminders...",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    comingSoon: "Coming soon",
    navRegistreren: "Register",
    navTaken: "Tasks",
    navGeschiedenis: "History",
    navPersoneel: "Staff management",
    navProfiel: "My profile",
    navRestaurant: "My restaurant",
    navInstellingen: "Settings",
    registrerenTitle: "Register",
    newRegistration: "New registration",
    newRegistrationHint: "Tap the button above to start a new registration.",
    chooseModule: "Choose a module",
    reminders: "Reminders",
    today: "Today",
    tomorrow: "Tomorrow",
    thisWeek: "This week",
    allPlanning: "All planning",
    todayAllDone: "All tasks for today are complete.",
    noTasksTomorrow: "No tasks are planned for tomorrow.",
    noTasksThisWeek: "No tasks are planned for this week.",
    remindersLoadFailed: "Failed to load reminders.",
    recordsLoadFailed: "Failed to load registrations.",
    filterByType: "Filter by type",
    all: "All",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    chooseMonth: "Choose month",
    chooseYear: "Choose year",
    noPlannedTasksOnDay: "No tasks are planned for this day.",
    months: "January|February|March|April|May|June|July|August|September|October|November|December",
    weekdaysShort: "Mon|Tue|Wed|Thu|Fri|Sat|Sun",
    weekdaysFull: "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday",
    restaurantManageIntro: "Manage your restaurant details and settings.",
    openingHours: "Opening hours",
    openingHoursManage: "Manage opening hours and closed days",
    ownerOnlyRestaurantSettings: "Only the owner can change restaurant settings.",
    backToRestaurant: "Back to restaurant",
    openingHoursIntro:
      "Set the opening hours here. Daily tasks are not planned on days when the restaurant is closed.",
    closedDays: "Closed days",
    noClosedDays: "No extra closed days have been set.",
    closedDayAdd: "Add closed day",
    closedDayRemove: "Remove {date}",
    from: "From",
    to: "To",
    open: "Open",
    closed: "Closed",
    restaurantSettingsSaved: "Restaurant settings saved.",
    saveFailed: "Save failed.",
    frequency: "Frequency",
    frequencyIntro:
      "If this task is not recurring, use New registration directly in Register.",
    notPeriodic: "Not recurring",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
    custom: "Custom",
    assignTimes: "Assign times?",
    yes: "Yes",
    no: "No",
    registrationTime: "{ordinal} registration time",
    registrationDate: "{ordinal} registration date",
    optional: "Optional",
    addReminder: "Add reminder",
    removeReminder: "Remove reminder",
    add: "Add",
    remove: "Remove",
    move: "Move",
    edit: "Edit",
    done: "Done",
    ordinal1: "First",
    ordinal2: "Second",
    ordinal3: "Third",
    ordinal4: "Fourth",
    ordinal5: "Fifth",
    ordinalN: "{n}th",
    theme: "Theme",
    changeTheme: "Change theme",
    staffIntro: "Manage your team members and access rights",
    profileIntro: "View and edit your personal details",
    deletedMessage: '"{name}" deleted',
    undo: "Undo",
  },
} as const;

type TranslationKey = keyof (typeof translations)["nl"];

const termAliases: Record<string, TranslationKey> = {
  koeling: "koeling",
  cooling: "koeling",
  kerntemperatuur: "kerntemperatuur",
  "core temperature": "kerntemperatuur",
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
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      if (typeof window === "undefined") return "nl";
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "nl" || stored === "en") {
        return stored;
      }
    } catch {
      // ignore storage read failures
    }
    return "nl";
  });

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
      let template: string =
        translations[language][key] ?? translations.nl[key] ?? key;
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
