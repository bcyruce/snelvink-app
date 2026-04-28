"use client";

import SupercellButton from "@/components/SupercellButton";
import { useUser } from "@/hooks/useUser";
import {
  PLAN_DEFINITIONS,
  planLabel,
  planStatusLabel,
  type PlanDefinition,
  type PlanId,
} from "@/lib/plans";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Check,
  Crown,
  ExternalLink,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function formatPeriodEnd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, restaurant } = useUser();

  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Toon een success/cancel banner na een redirect vanaf Stripe.
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      setFlash(
        "Betaling geslaagd – je abonnement wordt binnen enkele seconden bijgewerkt.",
      );
    } else if (status === "cancel") {
      setFlash("Betaling geannuleerd. Je plan is niet gewijzigd.");
    }
  }, [searchParams]);

  const currentPlan = (restaurant?.plan ??
    restaurant?.plan_type ??
    "free") as PlanId;
  const statusBadge = planStatusLabel(restaurant?.plan_status);
  const periodEnd = formatPeriodEnd(restaurant?.plan_period_end);

  const isOwner =
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.role === "eigenaar";

  const hasActiveSubscription =
    currentPlan !== "free" && restaurant?.plan_status !== null;

  const orderedPlans: PlanDefinition[] = [
    PLAN_DEFINITIONS.free,
    PLAN_DEFINITIONS.basic,
    PLAN_DEFINITIONS.pro,
  ];

  async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  const handleUpgrade = async (plan: PlanId) => {
    if (plan === "free") return;
    setError(null);
    setBusy("checkout");
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Niet ingelogd. Meld je opnieuw aan.");
      }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Kon Stripe Checkout niet starten.");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  };

  const handleManage = async () => {
    setError(null);
    setBusy("portal");
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Niet ingelogd. Meld je opnieuw aan.");
      }
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Kon Customer Portal niet openen.");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  };

  return (
    <section className="px-6 pb-24 pt-20 sm:px-10 sm:pb-28 sm:pt-28">
      <SupercellButton
        type="button"
        size="lg"
        variant="neutral"
        onClick={() => router.push("/?tab=settings")}
        className="mb-8 flex h-16 w-full items-center justify-center gap-3 text-xl"
      >
        <ArrowLeft className="h-6 w-6" strokeWidth={2.5} aria-hidden />
        Terug
      </SupercellButton>

      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Abonnement
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          Kies het plan dat past bij jouw keuken.
        </p>
      </header>

      {flash ? (
        <div className="mb-6 rounded-2xl border border-green-300 bg-green-50 px-4 py-3 text-center text-sm font-semibold text-green-900">
          {flash}
        </div>
      ) : null}
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-900">
          {error}
        </div>
      ) : null}

      {/* Huidig plan */}
      <div className="mb-8 rounded-3xl border-2 border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
          Huidig plan
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="text-4xl font-black text-gray-900 sm:text-5xl">
            {planLabel(currentPlan)}
          </p>
          {restaurant?.plan_status ? (
            <StatusBadge
              label={statusBadge.label}
              tone={statusBadge.tone}
            />
          ) : null}
        </div>
        {periodEnd ? (
          <p className="mt-3 text-sm text-gray-600">
            Huidige periode loopt tot <strong>{periodEnd}</strong>.
          </p>
        ) : null}

        {isOwner && hasActiveSubscription ? (
          <SupercellButton
            type="button"
            size="sm"
            variant="neutral"
            onClick={handleManage}
            disabled={busy !== null}
            className="mt-5 inline-flex items-center gap-2 border-2 border-gray-200 px-4 py-3 text-sm normal-case"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            {busy === "portal" ? "Openen…" : "Abonnement beheren"}
          </SupercellButton>
        ) : null}
      </div>

      {!isOwner ? (
        <p className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-center text-amber-900">
          Alleen de eigenaar kan het abonnement wijzigen. Vraag je baas om te
          upgraden.
        </p>
      ) : null}

      {/* Plan-kaarten */}
      <div className="flex flex-col gap-5">
        {orderedPlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={plan.id === currentPlan}
            canUpgrade={isOwner && plan.id !== currentPlan && plan.id !== "free"}
            isBusy={busy === "checkout"}
            onUpgrade={() => handleUpgrade(plan.id)}
          />
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-gray-500">
        Facturen en betaalmethoden worden beheerd via Stripe. Je kunt je
        abonnement op elk moment opzeggen.
      </p>
    </section>
  );
}

