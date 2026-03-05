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
    const { financialData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Gere um relatório financeiro mensal completo e profissional em português brasileiro com base nos dados abaixo.

Dados financeiros do mês:
${JSON.stringify(financialData)}

O relatório deve incluir as seguintes seções em markdown:
1. **📊 Resumo Executivo** - Visão geral rápida do mês
2. **💰 Receitas vs Despesas** - Análise comparativa
3. **📈 Top Categorias de Gastos** - As 5 maiores categorias e % do total
4. **🎯 Análise de Orçamento** - Se o usuário ficou dentro do orçamento
5. **📉 Tendências** - Comparação com mês anterior se disponível
6. **💡 Recomendações** - 3-5 dicas práticas e personalizadas para melhorar
7. **⭐ FinScore** - Análise do score financeiro e como melhorar

Use formatação markdown rica (tabelas, listas, negrito). Formate valores como "R$ X.XXX,XX".
Seja direto e prático, sem enrolação.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um analista financeiro especializado em finanças pessoais brasileiras. Gera relatórios claros, práticos e visuais." },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("monthly-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
