import * as React from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send } from "lucide-react";

type Msg = { role: "user" | "assistant"; text: string };

export function AssistantPanel({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
}) {
    const [input, setInput] = React.useState("");
    const [messages, setMessages] = React.useState<Msg[]>([
        {
            role: "assistant",
            text: "Oi! Eu sou o assistente do FinBrasil. Quer revisar gastos, metas ou faturas?",
        },
    ]);

    function send() {
        const text = input.trim();
        if (!text) return;

        setMessages((prev) => [...prev, { role: "user", text }]);
        setInput("");

        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    text:
                        "Perfeito. Por enquanto eu tô em modo demo 😄 Me diga qual tela/aba você quer que eu ajude primeiro (Dashboard, Gastos, Cartões, Contas).",
                },
            ]);
        }, 250);
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-[92vw] sm:w-[440px] p-0"
            >
                <div className="flex h-full flex-col">
                    {/* Header sem linha dura */}
                    <SheetHeader className="p-4">
                        <div className="flex items-center justify-between gap-3">
                            <SheetTitle className="flex items-center gap-2">
                                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
                                    <Bot className="h-5 w-5 text-primary" />
                                </span>
                                <div className="leading-tight">
                                    <div className="text-sm font-semibold">Assistente FinBrasil</div>
                                    <div className="text-xs text-muted-foreground">Dicas e análises rápidas</div>
                                </div>
                            </SheetTitle>
                        </div>
                    </SheetHeader>

                    {/* Hairline shadow sutil (não é “linha branca”) */}
                    <div className="h-px w-full bg-[hsl(var(--border)/0.25)]" />

                    {/* Chat */}
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                            {messages.map((m, idx) => {
                                const isUser = m.role === "user";
                                return (
                                    <div
                                        key={idx}
                                        className={[
                                            "max-w-[86%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                                            "shadow-sm",
                                            isUser
                                                ? "ml-auto bg-primary text-primary-foreground"
                                                : "bg-card/70 text-foreground border border-border/50",
                                        ].join(" ")}
                                    >
                                        {m.text}
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>

                    {/* Input area (sem border-t duro) */}
                    <div className="px-4 pb-4 pt-3">
                        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-2 shadow-sm">
                            <div className="flex items-center gap-2">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Digite sua pergunta…"
                                    onKeyDown={(e) => e.key === "Enter" && send()}
                                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                                />
                                <Button
                                    size="icon"
                                    onClick={send}
                                    aria-label="Enviar"
                                    className="rounded-xl"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>

                            <p className="mt-2 px-1 text-xs text-muted-foreground">
                                Ex.: “quanto eu gastei esse mês?”, “quanto falta na fatura?”, “onde cortar gastos?”
                            </p>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}