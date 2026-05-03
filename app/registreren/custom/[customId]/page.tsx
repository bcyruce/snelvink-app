"use client";

import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import HaccpTemperatureModule from "@/components/HaccpTemperatureModule";
import OntvangstCheck from "@/components/OntvangstCheck";
import SchoonmaakCheck from "@/components/SchoonmaakCheck";
import SupercellButton from "@/components/SupercellButton";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { useTranslation } from "@/hooks/useTranslation";
import { UserProvider, useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Wrench } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CustomModuleType = "number" | "boolean" | "list";

type CustomModuleHeader = {
  id: string;
  name: string;
  moduleType: CustomModuleType;
};

function normalizeModuleType(value: unknown): CustomModuleType {
  if (value === "boolean") return "boolean";
  if (value === "list") return "list";
  return "number";
}

function CustomModuleRecordContent() {
  const router = useRouter();
  const params = useParams<{ customId: string }>();
  const customId = params?.customId ?? "";
  const { user, isLoading } = useUser();
  const { t } = useTranslation();

  const [module, setModule] = useState<CustomModuleHeader | null>(null);
  const [isModuleLoading, setIsModuleLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !customId) {
      setIsModuleLoading(false);
      return;
    }

    let ignore = false;

    async function loadModule() {
      setIsModuleLoading(true);
      const { data, error } = await supabase
        .from("custom_modules")
        .select("id, name, module_type")
        .eq("id", customId)
        .maybeSingle();

      if (ignore) return;

      if (error || !data) {
        console.error("Custom module laden mislukt:", error);
        setErrorMessage(t("moduleNotFound"));
        setModule(null);
      } else {
        setModule({
          id: String(data.id),
          name: data.name ?? t("customModuleDefaultName"),
          moduleType: normalizeModuleType(data.module_type),
        });
      }
      setIsModuleLoading(false);
    }

    void loadModule();

    return () => {
      ignore = true;
    };
  }, [customId, user, t]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  const handleMenuNav = (tab: MenuTab) => {
    if (tab === "registreren") router.push("/registreren");
    else if (tab === "taken") router.push("/");
    else router.push(`/?tab=${tab}`);
  };

  if (isLoading || !user || isModuleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-semibold text-slate-500">
          {t("loadingApp")}
        </p>
      </div>
    );
  }

  return (
    <>
      <VerifyEmailBanner />
      <section className="px-6 pb-24 pt-20 sm:px-10 sm:pb-28 sm:pt-28">
        <SupercellButton
          type="button"
          size="lg"
          variant="neutral"
          onClick={() => router.push("/registreren")}
          className="mb-8 flex h-20 w-full items-center justify-center gap-3 text-2xl"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          {t("back")}
        </SupercellButton>

        {module ? (
          module.moduleType === "number" ? (
            <HaccpTemperatureModule
              moduleType="custom_number"
              title={module.name}
              defaultTemperature={0}
              firstEquipmentName={t("itemOne")}
              mode="record"
              customModuleId={module.id}
              stepLayout="single"
            />
          ) : module.moduleType === "boolean" ? (
            <OntvangstCheck
              mode="record"
              customModuleId={module.id}
              title={module.name}
            />
          ) : (
            <SchoonmaakCheck
              mode="record"
              customModuleId={module.id}
              title={module.name}
            />
          )
        ) : (
          <div className="mt-4 flex flex-col items-center justify-center gap-5 rounded-3xl border border-slate-100 bg-white px-6 py-16 text-center shadow-sm">
            <Wrench
              className="h-16 w-16 text-slate-400"
              strokeWidth={2}
              aria-hidden
            />
            <p className="text-xl font-bold text-slate-900">
              {errorMessage ?? t("moduleNotFound")}
            </p>
            <p className="max-w-sm text-base text-slate-500">
              {t("moduleUnavailable")}
            </p>
          </div>
        )}
      </section>

      <FloatingMenu active="registreren" onChange={handleMenuNav} />
    </>
  );
}

export default function CustomModuleRecordPage() {
  return (
    <UserProvider>
      <CustomModuleRecordContent />
    </UserProvider>
  );
}
