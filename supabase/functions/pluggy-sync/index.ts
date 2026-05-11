import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { pluggyFetch } from "../_shared/pluggy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeia categorias da Pluggy para categorias do FinBrasil
function mapCategory(pluggyCategory: string | null | undefined): string {
  if (!pluggyCategory) return "outros";
  const c = pluggyCategory.toLowerCase();
  if (c.includes("food") || c.includes("aliment") || c.includes("restau") || c.includes("supermerc")) return "alimentacao";
  if (c.includes("transport") || c.includes("uber") || c.includes("combust") || c.includes("gasolin")) return "transporte";
  if (c.includes("health") || c.includes("saúde") || c.includes("farm") || c.includes("medic")) return "saude";
  if (c.includes("home") || c.includes("casa") || c.includes("aluguel") || c.includes("rent")) return "moradia";
  if (c.includes("entertain") || c.includes("lazer") || c.includes("stream")) return "lazer";
  if (c.includes("educ") || c.includes("school") || c.includes("escola")) return "educacao";
  if (c.includes("shop") || c.includes("compr")) return "compras";
  if (c.includes("service") || c.includes("serviç")) return "servicos";
  if (c.includes("salar") || c.includes("salary") || c.includes("incom")) return "salario";
  return "outros";
}

function mapAccountType(pluggyType: string, pluggySubtype?: string): "wallet" | "checking" | "savings" | "credit_card" | "investment" {
  const t = pluggyType?.toUpperCase();
  if (t === "BANK") {
    const s = pluggySubtype?.toUpperCase();
    if (s === "SAVINGS_ACCOUNT") return "savings";
    return "checking";
  }
  if (t === "CREDIT") return "credit_card";
  if (t === "INVESTMENT") return "investment";
  return "wallet";
}

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
    const itemId: string = body.itemId;
    if (!itemId) throw new Error("itemId é obrigatório");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar dados do item Pluggy
    const item = await pluggyFetch(`/items/${itemId}`);

    // Upsert da conexão
    const { data: connectionRow, error: connErr } = await admin
      .from("pluggy_connections")
      .upsert({
        user_id: userId,
        pluggy_item_id: itemId,
        connector_id: item.connector?.id,
        connector_name: item.connector?.name ?? "Banco",
        connector_image_url: item.connector?.imageUrl,
        status: item.status ?? "UPDATING",
        status_detail: item.statusDetail ? JSON.stringify(item.statusDetail) : null,
        mfa_required: item.status === "WAITING_USER_INPUT",
        last_sync_at: new Date().toISOString(),
        is_active: true,
      }, { onConflict: "user_id,pluggy_item_id" })
      .select()
      .single();
    if (connErr) throw connErr;

    // Se ainda atualizando, retorna sem sincronizar transações
    if (item.status === "UPDATING" || item.status === "WAITING_USER_INPUT" || item.status === "LOGIN_IN_PROGRESS") {
      return new Response(JSON.stringify({ status: item.status, message: "Item ainda processando" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (item.status === "LOGIN_ERROR" || item.status === "OUTDATED") {
      return new Response(JSON.stringify({ status: item.status, message: "Reconectar necessário" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar contas
    const accountsResp = await pluggyFetch(`/accounts?itemId=${itemId}`);
    const accounts: any[] = accountsResp.results ?? [];

    let totalImported = 0;
    let totalSkipped = 0;

    for (const acc of accounts) {
      const accountType = mapAccountType(acc.type, acc.subtype);

      // Garantir vínculo / criar conta financeira local
      const { data: existingLink } = await admin
        .from("pluggy_account_links")
        .select("*, financial_account_id")
        .eq("user_id", userId)
        .eq("pluggy_account_id", acc.id)
        .maybeSingle();

      let financialAccountId = existingLink?.financial_account_id ?? null;

      if (!financialAccountId) {
        const accName = `${item.connector?.name ?? "Banco"} - ${acc.name ?? acc.subtype ?? "Conta"}`;
        const { data: newAcc, error: accErr } = await admin
          .from("financial_accounts")
          .insert({
            user_id: userId,
            name: accName.slice(0, 80),
            type: accountType,
            balance: acc.balance ?? 0,
            current_value: accountType === "investment" ? (acc.balance ?? 0) : 0,
            applied_value: accountType === "investment" ? (acc.investmentData?.amountOriginal ?? acc.balance ?? 0) : 0,
            color: "#6366f1",
            icon: accountType === "credit_card" ? "credit-card" : accountType === "investment" ? "trending-up" : "wallet",
          })
          .select()
          .single();
        if (accErr) {
          console.error("Erro criando conta:", accErr);
          continue;
        }
        financialAccountId = newAcc.id;

        await admin.from("pluggy_account_links").upsert({
          user_id: userId,
          connection_id: connectionRow.id,
          pluggy_account_id: acc.id,
          financial_account_id: financialAccountId,
          account_type: acc.type,
          account_subtype: acc.subtype,
          account_number: acc.number,
        }, { onConflict: "user_id,pluggy_account_id" });
      } else {
        // Atualiza saldo da conta existente
        await admin.from("financial_accounts").update({
          balance: acc.balance ?? 0,
          ...(accountType === "investment" ? {
            current_value: acc.balance ?? 0,
            applied_value: acc.investmentData?.amountOriginal ?? acc.balance ?? 0,
          } : {}),
        }).eq("id", financialAccountId);
      }

      // Buscar transações dos últimos 12 meses
      const from = new Date();
      from.setMonth(from.getMonth() - 12);
      const fromStr = from.toISOString().slice(0, 10);

      let page = 1;
      let hasMore = true;
      while (hasMore && page <= 20) {
        const txResp = await pluggyFetch(`/transactions?accountId=${acc.id}&from=${fromStr}&pageSize=500&page=${page}`);
        const txs: any[] = txResp.results ?? [];
        if (txs.length === 0) break;

        for (const tx of txs) {
          const isExpense = tx.amount < 0 || tx.type === "DEBIT";
          const absAmount = Math.abs(tx.amount);
          const dateStr = (tx.date ?? new Date().toISOString()).slice(0, 10);
          const description = (tx.description ?? tx.descriptionRaw ?? "Lançamento").slice(0, 200);
          const category = mapCategory(tx.category ?? tx.categoryId);

          if (isExpense) {
            const { error } = await admin.from("expenses").upsert({
              user_id: userId,
              account_id: financialAccountId,
              date: dateStr,
              description,
              amount: absAmount,
              category,
              status: "paid",
              pluggy_transaction_id: tx.id,
              auto_imported: true,
            }, { onConflict: "user_id,pluggy_transaction_id", ignoreDuplicates: false });
            if (error) {
              if (!String(error.message).includes("duplicate")) console.error("expense err:", error);
              totalSkipped++;
            } else {
              totalImported++;
            }
          } else {
            const { error } = await admin.from("extra_incomes").upsert({
              user_id: userId,
              date: dateStr,
              description,
              amount: absAmount,
              category,
              pluggy_transaction_id: tx.id,
              auto_imported: true,
            }, { onConflict: "user_id,pluggy_transaction_id", ignoreDuplicates: false });
            if (error) {
              if (!String(error.message).includes("duplicate")) console.error("income err:", error);
              totalSkipped++;
            } else {
              totalImported++;
            }
          }
        }

        hasMore = txs.length === 500;
        page++;
      }
    }

    await admin.from("pluggy_connections").update({
      status: item.status,
      last_sync_at: new Date().toISOString(),
    }).eq("id", connectionRow.id);

    return new Response(JSON.stringify({
      status: "success",
      itemStatus: item.status,
      accountsCount: accounts.length,
      transactionsImported: totalImported,
      transactionsSkipped: totalSkipped,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("pluggy-sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
