"use client";

import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import RecordSelectionModal from "@/components/RecordSelectionModal";
import ScheduleReminderList from "@/components/ScheduleReminderList";
import SupercellButton from "@/components/SupercellButton";
import ThemePicker from "@/components/ThemePicker";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { useTheme } from "@/hooks/useTheme";
import { UserProvider, useUser } from "@/hooks/useUser";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function RegistrerenContent() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const { theme } = useTheme();
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
          SnelVink laden...
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

      {/* Header */}
      <header
        className="px-5 pt-6 pb-5"
        style={{ background: theme.primary }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "0.06em",
                lineHeight: 1,
                fontFamily: "'Trebuchet MS', sans-serif",
                textTransform: "uppercase",
              }}
            >
              SNEL<span style={{ opacity: 0.5, marginLeft: "0.1em" }}>VINK</span>
            </div>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.15em",
                marginTop: 3,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Meten · Vinken · Weten
            </div>
          </div>
          <ThemePicker />
        </div>
      </header>

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
          Registreren
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
          <span>Nieuwe Registratie</span>
        </SupercellButton>

        {/* Info text */}
        <p
          className="mt-4 text-center text-sm font-medium"
          style={{ color: theme.muted }}
        >
          Tik op de knop hierboven om een nieuwe registratie te starten.
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
