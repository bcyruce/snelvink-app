"use client";

import AppHeader from "@/components/AppHeader";
import FloatingMenu, { type MenuTab } from "@/components/FloatingMenu";
import IncompleteTasksList from "@/components/IncompleteTasksList";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { UserProvider, useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function OnvoltooidContent() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const { theme } = useTheme();
  const { t } = useTranslation();

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
    if (tab === "registreren") {
      router.push("/registreren");
      return;
    }
    if (tab === "taken") router.push("/");
    else router.push(`/?tab=${tab}`);
  };

  return (
    <>
      <VerifyEmailBanner />

      <AppHeader />

      <section
        className="relative px-4 pb-32 pt-4"
        style={{ background: theme.bg, minHeight: "calc(100vh - 100px)" }}
      >
        <IncompleteTasksList />
      </section>

      <FloatingMenu active="geschiedenis" onChange={handleMenuNav} />
    </>
  );
}

export default function OnvoltooidPage() {
  return (
    <UserProvider>
      <OnvoltooidContent />
    </UserProvider>
  );
}
