"use client";

import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import RecordSelectionModal from "@/components/RecordSelectionModal";
import SupercellButton from "@/components/SupercellButton";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import { loadLayout, type TaskModule } from "@/lib/taskModules";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function RegistrerenContent() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [open, setOpen] = useState(false);
  const [modules, setModules] = useState<TaskModule[]>([]);

  useEffect(() => {
    setModules(loadLayout());
  }, []);

  useEffect(() => {
    if (!isLoading && !user) router.push("/login");
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-semibold text-slate-500">
          SnelVink laden...
        </p>
      </div>
    );
  }

  const handleSelectModule = (module: TaskModule) => {
    setOpen(false);
    if (module.isCustom) {
      router.push(module.href);
      return;
    }
    router.push(`/registreren/${module.id}`);
  };

  const handleMenu = (tab: MenuTab) => {
    if (tab === "registreren") return;
    if (tab === "taken") router.push("/");
    else router.push(`/?tab=${tab}`);
  };

  return (
    <>
      <VerifyEmailBanner />
      <section className="px-5 pb-28 pt-8">
        <SupercellButton
          size="lg"
          variant="primary"
          onClick={() => setOpen(true)}
          textCase="normal"
          className="flex min-h-[220px] w-full flex-col items-center justify-center gap-4 text-3xl"
        >
          <Plus className="h-14 w-14" strokeWidth={2.75} />
          Nieuwe Registratie
        </SupercellButton>
      </section>

      <RecordSelectionModal
        open={open}
        modules={modules}
        onClose={() => setOpen(false)}
        onSelect={handleSelectModule}
      />

      <FloatingMenu active="registreren" onChange={handleMenu} />
    </>
  );
}

export default function RegistrerenPage() {
  return (
    <UserProvider>
      <RegistrerenContent />
    </UserProvider>
  );
}
