"use client";

import AppHeader from "@/components/AppHeader";
import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import RecordSelectionModal from "@/components/RecordSelectionModal";
import ScheduleReminderList from "@/components/ScheduleReminderList";
import SupercellButton from "@/components/SupercellButton";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { UserProvider, useUser } from "@/hooks/useUser";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function RegistrerenContent() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-center text-lg font-bold" style={{ color: theme.muted }}>
          {t("loadingApp")}
        </p>
      </div>
    );
  }

  const handleMenuNav = (tab: MenuTab) => {
    if (tab === "registreren") return; // Already on this page
    if (tab === "taken") router.push("/");
    else router.push(`/?tab=${tab}`);
  };

  return (
    <>
      <VerifyEmailBanner />

      <AppHeader />

      {/* Main Content */}
      <section
        className="relative flex flex-col px-4 pb-28 pt-6"
        style={{ background: theme.bg, minHeight: "calc(100vh - 100px)" }}
      >
        {/* Section Label */}
        <span
          className="mb-4 text-[11px] font-black uppercase tracking-widest"
          style={{ color: theme.muted }}
        >
          {t("registrerenTitle")}
        </span>

        {/* Nieuwe Registratie */}
        <SupercellButton
          size="lg"
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          className="flex w-full items-center justify-center gap-3 py-5 text-xl"
          style={{
            minHeight: 82,
            background: theme.primary,
            borderColor: theme.primaryDark,
          }}
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
          <span>{t("newRegistration")}</span>
        </SupercellButton>

        {/* Info text */}
        <p
          className="mt-4 text-center text-sm font-medium"
          style={{ color: theme.muted }}
        >
          {t("newRegistrationHint")}
        </p>

        <ScheduleReminderList />
      </section>

      {/* Module Selection Modal */}
      <RecordSelectionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Floating Menu */}
      <FloatingMenu active="registreren" onChange={handleMenuNav} />
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
