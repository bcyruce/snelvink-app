import Stripe from "stripe";

import { PLAN_DEFINITIONS, type PlanId } from "./plans";

/**
 * Server-side Stripe-singleton. Alleen gebruiken in route handlers,
 * server actions of server components. NOOIT in client-code.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY ontbreekt in .env.local");
  }
  // We laten de Stripe SDK zijn eigen pinned apiVersion kiezen (matched met
  // het geïnstalleerde package). Dat voorkomt onze TS-types uit sync te
  // raken met de Stripe types.
  cached = new Stripe(secret, { typescript: true });
  return cached;
}

/**
 * Vertaal onze interne plan-id naar het Stripe Price-ID uit de env.
 * Gooit een error als het plan niet betaalbaar is of de env-var ontbreekt.
 */
export function getStripePriceId(plan: PlanId): string {
  const def = PLAN_DEFINITIONS[plan];
  if (!def.stripePriceEnvKey) {
    throw new Error(`Plan "${plan}" is niet betaalbaar via Stripe.`);
  }
  const priceId = process.env[def.stripePriceEnvKey];
  if (!priceId) {
    throw new Error(
      `Stripe Price-ID ontbreekt voor plan ${plan} (env: ${def.stripePriceEnvKey}).`,
    );
  }
  return priceId;
}

/** Map een Stripe Price-ID terug naar onze PlanId. */
export function planIdFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC) return "basic";
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO) return "pro";
  return null;
}

/** Basis-URL van de app (voor success_url / return_url). */
export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}
