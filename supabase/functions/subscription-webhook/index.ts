import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { event, provider, subscription_id, user_id, plan, current_period_end } = body;

    // TODO: Validate webhook signature based on provider (Stripe / MercadoPago)
    // For Stripe: verify stripe-signature header
    // For MercadoPago: verify x-signature header

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event === "checkout.completed" || event === "subscription.active") {
      await supabaseAdmin
        .from("profiles")
        .update({
          plan: plan ?? "pro",
          subscription_provider: provider ?? "stripe",
          subscription_status: "active",
          subscription_id: subscription_id ?? null,
          current_period_end: current_period_end ?? null,
        })
        .eq("user_id", user_id);
    }

    if (event === "subscription.canceled" || event === "subscription.expired") {
      await supabaseAdmin
        .from("profiles")
        .update({
          plan: "free",
          subscription_status: "canceled",
          subscription_id: null,
          current_period_end: null,
        })
        .eq("user_id", user_id);
    }

    if (event === "invoice.payment_failed") {
      await supabaseAdmin
        .from("profiles")
        .update({ subscription_status: "past_due" })
        .eq("user_id", user_id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
