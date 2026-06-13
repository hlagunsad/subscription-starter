-- Subscription state, one row per user. Run this in the Supabase SQL Editor.

create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  status                 text not null default 'none'
                           check (status in ('active','trialing','past_due','canceled','incomplete','none')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Users may READ only their own subscription. There is deliberately no insert/update
-- policy for users: writes happen server-side via the SECRET key, only after Stripe
-- confirms payment — so a user can never grant themselves "Pro".
create policy "read own subscription"
  on public.subscriptions for select to authenticated
  using (auth.uid() = user_id);
