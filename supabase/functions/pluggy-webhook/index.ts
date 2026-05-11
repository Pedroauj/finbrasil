import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

// Endpoint público chamado pela Pluggy quando um item é atualizado.
// Apenas registra o status; o sync de transações deve ser disparado pelo usuário ou cron.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json().catch(() => ({}));
    const itemId = payload.itemId ?? payload.item?.id;
    const eventType = payload.event ?? payload.type;
    if (!itemId) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await admin.from("pluggy_connections").update({
      status: payload.status ?? payload.item?.status ?? "UPDATING",
      status_detail: eventType ? `webhook:${eventType}` : null,
      next_sync_at: payload.item?.nextAutoSyncAt ?? null,
    }).eq("pluggy_item_id", itemId);

    console.log(`[pluggy-webhook] item=${itemId} event=${eventType}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webhook error:", e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 200, // sempre 200 pra Pluggy não reenviar infinitamente
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
