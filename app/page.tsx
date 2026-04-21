"use client";

import BottomNav, { type BottomNavTab } from "@/components/BottomNav";
import HistoryList from "@/components/HistoryList";
import KerntemperatuurCheck from "@/components/KerntemperatuurCheck";
import KoelingCheck from "@/components/KoelingCheck";
import OntvangstCheck from "@/components/OntvangstCheck";
import SchoonmaakCheck from "@/components/SchoonmaakCheck";
import SettingsTab from "@/components/SettingsTab";
import { UserProvider, useUser } from "@/hooks/useUser";
import { Sparkles, Thermometer, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type TaskModule =
  | "dashboard"
  | "koeling"
  | "schoonmaak"
  | "kerntemp"
  | "ontvangst";

function HomeContent() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [activeTab, setActiveTab] = useState<BottomNavTab>("tasks");
  const [activeModule, setActiveModule] = useState<TaskModule>("dashboard");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-semibold text-gray-600">
          SnelVink laden...
        </p>
      </div>
    );
  }

  return (
    <>
      <section className="px-6 pb-24 pt-20 sm:px-10 sm:pb-28 sm:pt-28">
        <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight text-gray-900">
          SnelVink
        </h1>
        <p className="mt-5 text-lg text-gray-600 sm:text-xl">
          De keuken is open.
        </p>

        <div key={activeTab} className="tab-panel-enter">
          {activeTab === "tasks" ? (
            <>
              {activeModule === "dashboard" ? (
                <div className="mt-8 grid grid-cols-2 gap-5 sm:gap-6">
                  <button
                    type="button"
                    onClick={() => setActiveModule("koeling")}
                    className="flex h-40 w-full flex-col items-center justify-center gap-3 rounded-3xl bg-gray-100 px-4 text-center text-xl font-black text-gray-900 shadow-sm transition-transform active:scale-95"
                  >
                    <Thermometer className="h-11 w-11" strokeWidth={2.25} aria-hidden />
                    Koeling 1
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModule("schoonmaak")}
                    className="flex h-40 w-full flex-col items-center justify-center gap-3 rounded-3xl bg-gray-100 px-4 text-center text-xl font-black text-gray-900 shadow-sm transition-transform active:scale-95"
                  >
                    <Sparkles className="h-11 w-11" strokeWidth={2.25} aria-hidden />
                    Schoonmaak
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModule("kerntemp")}
                    className="flex h-40 w-full flex-col items-center justify-center gap-3 rounded-3xl bg-gray-100 px-4 text-center text-xl font-black text-gray-900 shadow-sm transition-transform active:scale-95"
                  >
                    <Thermometer className="h-11 w-11" strokeWidth={2.25} aria-hidden />
                    Kerntemperatuur
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModule("ontvangst")}
                    className="flex h-40 w-full flex-col items-center justify-center gap-3 rounded-3xl bg-gray-100 px-4 text-center text-xl font-black text-gray-900 shadow-sm transition-transform active:scale-95"
                  >
                    <Truck className="h-11 w-11" strokeWidth={2.25} aria-hidden />
                    Ontvangst
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveModule("dashboard")}
                    className="mb-8 h-20 w-full rounded-2xl bg-gray-900 text-2xl font-black text-white shadow-md transition-transform active:scale-95"
                  >
                    Terug
                  </button>

                  {activeModule === "koeling" ? <KoelingCheck /> : null}
                  {activeModule === "schoonmaak" ? <SchoonmaakCheck /> : null}
                  {activeModule === "kerntemp" ? <KerntemperatuurCheck /> : null}
                  {activeModule === "ontvangst" ? <OntvangstCheck /> : null}
                </>
              )}
            </>
          ) : null}

          {activeTab === "history" ? <HistoryList /> : null}

          {activeTab === "settings" ? <SettingsTab /> : null}
        </div>
      </section>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </>
  );
}

export default function Home() {
  return (
    <UserProvider>
      <HomeContent />
    </UserProvider>
  );
}
