import type { SubStatus } from "./types";

/** A subscription grants Pro access while it's active or trialing. */
export function isPro(status: SubStatus | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

export function planLabel(status: SubStatus | null | undefined): "Pro" | "Free" {
  return isPro(status) ? "Pro" : "Free";
}

const KNOWN_STATUSES: SubStatus[] = ["active", "trialing", "past_due", "canceled", "incomplete", "none"];

/** Coerce any Stripe subscription status into one our database allows. */
export function normalizeStatus(status: string): SubStatus {
  return (KNOWN_STATUSES as string[]).includes(status) ? (status as SubStatus) : "canceled";
}
