import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXPENSE_TOOL = {
  type: "function",
  function: {
    name: "add_expense",
    description: "Registra uma nova despesa no sistema financeiro do usuário. Use quando o usuário mencionar um gasto, compra ou pagamento que ele quer registrar.",
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
};

async function callAI(messages: any[], tools?: any[], toolChoice?: any) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const body: any = {
    model: "google/gemini-3-flash-preview",
    messages,
  };

  if (tools) {
    body.tools = tools;
    if (toolChoice) body.tool_choice = toolChoice;
    body.stream = false;
  } else {
    body.stream = true;
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return response;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Extract user JWT from authorization header
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
- Responder perguntas sobre finanças pessoais
- Sugerir metas e estratégias de economia
- Explicar conceitos financeiros de forma simples
- Calcular projeções simples
- **REGISTRAR DESPESAS**: Quando o usuário mencionar um gasto, compra ou pagamento, use a ferramenta add_expense para registrar automaticamente. Extraia a descrição, valor, categoria, data e status da mensagem do usuário.

Regras:
- Seja conciso mas completo
- Use emojis moderadamente para tornar a conversa agradável
- Quando não tiver dados suficientes, peça ao usuário para registrar mais informações
- Nunca invente dados financeiros do usuário
- Formate valores como "R$ X.XXX,XX"
- Quando o usuário falar de um gasto (ex: "gastei 50 reais no mercado"), registre automaticamente usando a ferramenta add_expense
- Se não souber a categoria exata, escolha a mais próxima
- Se o usuário não disser a data, use a data de hoje (${today})
- Se parecer que o gasto já aconteceu, use status "paid". Se for futuro/previsto, use "planned"`;

    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // First call: check if the AI wants to use tools
    const toolResponse = await callAI(fullMessages, [EXPENSE_TOOL]);

    if (!toolResponse.ok) {
      if (toolResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (toolResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Contate o administrador." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await toolResponse.text();
      console.error("AI gateway error:", toolResponse.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolResult = await toolResponse.json();
    const choice = toolResult.choices?.[0];

    // Check if AI wants to call a tool
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];

      if (toolCall.function.name === "add_expense") {
        let args: any;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          return new Response(JSON.stringify({ error: "Erro ao processar dados da despesa" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Insert expense using user's JWT for RLS
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${jwt}` } },
        });

        // Get user from JWT
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: insertedExpense, error: insertError } = await supabase
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

        let toolResultContent: string;
        if (insertError) {
          console.error("Insert error:", insertError);
          toolResultContent = JSON.stringify({ success: false, error: insertError.message });
        } else {
          toolResultContent = JSON.stringify({
            success: true,
            expense: {
              id: insertedExpense.id,
              description: insertedExpense.description,
              amount: insertedExpense.amount,
              category: insertedExpense.category,
              date: insertedExpense.date,
              status: insertedExpense.status,
            },
          });
        }

        // Second call: let AI respond with confirmation, now streaming
        const followUpMessages = [
          ...fullMessages,
          choice.message,
          {
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResultContent,
          },
        ];

        const streamResponse = await callAI(followUpMessages);

        if (!streamResponse.ok) {
          // Fallback: manually craft a response
          const statusLabel = args.status === "planned" ? "prevista" : "paga";
          const fallbackMsg = insertError
            ? `❌ Não consegui registrar a despesa: ${insertError.message}`
            : `✅ Despesa registrada!\n\n- **${args.description}** — R$ ${Number(args.amount).toFixed(2).replace(".", ",")}\n- Categoria: ${args.category}\n- Data: ${args.date}\n- Status: ${statusLabel}`;

          return new Response(JSON.stringify({
            action: insertError ? undefined : "expense_added",
            expense: insertError ? undefined : insertedExpense,
            fallbackMessage: fallbackMsg,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Stream back with a custom header indicating an expense was added
        const headers: Record<string, string> = {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
        };

        if (!insertError) {
          headers["X-Action"] = "expense_added";
          headers["X-Expense"] = encodeURIComponent(JSON.stringify({
            id: insertedExpense.id,
            description: insertedExpense.description,
            amount: insertedExpense.amount,
            category: insertedExpense.category,
            date: insertedExpense.date,
            status: insertedExpense.status,
          }));
          headers["Access-Control-Expose-Headers"] = "X-Action, X-Expense";
        }

        return new Response(streamResponse.body, { headers });
      }
    }

    // No tool call: normal streaming response
    // We need to re-call with streaming since the first call was non-streaming
    const streamResponse = await callAI(fullMessages);

    if (!streamResponse.ok) {
      const t = await streamResponse.text();
      console.error("AI streaming error:", streamResponse.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
