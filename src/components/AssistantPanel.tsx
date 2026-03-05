import * as React from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-chat`;

interface AssistantPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  financialContext?: Record<string, any>;
}

export function AssistantPanel({ open, onOpenChange, financialContext }: AssistantPanelProps) {
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<Msg[]>([
    {
      role: "assistant",
      content: "Oi! 👋 Eu sou o assistente financeiro do FinBrasil. Posso analisar seus gastos, dar dicas de economia e responder perguntas sobre suas finanças. Como posso ajudar?",
    },
  ]);
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > 1 && prev[prev.length - 2]?.role === "user" && prev[prev.length - 2]?.content === text) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const allMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          context: financialContext,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        toast.error(err.error || `Erro ${resp.status}`);
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      toast.error("Erro ao conectar com o assistente.");
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "Quanto eu gastei esse mês?",
    "Onde posso economizar?",
    "Como melhorar meu FinScore?",
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[92vw] sm:w-[480px] p-0">
        <div className="flex h-full flex-col">
          <SheetHeader className="p-4">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
                  <Bot className="h-5 w-5 text-primary" />
                </span>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">Assistente FinBrasil</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Powered by IA
                  </div>
                </div>
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="h-px w-full bg-[hsl(var(--border)/0.25)]" />

          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-3">
              {messages.map((m, idx) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={idx}
                    className={[
                      "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      "shadow-sm",
                      isUser
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-card/70 text-foreground border border-border/50",
                    ].join(" ")}
                  >
                    {isUser ? (
                      m.content
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Pensando...
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggestions (only show when few messages) */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); }}
                    className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-card/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 pb-4 pt-2">
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-2 shadow-sm">
              <div className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte sobre suas finanças…"
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isLoading}
                />
                <Button
                  size="icon"
                  onClick={send}
                  aria-label="Enviar"
                  className="rounded-xl"
                  disabled={isLoading || !input.trim()}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
