import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
}

function getWeekRange(): { start: string; end: string; label: string } {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 7);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const fmtBR = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

  return {
    start: fmt(start),
    end: fmt(end),
    label: `${fmtBR(start)} a ${fmtBR(end)}`,
  };
}

interface UserSnapshot {
  userId: string;
  email: string;
  displayName: string | null;
  weeklyEmail: boolean;
  weeklyWhatsapp: boolean;
  phone?: string | null;
}

async function buildSnapshot(supabase: any, userId: string, weekStart: string, weekEnd: string) {
  // Expenses this week
  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, category, status, date")
    .eq("user_id", userId)
    .gte("date", weekStart)
    .lte("date", weekEnd);

  const totalExpenses = (expenses ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
  const paidExpenses = (expenses ?? []).filter((e: any) => e.status === "paid");
  const totalPaid = paidExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const plannedCount = (expenses ?? []).filter((e: any) => e.status === "planned").length;
  const overdueCount = (expenses ?? []).filter((e: any) => e.status === "overdue").length;

  // Category breakdown
  const catMap: Record<string, number> = {};
  for (const e of expenses ?? []) {
    catMap[e.category] = (catMap[e.category] ?? 0) + Number(e.amount);
  }
  const topCategories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Current month budget
  const now = new Date();
  const { data: budget } = await supabase
    .from("budgets")
    .select("total_limit")
    .eq("user_id", userId)
    .eq("month", now.getMonth() + 1)
    .eq("year", now.getFullYear())
    .maybeSingle();

  // Month expenses so far
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: monthExpenses } = await supabase
    .from("expenses")
    .select("amount")
    .eq("user_id", userId)
    .gte("date", monthStart)
    .lte("date", weekEnd);

  const monthTotal = (monthExpenses ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
  const budgetLimit = budget?.total_limit ?? 0;
  const budgetRemaining = budgetLimit > 0 ? budgetLimit - monthTotal : null;
  const budgetPercent = budgetLimit > 0 ? Math.round((monthTotal / budgetLimit) * 100) : null;

  // Upcoming (next 7 days)
  const nextStart = weekEnd;
  const nextEnd = new Date(now);
  nextEnd.setDate(nextEnd.getDate() + 7);
  const { data: upcoming } = await supabase
    .from("expenses")
    .select("description, amount, date, status")
    .eq("user_id", userId)
    .gte("date", nextStart)
    .lte("date", nextEnd.toISOString().split("T")[0])
    .in("status", ["planned", "overdue"]);

  return {
    totalExpenses,
    totalPaid,
    plannedCount,
    overdueCount,
    topCategories,
    budgetLimit,
    budgetRemaining,
    budgetPercent,
    monthTotal,
    upcoming: upcoming ?? [],
    expenseCount: (expenses ?? []).length,
  };
}

function buildMessage(
  name: string | null,
  weekLabel: string,
  snap: Awaited<ReturnType<typeof buildSnapshot>>
): string {
  const firstName = name?.split(" ")[0] ?? "Olá";
  let msg = `📊 *Snapshot Semanal FinBrasil*\n`;
  msg += `📅 ${weekLabel}\n\n`;
  msg += `Olá, ${firstName}! Aqui está seu resumo da semana:\n\n`;

  msg += `💰 *Gastos da semana:* ${formatCurrency(snap.totalExpenses)} (${snap.expenseCount} lançamentos)\n`;
  msg += `✅ Pagos: ${formatCurrency(snap.totalPaid)}\n`;

  if (snap.plannedCount > 0) msg += `📋 Previstos: ${snap.plannedCount}\n`;
  if (snap.overdueCount > 0) msg += `⚠️ Atrasados: ${snap.overdueCount}\n`;

  msg += `\n`;

  if (snap.topCategories.length > 0) {
    msg += `📂 *Top categorias:*\n`;
    for (const [cat, amount] of snap.topCategories) {
      msg += `  • ${cat}: ${formatCurrency(amount)}\n`;
    }
    msg += `\n`;
  }

  if (snap.budgetLimit > 0) {
    msg += `🎯 *Orçamento do mês:*\n`;
    msg += `  Usado: ${formatCurrency(snap.monthTotal)} de ${formatCurrency(snap.budgetLimit)} (${snap.budgetPercent}%)\n`;
    if (snap.budgetRemaining !== null) {
      msg += snap.budgetRemaining > 0
        ? `  Restante: ${formatCurrency(snap.budgetRemaining)} ✅\n`
        : `  Estourado em: ${formatCurrency(Math.abs(snap.budgetRemaining))} 🔴\n`;
    }
    msg += `\n`;
  }

  if (snap.upcoming.length > 0) {
    msg += `📆 *Próximos 7 dias:*\n`;
    for (const u of snap.upcoming.slice(0, 5)) {
      const d = u.date.split("-");
      const status = u.status === "overdue" ? "⚠️" : "📋";
      msg += `  ${status} ${d[2]}/${d[1]} - ${u.description}: ${formatCurrency(Number(u.amount))}\n`;
    }
    if (snap.upcoming.length > 5) msg += `  ... e mais ${snap.upcoming.length - 5}\n`;
    msg += `\n`;
  }

  // Tips
  if (snap.overdueCount > 0) {
    msg += `💡 *Dica:* Você tem ${snap.overdueCount} gasto(s) atrasado(s). Regularize para manter seu FinScore alto!\n`;
  } else if (snap.budgetPercent !== null && snap.budgetPercent > 80) {
    msg += `💡 *Dica:* Você já usou ${snap.budgetPercent}% do orçamento. Atenção nos próximos gastos!\n`;
  } else {
    msg += `💡 *Dica:* Continue registrando seus gastos diariamente para insights mais precisos!\n`;
  }

  msg += `\n—\nFinBrasil • Gestão Financeira Inteligente`;

  return msg;
}

function buildEmailHtml(
  name: string | null,
  weekLabel: string,
  snap: Awaited<ReturnType<typeof buildSnapshot>>
): string {
  const firstName = name?.split(" ")[0] ?? "Olá";

  const categoryRows = snap.topCategories
    .map(([cat, amount]) => `<tr><td style="padding:4px 12px;border-bottom:1px solid #f0f0f0;">${cat}</td><td style="padding:4px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${formatCurrency(amount)}</td></tr>`)
    .join("");

  const upcomingRows = snap.upcoming
    .slice(0, 5)
    .map((u: any) => {
      const d = u.date.split("-");
      const badge = u.status === "overdue"
        ? '<span style="background:#fef2f2;color:#dc2626;padding:2px 6px;border-radius:8px;font-size:11px;">Atrasado</span>'
        : '<span style="background:#f0fdf4;color:#16a34a;padding:2px 6px;border-radius:8px;font-size:11px;">Previsto</span>';
      return `<tr><td style="padding:4px 12px;border-bottom:1px solid #f0f0f0;">${d[2]}/${d[1]}</td><td style="padding:4px 12px;border-bottom:1px solid #f0f0f0;">${u.description}</td><td style="padding:4px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatCurrency(Number(u.amount))}</td><td style="padding:4px 12px;border-bottom:1px solid #f0f0f0;">${badge}</td></tr>`;
    })
    .join("");

  const budgetBar = snap.budgetLimit > 0
    ? `<div style="margin:12px 0;">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
          <span>Usado: ${formatCurrency(snap.monthTotal)}</span>
          <span>Limite: ${formatCurrency(snap.budgetLimit)}</span>
        </div>
        <div style="background:#e5e7eb;border-radius:8px;height:8px;overflow:hidden;">
          <div style="background:${(snap.budgetPercent ?? 0) > 80 ? '#dc2626' : '#10b981'};height:100%;width:${Math.min(snap.budgetPercent ?? 0, 100)}%;border-radius:8px;"></div>
        </div>
        <div style="text-align:right;font-size:12px;color:#6b7280;margin-top:2px;">${snap.budgetPercent}%</div>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px;">
  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px 16px 0 0;padding:24px;text-align:center;">
    <h1 style="color:#fff;font-size:20px;margin:0;">📊 Snapshot Semanal</h1>
    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:8px 0 0;">${weekLabel}</p>
  </div>
  <div style="background:#fff;border-radius:0 0 16px 16px;padding:24px;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    <p style="font-size:15px;color:#1f2937;">Olá, <strong>${firstName}</strong>! Aqui está seu resumo:</p>

    <div style="display:flex;gap:12px;margin:16px 0;flex-wrap:wrap;">
      <div style="flex:1;min-width:120px;background:#f0fdf4;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-size:11px;color:#16a34a;font-weight:600;">GASTOS DA SEMANA</div>
        <div style="font-size:20px;font-weight:700;color:#15803d;">${formatCurrency(snap.totalExpenses)}</div>
        <div style="font-size:11px;color:#6b7280;">${snap.expenseCount} lançamentos</div>
      </div>
      <div style="flex:1;min-width:120px;background:#eff6ff;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-size:11px;color:#2563eb;font-weight:600;">PAGOS</div>
        <div style="font-size:20px;font-weight:700;color:#1d4ed8;">${formatCurrency(snap.totalPaid)}</div>
      </div>
      ${snap.overdueCount > 0 ? `<div style="flex:1;min-width:120px;background:#fef2f2;border-radius:12px;padding:12px;text-align:center;">
        <div style="font-size:11px;color:#dc2626;font-weight:600;">ATRASADOS</div>
        <div style="font-size:20px;font-weight:700;color:#b91c1c;">${snap.overdueCount}</div>
      </div>` : ""}
    </div>

    ${budgetBar ? `<h3 style="font-size:14px;color:#1f2937;margin:20px 0 8px;">🎯 Orçamento do mês</h3>${budgetBar}` : ""}

    ${categoryRows ? `<h3 style="font-size:14px;color:#1f2937;margin:20px 0 8px;">📂 Top Categorias</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">${categoryRows}</table>` : ""}

    ${upcomingRows ? `<h3 style="font-size:14px;color:#1f2937;margin:20px 0 8px;">📆 Próximos 7 dias</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">${upcomingRows}</table>` : ""}

    <div style="margin-top:24px;padding:12px;background:#f3f4f6;border-radius:8px;font-size:12px;color:#6b7280;">
      💡 ${snap.overdueCount > 0 ? `Você tem ${snap.overdueCount} gasto(s) atrasado(s). Regularize para manter seu FinScore!` : snap.budgetPercent && snap.budgetPercent > 80 ? `Atenção: ${snap.budgetPercent}% do orçamento já utilizado!` : "Continue registrando seus gastos para insights mais precisos!"}
    </div>
  </div>
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">FinBrasil • Gestão Financeira Inteligente</p>
</div>
</body></html>`;
}

async function sendWhatsAppMessage(to: string, body: string) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const from = "whatsapp:+14155238886";

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
    },
    body: new URLSearchParams({
      To: `whatsapp:${to}`,
      From: from,
      Body: body,
    }).toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("Twilio WhatsApp error:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();
    const week = getWeekRange();

    // Get all users with weekly snapshot enabled
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, weekly_snapshot_email, weekly_snapshot_whatsapp")
      .or("weekly_snapshot_email.eq.true,weekly_snapshot_whatsapp.eq.true");

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users opted in" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentEmail = 0;
    let sentWhatsapp = 0;

    for (const profile of profiles) {
      try {
        const snap = await buildSnapshot(supabase, profile.user_id, week.start, week.end);

        // Send email
        if (profile.weekly_snapshot_email) {
          // Get user email from auth
          const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
          if (authUser?.user?.email) {
            const htmlBody = buildEmailHtml(profile.display_name, week.label, snap);
            const messageId = `weekly-snapshot-${profile.user_id}-${week.start}`;

            await supabase.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                to: authUser.user.email,
                subject: `📊 Snapshot Semanal FinBrasil — ${week.label}`,
                html: htmlBody,
                message_id: messageId,
                template_name: "weekly-snapshot",
              },
            });
            sentEmail++;
          }
        }

        // Send WhatsApp
        if (profile.weekly_snapshot_whatsapp) {
          const { data: wa } = await supabase
            .from("whatsapp_users")
            .select("phone_number")
            .eq("user_id", profile.user_id)
            .eq("verified", true)
            .maybeSingle();

          if (wa?.phone_number) {
            const msg = buildMessage(profile.display_name, week.label, snap);
            await sendWhatsAppMessage(wa.phone_number, msg);
            sentWhatsapp++;
          }
        }
      } catch (userErr) {
        console.error(`Error processing user ${profile.user_id}:`, userErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: profiles.length,
        sentEmail,
        sentWhatsapp,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Weekly snapshot error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
