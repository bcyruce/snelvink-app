"use client";

import BottomNav, { type BottomNavTab } from "@/components/BottomNav";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import {
  getModuleIcon,
  loadLayout,
  type TaskModule,
} from "@/lib/taskModules";
import { ArrowLeft, Wrench } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function CustomModuleContent() {
  const router = useRouter();
  const params = useParams<{ customId: string }>();
  const customId = params?.customId ?? "";
  const { user, isLoading } = useUser();

  const [module, setModule] = useState<TaskModule | null>(null);
  const [layoutReady, setLayoutReady] = useState(false);

  useEffect(() => {
    const layout = loadLayout();
    const found = layout.find((m) => m.id === customId) ?? null;
    setModule(found);
    setLayoutReady(true);
  }, [customId]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || !layoutReady) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-semibold text-gray-600">
          SnelVink laden...
        </p>
      </div>
    );
  }

  const handleBottomNav = (tab: BottomNavTab) => {
    if (tab === "tasks") router.push("/");
    else router.push(`/?tab=${tab}`);
  };

  const Icon = module ? getModuleIcon(module.icon) : Wrench;

  return (
    <>
      <VerifyEmailBanner />
      <section className="px-6 pb-24 pt-20 sm:px-10 sm:pb-28 sm:pt-28">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-8 flex h-20 w-full items-center justify-center gap-3 rounded-2xl bg-gray-900 text-2xl font-black text-white shadow-md transition-transform active:scale-95"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          Terug
        </button>

        {module ? (
          <div className="mt-4 flex flex-col gap-6">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {module.name}
            </h2>

            <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
              <Icon
                className="h-16 w-16 text-gray-400"
                strokeWidth={2}
                aria-hidden
              />
              <p className="text-xl font-bold text-gray-700">
                Nog te implementeren
              </p>
              <p className="max-w-sm text-base text-gray-500">
                Deze module heb je zelf toegevoegd. De registratiefunctie komt
                binnenkort. Ondertussen blijft de tegel netjes op je beginscherm
                staan.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
            <Wrench
              className="h-16 w-16 text-gray-400"
              strokeWidth={2}
              aria-hidden
            />
            <p className="text-xl font-bold text-gray-700">
              Module niet gevonden
            </p>
            <p className="max-w-sm text-base text-gray-500">
              Deze module bestaat niet (meer) in je lay-out. Ga terug naar het
              beginscherm.
            </p>
          </div>
        )}
      </section>

      <BottomNav active="tasks" onChange={handleBottomNav} />
    </>
  );
}

export default function CustomModulePage() {
  return (
    <UserProvider>
      <CustomModuleContent />
    </UserProvider>
  );
}
