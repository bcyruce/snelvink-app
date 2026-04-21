"use client";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { Download, LogOut } from "lucide-react";
import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

type DocWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

function formatNlDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SettingsTab() {
  const router = useRouter();
  const { profile, restaurant, isFreePlan } = useUser();
  const restaurantId = profile?.restaurant_id ?? null;
  const isOwner = profile?.role === "owner";

  const [isExporting, setIsExporting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

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

      <div className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Restaurant
        </p>
        <p className="mt-1 text-xl font-bold text-gray-900">
          {restaurant?.name ?? "—"}
        </p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Abonnement
        </p>
        <p className="mt-1 text-lg font-bold text-gray-900">
          {isFreePlan ? "Gratis" : "Basic"}
        </p>

        {isOwner && restaurant?.invite_code ? (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
              Koppelcode
            </p>
            <p className="mt-3 text-center text-5xl font-black tabular-nums tracking-widest text-gray-900 sm:text-6xl">
              {restaurant.invite_code}
            </p>
            <p className="mt-4 text-center text-sm leading-relaxed text-gray-600">
              Deel deze code met je werknemers om ze te koppelen.
            </p>
          </div>
        ) : null}
      </div>

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
