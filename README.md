# Subscription Starter

Auth + **Stripe subscriptions** in Next.js: sign up, subscribe to a paid plan, and unlock premium content — with subscription status written **server-side only** (after Stripe confirms payment), so a user can never grant themselves "Pro."

**Live demo:** https://subscription-starter-zeta-khaki.vercel.app

## How it works
1. **Sign up / log in** (Supabase Auth)
2. **Subscribe to Pro** → a route handler creates a **Stripe Checkout** session and redirects to Stripe (test mode)
3. Pay with a test card → redirected back → the server **validates the session with Stripe**, then writes your plan
4. **Premium content unlocks**

Subscriptions live in a `subscriptions` table whose RLS lets a user **read only their own** row — there is no user-level write policy. Writes happen exclusively via the **secret key** inside route handlers, so a subscription can't be self-granted. A Stripe **webhook** (`/api/webhooks/stripe`) keeps the row in sync for renewals and cancellations.

## Tech
Next.js (App Router + route handlers) · TypeScript · Supabase (Auth + Postgres + RLS) · Stripe (Checkout + webhooks) · Tailwind · Vitest · Playwright.

## Run locally
```bash
npm install
```
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...            # server-only
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...          # the recurring price, not the product id
STRIPE_WEBHOOK_SECRET=whsec_...    # optional locally; set in prod (see "Stripe webhook" below)
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # fallback only — redirect URLs use the request origin
```
Then run `supabase/migrations/0001_init.sql` in the Supabase SQL editor (creates the `subscriptions` table + RLS), and turn off "Confirm email" in Supabase Auth so sign-up is instant.

**Stripe webhook (production):** in the Stripe Dashboard → Developers → Webhooks, add an endpoint at `<your-site>/api/webhooks/stripe` for `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`, then put its signing secret in `STRIPE_WEBHOOK_SECRET` (your host's env vars). This keeps subscription status correct on renewals / cancellations and even if the post-checkout redirect is missed. For local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` (prints a `whsec_…`).
```bash
npm run dev       # http://localhost:3000
npm test          # Vitest unit tests
npm run test:e2e  # Playwright (needs E2E_EMAIL / E2E_PASSWORD for a Free test account)
```
Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC.

## Tests
- **Unit (Vitest):** the Pro/Free subscription logic (`src/lib/plan.ts`).
- **E2E (Playwright):** sign in → see the upgrade option → "Subscribe" hands off to Stripe Checkout.
