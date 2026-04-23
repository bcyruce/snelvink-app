"use client";

import SubscriptionPage from "@/components/SubscriptionPage";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { UserProvider, useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function SubscriptionRouteContent() {
  const router = useRouter();
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

  return (
    <>
      <VerifyEmailBanner />
      <SubscriptionPage />
    </>
  );
}

export default function DashboardSubscriptionPage() {
  return (
    <UserProvider>
      <SubscriptionRouteContent />
    </UserProvider>
  );
}
