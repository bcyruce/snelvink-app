"use client";

import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import SupercellButton from "@/components/SupercellButton";
import KerntemperatuurCheck from "@/components/KerntemperatuurCheck";
import KoelingCheck from "@/components/KoelingCheck";
import OntvangstCheck from "@/components/OntvangstCheck";
import SchoonmaakCheck from "@/components/SchoonmaakCheck";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import { ArrowLeft } from "lucide-react";
import { notFound, useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, type ComponentType } from "react";

// Components with mode prop - always use "record" mode for registreren
const MODULE_COMPONENTS: Record<string, ComponentType<{ mode?: "manage" | "record" }>> = {
  koeling: KoelingCheck,
  ontvangst: OntvangstCheck,
  schoonmaak: SchoonmaakCheck,
  kerntemperatuur: KerntemperatuurCheck,
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
          onClick={() => router.push("/registreren")}
          className="mb-8 flex h-20 w-full items-center justify-center gap-3 text-2xl"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={2.5} aria-hidden />
          Terug
        </SupercellButton>

        {/* Always use record mode for registreren pages */}
        <ModuleComponent mode="record" />
      </section>

      <FloatingMenu active="registreren" onChange={handleMenuNav} />
    </>
  );
}

function ModuleLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <p className="text-center text-lg font-semibold text-gray-600">
        SnelVink laden...
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
