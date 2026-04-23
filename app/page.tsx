"use client";

import BottomNav, { type BottomNavTab } from "@/components/BottomNav";
import HistoryList from "@/components/HistoryList";
import SettingsTab from "@/components/SettingsTab";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import {
  DEFAULT_MODULES,
  getModuleIcon,
  loadLayout,
  type TaskModule,
} from "@/lib/taskModules";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const VALID_TABS: readonly BottomNavTab[] = ["tasks", "history", "settings"];

function isBottomNavTab(value: string | null): value is BottomNavTab {
  return value !== null && (VALID_TABS as readonly string[]).includes(value);
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useUser();

  const initialTab: BottomNavTab = (() => {
    const t = searchParams.get("tab");
    return isBottomNavTab(t) ? t : "tasks";
  })();

  const [activeTab, setActiveTab] = useState<BottomNavTab>(initialTab);
  const [modules, setModules] = useState<TaskModule[]>(DEFAULT_MODULES);

  useEffect(() => {
    setModules(loadLayout());
  }, []);

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
      <VerifyEmailBanner />
      <section className="px-6 pb-24 pt-20 sm:px-10 sm:pb-28 sm:pt-28">
        <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight text-gray-900">
          SnelVink
        </h1>
        <p className="mt-5 text-lg text-gray-600 sm:text-xl">
          De keuken is open.
        </p>

        <div key={activeTab} className="tab-panel-enter">
          {activeTab === "tasks" ? (
            <div className="mt-8 grid grid-cols-2 gap-5 sm:gap-6">
              {modules.map((m) => {
                const Icon = getModuleIcon(m.icon);
                return (
                  <Link
                    key={m.id}
                    href={m.href}
                    className="flex h-40 w-full flex-col items-center justify-center gap-3 rounded-3xl bg-gray-100 px-4 text-center text-xl font-black text-gray-900 shadow-sm transition-transform active:scale-95"
                  >
                    <Icon
                      className="h-11 w-11"
                      strokeWidth={2.25}
                      aria-hidden
                    />
                    <span className="line-clamp-2 leading-tight">
                      {m.name}
                    </span>
                  </Link>
                );
              })}
            </div>
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
