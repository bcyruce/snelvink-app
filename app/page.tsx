"use client";

import BottomNav, { type BottomNavTab } from "@/components/BottomNav";
import HistoryList from "@/components/HistoryList";
import KerntemperatuurCheck from "@/components/KerntemperatuurCheck";
import KoelingCheck from "@/components/KoelingCheck";
import OntvangstCheck from "@/components/OntvangstCheck";
import SchoonmaakCheck from "@/components/SchoonmaakCheck";
import SettingsTab from "@/components/SettingsTab";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BottomNavTab>("tasks");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    const verifySession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!data.session) {
        router.push("/login");
        return;
      }

      setCheckingSession(false);
    };

    void verifySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push("/login");
      } else if (mounted) {
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (checkingSession) {
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
              <KoelingCheck />
              <hr className="my-10 border-t border-gray-200" />
              <KerntemperatuurCheck />
              <hr className="my-10 border-t border-gray-200" />
              <OntvangstCheck />
              <hr className="my-10 border-t border-gray-200" />
              <SchoonmaakCheck />
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
