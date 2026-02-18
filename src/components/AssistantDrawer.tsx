import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Wand2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

type Props = {
  baseDate: Date;
  onAddExpense: (expense: {
    date: string; // YYYY-MM-DD
    description: string;
    category: string;
    amount: number;
    status: "paid" | "planned" | "overdue";
  }) => void;
};

type Msg = { role: "assistant" | "user"; text: string };

type PendingExpense = {
  date: string; // YYYY-MM-DD
  description: string;
  category: string;
  amount: number;
  status: "paid" | "planned" | "overdue";
};

type DraftExpense = Partial<PendingExpense>;

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatCurrencyBRL(n: number) {
  try {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${n.toFixed(2).replace(".", ",")}`;
  }
}

function parseAmount(text: string): number | null {
  // pega primeiro número, aceita "32,90", "32.90", "R$ 32,90", "1.234,56"
  const m = text.match(/(?:r\$?\s*)?(\d{1,3}(?:[.\s]\d{3})*|\d+)([.,]\d{1,2})?/i);
  if (!m) return null;
  const intPart = m[1].replace(/[.\s]/g, "");
  const dec = (m[2] ?? "").replace(",", ".");
  const num = Number(`${intPart}${dec}`);
  return Number.isFinite(num) ? num : null;
}

function inferStatus(text: string): "paid" | "planned" | "overdue" | null {
  const t = normalize(text);
  if (t.includes("pago") || t.includes("paguei") || t.includes("paga")) return "paid";
  if (t.includes("previsto") || t.includes("planejado") || t.includes("planejada")) return "planned";
  if (t.includes("atrasado") || t.includes("atrasada") || t.includes("vencido") || t.includes("vencida")) return "overdue";
  return null;
}

function inferDate(text: string, baseDate: Date): string | null {
  const t = normalize(text);

  const toISO = (d: Date) => format(d, "yyyy-MM-dd");

  if (t.includes("hoje")) return toISO(baseDate);

  if (t.includes("ontem")) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 1);
    return toISO(d);
  }

  // "dia 05" ou "dia 5"
  const mDia = t.match(/\bdia\s+(\d{1,2})\b/);
  if (mDia) {
    const day = Number(mDia[1]);
    if (day >= 1 && day <= 31) {
      const d = new Date(baseDate);
      d.setDate(day);
      return toISO(d);
    }
  }

  // dd/mm(/yyyy)
  const mBR = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (mBR) {
    const dd = Number(mBR[1]);
    const mm = Number(mBR[2]);
    const yyRaw = mBR[3];
    const yyyy = yyRaw ? (yyRaw.length === 2 ? 2000 + Number(yyRaw) : Number(yyRaw)) : baseDate.getFullYear();
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      const d = new Date(yyyy, mm - 1, dd);
      return toISO(d);
    }
  }

  return null;
}

function cleanDescription(text: string): string {
  let t = normalize(text);

  // remove status palavras
  t = t
    .replace(/\b(pago|paguei|paga|previsto|planejado|planejada|atrasado|atrasada|vencido|vencida)\b/g, " ")
    .replace(/\b(hoje|ontem)\b/g, " ")
    .replace(/\bdia\s+\d{1,2}\b/g, " ")
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, " ")
    .replace(/(?:r\$?\s*)?(\d{1,3}(?:[.\s]\d{3})*|\d+)([.,]\d{1,2})?/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // volta sem normalizar (só capitaliza básico)
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function statusLabel(s: "paid" | "planned" | "overdue") {
  if (s === "paid") return "Pago";
  if (s === "planned") return "Previsto";
  return "Atrasado";
}

export function AssistantDrawer({ baseDate, onAddExpense }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "Me fala um gasto tipo: “47,90 mercado ontem” que eu lanço pra você." },
  ]);

  const [pending, setPending] = useState<PendingExpense | null>(null);

  // draft + passo do follow-up (quando falta algo)
  const [draft, setDraft] = useState<DraftExpense | null>(null);
  const [need, setNeed] = useState<"amount" | "description" | "category" | "status" | "date" | null>(null);

  const suggestions = useMemo(
    () => ["47,90 mercado ontem", "uber 32,50 hoje", "internet 119,90 dia 05 previsto", "farmácia 28,00 pago"],
    []
  );

  function pushAssistant(text: string) {
    setMessages((m) => [...m, { role: "assistant", text }]);
  }

  function askNext(maybeDraft: DraftExpense) {
    // decide próximo campo faltante
    if (maybeDraft.amount == null) {
      setNeed("amount");
      pushAssistant('Qual foi o **valor**? (ex: "32,90")');
      return;
    }
    if (!maybeDraft.description) {
      setNeed("description");
      pushAssistant('Qual foi a **descrição**? (ex: "mercado", "uber")');
      return;
    }
    if (!maybeDraft.category) {
      setNeed("category");
      pushAssistant('Qual a **categoria**? (ex: "Alimentação")');
      return;
    }
    if (!maybeDraft.status) {
      setNeed("status");
      pushAssistant('Status: **pago**, **previsto** ou **atrasado**?');
      return;
    }
    if (!maybeDraft.date) {
      setNeed("date");
      pushAssistant('Qual a **data**? (ex: "hoje", "ontem", "dia 05" ou "12/02")');
      return;
    }

    // completo → vira pending
    const full = maybeDraft as PendingExpense;
    setDraft(null);
    setNeed(null);
    setPending(full);

    pushAssistant(
      `Entendi isso aqui 👇\n` +
        `• ${full.description}\n` +
        `• ${formatCurrencyBRL(full.amount)}\n` +
        `• ${full.category}\n` +
        `• ${statusLabel(full.status)}\n` +
        `• ${format(new Date(full.date), "dd/MM/yyyy")}\n\n` +
        `Confirmar?`
    );
  }

  function startFromText(input: string) {
    const amount = parseAmount(input);
    const date = inferDate(input, baseDate) ?? undefined;
    const status = inferStatus(input) ?? undefined;

    // categoria: por enquanto default
    const category = "Outros";

    const description = cleanDescription(input);

    const nextDraft: DraftExpense = {
      amount: amount ?? undefined,
      description: description || undefined,
      category,
      status,
      date,
    };

    setDraft(nextDraft);

    // se veio tudo completo já, vai direto
    askNext(nextDraft);
  }

  function fillDraftWithAnswer(answer: string) {
    if (!draft || !need) return false;

    const a = answer.trim();
    const an = normalize(a);

    if (an === "cancelar" || an === "cancela" || an === "cancel") {
      setDraft(null);
      setNeed(null);
      pushAssistant("Beleza — cancelei.");
      return true;
    }

    const updated: DraftExpense = { ...draft };

    if (need === "amount") {
      const v = parseAmount(a);
      if (v == null) {
        pushAssistant('Não peguei o valor. Manda assim: "32,90" (ou "R$ 32,90").');
        return true;
      }
      updated.amount = v;
    } else if (need === "description") {
      if (a.length < 2) {
        pushAssistant('Me fala uma descrição curtinha tipo "mercado", "uber"...');
        return true;
      }
      updated.description = a;
    } else if (need === "category") {
      if (a.length < 2) {
        pushAssistant('Categoria muito curta. Ex: "Alimentação", "Transporte"...');
        return true;
      }
      updated.category = a;
    } else if (need === "status") {
      const st = inferStatus(a);
      if (!st) {
        pushAssistant('Me fala: **pago**, **previsto** ou **atrasado**.');
        return true;
      }
      updated.status = st;
    } else if (need === "date") {
      const d = inferDate(a, baseDate);
      if (!d) {
        pushAssistant('Não entendi a data. Ex: "hoje", "ontem", "dia 05" ou "12/02".');
        return true;
      }
      updated.date = d;
    }

    setDraft(updated);
    askNext(updated);
    return true;
  }

  function submit() {
    const input = text.trim();
    if (!input) return;

    setMessages((m) => [...m, { role: "user", text: input }]);
    setText("");

    // se tá em modo follow-up, usa a resposta pra completar
    if (draft && need) {
      fillDraftWithAnswer(input);
      return;
    }

    // começo normal
    startFromText(input);
  }

  function confirm() {
    if (!pending) return;
    onAddExpense(pending);
    setPending(null);
    pushAssistant("Fechado ✅ Lancei o gasto.");
  }

  function cancel() {
    setPending(null);
    pushAssistant("Beleza — não lancei.");
  }

  return (
    <>
      {/* Botão flutuante */}
      <motion.div className="fixed bottom-5 left-5 z-50" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <Button onClick={() => setOpen(true)} className="h-12 rounded-full px-4 shadow-lg shadow-emerald-500/20" variant="secondary">
          <Sparkles className="h-4 w-4 mr-2" />
          Assistente
        </Button>
      </motion.div>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-50 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />

            <motion.div
              className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-white/10 bg-slate-950/90 backdrop-blur-xl p-4"
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              transition={{ type: "spring", stiffness: 520, damping: 40 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/90">
                  <Wand2 className="h-4 w-4" />
                  <span className="font-semibold">Assistente FinBrasil</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 space-y-3 h-[72vh] overflow-auto pr-1">
                {messages.map((m, idx) => (
                  <Card
                    key={idx}
                    className={`border-white/10 bg-white/5 p-3 text-sm whitespace-pre-line ${m.role === "user" ? "ml-10" : "mr-10"}`}
                  >
                    <div className="text-white/90">{m.text}</div>
                  </Card>
                ))}
              </div>

              {pending && (
                <div className="mt-3 flex gap-2">
                  <Button onClick={confirm} className="flex-1 gap-2">
                    <Check className="h-4 w-4" /> Confirmar
                  </Button>
                  <Button onClick={cancel} variant="secondary" className="flex-1 gap-2">
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={draft && need ? "Responda aqui (ou 'cancelar')" : 'Ex: "47,90 mercado ontem"'}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
                <Button onClick={submit} className="gap-2">
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setText(s)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:text-white hover:bg-white/10 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}