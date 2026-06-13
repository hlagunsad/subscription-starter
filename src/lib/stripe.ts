import Stripe from "stripe";

let stripe: Stripe | undefined;

/** Server-only Stripe client (lazy — created on first use, never at import time). */
export function getStripe(): Stripe {
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return stripe;
}
