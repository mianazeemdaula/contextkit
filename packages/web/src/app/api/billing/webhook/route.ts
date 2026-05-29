// POST /api/billing/webhook — Stripe webhook receiver.
// https://docs.stripe.com/webhooks — verify signature with the raw body
// using stripe.webhooks.constructEvent(payload, sig, endpointSecret).
//
// We read the raw text (Next route handlers expose it via request.text()),
// then dispatch on event type. Updates to the `subscriptions` table use the
// service-role client to bypass RLS.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readEnv, hasStripe } from "@/lib/env";

// Stripe webhooks require the raw body — disable any body parsing.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/billing/webhook */
export async function POST(request: NextRequest) {
  if (!hasStripe()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }
  const env = readEnv();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await request.text();

  const { default: Stripe } = (await import("stripe")) as unknown as {
    default: new (key: string) => {
      webhooks: {
        constructEvent: (
          payload: string,
          sig: string,
          secret: string
        ) => { type: string; data: { object: Record<string, unknown> } };
      };
    };
  };
  const stripe = new Stripe(env.stripeSecret!);

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = stripe.webhooks.constructEvent(payload, sig, env.stripeWebhookSecret!);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature verification failed: ${err instanceof Error ? err.message : "?"}` },
      { status: 400 }
    );
  }

  // Service-role client for RLS bypass (webhook is server-trusted).
  // Cast to a permissive shape — full Database typegen lives in the CLI sync
  // package and isn't shared here yet.
  type AdminClient = {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (col: string, val: unknown) => {
          maybeSingle: () => Promise<{ data: { id?: string } | null }>;
        };
      };
      upsert: (row: Record<string, unknown>, opts?: Record<string, unknown>) => Promise<unknown>;
      update: (row: Record<string, unknown>) => {
        eq: (col: string, val: unknown) => Promise<unknown>;
      };
    };
  };
  let admin: AdminClient | null = null;
  if (env.supabaseUrl && env.supabaseServiceRole) {
    admin = createClient(env.supabaseUrl, env.supabaseServiceRole, {
      auth: { persistSession: false, autoRefreshToken: false }
    }) as unknown as AdminClient;
  }

  try {
    if (event.type === "checkout.session.completed" && admin) {
      const s = event.data.object as {
        customer?: string;
        subscription?: string;
        customer_email?: string;
        metadata?: { tier?: string };
      };
      const email = s.customer_email;
      const tier = s.metadata?.tier ?? "personal";
      if (email) {
        const { data: user } = await admin
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (user?.id) {
          await admin.from("subscriptions").upsert(
            {
              user_id: user.id,
              tier,
              stripe_customer_id: s.customer ?? null,
              stripe_subscription_id: s.subscription ?? null,
              status: "active",
              updated_at: new Date().toISOString()
            },
            { onConflict: "stripe_subscription_id" }
          );
        }
      }
    }

    if (
      (event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted") &&
      admin
    ) {
      const s = event.data.object as {
        id?: string;
        status?: string;
        current_period_end?: number;
      };
      if (s.id) {
        await admin
          .from("subscriptions")
          .update({
            status: event.type === "customer.subscription.deleted" ? "canceled" : s.status,
            current_period_end: s.current_period_end
              ? new Date(s.current_period_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString()
          })
          .eq("stripe_subscription_id", s.id);
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
