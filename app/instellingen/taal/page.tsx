"use client";

import AppHeader from "@/components/AppHeader";
import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import {
  LANGUAGE_META,
  SUPPORTED_LANGUAGES,
  type Language,
} from "@/context/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { UserProvider, useUser } from "@/hooks/useUser";
import { ArrowLeft, Check, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function LanguageSettingsContent() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const { theme } = useTheme();
  const { t, language, setLanguage } = useTranslation();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-bold" style={{ color: theme.muted }}>
          {t("loadingApp")}
        </p>
      </div>
    );
  }

  const handleMenuNav = (tab: MenuTab) => {
    if (tab === "registreren") {
      router.push("/registreren");
      return;
    }
    if (tab === "taken") router.push("/");
    else router.push(`/?tab=${tab}`);
  };

  const handleSelect = (next: Language) => {
    setLanguage(next);
  };

  return (
    <>
      <VerifyEmailBanner />

      <AppHeader />

      <section
        className="relative px-4 pb-32 pt-4"
        style={{ background: theme.bg, minHeight: "calc(100vh - 100px)" }}
      >
        <div className="mt-2">
          <div className="mb-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/?tab=instellingen")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-50 active:translate-y-0.5 rtl:rotate-180"
              aria-label={t("back")}
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {t("language")}
              </h1>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {t("chooseLanguage")}
              </p>
            </div>
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: `${theme.primary}15`, color: theme.primary }}
              aria-hidden
            >
              <Globe className="h-5 w-5" strokeWidth={2.25} />
            </div>
          </div>

          <ul className="flex flex-col gap-2.5">
            {SUPPORTED_LANGUAGES.map((code) => {
              const meta = LANGUAGE_META[code];
              const active = language === code;
              return (
                <li key={code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(code)}
                    aria-pressed={active}
                    className={[
                      "flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-all active:translate-y-0.5",
                      active
                        ? "border-blue-300 border-b-4 border-b-blue-400 bg-blue-50 shadow-sm"
                        : "border-slate-200 border-b-4 border-b-slate-300 bg-white hover:bg-slate-50",
                    ].join(" ")}
                    dir={meta.dir}
                  >
                    <span
                      aria-hidden
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl ring-1 ring-slate-200"
                    >
                      {meta.flag}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={[
                          "block truncate text-lg font-black",
                          active ? "text-blue-900" : "text-slate-900",
                        ].join(" ")}
                      >
                        {meta.nativeName}
                      </span>
                      <span
                        className={[
                          "block truncate text-xs font-bold uppercase tracking-wider",
                          active ? "text-blue-700/70" : "text-slate-500",
                        ].join(" ")}
                      >
                        {meta.englishName}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                        active
                          ? "bg-blue-600 text-white"
                          : "border-2 border-slate-300 bg-white text-transparent",
                      ].join(" ")}
                    >
                      {active ? (
                        <Check className="h-4 w-4" strokeWidth={3} />
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <FloatingMenu active="instellingen" onChange={handleMenuNav} />
    </>
  );
}

export default function LanguageSettingsPage() {
  return (
    <UserProvider>
      <LanguageSettingsContent />
    </UserProvider>
  );
}
