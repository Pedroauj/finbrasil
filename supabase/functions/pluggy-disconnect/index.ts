import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { pluggyFetch } from "../_shared/pluggy.ts";

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
    const connectionId: string = body.connectionId;
    if (!connectionId) throw new Error("connectionId é obrigatório");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: conn } = await admin
      .from("pluggy_connections")
      .select("*")
      .eq("id", connectionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!conn) throw new Error("Conexão não encontrada");

    // Tenta deletar na Pluggy (se falhar, ainda marca como inativa local)
    try {
      await pluggyFetch(`/items/${conn.pluggy_item_id}`, { method: "DELETE" });
    } catch (e) {
      console.warn("Pluggy delete falhou (ignorando):", e);
    }

    await admin.from("pluggy_connections").update({ is_active: false, status: "DELETED" }).eq("id", connectionId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pluggy-disconnect error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
