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
        }, 300);
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-[92vw] sm:w-[420px] p-0">
                <div className="flex h-full flex-col">
                    <SheetHeader className="p-4 border-b">
                        <SheetTitle className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            Assistente FinBrasil
                        </SheetTitle>
                    </SheetHeader>

                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                            {messages.map((m, idx) => (
                                <div
                                    key={idx}
                                    className={[
                                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                                        m.role === "user"
                                            ? "ml-auto bg-primary text-primary-foreground"
                                            : "bg-muted text-foreground",
                                    ].join(" ")}
                                >
                                    {m.text}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    <div className="p-4 border-t">
                        <div className="flex items-center gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Digite sua pergunta…"
                                onKeyDown={(e) => e.key === "Enter" && send()}
                            />
                            <Button size="icon" onClick={send} aria-label="Enviar">
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Ex.: “quanto eu gastei esse mês?”, “quanto falta na fatura?”, “onde cortar gastos?”
                        </p>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}