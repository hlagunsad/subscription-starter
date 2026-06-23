import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeStatus } from "@/lib/plan";

// Server-side source of truth for subscription state. Stripe POSTs events here; we verify
// the signature with STRIPE_WEBHOOK_SECRET, then upsert the user's subscription (same write
// as /api/confirm). This keeps status correct even when the browser never finishes the
// post-checkout redirect, and captures later changes — renewals, cancellations, failed
// payments. Handles BOTH checkout.session.completed and customer.subscription.* so it works
// whichever of those events the dashboard endpoint is subscribed to.
//
// Setup: Stripe Dashboard -> Developers -> Webhooks -> add endpoint <site>/api/webhooks/stripe
// for checkout.session.completed, customer.subscription.updated, customer.subscription.deleted,
// then put its signing secret (whsec_...) in STRIPE_WEBHOOK_SECRET (Vercel + .env.local).
export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, { status: 500 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    const body = await req.text(); // the raw body is required to verify Stripe's signature
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  // Only the SECRET-key client writes subscription state, and only for the user the Stripe
  // object is tagged with (set via metadata when the Checkout session is created).
  async function sync(subscription: Stripe.Subscription, fallbackUserId?: string) {
    const userId = subscription.metadata?.supabase_user_id ?? fallbackUserId;
    if (!userId) return; // not one of ours
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    await getSupabaseAdmin().from("subscriptions").upsert(
      {
        user_id: userId,
        status: normalizeStatus(subscription.status),
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await sync(sub, session.metadata?.supabase_user_id);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await sync(event.data.object as Stripe.Subscription);
        break;
      default:
        break; // ignore other event types
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "handler error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
