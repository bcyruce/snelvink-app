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

type RegistrerenModuleProps = {
  mode?: "manage" | "record";
  initialItemId?: string;
};

// Components with mode prop - always use "record" mode for registreren
const MODULE_COMPONENTS: Record<string, ComponentType<RegistrerenModuleProps>> = {
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
  const initialItemId = searchParams?.get("item") ?? undefined;
  const { user, isLoading } = useUser();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/app/login");
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

  const handleMenuNav = (tab: MenuTab) => {
    if (tab === "registreren") router.push("/app/registreren");
    else if (tab === "taken") router.push("/app");
    else router.push(`/?tab=${tab}`);
  };

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

        {/* Always use record mode for registreren pages */}
        <ModuleComponent mode="record" initialItemId={initialItemId} />
      </section>

      <FloatingMenu active="registreren" onChange={handleMenuNav} />
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

export default function RegistrerenModulePage() {
  return (
    <UserProvider>
      <Suspense fallback={<ModuleLoading />}>
        <ModuleContent />
      </Suspense>
    </UserProvider>
  );
}
