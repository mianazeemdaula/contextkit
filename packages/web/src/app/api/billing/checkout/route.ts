// POST /api/billing/checkout — creates a Stripe Checkout Session.
// https://docs.stripe.com/checkout/quickstart
//
// Returns 503 (not 500) when Stripe env vars are missing, so the build
// doesn't crash and the UI can show a friendly "billing not configured"
// message in dev.
import { NextResponse, type NextRequest } from "next/server";
import { readEnv, hasStripe } from "@/lib/env";
import { getServerSupabase } from "@/lib/supabase/server";

type CheckoutBody = { tier: "personal" | "team" };

/** POST /api/billing/checkout */
export async function POST(request: NextRequest) {
  try {
    if (!hasStripe()) {
      return NextResponse.json(
        {
          error:
            "Stripe not configured — set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env."
        },
        { status: 503 }
      );
    }
    const env = readEnv();
    const body = (await request.json()) as CheckoutBody;
    if (body.tier !== "personal" && body.tier !== "team") {
      return NextResponse.json({ error: "tier must be personal|team" }, { status: 400 });
    }
    const price = body.tier === "personal" ? env.stripePricePersonal : env.stripePriceTeam;
    if (!price) {
      return NextResponse.json(
        { error: `Missing STRIPE_PRICE_${body.tier.toUpperCase()}` },
        { status: 503 }
      );
    }

    const supabase = await getServerSupabase();
    const userEmail = supabase
      ? (await supabase.auth.getUser()).data.user?.email
      : undefined;

    // Lazy-load `stripe` so missing dep doesn't crash module init for users
    // who haven't installed it yet. Cast to unknown to keep TS happy without
    // requiring @types at module-load time.
    const { default: Stripe } = (await import("stripe")) as unknown as {
      default: new (key: string, opts?: { apiVersion?: string }) => {
        checkout: {
          sessions: {
            create: (params: Record<string, unknown>) => Promise<{ url: string | null }>;
          };
        };
      };
    };
    const stripe = new Stripe(env.stripeSecret!);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price, quantity: 1 }],
      customer_email: userEmail,
      success_url: `${env.siteUrl}/settings?checkout=success`,
      cancel_url: `${env.siteUrl}/pricing?checkout=cancel`,
      metadata: { tier: body.tier }
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
