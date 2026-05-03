"use client";

import SupercellButton from "@/components/SupercellButton";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { useTranslation } from "@/hooks/useTranslation";
import { planLabel, planStatusLabel } from "@/lib/plans";
import { ChevronRight, Download, LogOut, RefreshCw } from "lucide-react";
import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type DocWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

type StaffMember = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type ExportHaccpRow = {
  recorded_at: string;
  module_type: "koeling" | "kerntemperatuur" | "ontvangst" | "schoonmaak";
  temperature: number | null;
  product_name: string | null;
  status: "goedgekeurd" | "afgekeurd" | null;
  location_name: string | null;
  completed_tasks: string[] | null;
  haccp_equipments: { name: string | null } | { name: string | null }[] | null;
};

function formatNlDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const { language, setLanguage, t } = useTranslation();
  const { profile, restaurant, isFreePlan, refresh } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;
  const isOwner =
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.role === "eigenaar";

  const [isExporting, setIsExporting] = useState(false);
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

  const generatePDF = useCallback(async () => {
    if (!restaurantId) {
      console.error("Geen restaurant gekoppeld aan dit profiel.");
      return;
    }

    setIsExporting(true);

    try {
      const { data, error } = await supabase
        .from("haccp_records")
        .select(
          "recorded_at, module_type, temperature, product_name, status, location_name, completed_tasks, haccp_equipments(name)",
        )
        .eq("restaurant_id", restaurantId)
        .order("recorded_at", { ascending: false })
        .limit(10_000);

      if (error) {
        console.error("haccp_records ophalen mislukt:", error);
      }

      const haccpRows = (data ?? []) as ExportHaccpRow[];

      const tempRows = haccpRows
        .filter(
          (row) =>
            row.module_type === "koeling" || row.module_type === "kerntemperatuur",
        )
        .map((row) => {
          const equipmentName = Array.isArray(row.haccp_equipments)
            ? (row.haccp_equipments[0]?.name ?? "—")
            : (row.haccp_equipments?.name ?? "—");
          return [
            formatNlDateTime(row.recorded_at),
            String(equipmentName),
            typeof row.temperature === "number"
              ? `${Number(row.temperature).toFixed(1)} °C`
              : "—",
          ];
        });

      const cleanRows = haccpRows
        .filter((row) => row.module_type === "schoonmaak")
        .map((row) => [
          formatNlDateTime(row.recorded_at),
          String(row.location_name ?? "—"),
          row.completed_tasks && row.completed_tasks.length > 0
            ? t("completed")
            : t("noTasksChecked"),
        ]);

      const doc = new jsPDF();
      const margin = 14;
      let cursorY = 18;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(t("haccpReportTitle"), margin, cursorY);

      cursorY += 12;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(t("temperatureRegistration"), margin, cursorY);

      autoTable(doc, {
        startY: cursorY + 2,
        head: [[t("dateTime"), t("equipment"), t("temperature")]],
        body: tempRows,
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [55, 65, 81] },
      });

      const docExt = doc as DocWithAutoTable;
      cursorY = (docExt.lastAutoTable?.finalY ?? cursorY) + 10;

      doc.setFont("helvetica", "bold");
      doc.text(t("cleaningRegistration"), margin, cursorY);

      autoTable(doc, {
        startY: cursorY + 2,
        head: [[t("dateTime"), t("task"), t("status")]],
        body: cleanRows,
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [55, 65, 81] },
      });

      doc.save("HACCP_Rapport.pdf");
    } catch (err) {
      console.error("PDF genereren mislukt:", err);
    } finally {
      setIsExporting(false);
    }
  }, [restaurantId, t]);

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
      router.push("/login");
      setIsSigningOut(false);
    }
  }, [router]);

  return (
    <div className="mt-2">
      <h2 className="mb-5 text-3xl font-black tracking-tight text-slate-900">
        {t("settingsTitle")}
      </h2>

      <section className="mb-6 rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white p-5">
        <h3 className="text-base font-black text-slate-900">{t("languageSectionTitle")}</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">{t("languageSectionSubtitle")}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <SupercellButton
            type="button"
            size="sm"
            variant={language === "nl" ? "primary" : "neutral"}
            onClick={() => setLanguage("nl")}
            aria-pressed={language === "nl"}
            className="min-h-12 rounded-xl px-3 py-3 text-sm normal-case"
          >
            🇳🇱 Nederlands
          </SupercellButton>
          <SupercellButton
            type="button"
            size="sm"
            variant={language === "en" ? "primary" : "neutral"}
            onClick={() => setLanguage("en")}
            aria-pressed={language === "en"}
            className="min-h-12 rounded-xl px-3 py-3 text-sm normal-case"
          >
            EN English
          </SupercellButton>
        </div>
      </section>

      <div className="mb-8 rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {t("restaurant")}
            </p>
            <p className="mt-1 truncate text-2xl font-black text-slate-900">
              {restaurant?.name ?? "—"}
            </p>
          </div>
          <SupercellButton
            type="button"
            size="icon"
            variant="neutral"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            aria-busy={isRefreshing}
            title={t("refresh")}
            className="shrink-0 rounded-lg p-2"
          >
            <RefreshCw
              className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
              strokeWidth={2}
            />
          </SupercellButton>
        </div>

        <p className="mt-5 text-xs font-black uppercase tracking-wide text-slate-500">
          {t("subscription")}
        </p>
        <SupercellButton
          type="button"
          size="lg"
          variant="neutral"
          onClick={() => router.push("/dashboard/subscription")}
          textCase="normal"
          className="mt-2 flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
        >
          <div className="min-w-0">
            <p className="truncate text-xl font-black text-slate-900">
              {planLabel(restaurant?.plan ?? restaurant?.plan_type ?? "free")}
            </p>
            {restaurant?.plan_status ? (
              <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
                {translatedPlanStatus(restaurant.plan_status, t)}
              </p>
            ) : (
              <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                {isOwner
                  ? t("manageSubscription")
                  : t("viewRestaurantSubscription")}
              </p>
            )}
          </div>
          <ChevronRight
            className="h-6 w-6 shrink-0 text-blue-600"
            strokeWidth={2.75}
            aria-hidden
          />
        </SupercellButton>

        {isOwner ? (
          <div className="mt-6 border-t-2 border-slate-200 pt-6">
            <p className="text-center text-xs font-black uppercase tracking-wide text-slate-500">
              {t("inviteCode")}
            </p>
            {!restaurant ? (
              <p className="mt-3 text-center text-sm font-bold text-slate-500">
                {t("loading")}
              </p>
            ) : isFreePlan ? (
              <div className="mt-3 rounded-2xl border-2 border-amber-300 border-b-4 border-b-amber-400 bg-amber-100 px-4 py-5 text-center">
                <p className="text-base font-black text-amber-900">
                  {t("inviteCodeUnavailableTitle")}
                </p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-amber-900">
                  {t("inviteCodeUpgradeMessage")}
                </p>
              </div>
            ) : restaurant.invite_code ? (
              <div className="mt-3 rounded-2xl border-2 border-blue-300 border-b-4 border-b-blue-400 bg-blue-50 px-4 py-5">
                <p className="text-center text-5xl font-black tabular-nums tracking-widest text-blue-700 sm:text-6xl">
                  {restaurant.invite_code}
                </p>
                <p className="mt-4 text-center text-sm font-semibold leading-relaxed text-slate-600">
                  {t("inviteCodeShareMessage")}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-center text-sm font-bold text-slate-500">
                {t("inviteCodeUnavailable")}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {isOwner ? (
        <div className="mb-8 rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white p-5">
          <h3 className="text-lg font-black text-slate-900">{t("staff")}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {t("linkedStaffIntro")}
          </p>
          {isLoadingStaff ? (
            <p className="mt-4 text-sm font-bold text-slate-500">{t("loading")}</p>
          ) : staff.length === 0 ? (
            <p className="mt-4 text-sm font-bold text-slate-500">{t("noLinkedStaff")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {staff.map((member) => (
                <li
                  key={member.id}
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
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <p className="mb-5 text-sm font-semibold text-slate-600">
        {t("exportIntro")}
      </p>

      <SupercellButton
        type="button"
        size="lg"
        variant="primary"
        onClick={() => void generatePDF()}
        disabled={isExporting || !restaurantId}
        aria-busy={isExporting}
        textCase="normal"
        className="mb-4 flex w-full items-center justify-center gap-3 py-6 text-xl"
      >
        <Download className="h-7 w-7 shrink-0 text-white" strokeWidth={2.5} />
        {isExporting ? t("generating") : t("downloadHaccpReport")}
      </SupercellButton>

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
    </div>
  );
}
