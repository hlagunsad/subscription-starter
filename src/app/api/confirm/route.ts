import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/auth";
import { normalizeStatus } from "@/lib/plan";

// Called when Stripe redirects back after checkout. Validates the session with
// Stripe (server-side) before writing the subscription — so a user can't fake Pro.
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { session_id } = (await req.json()) as { session_id?: string };
  if (!session_id) return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

  const session = await getStripe().checkout.sessions.retrieve(session_id, { expand: ["subscription"] });
  if (session.metadata?.supabase_user_id !== user.id) {
    return NextResponse.json({ error: "This checkout does not belong to you" }, { status: 403 });
  }

  const subscription = session.subscription as Stripe.Subscription | null;
  if (!subscription) return NextResponse.json({ error: "No subscription on this session" }, { status: 400 });

  const customerId = typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);
  const status = normalizeStatus(subscription.status);

  await getSupabaseAdmin().from("subscriptions").upsert(
    {
      user_id: user.id,
      status,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return NextResponse.json({ status });
}
