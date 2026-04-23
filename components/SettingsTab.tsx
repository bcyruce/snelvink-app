"use client";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { useTranslation } from "@/hooks/useTranslation";
import { Download, LogOut, RefreshCw } from "lucide-react";
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

function formatNlDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
      const [tempRes, cleanRes] = await Promise.all([
        supabase
          .from("temperature_logs")
          .select("created_at, equipment_name, temperature")
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: false })
          .limit(10_000),
        supabase
          .from("cleaning_logs")
          .select("created_at, task_name, is_completed")
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: false })
          .limit(10_000),
      ]);

      if (tempRes.error) {
        console.error("temperature_logs ophalen mislukt:", tempRes.error);
      }
      if (cleanRes.error) {
        console.error("cleaning_logs ophalen mislukt:", cleanRes.error);
      }

      const tempRows =
        tempRes.data?.map((row) => [
          formatNlDateTime(row.created_at),
          String(row.equipment_name ?? "—"),
          `${Number(row.temperature).toFixed(1)} °C`,
        ]) ?? [];

      const cleanRows =
        cleanRes.data?.map((row) => [
          formatNlDateTime(row.created_at),
          String(row.task_name ?? "—"),
          row.is_completed ? "Voltooid" : "Niet voltooid",
        ]) ?? [];

      const doc = new jsPDF();
      const margin = 14;
      let cursorY = 18;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("SnelVink - HACCP Rapportage", margin, cursorY);

      cursorY += 12;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Temperatuur Registratie", margin, cursorY);

      autoTable(doc, {
        startY: cursorY + 2,
        head: [["Datum/Tijd", "Apparaat", "Temperatuur"]],
        body: tempRows,
        theme: "striped",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [55, 65, 81] },
      });

      const docExt = doc as DocWithAutoTable;
      cursorY = (docExt.lastAutoTable?.finalY ?? cursorY) + 10;

      doc.setFont("helvetica", "bold");
      doc.text("Schoonmaak Registratie", margin, cursorY);

      autoTable(doc, {
        startY: cursorY + 2,
        head: [["Datum/Tijd", "Taak", "Status"]],
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
  }, [restaurantId]);

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
    <div className="mt-12">
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-900">
        {"Instellingen & Export"}
      </h2>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
        <h3 className="text-base font-bold text-gray-900">{t("languageSectionTitle")}</h3>
        <p className="mt-1 text-sm text-gray-600">{t("languageSectionSubtitle")}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setLanguage("nl")}
            aria-pressed={language === "nl"}
            className={`min-h-12 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-colors ${
              language === "nl"
                ? "border-blue-600 bg-blue-50 text-blue-800"
                : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
            }`}
          >
            🇳🇱 Nederlands
          </button>
          <button
            type="button"
            onClick={() => setLanguage("en")}
            aria-pressed={language === "en"}
            className={`min-h-12 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-colors ${
              language === "en"
                ? "border-blue-600 bg-blue-50 text-blue-800"
                : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
            }`}
          >
            EN English
          </button>
        </div>
      </section>

      <div className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Restaurant
            </p>
            <p className="mt-1 truncate text-xl font-bold text-gray-900">
              {restaurant?.name ?? "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            aria-busy={isRefreshing}
            title="Vernieuwen"
            className="shrink-0 rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
              strokeWidth={2}
            />
          </button>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Abonnement
        </p>
        <p className="mt-1 text-lg font-bold text-gray-900">
          {restaurant?.plan_type
            ? restaurant.plan_type.charAt(0).toUpperCase() +
              restaurant.plan_type.slice(1)
            : "—"}
        </p>

        {isOwner ? (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
              Koppelcode
            </p>
            {!restaurant ? (
              <p className="mt-3 text-center text-sm text-gray-500">
                Laden...
              </p>
            ) : isFreePlan ? (
              <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-5 text-center">
                <p className="text-base font-bold text-amber-900">
                  Nog geen koppelcode beschikbaar
                </p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900">
                  Upgrade je abonnement naar Basic of Pro om medewerkers te kunnen
                  koppelen en de koppelcode te ontgrendelen.
                </p>
              </div>
            ) : restaurant.invite_code ? (
              <>
                <p className="mt-3 text-center text-5xl font-black tabular-nums tracking-widest text-gray-900 sm:text-6xl">
                  {restaurant.invite_code}
                </p>
                <p className="mt-4 text-center text-sm leading-relaxed text-gray-600">
                  Deel deze code met je werknemers om ze te koppelen.
                </p>
              </>
            ) : (
              <p className="mt-3 text-center text-sm text-gray-500">
                Geen koppelcode beschikbaar.
              </p>
            )}
          </div>
        ) : null}
      </div>

      {isOwner ? (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-lg font-bold text-gray-900">Personeel</h3>
          <p className="mt-1 text-sm text-gray-600">
            Gekoppelde medewerkers van dit restaurant.
          </p>
          {isLoadingStaff ? (
            <p className="mt-4 text-sm text-gray-500">Laden...</p>
          ) : staff.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">Nog geen personeel gekoppeld.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {staff.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {member.full_name?.trim() || "Naamloos"}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {member.email ?? "Onbekend e-mailadres"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteStaff(member.id)}
                    disabled={deletingStaffId === member.id}
                    className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingStaffId === member.id ? "Bezig..." : "Verwijderen"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <p className="mb-6 text-sm text-gray-600">
        Download een overzicht van alle temperatuur- en schoonmaakregistraties.
      </p>

      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={isSigningOut}
        className="mb-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut className="h-5 w-5 shrink-0 text-gray-700" strokeWidth={2} />
        {isSigningOut ? "Uitloggen..." : "Uitloggen"}
      </button>

      <button
        type="button"
        onClick={() => void generatePDF()}
        disabled={isExporting || !restaurantId}
        aria-busy={isExporting}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 py-6 text-xl font-bold text-white shadow-md transition-transform hover:bg-indigo-700 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download className="h-7 w-7 shrink-0 text-white" strokeWidth={2.25} />
        {isExporting ? "Genereren..." : "Download HACCP Rapport (PDF)"}
      </button>
    </div>
  );
}