// =========================================================================
// PlanCard
// =========================================================================
type PlanCardProps = {
  plan: PlanDefinition;
  isCurrent: boolean;
  canUpgrade: boolean;
  isBusy: boolean;
  onUpgrade: () => void;
};

function PlanCard({
  plan,
  isCurrent,
  canUpgrade,
  isBusy,
  onUpgrade,
}: PlanCardProps) {
  const accent =
    plan.id === "pro"
      ? "bg-gradient-to-br from-gray-900 to-gray-700 text-white"
      : plan.id === "basic"
        ? "bg-blue-50 text-gray-900"
        : "bg-gray-50 text-gray-900";

  const icon =
    plan.id === "pro" ? (
      <Crown className="h-7 w-7" strokeWidth={2.25} aria-hidden />
    ) : plan.id === "basic" ? (
      <ShieldCheck className="h-7 w-7" strokeWidth={2.25} aria-hidden />
    ) : (
      <Users className="h-7 w-7" strokeWidth={2.25} aria-hidden />
    );

  const priceLine =
    plan.pricePerMonth === 0
      ? "Gratis"
      : `€ ${plan.pricePerMonth},- / maand`;

  return (
    <article
      className={`relative flex flex-col gap-5 rounded-3xl p-6 shadow-md ${accent} ${
        isCurrent ? "ring-4 ring-green-400" : ""
      }`}
    >
      {isCurrent ? (
        <span className="absolute -top-3 right-6 rounded-full bg-green-500 px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow">
          Huidig plan
        </span>
      ) : null}

      <div className="flex items-center gap-3">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            plan.id === "pro" ? "bg-white/15" : "bg-white"
          }`}
        >
          {icon}
        </span>
        <div>
          <h2 className="text-3xl font-black tracking-tight">{plan.name}</h2>
          <p
            className={`text-sm font-semibold ${
              plan.id === "pro" ? "text-white/70" : "text-gray-500"
            }`}
          >
            {plan.tagline}
          </p>
        </div>
      </div>

      <div>
        <p className="text-4xl font-black tabular-nums sm:text-5xl">
          {priceLine}
        </p>
        <p
          className={`mt-1 text-sm font-semibold ${
            plan.id === "pro" ? "text-white/70" : "text-gray-500"
          }`}
        >
          {plan.maxStaff === 0
            ? "Alleen eigenaar"
            : `Tot ${plan.maxStaff} medewerkers`}
        </p>
      </div>

      <ul className="flex flex-col gap-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-base">
            <Check
              className={`mt-0.5 h-5 w-5 shrink-0 ${
                plan.id === "pro" ? "text-green-300" : "text-green-600"
              }`}
              strokeWidth={3}
              aria-hidden
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {plan.id === "free" ? null : (
        <SupercellButton
          type="button"
          size="lg"
          variant={plan.id === "pro" ? "neutral" : "success"}
          onClick={onUpgrade}
          disabled={!canUpgrade || isBusy}
          aria-busy={isBusy}
          className={`mt-2 flex h-20 w-full items-center justify-center gap-3 text-2xl normal-case ${
            plan.id === "pro" ? "text-gray-900" : ""
          }`}
        >
          {isCurrent
            ? "Actief"
            : isBusy
              ? "Bezig…"
              : `Upgraden naar ${plan.name}`}
        </SupercellButton>
      )}
    </article>
  );
}

// =========================================================================
// StatusBadge
// =========================================================================
function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "ok" | "warn" | "bad" | "muted";
}) {
  const cls =
    tone === "ok"
      ? "bg-green-100 text-green-800"
      : tone === "warn"
        ? "bg-amber-100 text-amber-900"
        : tone === "bad"
          ? "bg-red-100 text-red-800"
          : "bg-gray-100 text-gray-700";
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}
