import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendWhatsAppMessage(to: string, body: string) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const from = "whatsapp:+14155238886"; // Twilio sandbox number

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

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function callAI(messages: any[]) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

  const tools = [
    {
      type: "function",
      function: {
        name: "add_expense",
        description: "Registrar um gasto/despesa",
        parameters: {
          type: "object",
          properties: {
            amount: { type: "number", description: "Valor em reais" },
            description: { type: "string" },
            category: {
              type: "string",
              enum: ["alimentação", "transporte", "moradia", "saúde", "educação", "lazer", "compras", "serviços", "outros"],
            },
            date: { type: "string", description: "Data YYYY-MM-DD (hoje se não informado)" },
          },
          required: ["amount", "description", "category"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "add_income",
        description: "Registrar uma receita/entrada de dinheiro",
        parameters: {
          type: "object",
          properties: {
            amount: { type: "number" },
            description: { type: "string" },
            category: { type: "string", enum: ["salário", "freelance", "investimento", "presente", "outros"] },
            date: { type: "string" },
          },
          required: ["amount", "description"],
        },
      },
    },
  ];

  const today = new Date().toISOString().split("T")[0];
  const systemPrompt = `Você é o assistente financeiro FinBrasil no WhatsApp. Interprete mensagens de texto sobre gastos ou receitas e use as ferramentas para registrá-los. Hoje é ${today}. Responda sempre em português brasileiro de forma curta e amigável. Se não entender, peça mais detalhes.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools,
      stream: false,
    }),
  });

  if (!resp.ok) {
    console.error("AI error:", resp.status, await resp.text());
    throw new Error("AI gateway error");
  }
  return resp.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    const supabaseAdmin = getSupabaseAdmin();

    // ── Internal call: send verification code ──
    if (contentType.includes("application/json")) {
      const body = await req.json();

      if (body.action === "send_verification") {
        await sendWhatsAppMessage(
          body.phone,
          `🔐 Seu código de verificação FinBrasil: *${body.code}*\n\nDigite este código no app para vincular seu WhatsApp.`
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Twilio webhook (form-urlencoded) ──
    const formData = await req.formData();
    const from = (formData.get("From") as string || "").replace("whatsapp:", "");
    const messageBody = (formData.get("Body") as string || "").trim();

    if (!from || !messageBody) {
      return new Response("<Response></Response>", {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Find linked user
    const { data: whatsappUser } = await supabaseAdmin
      .from("whatsapp_users")
      .select("user_id, verified")
      .eq("phone_number", from)
      .eq("verified", true)
      .single();

    if (!whatsappUser) {
      await sendWhatsAppMessage(
        from,
        "❌ Este número não está vinculado a uma conta FinBrasil. Vincule no app em Configurações > Preferências."
      );
      return new Response("<Response></Response>", {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const userId = whatsappUser.user_id;
    const today = new Date().toISOString().split("T")[0];

    // Call AI
    const aiResult = await callAI([{ role: "user", content: messageBody }]);
    const choice = aiResult.choices?.[0];

    if (choice?.message?.tool_calls?.length > 0) {
      const tc = choice.message.tool_calls[0];
      const fnName = tc.function.name;
      const args = JSON.parse(tc.function.arguments);

      if (fnName === "add_expense") {
        const { error } = await supabaseAdmin.from("expenses").insert({
          user_id: userId,
          amount: args.amount,
          description: args.description,
          category: args.category,
          date: args.date || today,
          status: "paid",
        });
        if (error) throw error;

        await sendWhatsAppMessage(
          from,
          `✅ Gasto registrado!\n📝 ${args.description}\n💰 R$ ${args.amount.toFixed(2)}\n📁 ${args.category}\n📅 ${args.date || today}`
        );
      } else if (fnName === "add_income") {
        const { error } = await supabaseAdmin.from("extra_incomes").insert({
          user_id: userId,
          amount: args.amount,
          description: args.description,
          category: args.category || "outros",
          date: args.date || today,
        });
        if (error) throw error;

        await sendWhatsAppMessage(
          from,
          `✅ Receita registrada!\n📝 ${args.description}\n💰 R$ ${args.amount.toFixed(2)}\n📅 ${args.date || today}`
        );
      }
    } else {
      const reply = choice?.message?.content || "Não entendi. Tente algo como: 'Gastei 50 reais no almoço'";
      await sendWhatsAppMessage(from, reply);
    }

    return new Response("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  }
});
