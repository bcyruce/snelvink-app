export type PlanId = "free" | "basic" | "pro";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  /** Maandprijs in euro's – enkel voor UI, echte prijs komt van Stripe. */
  pricePerMonth: number;
  /** Maximum aantal medewerkers dat dit plan toelaat (excl. eigenaar). */
  maxStaff: number;
  /** Korte tagline bovenaan de kaart. */
  tagline: string;
  /** Bullet-features. */
  features: string[];
  /** Env var naam met Stripe Price-ID (alleen voor betaalde plannen). */
  stripePriceEnvKey?: string;
};

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    pricePerMonth: 0,
    maxStaff: 0,
    tagline: "Voor eenmansrestaurants",
    features: [
      "Alleen eigenaar, geen medewerkers",
      "Basis HACCP-registraties",
      "Historie laatste 30 dagen",
      "Geen foto-bijlagen",
    ],
  },
  basic: {
    id: "basic",
    name: "Basic",
    pricePerMonth: 20,
    maxStaff: 10,
    tagline: "Voor een gemiddelde zaak",
    features: [
      "Tot 10 medewerkers",
      "Volledige HACCP-historie",
      "Foto-bewijs bij registraties",
      "NVWA PDF-rapport genereren",
    ],
    stripePriceEnvKey: "NEXT_PUBLIC_STRIPE_PRICE_BASIC",
  },
  pro: {
    id: "pro",
    name: "Pro",
    pricePerMonth: 40,
    maxStaff: 50,
    tagline: "Voor grote keukens & ketens",
    features: [
      "Tot 50 medewerkers",
      "Alles uit Basic",
      "Prioriteit-ondersteuning",
      "Exporteren naar CSV (binnenkort)",
    ],
    stripePriceEnvKey: "NEXT_PUBLIC_STRIPE_PRICE_PRO",
  },
};

export function planLabel(plan: string | null | undefined): string {
  if (!plan) return "—";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export function planStatusLabel(
  status: string | null | undefined,
): { label: string; tone: "ok" | "warn" | "bad" | "muted" } {
  if (!status) return { label: "—", tone: "muted" };
  switch (status) {
    case "active":
      return { label: "Actief", tone: "ok" };
    case "trialing":
      return { label: "Proefperiode", tone: "ok" };
    case "past_due":
      return { label: "Betaling vereist", tone: "warn" };
    case "canceled":
      return { label: "Opgezegd", tone: "warn" };
    case "incomplete":
    case "incomplete_expired":
      return { label: "Onvoltooid", tone: "warn" };
    case "unpaid":
      return { label: "Niet betaald", tone: "bad" };
    case "paused":
      return { label: "Gepauzeerd", tone: "muted" };
    default:
      return { label: status, tone: "muted" };
  }
}
