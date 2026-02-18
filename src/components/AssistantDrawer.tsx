import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Wand2,
  Check,
  X,
  BarChart3,
  TrendingUp,
  ListOrdered,
  Pencil,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { parseExpenseText } from "@/lib/expenseParser";
import { buildAddExpenseAction } from "@/lib/assistantActions";
import { format, getDaysInMonth } from "date-fns";
import { formatCurrency, Expense } from "@/types/expense";

type Props = {
  baseDate: Date;
  expenses: Expense[];
  budget?: number;
  monthBalance?: number;
  onAddExpense: (expense: {
    date: string;
    description: string;
    category: string;
    amount: number;
    status: "paid" | "planned" | "overdue";
  }) => void;
};

type Msg =
  | { role: "assistant"; text: string }
  | { role: "user"; text: string };

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos (compatível com targets antigos)
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function statusLabel(s: "paid" | "planned" | "overdue") {
  if (s === "paid") return "Pago";
  if (s === "planned") return "Previsto";
  return "Atrasado";
}

function parseOnlyAmount(text: string): number | null {
  const t = text.trim();
  const m = t.match(/(?:r\$?\s*)?(\d{1,3}(?:[.\s]\d{3})*|\d+)([.,]\d{1,2})?\b/i);
  if (!m) return null;
  const intPart = m[1].replace(/[.\s]/g, "");
  const decPart = (m[2] ?? "").replace(",", ".");
  const num = Number(`${intPart}${decPart}`);
  return Number.isFinite(num) ? num : null;
}

