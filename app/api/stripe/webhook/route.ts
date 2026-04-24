import { getStripe, planIdFromPriceId } from "@/lib/stripe";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

/**
 * Stripe Webhook handler.
 *
 * In Next.js App Router lezen we de raw body via request.text() zodat
 * stripe.webhooks.constructEvent() de HMAC-handtekening kan verifiëren.
 *
 * Events die we verwerken:
 *   - checkout.session.completed         → eerste succesvolle betaling
 *   - customer.subscription.created      → (vaak overlap, defensief meenemen)
 *   - customer.subscription.updated      → renewals, plan-wissels, past_due, etc.
 *   - customer.subscription.deleted      → abonnement eindigt / geannuleerd
 *
 * Local testen:
 *   stripe listen --forward-to http://localhost:3000/api/stripe/webhook
 *   (kopieer de whsec_... naar STRIPE_WEBHOOK_SECRET)
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET ontbreekt in env.");
    return NextResponse.json(
      { error: "Server is niet correct geconfigureerd." },
      { status: 500 },
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe webhook signature check mislukt:", message);
    return NextResponse.json(
      { error: `Webhook signature check mislukt: ${message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, stripe);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpsert(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        // Nog niet relevant – gewoon 200 retourneren zodat Stripe niet retried.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`Webhook handler faalde voor ${event.type}:`, err);
    // 500 → Stripe zal retry'en, wat gewenst is bij transient fouten.
    return NextResponse.json(
      { error: "Webhook handler faalde." },
      { status: 500 },
    );
  }
}

// =========================================================================
// Helpers
// =========================================================================
function toIsoOrNull(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

/**
 * Vind restaurant_id: eerst via metadata, anders via stripe_customer_id.
 */
async function resolveRestaurantId(
  meta: Stripe.Metadata | null | undefined,
  customerId: string | null,
): Promise<string | null> {
  const fromMeta = meta?.restaurant_id;
  if (fromMeta) return String(fromMeta);

  if (!customerId) return null;

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("restaurants")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error("Lookup via stripe_customer_id mislukt:", error);
    return null;
  }
  return (data?.id as string | undefined) ?? null;
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
) {
  // Haal de Subscription op (uitgebreid, zodat price + period_end aanwezig zijn).
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  if (!subscriptionId) {
    console.warn("checkout.session.completed zonder subscription id", session.id);
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });

  await handleSubscriptionUpsert(subscription);
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  const restaurantId = await resolveRestaurantId(
    subscription.metadata,
    customerId,
  );

  if (!restaurantId) {
    console.warn(
      "Kon geen restaurant koppelen aan subscription",
      subscription.id,
    );
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const resolvedPlan = planIdFromPriceId(priceId);

  // Als Stripe-plan niet matched met onze env (bv. oude price), laat plan staan.
  const planUpdate = resolvedPlan ? { plan: resolvedPlan } : {};

  const periodEnd =
    // Stripe.Subscription heeft current_period_end; fallback naar cancel_at / trial_end.
    toIsoOrNull(
      (subscription as unknown as { current_period_end?: number })
        .current_period_end ??
        subscription.cancel_at ??
        subscription.trial_end ??
        null,
    );

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("restaurants")
    .update({
      ...planUpdate,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan_status: subscription.status,
      plan_period_end: periodEnd,
    })
    .eq("id", restaurantId);

  if (error) {
    console.error("Restaurant abonnement updaten mislukt:", error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  const restaurantId = await resolveRestaurantId(
    subscription.metadata,
    customerId,
  );
  if (!restaurantId) return;

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("restaurants")
    .update({
      plan: "free",
      plan_status: "canceled",
      stripe_subscription_id: null,
      plan_period_end: toIsoOrNull(
        (subscription as unknown as { current_period_end?: number })
          .current_period_end ?? null,
      ),
    })
    .eq("id", restaurantId);

  if (error) {
    console.error("Restaurant downgraden naar free mislukt:", error);
    throw error;
  }
}
