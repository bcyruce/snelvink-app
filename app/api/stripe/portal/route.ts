import { getAppUrl, getStripe } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

/**
 * Maakt een Stripe Customer Portal sessie voor het huidige restaurant.
 * Gebruikers kunnen daar betaalmethode updaten, plan wijzigen of opzeggen.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json(
        { error: "Niet ingelogd. Meld je opnieuw aan." },
        { status: 401 },
      );
    }

    const admin = createSupabaseAdmin();

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user?.id) {
      return NextResponse.json({ error: "Sessie ongeldig." }, { status: 401 });
    }

    const { data: profileRow, error: profileError } = await admin
      .from("profiles")
      .select("role, restaurant_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup mislukt:", profileError);
      return NextResponse.json(
        { error: "Profiel ophalen mislukt." },
        { status: 500 },
      );
    }
    if (!profileRow) {
      return NextResponse.json({ error: "Profiel niet gevonden." }, { status: 404 });
    }

    const role = String(profileRow.role ?? "").toLowerCase();
    if (!["owner", "admin", "eigenaar"].includes(role)) {
      return NextResponse.json(
        { error: "Alleen de eigenaar kan het abonnement beheren." },
        { status: 403 },
      );
    }

    const restaurantId = profileRow.restaurant_id as string | null;
    if (!restaurantId) {
      return NextResponse.json(
        { error: "Geen restaurant gekoppeld." },
        { status: 400 },
      );
    }

    const { data: restaurantRow } = await admin
      .from("restaurants")
      .select("stripe_customer_id")
      .eq("id", restaurantId)
      .maybeSingle();

    const customerId =
      (restaurantRow?.stripe_customer_id as string | null) ?? null;
    if (!customerId) {
      return NextResponse.json(
        { error: "Nog geen abonnement – upgrade eerst via Stripe Checkout." },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppUrl()}/dashboard/subscription`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe portal mislukt:", err);
    const message =
      err instanceof Error ? err.message : "Onbekende fout bij Stripe portal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
