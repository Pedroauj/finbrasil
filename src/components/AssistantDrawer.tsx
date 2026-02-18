import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Wand2, Check, X, BarChart3, TrendingUp, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { parseExpenseText } from "@/lib/expenseParser";
import { buildAddExpenseAction } from "@/lib/assistantActions";
import { format, getDaysInMonth } from "date-fns";
import { formatCurrency, Expense } from "@/types/expense";

type Props = {
    baseDate: Date; // data atual do app (store.currentDate)
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
    return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function isSameMonth(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function statusLabel(s: "paid" | "planned" | "overdue") {
    if (s === "paid") return "Pago";
    if (s === "planned") return "Previsto";
    return "Atrasado";
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
                "• “previsão do mês”",
        },
    ]);

    const [pending, setPending] = useState<null | ReturnType<typeof parseExpenseText>>(null);

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
        for (const e of monthExpenses) {
            map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
        }
        return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    }, [monthExpenses]);

    const forecast = useMemo(() => {
        const day = baseDate.getDate();
        const daysInMonth = getDaysInMonth(baseDate);

        // ritmo baseado no total do mês até agora
        const daily = day > 0 ? monthTotals.total / day : monthTotals.total;
        const projected = daily * daysInMonth;

        return { daily, projected, daysInMonth, day };
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

        const balanceLine =
            typeof monthBalance === "number" ? `Saldo do mês: ${formatCurrency(monthBalance)}` : "";

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
            `\nSe quiser, me manda um gasto por texto que eu lanço também.`;

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

        const lines = topCategories
            .map(([cat, amt], i) => `${i + 1}. ${cat} — ${formatCurrency(amt)}`)
            .join("\n");

        setMessages((m) => [
            ...m,
            {
                role: "assistant",
                text: `🏆 Top categorias em ${monthName}\n${lines}\n\nQuer que eu te diga onde dá pra cortar primeiro?`,
            },
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
                    extra +
                    `\n\nSe quiser, eu posso sugerir 1 meta prática pra semana.`,
            },
        ]);
    }

    function handleIntent(inputRaw: string): boolean {
        const t = normalize(inputRaw);

        // intents (analista)
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

    function submit() {
        const input = text.trim();
        if (!input) return;

        setMessages((m) => [...m, { role: "user", text: input }]);
        setText("");

        // 1) Tenta intents “analista”
        if (handleIntent(input)) return;

        // 2) Senão, tenta lançar como gasto
        const parsed = parseExpenseText(input, baseDate);
        const action = buildAddExpenseAction(parsed);

        if (action.type === "none") {
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

        setPending(parsed);
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
        setMessages((m) => [...m, { role: "assistant", text: "Fechado ✅ Lancei o gasto." }]);
    }

    function cancel() {
        setPending(null);
        setMessages((m) => [...m, { role: "assistant", text: "Beleza — não lancei." }]);
    }

    return (
        <>
            {/* Botão flutuante do assistente */}
            <motion.div
                className="fixed bottom-5 left-5 z-50"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Button
                    onClick={() => setOpen(true)}
                    className="h-12 rounded-full px-4 shadow-lg shadow-emerald-500/20"
                    variant="secondary"
                >
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
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setOpen(false)}
                                    className="text-white/70 hover:text-white"
                                >
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

                            <div className="mt-4 space-y-3 h-[62vh] overflow-auto pr-1">
                                {messages.map((m, idx) => (
                                    <Card
                                        key={idx}
                                        className={`border-white/10 bg-white/5 p-3 text-sm whitespace-pre-line ${m.role === "user" ? "ml-10" : "mr-10"
                                            }`}
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
                                    placeholder='Ex: "47,90 mercado ontem" ou "como estou esse mês?"'
                                    onKeyDown={(e) => e.key === "Enter" && submit()}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                                />
                                <Button onClick={submit} className="gap-2">
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* sugestões de gastos */}
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