export function AssistantDrawer({ baseDate, expenses, budget, monthBalance, onAddExpense }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text:
        "Fala comigo 👇\n" +
        "• “47,90 mercado ontem” (eu lanço)\n" +
        "• “como estou esse mês?”\n" +
        "• “top categorias”\n" +
        "• “previsão do mês”\n\n" +
        "Dica: se eu perguntar algo, pode responder só com o valor (ex: “32,90”).",
    },
  ]);

  const [pending, setPending] = useState<null | ReturnType<typeof parseExpenseText>>(null);

  const [draft, setDraft] = useState<null | ReturnType<typeof parseExpenseText>>(null);
  const [draftNeeds, setDraftNeeds] = useState<Array<"amount" | "description">>([]);

  // ✏️ modo edição do pending
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<null | {
    date: string;
    description: string;
    category: string;
    amount: string; // mantém string pra digitação
    status: "paid" | "planned" | "overdue";
  }>(null);

  const monthExpenses = useMemo(() => {
    return expenses.filter((e) => isSameMonth(new Date(e.date), baseDate));
  }, [expenses, baseDate]);

  const monthTotals = useMemo(() => {
    const total = monthExpenses.reduce((s, e) => s + e.amount, 0);
    const paid = monthExpenses.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount, 0);
    const planned = monthExpenses.filter((e) => e.status === "planned").reduce((s, e) => s + e.amount, 0);
    const overdue = monthExpenses.filter((e) => e.status === "overdue").reduce((s, e) => s + e.amount, 0);
    const overdueCount = monthExpenses.filter((e) => e.status === "overdue").length;

    return { total, paid, planned, overdue, overdueCount, count: monthExpenses.length };
  }, [monthExpenses]);

  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of monthExpenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [monthExpenses]);

  const forecast = useMemo(() => {
    const day = baseDate.getDate();
    const dim = getDaysInMonth(baseDate);
    const daily = day > 0 ? monthTotals.total / day : monthTotals.total;
    const projected = daily * dim;
    return { daily, projected, dim, day };
  }, [baseDate, monthTotals.total]);

  const quickSuggestions = useMemo(
    () => [
      { label: "Como estou esse mês?", icon: <BarChart3 className="h-3.5 w-3.5" />, value: "como estou esse mês" },
      { label: "Top categorias", icon: <ListOrdered className="h-3.5 w-3.5" />, value: "top categorias" },
      { label: "Previsão do mês", icon: <TrendingUp className="h-3.5 w-3.5" />, value: "previsão do mês" },
    ],
    []
  );

  const expenseExamples = useMemo(
    () => ["47,90 mercado ontem", "uber 32,50 hoje", "internet 119,90 dia 05 previsto", "farmácia 28,00 pago"],
    []
  );

  function replyHowAmI() {
    const monthName = format(baseDate, "MMMM/yyyy");
    const budgetLine =
      typeof budget === "number"
        ? `Orçamento: ${formatCurrency(budget)} (${budget > 0 ? Math.round((monthTotals.total / budget) * 100) : 0}% usado)`
        : "Orçamento: (não definido)";

    const balanceLine = typeof monthBalance === "number" ? `Saldo do mês: ${formatCurrency(monthBalance)}` : "";

    const overdueLine =
      monthTotals.overdueCount > 0
        ? `⚠️ Atrasados: ${monthTotals.overdueCount} (${formatCurrency(monthTotals.overdue)})`
        : `✅ Atrasados: 0`;

    const text =
      `📌 Resumo de ${monthName}\n` +
      `• Total: ${formatCurrency(monthTotals.total)} (${monthTotals.count} lançamentos)\n` +
      `• Pagos: ${formatCurrency(monthTotals.paid)}\n` +
      `• Previstos: ${formatCurrency(monthTotals.planned)}\n` +
      `${overdueLine}\n` +
      `${budgetLine}\n` +
      (balanceLine ? `${balanceLine}\n` : "") +
      `\nMe manda um gasto por texto que eu lanço.`;

    setMessages((m) => [...m, { role: "assistant", text }]);
  }

  function replyTopCategories() {
    const monthName = format(baseDate, "MMMM/yyyy");
    if (topCategories.length === 0) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `Ainda não tem gastos em ${monthName}. Me manda um tipo “47,90 mercado ontem”.` },
      ]);
      return;
    }

    const lines = topCategories.map(([cat, amt], i) => `${i + 1}. ${cat} — ${formatCurrency(amt)}`).join("\n");

    setMessages((m) => [
      ...m,
      { role: "assistant", text: `🏆 Top categorias em ${monthName}\n${lines}\n\nQuer que eu te sugira 1 meta pra semana?` },
    ]);
  }

  function replyForecast() {
    const monthName = format(baseDate, "MMMM/yyyy");
    const projected = forecast.projected;

    let extra = "";
    if (typeof budget === "number" && budget > 0) {
      const diff = projected - budget;
      if (diff > 0) extra = `\n⚠️ No ritmo atual, você pode passar do orçamento em ~${formatCurrency(diff)}.`;
      else extra = `\n✅ No ritmo atual, você tende a ficar ~${formatCurrency(Math.abs(diff))} abaixo do orçamento.`;
    }

    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        text:
          `🔮 Previsão de ${monthName}\n` +
          `• Ritmo médio: ${formatCurrency(forecast.daily)} por dia\n` +
          `• Projeção do mês: ${formatCurrency(projected)}\n` +
          extra,
      },
    ]);
  }

  function handleIntent(inputRaw: string): boolean {
    const t = normalize(inputRaw);

    if (t.includes("como estou") || t.includes("resumo") || t.includes("status do mes") || t.includes("status do mês")) {
      replyHowAmI();
      return true;
    }

    if (t.includes("top categorias") || t.includes("maior categoria") || t.includes("mais gastei") || t.includes("ranking")) {
      replyTopCategories();
      return true;
    }

    if (t.includes("previsao") || t.includes("previsão") || t.includes("projecao") || t.includes("projeção") || t.includes("ate o fim")) {
      replyForecast();
      return true;
    }

    return false;
  }

  function showConfirm(parsed: ReturnType<typeof parseExpenseText>) {
    setPending(parsed);
    setEditOpen(false);
    setEditData(null);

    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        text:
          `Entendi isso aqui 👇\n` +
          `• ${parsed.description}\n` +
          `• ${formatCurrency(parsed.amount)}\n` +
          `• ${parsed.category}\n` +
          `• ${statusLabel(parsed.status)}\n` +
          `• ${format(new Date(parsed.date), "dd/MM/yyyy")}\n\n` +
          `Confirmar?`,
      },
    ]);
  }

  function askForMissing(parsed: ReturnType<typeof parseExpenseText>) {
    const missing = (parsed.missing ?? []).filter((k) => k === "amount" || k === "description") as Array<
      "amount" | "description"
    >;

    if (missing.length === 0) return false;

    setDraft(parsed);
    setDraftNeeds(missing);

    if (missing.includes("amount")) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            `Quase lá 😄 Só faltou o **valor**.\n` +
            `Me diz quanto foi (ex: “32,90”).\n` +
            `Se quiser desistir: digita “cancelar”.`,
        },
      ]);
    } else if (missing.includes("description")) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            `Só faltou a **descrição**.\n` +
            `Me fala o que foi (ex: “mercado”, “uber”).\n` +
            `Se quiser desistir: digita “cancelar”.`,
        },
      ]);
    }

    return true;
  }

  function tryFillDraft(userText: string): boolean {
    if (!draft || draftNeeds.length === 0) return false;

    const t = normalize(userText);
    if (t === "cancelar" || t === "cancela" || t === "cancel") {
      setDraft(null);
      setDraftNeeds([]);
      setMessages((m) => [...m, { role: "assistant", text: "Beleza — cancelei esse lançamento." }]);
      return true;
    }

    if (draftNeeds.includes("amount")) {
      const amt = parseOnlyAmount(userText);
      if (amt == null) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: "Não peguei o valor. Me manda assim: “32,90” (ou “R$ 32,90”)." },
        ]);
        return true;
      }

      const updated = { ...draft, amount: amt, missing: (draft.missing ?? []).filter((x) => x !== "amount") };
      setDraft(updated);
      setDraftNeeds((prev) => prev.filter((x) => x !== "amount"));

      if ((updated.missing ?? []).length) {
        askForMissing(updated);
      } else {
        setDraft(null);
        setDraftNeeds([]);
        showConfirm(updated);
      }
      return true;
    }

    if (draftNeeds.includes("description")) {
      const desc = userText.trim();
      if (desc.length < 2) {
        setMessages((m) => [
          ...m,
          { role: "assistant", text: "Me fala uma descrição curtinha tipo “mercado”, “uber”, “internet”…" },
        ]);
        return true;
      }

      const updated = { ...draft, description: desc, missing: (draft.missing ?? []).filter((x) => x !== "description") };
      setDraft(updated);
      setDraftNeeds((prev) => prev.filter((x) => x !== "description"));

      if ((updated.missing ?? []).length) {
        askForMissing(updated);
      } else {
        setDraft(null);
        setDraftNeeds([]);
        showConfirm(updated);
      }
      return true;
    }

    return false;
  }

  function openEdit() {
    if (!pending) return;
    setEditOpen(true);
    setEditData({
      date: pending.date,
      description: pending.description,
      category: pending.category,
      amount: String(pending.amount).replace(".", ","),
      status: pending.status,
    });
  }

  function saveEdit() {
    if (!pending || !editData) return;

    const amt = parseOnlyAmount(editData.amount);
    if (amt == null || amt <= 0) {
      setMessages((m) => [...m, { role: "assistant", text: "Valor inválido. Ex: 32,90" }]);
      return;
    }

    const desc = editData.description.trim();
    const cat = editData.category.trim();

    if (desc.length < 2) {
      setMessages((m) => [...m, { role: "assistant", text: "Descrição muito curta. Ex: Mercado / Uber / Internet" }]);
      return;
    }
    if (cat.length < 2) {
      setMessages((m) => [...m, { role: "assistant", text: "Categoria muito curta. Ex: Alimentação / Transporte" }]);
      return;
    }

    const updated = {
      ...pending,
      date: editData.date,
      description: desc,
      category: cat,
      amount: amt,
      status: editData.status,
      missing: [],
      confidence: pending.confidence ?? 0.8,
    };

    setPending(updated);
    setEditOpen(false);

    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        text:
          `Atualizei ✅\n` +
          `• ${updated.description}\n` +
          `• ${formatCurrency(updated.amount)}\n` +
          `• ${updated.category}\n` +
          `• ${statusLabel(updated.status)}\n` +
          `• ${format(new Date(updated.date), "dd/MM/yyyy")}\n\n` +
          `Confirmar?`,
      },
    ]);
  }

  function submit() {
    const input = text.trim();
    if (!input) return;

    setMessages((m) => [...m, { role: "user", text: input }]);
    setText("");

    if (tryFillDraft(input)) return;

    if (handleIntent(input)) return;

    const parsed = parseExpenseText(input, baseDate);
    const action = buildAddExpenseAction(parsed);

    if (action.type === "none") {
      const didAsk = askForMissing(parsed);
      if (didAsk) return;

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text:
            `Não consegui lançar. ${action.message}\n` +
            `Me manda assim: “valor descrição data (opcional)”. Ex: “47,90 mercado ontem”.`,
        },
      ]);
      return;
    }

    showConfirm(parsed);
  }

  function confirm() {
    if (!pending) return;
    onAddExpense({
      date: pending.date,
      description: pending.description,
      category: pending.category,
      amount: pending.amount,
      status: pending.status,
    });
    setPending(null);
    setEditOpen(false);
    setEditData(null);
    setMessages((m) => [...m, { role: "assistant", text: "Fechado ✅ Lancei o gasto." }]);
  }

  function cancel() {
    setPending(null);
    setEditOpen(false);
    setEditData(null);
    setMessages((m) => [...m, { role: "assistant", text: "Beleza — não lancei." }]);
  }

  return (
    <>
      {/* Botão flutuante do assistente */}
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
            <motion.div
              className="fixed inset-0 z-50 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

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

              {/* Chips inteligentes */}
              <div className="mt-3 flex flex-wrap gap-2">
                {quickSuggestions.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => {
                      setMessages((m) => [...m, { role: "user", text: s.label }]);
                      handleIntent(s.value);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 transition"
                  >
                    {s.icon}
                    {s.label}
                  </button>
                ))}
              </div>

              {/* ✏️ Editor do pending */}
              {pending && editOpen && editData && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-white/90">Editar antes de confirmar</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditOpen(false);
                        setEditData(null);
                      }}
                      className="h-8 w-8 text-white/70 hover:text-white"
                      title="Fechar edição"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <Input
                      value={editData.description}
                      onChange={(e) => setEditData((p) => (p ? { ...p, description: e.target.value } : p))}
                      placeholder="Descrição"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={editData.amount}
                        onChange={(e) => setEditData((p) => (p ? { ...p, amount: e.target.value } : p))}
                        placeholder="Valor (ex: 32,90)"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                      />
                      <Input
                        value={editData.category}
                        onChange={(e) => setEditData((p) => (p ? { ...p, category: e.target.value } : p))}
                        placeholder="Categoria"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={editData.date}
                        onChange={(e) => setEditData((p) => (p ? { ...p, date: e.target.value } : p))}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                      />

                      <div className="flex gap-1">
                        {(["paid", "planned", "overdue"] as const).map((s) => {
                          const active = editData.status === s;
                          return (
                            <button
                              key={s}
                              onClick={() => setEditData((p) => (p ? { ...p, status: s } : p))}
                              className={
                                "flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition " +
                                (active
                                  ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
                                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white")
                              }
                            >
                              {statusLabel(s)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-1 flex gap-2">
                      <Button onClick={saveEdit} className="flex-1 gap-2">
                        <Save className="h-4 w-4" /> Salvar
                      </Button>
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => {
                          setEditOpen(false);
                          setEditData(null);
                        }}
                      >
                        Voltar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-3 h-[56vh] overflow-auto pr-1">
                {messages.map((m, idx) => (
                  <Card
                    key={idx}
                    className={`border-white/10 bg-white/5 p-3 text-sm whitespace-pre-line ${
                      m.role === "user" ? "ml-10" : "mr-10"
                    }`}
                  >
                    <div className="text-white/90">{m.text}</div>
                  </Card>
                ))}
              </div>

              {pending && !editOpen && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button onClick={confirm} className="gap-2">
                    <Check className="h-4 w-4" /> Confirmar
                  </Button>
                  <Button onClick={openEdit} variant="secondary" className="gap-2">
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button onClick={cancel} variant="secondary" className="gap-2">
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={draft ? "Responda aqui (ex: 32,90) ou 'cancelar'" : 'Ex: "47,90 mercado ontem" ou "como estou esse mês?"'}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
                <Button onClick={submit} className="gap-2">
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {expenseExamples.map((s) => (
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