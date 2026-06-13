import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subscription Starter — Auth + Stripe",
  description:
    "A small SaaS auth + subscription-payments demo: Supabase Auth, Stripe Checkout, and gated premium content.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
