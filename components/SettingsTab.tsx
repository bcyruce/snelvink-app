"use client";

import SupercellButton from "@/components/SupercellButton";
import { LANGUAGE_META } from "@/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { useTranslation } from "@/hooks/useTranslation";
import { planLabel, planStatusLabel } from "@/lib/plans";
import { listContainerVariants, listItemVariants } from "@/lib/uiMotion";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, LogOut, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type StaffMember = {
  id: string;
  email: string | null;
  full_name: string | null;
};

function translatedPlanStatus(
  status: string | null | undefined,
  t: ReturnType<typeof useTranslation>["t"],
) {
  switch (status) {
    case "active":
      return t("planStatusActive");
    case "trialing":
      return t("planStatusTrialing");
    case "past_due":
      return t("planStatusPastDue");
    case "canceled":
      return t("planStatusCanceled");
    case "incomplete":
    case "incomplete_expired":
      return t("planStatusIncomplete");
    case "unpaid":
      return t("planStatusUnpaid");
    case "paused":
      return t("planStatusPaused");
    default:
      return planStatusLabel(status).label;
  }
}

export default function SettingsTab() {
  const router = useRouter();
  const { language, t } = useTranslation();
  const { profile, restaurant, isFreePlan, refresh } = useUser();
  const languageMeta = LANGUAGE_META[language];
  const restaurantId = profile?.restaurant_id ?? null;
  const isOwner =
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.role === "eigenaar";

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    if (!restaurantId || !isOwner) {
      setStaff([]);
      return;
    }
    setIsLoadingStaff(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("restaurant_id", restaurantId)
        .eq("role", "staff")
        .order("full_name", { ascending: true });
      if (error) {
        console.error("Staff ophalen mislukt:", error);
        setStaff([]);
        return;
      }
      setStaff((data ?? []) as StaffMember[]);
    } catch (err) {
      console.error("Staff ophalen mislukt:", err);
      setStaff([]);
    } finally {
      setIsLoadingStaff(false);
    }
  }, [isOwner, restaurantId]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const handleDeleteStaff = useCallback(
    async (staffId: string) => {
      if (!restaurantId || !isOwner) return;
      setDeletingStaffId(staffId);
      try {
        const { error } = await supabase
          .from("profiles")
          .delete()
          .eq("id", staffId)
          .eq("restaurant_id", restaurantId)
          .eq("role", "staff");
        if (error) {
          console.error("Staff verwijderen mislukt:", error);
          return;
        }
        setStaff((prev) => prev.filter((member) => member.id !== staffId));
      } catch (err) {
        console.error("Staff verwijderen mislukt:", err);
      } finally {
        setDeletingStaffId(null);
      }
    },
    [isOwner, restaurantId],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
      await loadStaff();
    } catch (err) {
      console.error("Gegevens verversen mislukt:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh, loadStaff]);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Uitloggen mislukt:", error);
      }
    } catch (err) {
      console.error("Uitloggen mislukt:", err);
    } finally {
      router.push("/app/login");
      setIsSigningOut(false);
    }
  }, [router]);

  return (
    <motion.div
      className="mt-2"
      variants={listContainerVariants}
      initial="initial"
      animate="animate"
    >
      <motion.h2
        variants={listItemVariants}
        className="mb-5 text-xl font-semibold tracking-tight text-neutral-900"
      >
        {t("settingsTitle")}
      </motion.h2>

      <motion.section
        variants={listItemVariants}
        className="mb-5"
      >
        <button
          type="button"
          onClick={() => router.push("/app/instellingen/taal")}
          className="group flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-4 text-left transition-all duration-200 hover:bg-neutral-50 hover:shadow-sm"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xl">
              {languageMeta.flag}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-neutral-900">
                {t("language")}
              </span>
              <span className="mt-0.5 block truncate text-xs text-neutral-500">
                {languageMeta.nativeName}
              </span>
            </span>
          </span>
          <ChevronRight
            className="h-5 w-5 shrink-0 text-neutral-400 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180"
            strokeWidth={2}
            aria-hidden
          />
        </button>
      </motion.section>

      <motion.div
        variants={listItemVariants}
        className="mb-6 rounded-xl border border-neutral-200 bg-white p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t("restaurant")}
            </p>
            <p className="mt-1 truncate text-lg font-semibold text-neutral-900">
              {restaurant?.name ?? "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            aria-busy={isRefreshing}
            title={t("refresh")}
            className="shrink-0 rounded-lg p-2 hover:bg-neutral-100 transition-colors"
          >
            <RefreshCw
              className={`h-5 w-5 text-neutral-500 ${isRefreshing ? "animate-spin" : ""}`}
              strokeWidth={1.75}
            />
          </button>
        </div>

        <p className="mt-5 text-xs font-medium uppercase tracking-wide text-neutral-500">
          {t("subscription")}
        </p>
        <button
          type="button"
          onClick={() => router.push("/app/dashboard/subscription")}
          className="group mt-2 flex w-full items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-left transition-all duration-200 hover:bg-neutral-100"
        >
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-neutral-900">
              {planLabel(restaurant?.plan ?? restaurant?.plan_type ?? "free")}
            </p>
            {restaurant?.plan_status ? (
              <p className="mt-0.5 truncate text-xs text-neutral-500">
                {translatedPlanStatus(restaurant.plan_status, t)}
              </p>
            ) : (
              <p className="mt-0.5 truncate text-xs text-neutral-500">
                {isOwner
                  ? t("manageSubscription")
                  : t("viewRestaurantSubscription")}
              </p>
            )}
          </div>
          <ChevronRight
            className="h-5 w-5 shrink-0 text-neutral-400 transition-transform duration-200 group-hover:translate-x-0.5"
            strokeWidth={2}
            aria-hidden
          />
        </button>

        {isOwner ? (
          <div className="mt-5 border-t border-neutral-200 pt-5">
            <p className="text-center text-xs font-medium uppercase tracking-wide text-neutral-500">
              {t("inviteCode")}
            </p>
            {!restaurant ? (
              <p className="mt-3 text-center text-sm text-neutral-500">
                {t("loading")}
              </p>
            ) : isFreePlan ? (
              <div className="mt-3 rounded-lg bg-amber-50 px-4 py-4 text-center">
                <p className="text-sm font-medium text-amber-800">
                  {t("inviteCodeUnavailableTitle")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-700">
                  {t("inviteCodeUpgradeMessage")}
                </p>
              </div>
            ) : restaurant.invite_code ? (
              <div className="mt-3 rounded-lg bg-[var(--theme-primary)]/10 px-4 py-5">
                <p className="text-center text-4xl font-bold tabular-nums tracking-widest" style={{ color: "var(--theme-primary)" }}>
                  {restaurant.invite_code}
                </p>
                <p className="mt-3 text-center text-sm text-neutral-600">
                  {t("inviteCodeShareMessage")}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-center text-sm text-neutral-500">
                {t("inviteCodeUnavailable")}
              </p>
            )}
          </div>
        ) : null}
      </motion.div>

      {isOwner ? (
        <motion.div
          variants={listItemVariants}
          className="mb-8 rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white p-5"
        >
          <h3 className="text-lg font-black text-slate-900">{t("staff")}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {t("linkedStaffIntro")}
          </p>
          {isLoadingStaff ? (
            <p className="mt-4 text-sm font-bold text-slate-500">{t("loading")}</p>
          ) : staff.length === 0 ? (
            <p className="mt-4 text-sm font-bold text-slate-500">{t("noLinkedStaff")}</p>
          ) : (
            <motion.ul
              className="mt-4 space-y-3"
              variants={listContainerVariants}
              initial="initial"
              animate="animate"
            >
              <AnimatePresence>
                {staff.map((member) => (
                  <motion.li
                    key={member.id}
                    variants={listItemVariants}
                    layout
                    exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                    className="flex items-center justify-between gap-3 rounded-xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-slate-50 px-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">
                        {member.full_name?.trim() || t("unnamed")}
                      </p>
                      <p className="truncate text-xs font-semibold text-slate-500">
                        {member.email ?? t("unknownEmail")}
                      </p>
                    </div>
                    <SupercellButton
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => void handleDeleteStaff(member.id)}
                      disabled={deletingStaffId === member.id}
                      textCase="normal"
                      className="shrink-0 rounded-xl px-3 py-2 text-sm"
                    >
                      {deletingStaffId === member.id ? t("busy") : t("delete")}
                    </SupercellButton>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </motion.div>
      ) : null}

      <motion.div variants={listItemVariants}>
        <SupercellButton
          type="button"
          size="lg"
          variant="danger"
          onClick={() => void handleSignOut()}
          disabled={isSigningOut}
          textCase="normal"
          className="flex min-h-14 w-full items-center justify-center gap-2 px-4 py-3 text-base"
        >
          <LogOut className="h-5 w-5 shrink-0 text-white" strokeWidth={2.5} />
          {isSigningOut ? t("signingOut") : t("signOut")}
        </SupercellButton>
      </motion.div>
    </motion.div>
  );
}
