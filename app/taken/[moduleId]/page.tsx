"use client";

import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import HaccpTemperatureModule from "@/components/HaccpTemperatureModule";
import SupercellButton from "@/components/SupercellButton";
import OntvangstCheck from "@/components/OntvangstCheck";
import SchoonmaakCheck from "@/components/SchoonmaakCheck";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import { ArrowLeft } from "lucide-react";
import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, type ComponentType } from "react";

const MODULE_COMPONENTS: Record<string, ComponentType> = {
  koeling: () => (
    <HaccpTemperatureModule
      moduleType="koeling"
      title="Koeling"
      defaultTemperature={7}
      firstEquipmentName="Koelkast 1"
      mode="manage"
    />
  ),
  ontvangst: () => <OntvangstCheck mode="manage" />,
  schoonmaak: () => <SchoonmaakCheck mode="manage" />,
  kerntemperatuur: () => (
    <HaccpTemperatureModule
      moduleType="kerntemperatuur"
      title="Kerntemperatuur"
      defaultTemperature={75}
      firstEquipmentName="Kernsonde 1"
      mode="manage"
    />
  ),
};

function ModuleContent() {
  const router = useRouter();
  const params = useParams<{ moduleId: string }>();
  const moduleId = params?.moduleId ?? "";
  const { user, isLoading } = useUser();

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

  const ModuleComponent = MODULE_COMPONENTS[moduleId];
  if (!ModuleComponent) {
    notFound();
  }

  const handleMenuNav = (tab: MenuTab) => {
    if (tab === "registreren") router.push("/registreren");
    else if (tab === "taken") router.push("/");
    else router.push(`/?tab=${tab}`);
  };

  return (
    <>
      <VerifyEmailBanner />
      <section className="px-6 pb-24 pt-20 sm:px-10 sm:pb-28 sm:pt-28">
        <SupercellButton
          type="button"
          size="lg"
          variant="neutral"
          onClick={() => router.push("/")}
          className="mb-8 flex h-20 w-full items-center justify-center gap-3 text-2xl"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          Terug
        </SupercellButton>

        <ModuleComponent />
      </section>

      <FloatingMenu active="taken" onChange={handleMenuNav} />
    </>
  );
}

export default function TakenModulePage() {
  return (
    <UserProvider>
      <ModuleContent />
    </UserProvider>
  );
}
