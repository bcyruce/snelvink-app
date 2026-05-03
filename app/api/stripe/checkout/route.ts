import { PLAN_DEFINITIONS, type PlanId } from "@/lib/plans";
import { getAppUrl, getStripe, getStripePriceId } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

type Body = {
  plan?: string;
  language?: string;
};

function getRequestLanguage(request: Request, body?: Body): string {
  const fromBody = typeof body?.language === "string" ? body.language : null;
  const fromHeader = request.headers.get("x-snelvink-language");
  return (fromBody ?? fromHeader ?? "nl").toLowerCase();
}

function isEnglish(request: Request, body?: Body) {
  // For now non-Dutch locales fall back to the English copy in this API
  // (the user-facing app text is fully localized; only Stripe-side messages flow through here).
  return getRequestLanguage(request, body) !== "nl";
}

function msg(request: Request, body: Body | undefined, nl: string, en: string) {
  return isEnglish(request, body) ? en : nl;
}

// Map our app language codes to a Stripe Checkout `locale` value.
// Stripe Checkout supports a fixed list of locales (see Stripe.Checkout.Session.Locale).
// Languages without a Stripe equivalent (e.g. Arabic) fall back to "auto",
// which lets Stripe pick the best match from the browser.
function toStripeLocale(language: string): "nl" | "en" | "zh" | "tr" | "auto" {
  switch (language) {
    case "nl":
      return "nl";
    case "en":
      return "en";
    case "zh":
      return "zh";
    case "tr":
      return "tr";
    case "ar":
    default:
      return "auto";
  }
}

function isPaidPlan(value: string): value is Extract<PlanId, "basic" | "pro"> {
  return value === "basic" || value === "pro";
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json(
        { error: msg(request, undefined, "Niet ingelogd. Meld je opnieuw aan.", "Not signed in. Please sign in again.") },
        { status: 401 },
      );
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json(
        { error: msg(request, undefined, "Ongeldige aanvraag.", "Invalid request.") },
        { status: 400 },
      );
    }

    const plan = String(body.plan ?? "");
    const locale = toStripeLocale(getRequestLanguage(request, body));
    if (!isPaidPlan(plan)) {
      return NextResponse.json(
        { error: msg(request, body, "Ongeldig plan. Kies Basic of Pro.", "Invalid plan. Choose Basic or Pro.") },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdmin();

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user?.id) {
      return NextResponse.json({ error: msg(request, body, "Sessie ongeldig.", "Invalid session.") }, { status: 401 });
    }

    // Haal profiel op – alleen eigenaar mag betalen.
    const { data: profileRow, error: profileError } = await admin
      .from("profiles")
      .select("role, restaurant_id, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup mislukt:", profileError);
      return NextResponse.json(
        { error: msg(request, body, "Profiel ophalen mislukt.", "Failed to load profile.") },
        { status: 500 },
      );
    }
    if (!profileRow) {
      return NextResponse.json({ error: msg(request, body, "Profiel niet gevonden.", "Profile not found.") }, { status: 404 });
    }

    const role = String(profileRow.role ?? "").toLowerCase();
    if (!["owner", "admin", "eigenaar"].includes(role)) {
      return NextResponse.json(
        { error: msg(request, body, "Alleen de eigenaar kan het abonnement wijzigen.", "Only the owner can change the subscription.") },
        { status: 403 },
      );
    }

    const restaurantId = profileRow.restaurant_id as string | null;
    if (!restaurantId) {
      return NextResponse.json(
        { error: msg(request, body, "Geen restaurant gekoppeld aan dit profiel.", "No restaurant is linked to this profile.") },
        { status: 400 },
      );
    }

    const { data: restaurantRow, error: restaurantError } = await admin
      .from("restaurants")
      .select("name, plan, stripe_customer_id")
      .eq("id", restaurantId)
      .maybeSingle();

    if (restaurantError) {
      console.error("Restaurant lookup mislukt:", restaurantError);
      return NextResponse.json(
        { error: msg(request, body, "Restaurant ophalen mislukt.", "Failed to load restaurant.") },
        { status: 500 },
      );
    }

    const stripe = getStripe();
    const priceId = getStripePriceId(plan);

    // Zorg dat er een Stripe Customer is voor dit restaurant.
    let customerId = (restaurantRow?.stripe_customer_id as string | null) ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name:
          (restaurantRow?.name as string | null) ??
          (profileRow.full_name as string | null) ??
          undefined,
        metadata: {
          restaurant_id: restaurantId,
          owner_user_id: user.id,
        },
      });
      customerId = customer.id;

      const { error: updateError } = await admin
        .from("restaurants")
        .update({ stripe_customer_id: customerId })
        .eq("id", restaurantId);

      if (updateError) {
        console.error("stripe_customer_id opslaan mislukt:", updateError);
        // Niet fataal – Stripe heeft het customer record wel aangemaakt.
      }
    }

    const appUrl = getAppUrl();
    const planDef = PLAN_DEFINITIONS[plan];

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card", "ideal"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      client_reference_id: restaurantId,
      subscription_data: {
        metadata: {
          restaurant_id: restaurantId,
          plan: planDef.id,
        },
      },
      metadata: {
        restaurant_id: restaurantId,
        plan: planDef.id,
      },
      success_url: `${appUrl}/dashboard/subscription?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/subscription?status=cancel`,
      allow_promotion_codes: true,
      locale,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: msg(request, body, "Geen Checkout URL ontvangen van Stripe.", "No Checkout URL received from Stripe.") },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout mislukt:", err);
    const message =
      err instanceof Error
        ? err.message
        : msg(request, undefined, "Onbekende fout bij Stripe checkout.", "Unknown Stripe checkout error.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
