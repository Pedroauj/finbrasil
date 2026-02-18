import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Wand2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { parseExpenseText } from "@/lib/expenseParser";
import { buildAddExpenseAction } from "@/lib/assistantActions";
import { format } from "date-fns";
import { formatCurrency } from "@/types/expense";

type Props = {
    baseDate: Date;
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

export function AssistantDrawer({ baseDate, onAddExpense }: Props) {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const [messages, setMessages] = useState<Msg[]>([
        { role: "assistant", text: "Me fala um gasto tipo: “47,90 mercado ontem” que eu lanço pra você." },
    ]);

    const [pending, setPending] = useState<null | ReturnType<typeof parseExpenseText>>(null);

    const suggestions = useMemo(
        () => [
            "47,90 mercado ontem",
            "uber 32,50 hoje",
            "internet 119,90 dia 05 previsto",
            "farmácia 28,00 pago",
        ],
        []
    );

    function submit() {
        const input = text.trim();
        if (!input) return;

        setMessages((m) => [...m, { role: "user", text: input }]);
        setText("");

        const parsed = parseExpenseText(input, baseDate);
        const action = buildAddExpenseAction(parsed);

        if (action.type === "none") {
            setMessages((m) => [
                ...m,
                { role: "assistant", text: `Não consegui lançar. ${action.message} Me manda assim: "valor descrição data".` },
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
                    `• ${parsed.status === "paid" ? "Pago" : parsed.status === "planned" ? "Previsto" : "Atrasado"}\n` +
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
            <motion.div className="fixed bottom-5 left-5 z-50" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                <Button
                    onClick={() => setOpen(true)}
                    className="h-12 rounded-full px-4 shadow-lg shadow-emerald-500/20"
                    variant="secondary"
                >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Assistente
                </Button>
            </motion.div>

            {/* Drawer (lado direito) */}
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

                            <div className="mt-4 space-y-3 h-[72vh] overflow-auto pr-1">
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
                                    placeholder='Ex: "47,90 mercado ontem"'
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