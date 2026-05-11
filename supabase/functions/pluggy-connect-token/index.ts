import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getPluggyApiKey, PLUGGY_BASE_URL } from "../_shared/pluggy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub;

    const body = await req.json().catch(() => ({}));
    const itemId: string | undefined = body.itemId; // se passado, update mode

    // Verificar limite de plano (apenas para nova conexão)
    if (!itemId) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const [{ data: profile }, { count }] = await Promise.all([
        admin.from("profiles").select("plan, pluggy_connections_limit").eq("user_id", userId).maybeSingle(),
        admin.from("pluggy_connections").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_active", true),
      ]);
      const limit = profile?.pluggy_connections_limit ?? 1;
      const isPaid = profile?.plan && profile.plan !== "free";
      if (!isPaid && (count ?? 0) >= limit) {
        return new Response(JSON.stringify({
          error: "PLAN_LIMIT_REACHED",
          message: `Plano gratuito permite ${limit} banco conectado. Faça upgrade para conectar mais.`,
        }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const apiKey = await getPluggyApiKey();
    const ctRes = await fetch(`${PLUGGY_BASE_URL}/connect_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify({
        clientUserId: userId,
        ...(itemId ? { itemId } : {}),
        options: {
          webhookUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/pluggy-webhook`,
        },
      }),
    });
    if (!ctRes.ok) {
      const t = await ctRes.text();
      throw new Error(`Pluggy connect_token [${ctRes.status}]: ${t}`);
    }
    const data = await ctRes.json();

    return new Response(JSON.stringify({ accessToken: data.accessToken }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pluggy-connect-token error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
