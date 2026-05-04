"use client";

import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import HaccpTemperatureModule from "@/components/HaccpTemperatureModule";
import OntvangstCheck from "@/components/OntvangstCheck";
import SchoonmaakCheck from "@/components/SchoonmaakCheck";
import SupercellButton from "@/components/SupercellButton";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { useTranslation } from "@/hooks/useTranslation";
import { UserProvider, useUser } from "@/hooks/useUser";
import { menuTabPath } from "@/lib/menuTabPath";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { ArrowLeft, Wrench } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

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
  const searchParams = useSearchParams();
  const customId = params?.customId ?? "";
  const initialItemId = searchParams?.get("item") ?? undefined;
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
      router.push("/app/login");
    }
  }, [isLoading, user, router]);

  const handleMenuNav = (tab: MenuTab) => {
    router.push(menuTabPath(tab));
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
          size="iconSm"
          variant="neutral"
          onClick={() => router.push("/app/registreren")}
          aria-label={t("back")}
          className="mb-4 rounded-full"
        >
          <motion.span
            initial={{ x: 0 }}
            whileHover={{ x: -3 }}
            transition={{ type: "spring", stiffness: 380, damping: 18 }}
            className="inline-flex"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </motion.span>
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
              initialItemId={initialItemId}
            />
          ) : module.moduleType === "boolean" ? (
            <OntvangstCheck
              mode="record"
              customModuleId={module.id}
              title={module.name}
              initialItemId={initialItemId}
            />
          ) : (
            <SchoonmaakCheck
              mode="record"
              customModuleId={module.id}
              title={module.name}
              initialItemId={initialItemId}
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

function CustomModuleRecordLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <p className="text-center text-lg font-semibold text-slate-500" />
    </div>
  );
}

export default function CustomModuleRecordPage() {
  return (
    <UserProvider>
      <Suspense fallback={<CustomModuleRecordLoading />}>
        <CustomModuleRecordContent />
      </Suspense>
    </UserProvider>
  );
}
