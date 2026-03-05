import * as React from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const REPORT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/monthly-report`;

interface MonthlyReportProps {
  financialData: Record<string, any>;
  className?: string;
}

export function MonthlyReport({ financialData, className }: MonthlyReportProps) {
  const [report, setReport] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [generated, setGenerated] = React.useState(false);

  const generate = async () => {
    setIsLoading(true);
    setReport("");
    setGenerated(true);

    try {
      const resp = await fetch(REPORT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ financialData }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        toast.error(err.error || `Erro ${resp.status}`);
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let accumulated = "";

      while (true) {
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
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setReport(accumulated);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error("Report error:", e);
      toast.error("Erro ao gerar relatório.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={cn("relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Relatório Financeiro Mensal
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-xl gap-1.5"
            onClick={generate}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : generated ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            {isLoading ? "Gerando..." : generated ? "Regerar" : "Gerar relatório"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5">
        {!generated ? (
          <div className="text-center py-8">
            <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Gere um relatório completo com análises e recomendações personalizadas.
            </p>
            <p className="text-xs text-muted-foreground">
              Powered by IA • Disponível para planos Pro e Ultra
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="prose prose-sm dark:prose-invert max-w-none [&>h1]:text-lg [&>h2]:text-base [&>h3]:text-sm [&>table]:text-xs">
              <ReactMarkdown>{report || "Gerando relatório..."}</ReactMarkdown>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
