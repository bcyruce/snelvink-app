"use client";

import SupercellButton from "@/components/SupercellButton";
import { getLocale } from "@/context/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useUser } from "@/hooks/useUser";
import {
  PLAN_DEFINITIONS,
  planLabel,
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

function formatPeriodEnd(
  iso: string | null | undefined,
  locale: string,
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(locale).format(d);
}

function translatedPlanStatus(
  status: string | null | undefined,
  t: ReturnType<typeof useTranslation>["t"],
): { label: string; tone: "ok" | "warn" | "bad" | "muted" } {
  switch (status) {
    case "active":
      return { label: t("planStatusActive"), tone: "ok" };
    case "trialing":
      return { label: t("planStatusTrialing"), tone: "ok" };
    case "past_due":
      return { label: t("planStatusPastDue"), tone: "warn" };
    case "canceled":
      return { label: t("planStatusCanceled"), tone: "warn" };
    case "incomplete":
    case "incomplete_expired":
      return { label: t("planStatusIncomplete"), tone: "warn" };
    case "unpaid":
      return { label: t("planStatusUnpaid"), tone: "bad" };
    case "paused":
      return { label: t("planStatusPaused"), tone: "muted" };
    default:
      return { label: status ?? "—", tone: "muted" };
  }
}

function planTagline(plan: PlanDefinition, t: ReturnType<typeof useTranslation>["t"]) {
  if (plan.id === "free") return t("planFreeTagline");
  if (plan.id === "basic") return t("planBasicTagline");
  return t("planProTagline");
}

function planFeatures(plan: PlanDefinition, t: ReturnType<typeof useTranslation>["t"]) {
  if (plan.id === "free") {
    return [
      t("planFreeFeature1"),
      t("planFreeFeature2"),
      t("planFreeFeature3"),
      t("planFreeFeature4"),
    ];
  }
  if (plan.id === "basic") {
    return [
      t("planBasicFeature1"),
      t("planBasicFeature2"),
      t("planBasicFeature3"),
      t("planBasicFeature4"),
    ];
  }
  return [
    t("planProFeature1"),
    t("planProFeature2"),
    t("planProFeature3"),
    t("planProFeature4"),
  ];
}

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, restaurant } = useUser();
  const { t, language } = useTranslation();
  const locale = getLocale(language);

  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  // Toon een success/cancel banner na een redirect vanaf Stripe.
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      setFlash(t("paymentSuccess"));
    } else if (status === "cancel") {
      setFlash(t("paymentCanceled"));
    }
  }, [searchParams, t]);

  const currentPlan = (restaurant?.plan ??
    restaurant?.plan_type ??
    "free") as PlanId;
  const statusBadge = translatedPlanStatus(restaurant?.plan_status, t);
  const periodEnd = formatPeriodEnd(restaurant?.plan_period_end, locale);

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
        throw new Error(t("notSignedIn"));
      }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-snelvink-language": language,
        },
        body: JSON.stringify({ plan, language }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? t("checkoutStartFailed"));
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
        throw new Error(t("notSignedIn"));
      }
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-snelvink-language": language,
        },
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? t("portalOpenFailed"));
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  };

  return (
    <section className="px-5 pb-28 pt-8 sm:px-8 sm:pb-32 sm:pt-12">
      <SupercellButton
        type="button"
        size="md"
        variant="neutral"
        onClick={() => router.push("/?tab=settings")}
        textCase="normal"
        className="mb-6 inline-flex items-center gap-2 px-4 py-3 text-base"
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2.75} aria-hidden />
        {t("back")}
      </SupercellButton>

      <header className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">
          {t("plans")}
        </p>
        <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
          {t("subscription")}
        </h1>
        <p className="mt-2 text-base font-bold text-slate-500 sm:text-lg">
          {t("choosePlan")}
        </p>
      </header>

      {flash ? (
        <div className="mb-6 rounded-2xl border-2 border-emerald-300 border-b-4 border-b-emerald-400 bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-900">
          {flash}
        </div>
      ) : null}
      {error ? (
        <div className="mb-6 rounded-2xl border-2 border-red-300 border-b-4 border-b-red-400 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-900">
          {error}
        </div>
      ) : null}

      {/* Huidig plan */}
      <div className="mb-8 rounded-2xl border-2 border-blue-300 border-b-4 border-b-blue-400 bg-blue-50 p-6">
        <p className="text-xs font-black uppercase tracking-wide text-blue-700">
          {t("currentPlan")}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="text-4xl font-black text-slate-900 sm:text-5xl">
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
          <p className="mt-3 text-sm font-semibold text-slate-600">
            {t("currentPeriodEnds", { date: periodEnd })}
          </p>
        ) : null}

        {isOwner && hasActiveSubscription ? (
          <SupercellButton
            type="button"
            size="sm"
            variant="neutral"
            onClick={handleManage}
            disabled={busy !== null}
            textCase="normal"
            className="mt-5 inline-flex items-center gap-2 px-4 py-3 text-sm"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={2.75} aria-hidden />
            {busy === "portal" ? t("opening") : t("manageSubscription")}
          </SupercellButton>
        ) : null}
      </div>

      {!isOwner ? (
        <p className="mb-8 rounded-2xl border-2 border-amber-300 border-b-4 border-b-amber-400 bg-amber-100 px-4 py-4 text-center font-bold text-amber-900">
          {t("ownerOnlySubscription")}
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
            t={t}
          />
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-gray-500">
        {t("invoicesStripe")}
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
  t: ReturnType<typeof useTranslation>["t"];
};

function PlanCard({
  plan,
  isCurrent,
  canUpgrade,
  isBusy,
  onUpgrade,
  t,
}: PlanCardProps) {
  const accent =
    plan.id === "pro"
      ? "border-blue-700 border-b-blue-800 bg-blue-600 text-white"
      : plan.id === "basic"
        ? "border-blue-200 border-b-blue-300 bg-blue-50 text-slate-900"
        : "border-slate-200 border-b-slate-300 bg-white text-slate-900";

  const iconBoxClass =
    plan.id === "pro"
      ? "border-blue-800 border-b-4 bg-blue-700 text-white"
      : "border-blue-700 border-b-4 bg-blue-500 text-white";

  const icon =
    plan.id === "pro" ? (
      <Crown className="h-7 w-7" strokeWidth={2.5} aria-hidden />
    ) : plan.id === "basic" ? (
      <ShieldCheck className="h-7 w-7" strokeWidth={2.5} aria-hidden />
    ) : (
      <Users className="h-7 w-7" strokeWidth={2.5} aria-hidden />
    );

  const priceLine =
    plan.pricePerMonth === 0
      ? t("free")
      : t("perMonth", { price: plan.pricePerMonth });

  const taglineClass =
    plan.id === "pro" ? "text-blue-100" : "text-slate-500";
  const checkClass =
    plan.id === "pro" ? "text-emerald-300" : "text-emerald-600";

  return (
    <article
      className={`relative flex flex-col gap-5 rounded-2xl border-2 border-b-4 p-6 ${accent} ${
        isCurrent ? "ring-4 ring-emerald-400" : ""
      }`}
    >
      {isCurrent ? (
        <span className="absolute -top-3 right-6 rounded-full border-2 border-emerald-700 border-b-4 bg-emerald-500 px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
          {t("currentPlan")}
        </span>
      ) : null}

      <div className="flex items-center gap-3">
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 ${iconBoxClass}`}
        >
          {icon}
        </span>
        <div>
          <h2 className="text-3xl font-black tracking-tight">{plan.name}</h2>
          <p className={`text-sm font-bold ${taglineClass}`}>
            {planTagline(plan, t)}
          </p>
        </div>
      </div>

      <div>
        <p className="text-4xl font-black tabular-nums sm:text-5xl">
          {priceLine}
        </p>
        <p className={`mt-1 text-sm font-bold ${taglineClass}`}>
          {plan.maxStaff === 0
            ? t("ownerOnly")
            : t("upToStaff", { count: plan.maxStaff })}
        </p>
      </div>

      <ul className="flex flex-col gap-2.5">
        {planFeatures(plan, t).map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-base font-semibold">
            <Check
              className={`mt-0.5 h-5 w-5 shrink-0 ${checkClass}`}
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
          variant={plan.id === "pro" ? "neutral" : "primary"}
          onClick={onUpgrade}
          disabled={!canUpgrade || isBusy}
          aria-busy={isBusy}
          textCase="normal"
          className="mt-2 flex h-16 w-full items-center justify-center gap-3 text-lg"
        >
          {isCurrent
            ? t("planStatusActive")
            : isBusy
              ? t("busy")
              : t("upgradeTo", { plan: plan.name })}
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
      ? "border-emerald-700 bg-emerald-500 text-white"
      : tone === "warn"
        ? "border-amber-600 bg-amber-400 text-amber-950"
        : tone === "bad"
          ? "border-red-700 bg-red-500 text-white"
          : "border-slate-400 bg-slate-200 text-slate-700";
  return (
    <span
      className={`rounded-full border-2 border-b-4 px-3 py-1 text-xs font-black uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}
