"use client";

import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import SupercellButton from "@/components/SupercellButton";
import KerntemperatuurCheck from "@/components/KerntemperatuurCheck";
import KoelingCheck from "@/components/KoelingCheck";
import OntvangstCheck from "@/components/OntvangstCheck";
import SchoonmaakCheck from "@/components/SchoonmaakCheck";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { useTranslation } from "@/hooks/useTranslation";
import { UserProvider, useUser } from "@/hooks/useUser";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, type ComponentType } from "react";

// Components with mode prop for manage/record distinction
const MODULE_COMPONENTS: Record<string, ComponentType<{ mode?: "manage" | "record" }>> = {
  koeling: KoelingCheck,
  ontvangst: OntvangstCheck,
  schoonmaak: SchoonmaakCheck,
  kerntemperatuur: KerntemperatuurCheck,
};

function ModuleContent() {
  const router = useRouter();
  const params = useParams<{ moduleId: string }>();
  const searchParams = useSearchParams();
  const moduleId = params?.moduleId ?? "";
  const { user, isLoading } = useUser();
  const { t } = useTranslation();

  // Determine where to go back based on source parameter
  const source = searchParams.get("source");
  const backPath = source === "registreren" ? "/registreren" : "/";
  const activeMenu = source === "registreren" ? "registreren" : "taken";

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-semibold text-gray-600">
          {t("loadingApp")}
        </p>
      </div>
    );
  }

  const ModuleComponent = MODULE_COMPONENTS[moduleId];
  if (!ModuleComponent) {
    notFound();
  }

  // Determine mode: if coming from registreren, use record mode; otherwise use manage mode
  const componentMode = source === "registreren" ? "record" : "manage";

  const handleMenuNav = (tab: MenuTab) => {
    if (tab === "registreren") router.push("/registreren");
    else if (tab === "taken") router.push("/");
    else router.push(`/?tab=${tab}`);
  };

  return (
    <>
      <VerifyEmailBanner />
      <section className="px-6 pb-32 pt-20 sm:px-10 sm:pb-36 sm:pt-28">
        <SupercellButton
          type="button"
          size="iconSm"
          variant="neutral"
          onClick={() => router.push(backPath)}
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

        <ModuleComponent mode={componentMode} />
      </section>

      <FloatingMenu active={activeMenu as "registreren" | "taken"} onChange={handleMenuNav} />
    </>
  );
}

function ModuleLoading() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <p className="text-center text-lg font-semibold text-gray-600">
        {t("loadingApp")}
      </p>
    </div>
  );
}

export default function TakenModulePage() {
  return (
    <UserProvider>
      <Suspense fallback={<ModuleLoading />}>
        <ModuleContent />
      </Suspense>
    </UserProvider>
  );
}
