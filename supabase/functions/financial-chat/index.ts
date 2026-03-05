import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOLS = [
  {
    type: "function",
    function: {
      name: "add_expense",
      description: "Registra uma nova despesa/gasto no sistema financeiro do usuário. Use quando o usuário mencionar um gasto, compra, pagamento ou conta que pagou.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Descrição curta da despesa" },
          amount: { type: "number", description: "Valor da despesa em reais (BRL). Sempre positivo." },
          category: {
            type: "string",
            enum: ["Alimentação", "Transporte", "Moradia", "Saúde", "Lazer", "Educação", "Outros"],
            description: "Categoria da despesa",
          },
          date: { type: "string", description: "Data no formato YYYY-MM-DD. Se não informada, usar a data de hoje." },
          status: {
            type: "string",
            enum: ["paid", "planned"],
            description: "Status: 'paid' se já foi pago, 'planned' se é futuro/previsto. Default: 'paid'.",
          },
        },
        required: ["description", "amount", "category", "date", "status"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_income",
      description: "Registra uma nova renda/receita extra no sistema financeiro do usuário. Use quando o usuário mencionar que RECEBEU dinheiro, ganhou, foi pago, recebeu férias, bônus, freelance, presente, etc.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Descrição da receita (ex: Férias, Freelance, Bônus)" },
          amount: { type: "number", description: "Valor recebido em reais (BRL). Sempre positivo." },
          category: {
            type: "string",
            enum: ["Salário", "Freelance", "Investimentos", "Outros"],
            description: "Categoria da receita",
          },
          date: { type: "string", description: "Data no formato YYYY-MM-DD. Se não informada, usar a data de hoje." },
        },
        required: ["description", "amount", "category", "date"],
        additionalProperties: false,
      },
    },
  },
];

function getSupabaseClient(jwt: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

async function callAI(messages: any[], stream: boolean, tools?: any[]) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const body: any = {
    model: "google/gemini-3-flash-preview",
    messages,
    stream,
  };

  if (tools) {
    body.tools = tools;
  }

  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function handleAIError(status: number) {
  if (status === 429) {
    return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (status === 402) {
    return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Contate o administrador." }), {
      status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
    status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const today = new Date().toISOString().slice(0, 10);

    const systemPrompt = `Você é o Assistente Financeiro do FinBrasil, um app brasileiro de gestão financeira pessoal.
Responda SEMPRE em português brasileiro, de forma clara, amigável e objetiva.
Use formatação markdown quando útil (listas, negrito, etc).

Data de hoje: ${today}

Contexto financeiro do usuário (dados do mês atual):
${context ? JSON.stringify(context) : "Nenhum dado disponível ainda."}

Suas capacidades:
- Analisar gastos por categoria e identificar onde o usuário pode economizar
- Dar dicas personalizadas baseadas nos dados reais do usuário
- **REGISTRAR DESPESAS**: Quando o usuário mencionar um gasto/compra/pagamento, use add_expense
- **REGISTRAR RENDAS**: Quando o usuário mencionar que RECEBEU/GANHOU dinheiro (férias, bônus, freelance, pagamento, etc), use add_income
- Responder perguntas sobre finanças pessoais
- Sugerir metas e estratégias de economia

Regras CRÍTICAS:
- Quando o usuário falar de um GASTO (ex: "gastei 50 no mercado", "paguei 120 de luz"), use a ferramenta add_expense
- Quando o usuário falar de RENDA/RECEITA (ex: "ganhei 500 de férias", "recebi 1000 do freelance"), use a ferramenta add_income
- SEMPRE use as ferramentas quando o usuário mencionar valores financeiros. NUNCA diga que não pode salvar dados.
- Se não souber a categoria exata, escolha a mais próxima
- Se o usuário não disser a data, use ${today}
- Formate valores como "R$ X.XXX,XX"
- Seja conciso mas completo
- Use emojis moderadamente`;

    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // First call: non-streaming with tools to check if AI wants to call a tool
    const toolResponse = await callAI(fullMessages, false, TOOLS);

    if (!toolResponse.ok) {
      console.error("AI tool call error:", toolResponse.status);
      return handleAIError(toolResponse.status);
    }

    const toolResult = await toolResponse.json();
    const choice = toolResult.choices?.[0];

    // Check if AI wants to call a tool
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const fnName = toolCall.function.name;

      let args: any;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        return new Response(JSON.stringify({ error: "Erro ao processar dados" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = getSupabaseClient(jwt);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let toolResultContent: string;
      let actionType: string | null = null;
      let insertedData: any = null;

      if (fnName === "add_expense") {
        const { data, error } = await supabase
          .from("expenses")
          .insert({
            user_id: user.id,
            description: args.description,
            amount: args.amount,
            category: args.category,
            date: args.date,
            status: args.status || "paid",
          })
          .select()
          .single();

        if (error) {
          console.error("Insert expense error:", error);
          toolResultContent = JSON.stringify({ success: false, error: error.message });
        } else {
          actionType = "expense_added";
          insertedData = data;
          toolResultContent = JSON.stringify({
            success: true,
            type: "expense",
            expense: { id: data.id, description: data.description, amount: data.amount, category: data.category, date: data.date, status: data.status },
          });
        }
      } else if (fnName === "add_income") {
        const { data, error } = await supabase
          .from("extra_incomes")
          .insert({
            user_id: user.id,
            description: args.description,
            amount: args.amount,
            category: args.category || "Outros",
            date: args.date,
          })
          .select()
          .single();

        if (error) {
          console.error("Insert income error:", error);
          toolResultContent = JSON.stringify({ success: false, error: error.message });
        } else {
          actionType = "income_added";
          insertedData = data;
          toolResultContent = JSON.stringify({
            success: true,
            type: "income",
            income: { id: data.id, description: data.description, amount: data.amount, category: data.category, date: data.date },
          });
        }
      } else {
        toolResultContent = JSON.stringify({ success: false, error: "Unknown tool" });
      }

      // Second call: streaming response with tool result
      const followUpMessages = [
        ...fullMessages,
        choice.message,
        { role: "tool", tool_call_id: toolCall.id, content: toolResultContent },
      ];

      const streamResponse = await callAI(followUpMessages, true);

      if (!streamResponse.ok) {
        // Fallback message
        const fallbackMsg = actionType
          ? `✅ ${actionType === "expense_added" ? "Despesa" : "Renda"} registrada com sucesso!\n\n- **${args.description}** — R$ ${Number(args.amount).toFixed(2).replace(".", ",")}`
          : `❌ Erro ao registrar: ${toolResultContent}`;

        return new Response(JSON.stringify({ action: actionType, fallbackMessage: fallbackMsg }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const headers: Record<string, string> = {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
      };

      if (actionType) {
        headers["X-Action"] = actionType;
        headers["Access-Control-Expose-Headers"] = "X-Action";
      }

      return new Response(streamResponse.body, { headers });
    }

    // No tool call: stream a normal response
    const streamResponse = await callAI(fullMessages, true);

    if (!streamResponse.ok) {
      const t = await streamResponse.text();
      console.error("AI streaming error:", streamResponse.status, t);
      return handleAIError(streamResponse.status);
    }

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("financial-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
