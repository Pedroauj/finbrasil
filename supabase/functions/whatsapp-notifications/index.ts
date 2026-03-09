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

async function sendWhatsAppMessage(to: string, body: string) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const from = "whatsapp:+14155238886";

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({
    To: `whatsapp:${to}`,
    From: from,
    Body: body,
  });

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
    },
    body: params.toString(),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("Twilio error:", err);
    throw new Error("Failed to send WhatsApp message");
  }
  return resp.json();
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatCurrency(amount: number): string {
  return `R$ ${amount.toFixed(2).replace(".", ",")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get all verified WhatsApp users
    const { data: whatsappUsers, error: wErr } = await supabaseAdmin
      .from("whatsapp_users")
      .select("user_id, phone_number")
      .eq("verified", true);

    if (wErr) throw wErr;
    if (!whatsappUsers || whatsappUsers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No verified users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Check upcoming days: today + next 3 days
    const upcoming = new Date(today);
    upcoming.setDate(upcoming.getDate() + 3);
    const upcomingStr = upcoming.toISOString().split("T")[0];

    let totalSent = 0;

    for (const wu of whatsappUsers) {
      const alerts: string[] = [];

      // 1. Overdue expenses (planned + date < today)
      const { data: overdue } = await supabaseAdmin
        .from("expenses")
        .select("description, amount, date, category")
        .eq("user_id", wu.user_id)
        .eq("status", "planned")
        .lt("date", todayStr)
        .order("date", { ascending: true })
        .limit(10);

      if (overdue && overdue.length > 0) {
        const totalOverdue = overdue.reduce((s, e) => s + Number(e.amount), 0);
        const items = overdue.slice(0, 5).map(
          (e) => `  • ${e.description} - ${formatCurrency(Number(e.amount))} (${formatDate(e.date)})`
        ).join("\n");
        alerts.push(
          `🔴 *${overdue.length} pagamento(s) atrasado(s)* (${formatCurrency(totalOverdue)}):\n${items}${overdue.length > 5 ? `\n  ... e mais ${overdue.length - 5}` : ""}`
        );
      }

      // 2. Due today
      const { data: dueToday } = await supabaseAdmin
        .from("expenses")
        .select("description, amount, category")
        .eq("user_id", wu.user_id)
        .eq("status", "planned")
        .eq("date", todayStr)
        .limit(10);

      if (dueToday && dueToday.length > 0) {
        const totalToday = dueToday.reduce((s, e) => s + Number(e.amount), 0);
        const items = dueToday.map(
          (e) => `  • ${e.description} - ${formatCurrency(Number(e.amount))}`
        ).join("\n");
        alerts.push(
          `🟡 *${dueToday.length} pagamento(s) vencem HOJE* (${formatCurrency(totalToday)}):\n${items}`
        );
      }

      // 3. Upcoming in next 3 days (excluding today)
      const tomorrowDate = new Date(today);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

      const { data: upcoming3 } = await supabaseAdmin
        .from("expenses")
        .select("description, amount, date, category")
        .eq("user_id", wu.user_id)
        .eq("status", "planned")
        .gte("date", tomorrowStr)
        .lte("date", upcomingStr)
        .order("date", { ascending: true })
        .limit(10);

      if (upcoming3 && upcoming3.length > 0) {
        const totalUpcoming = upcoming3.reduce((s, e) => s + Number(e.amount), 0);
        const items = upcoming3.map(
          (e) => `  • ${e.description} - ${formatCurrency(Number(e.amount))} (${formatDate(e.date)})`
        ).join("\n");
        alerts.push(
          `📅 *${upcoming3.length} pagamento(s) nos próximos dias* (${formatCurrency(totalUpcoming)}):\n${items}`
        );
      }

      // 4. Recurring expenses due today or in next 3 days
      const todayDay = today.getDate();
      const daysToCheck = [todayDay];
      for (let i = 1; i <= 3; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        daysToCheck.push(d.getDate());
      }

      const { data: recurringDue } = await supabaseAdmin
        .from("recurring_expenses")
        .select("description, amount, day_of_month, category")
        .eq("user_id", wu.user_id)
        .eq("active", true)
        .in("day_of_month", daysToCheck);

      if (recurringDue && recurringDue.length > 0) {
        const items = recurringDue.map(
          (e) => `  • ${e.description} - ${formatCurrency(Number(e.amount))} (dia ${e.day_of_month})`
        ).join("\n");
        alerts.push(
          `🔄 *Recorrentes próximos*:\n${items}`
        );
      }

      // Send consolidated message if there are alerts
      if (alerts.length > 0) {
        const message = `📊 *FinBrasil - Resumo de Alertas*\n\n${alerts.join("\n\n")}\n\n💡 Acesse o app para gerenciar seus pagamentos.`;
        try {
          await sendWhatsAppMessage(wu.phone_number, message);
          totalSent++;
          console.log(`Alerts sent to ${wu.phone_number}`);
        } catch (err) {
          console.error(`Failed to send to ${wu.phone_number}:`, err);
        }
      }
    }

    return new Response(
      JSON.stringify({ sent: totalSent, total_users: whatsappUsers.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
