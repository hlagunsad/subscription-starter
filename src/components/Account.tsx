"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { isPro, planLabel } from "@/lib/plan";
import type { Subscription } from "@/lib/types";

export default function Account({ session }: { session: Session }) {
  const userId = session.user.id;
  const email = session.user.email ?? "";
  const token = session.access_token;

  const [sub, setSub] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadSub = useCallback(async () => {
    const { data } = await getSupabase()
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setSub((data as Subscription) ?? null);
  }, [userId]);

  useEffect(() => {
    loadSub();
  }, [loadSub]);

  // Handle the redirect back from Stripe Checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (sessionId) {
      setBusy(true);
      fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: sessionId }),
      })
        .then((r) => r.json())
        .then(() => {
          setMsg("Subscription confirmed — welcome to Pro!");
          return loadSub();
        })
        .catch(() => setMsg("Couldn't confirm the subscription."))
        .finally(() => {
          window.history.replaceState({}, "", "/");
          setBusy(false);
        });
    } else if (params.get("canceled")) {
      setMsg("Checkout canceled.");
      window.history.replaceState({}, "", "/");
    }
  }, [token, loadSub]);

  async function subscribe() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setMsg(data.error ?? "Couldn't start checkout.");
    } catch {
      setMsg("Couldn't start checkout.");
    }
    setBusy(false);
  }

  const pro = isPro(sub?.status);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">Subscription Starter</h1>
          <p className="text-xs text-slate-500">{email}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${pro ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
          >
            {planLabel(sub?.status)}
          </span>
          <button
            onClick={() => getSupabase().auth.signOut()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </header>

      {msg && <div className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{msg}</div>}

      {pro ? (
        <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="font-semibold text-emerald-800">You&rsquo;re on Pro 🎉</h2>
          <p className="mt-1 text-sm text-emerald-700">
            Here&rsquo;s the premium content, unlocked by your subscription.
          </p>
          <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-4 text-sm text-slate-700">
            🔓 Premium feature — visible only to paying subscribers.
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">Upgrade to Pro</h2>
          <p className="mt-1 text-sm text-slate-500">Unlock premium content. Test mode — no real charge.</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">
            $9<span className="text-base font-normal text-slate-500">/month</span>
          </p>
          <button
            onClick={subscribe}
            disabled={busy}
            className="mt-4 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {busy ? "…" : "Subscribe to Pro"}
          </button>
          <p className="mt-3 text-xs text-slate-400">
            Test card: 4242 4242 4242 4242 · any future date · any CVC.
          </p>
        </section>
      )}
    </div>
  );
}
