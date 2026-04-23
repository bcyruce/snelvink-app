"use client";

import { useUser } from "@/hooks/useUser";
import {
  PLAN_DEFINITIONS,
  planLabel,
  planStatusLabel,
  type PlanDefinition,
  type PlanId,
} from "@/lib/plans";
import { ArrowLeft, Check, Crown, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";

function formatPeriodEnd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { profile, restaurant } = useUser();

  const currentPlan = (restaurant?.plan ??
    restaurant?.plan_type ??
    "free") as PlanId;
  const statusBadge = planStatusLabel(restaurant?.plan_status);
  const periodEnd = formatPeriodEnd(restaurant?.plan_period_end);

  const isOwner =
    profile?.role === "owner" ||
    profile?.role === "admin" ||
    profile?.role === "eigenaar";

  const orderedPlans: PlanDefinition[] = [
    PLAN_DEFINITIONS.free,
    PLAN_DEFINITIONS.basic,
    PLAN_DEFINITIONS.pro,
  ];

  // Phase 1 – knop doet nog niets. In Phase 2 hangen we hier de Checkout
  // Session aan.
  const handleUpgrade = (plan: PlanId) => {
    console.info(`[Phase 1] Upgrade-knop gebruikt – plan: ${plan}`);
  };

  return (
    <section className="px-6 pb-24 pt-20 sm:px-10 sm:pb-28 sm:pt-28">
      <button
        type="button"
        onClick={() => router.push("/?tab=settings")}
        className="mb-8 flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-gray-900 text-xl font-black text-white shadow-md transition-transform active:scale-95"
      >
        <ArrowLeft className="h-6 w-6" strokeWidth={2.5} aria-hidden />
        Terug
      </button>

      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Abonnement
        </h1>
        <p className="mt-3 text-lg text-gray-600">
          Kies het plan dat past bij jouw keuken.
        </p>
      </header>

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
  onUpgrade: () => void;
};

function PlanCard({ plan, isCurrent, canUpgrade, onUpgrade }: PlanCardProps) {
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
        <button
          type="button"
          onClick={onUpgrade}
          disabled={!canUpgrade}
          className={`mt-2 flex h-20 w-full items-center justify-center gap-3 rounded-2xl text-2xl font-black shadow-md transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
            plan.id === "pro"
              ? "bg-white text-gray-900"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {isCurrent ? "Actief" : `Upgraden naar ${plan.name}`}
        </button>
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
