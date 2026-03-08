import * as React from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Loader2, RefreshCw, Download, TrendingUp, TrendingDown,
  DollarSign, Target, PieChart as PieIcon, BarChart3, Sparkles,
  ArrowUpRight, ArrowDownRight, Wallet, CreditCard, Clock,
  CheckCircle2, AlertTriangle, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/types/expense";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const REPORT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/monthly-report`;

const PALETTE = [
  "hsl(160, 84%, 45%)",
  "hsl(217, 91%, 60%)",
  "hsl(30, 95%, 55%)",
  "hsl(270, 70%, 60%)",
  "hsl(190, 80%, 50%)",
  "hsl(0, 72%, 52%)",
  "hsl(45, 90%, 50%)",
  "hsl(330, 70%, 55%)",
];

interface MonthlyReportProps {
  financialData: Record<string, any>;
  className?: string;
}

/* ─── Micro-components ─── */

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-primary",
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
    >
      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className={cn("rounded-xl p-1.5 bg-muted/60")}>
            <Icon className={cn("h-4 w-4", color)} />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        </div>
        <div className={cn("text-xl font-bold tabular-nums", color)}>{value}</div>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </motion.div>
  );
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;
  const scoreColor =
    score >= 80 ? "hsl(160, 84%, 45%)" :
    score >= 60 ? "hsl(45, 90%, 50%)" :
    score >= 40 ? "hsl(30, 95%, 55%)" :
    "hsl(0, 72%, 52%)";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="6" opacity={0.3} />
        <motion.circle
          cx="50" cy="50" r="42" fill="none"
          stroke={scoreColor} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-black tabular-nums" style={{ color: scoreColor }}>{score}</span>
        <span className="text-[10px] font-bold text-muted-foreground">{grade}</span>
      </div>
    </div>
  );
}

function CategoryBar({
  name, amount, percent, color, index,
}: {
  name: string; amount: number; percent: number; color: string; index: number;
}) {
  return (
    <motion.div
      className="space-y-1"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
          <span className="truncate max-w-[140px]">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold tabular-nums">{formatCurrency(amount)}</span>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-md h-4">
            {percent}%
          </Badge>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percent, 100)}%` }}
          transition={{ delay: index * 0.06 + 0.2, duration: 0.5 }}
        />
      </div>
    </motion.div>
  );
}

/* ─── Main component ─── */

export function MonthlyReport({ financialData, className }: MonthlyReportProps) {
  const [aiReport, setAiReport] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [aiGenerated, setAiGenerated] = React.useState(false);
  const reportRef = React.useRef<HTMLDivElement>(null);

  // Extract data
  const {
    month = "",
    income = 0,
    totalExpenses = 0,
    balance = 0,
    budgetTotal = 0,
    budgetPercent = "0",
    finScore = 50,
    finGrade = "C",
    savingsRate = "0",
    avgDailySpend = "0",
    topCategories = [],
    prevMonthTotal = 0,
    expenseDelta = "0",
    totalPaid = 0,
    totalPlanned = 0,
    totalOverdue = 0,
  } = financialData;

  const delta = parseFloat(expenseDelta);
  const savings = parseFloat(savingsRate);
  const budgetPct = parseFloat(budgetPercent);
  const avgDaily = parseFloat(avgDailySpend);

  // Chart data
  const pieData = topCategories.map((c: any, i: number) => ({
    name: c.name,
    value: c.amount,
    fill: PALETTE[i % PALETTE.length],
  }));

  const statusData = [
    { name: "Pago", value: totalPaid, fill: "hsl(160, 84%, 45%)" },
    { name: "Planejado", value: totalPlanned, fill: "hsl(217, 91%, 60%)" },
    { name: "Atrasado", value: totalOverdue, fill: "hsl(0, 72%, 52%)" },
  ].filter(d => d.value > 0);

  // AI generation
  const generateAI = async () => {
    setIsLoading(true);
    setAiReport("");
    setAiGenerated(true);

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
              setAiReport(accumulated);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error("Report error:", e);
      toast.error("Erro ao gerar análise IA.");
    } finally {
      setIsLoading(false);
    }
  };

  // PDF export
  const exportPDF = async () => {
    if (!reportRef.current) return;
    toast.info("Gerando PDF...");
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      // Header
      pdf.setFillColor(16, 185, 129);
      pdf.rect(0, 0, pdfW, 14, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text(`FinBrasil — Relatório ${month}`, 10, 9);
      pdf.setFontSize(8);
      pdf.text(new Date().toLocaleDateString("pt-BR"), pdfW - 30, 9);

      const contentY = 18;
      const maxH = pdfH - contentY - 5;
      const imgH = (canvas.height * (pdfW - 10)) / canvas.width;

      if (imgH <= maxH) {
        pdf.addImage(imgData, "PNG", 5, contentY, pdfW - 10, imgH);
      } else {
        const ratio = canvas.width / (pdfW - 10);
        let srcY = 0;
        while (srcY < canvas.height) {
          const sliceH = Math.min(maxH * ratio, canvas.height - srcY);
          const tmp = document.createElement("canvas");
          tmp.width = canvas.width;
          tmp.height = sliceH;
          const ctx = tmp.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, tmp.width, tmp.height);
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const sliceData = tmp.toDataURL("image/png");
          const slicePdfH = (sliceH * (pdfW - 10)) / canvas.width;
          pdf.addImage(sliceData, "PNG", 5, srcY === 0 ? contentY : 5, pdfW - 10, slicePdfH);
          srcY += sliceH;
          if (srcY < canvas.height) pdf.addPage();
        }
      }

      pdf.save(`finbrasil-relatorio-${month || new Date().toISOString().slice(0, 7)}.pdf`);
      toast.success("PDF exportado!");
    } catch {
      toast.error("Erro ao exportar PDF.");
    }
  };

  const hasData = income > 0 || totalExpenses > 0;

  return (
    <Card className={cn(
      "relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm",
      className,
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary/10 p-2">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Relatório Financeiro</h3>
              <p className="text-[11px] text-muted-foreground font-normal">{month || "Mês atual"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              className="h-8 rounded-xl gap-1.5 text-xs"
              onClick={exportPDF}
              disabled={!hasData}
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-5" ref={reportRef}>
        {!hasData ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Sem dados suficientes para gerar o relatório.</p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="bg-muted/50 backdrop-blur rounded-2xl h-10 p-1 w-full grid grid-cols-3">
              <TabsTrigger value="overview" className="rounded-xl gap-1.5 text-[11px]">
                <BarChart3 className="h-3.5 w-3.5" /> Resumo
              </TabsTrigger>
              <TabsTrigger value="breakdown" className="rounded-xl gap-1.5 text-[11px]">
                <PieIcon className="h-3.5 w-3.5" /> Detalhamento
              </TabsTrigger>
              <TabsTrigger value="ai" className="rounded-xl gap-1.5 text-[11px]">
                <Sparkles className="h-3.5 w-3.5" /> IA Insights
              </TabsTrigger>
            </TabsList>

            {/* ─── OVERVIEW TAB ─── */}
            <TabsContent value="overview" className="space-y-4 mt-0">
              {/* KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                  icon={ArrowUpRight} label="Receita" value={formatCurrency(income)}
                  color="text-primary" delay={0}
                />
                <KpiCard
                  icon={ArrowDownRight} label="Gastos" value={formatCurrency(totalExpenses)}
                  sub={delta !== 0 ? `${delta > 0 ? "+" : ""}${delta}% vs mês anterior` : undefined}
                  color="text-destructive" delay={0.05}
                />
                <KpiCard
                  icon={Wallet} label="Saldo" value={formatCurrency(balance)}
                  color={balance >= 0 ? "text-primary" : "text-destructive"} delay={0.1}
                />
                <KpiCard
                  icon={DollarSign} label="Média/dia" value={formatCurrency(avgDaily)}
                  color="text-muted-foreground" delay={0.15}
                />
              </div>

              {/* Status + FinScore Row */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Status breakdown */}
                <motion.div
                  className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4 space-y-3"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold">Status dos Gastos</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { icon: CheckCircle2, label: "Pago", value: totalPaid, color: "text-primary" },
                      { icon: Clock, label: "Planejado", value: totalPlanned, color: "text-blue-500" },
                      { icon: AlertTriangle, label: "Atrasado", value: totalOverdue, color: "text-destructive" },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <s.icon className={cn("h-3.5 w-3.5", s.color)} />
                          <span className="text-xs">{s.label}</span>
                        </div>
                        <span className={cn("text-sm font-bold tabular-nums", s.color)}>
                          {formatCurrency(s.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* FinScore */}
                <motion.div
                  className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4 flex items-center gap-5"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <ScoreRing score={finScore} grade={finGrade} />
                  <div className="space-y-1.5 flex-1">
                    <div className="text-xs font-semibold">FinScore</div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {finScore >= 80 ? "Excelente saúde financeira! Continue assim." :
                       finScore >= 60 ? "Boa gestão financeira. Pequenos ajustes podem otimizar seus resultados." :
                       finScore >= 40 ? "Atenção: há espaço para melhorias significativas." :
                       "Alerta: seus gastos estão acima do ideal. Revise suas despesas."}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Zap className="h-3 w-3 text-primary" />
                      <span className="text-[10px] text-muted-foreground">
                        Taxa de economia: <strong className={savings >= 0 ? "text-primary" : "text-destructive"}>{savings}%</strong>
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Budget progress */}
              {budgetTotal > 0 && (
                <motion.div
                  className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold">Orçamento do Mês</span>
                    </div>
                    <Badge
                      variant={budgetPct > 100 ? "destructive" : budgetPct > 80 ? "outline" : "secondary"}
                      className="text-[10px] rounded-lg"
                    >
                      {budgetPct.toFixed(0)}% utilizado
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min(budgetPct, 100)}
                    className="h-2.5 rounded-full"
                  />
                  <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground">
                    <span>{formatCurrency(totalExpenses)} gastos</span>
                    <span>Limite: {formatCurrency(budgetTotal)}</span>
                  </div>
                </motion.div>
              )}
            </TabsContent>

            {/* ─── BREAKDOWN TAB ─── */}
            <TabsContent value="breakdown" className="space-y-4 mt-0">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Pie chart */}
                <motion.div
                  className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <PieIcon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Top Categorias</span>
                  </div>
                  {pieData.length > 0 ? (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%" cy="50%"
                            innerRadius={45} outerRadius={80}
                            paddingAngle={3}
                          >
                            {pieData.map((d: any, i: number) => (
                              <Cell key={i} fill={d.fill} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(v: number) => formatCurrency(v)}
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 12, fontSize: 11,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-8">Sem dados</p>
                  )}
                </motion.div>

                {/* Category ranking */}
                <motion.div
                  className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Ranking de Gastos</span>
                  </div>
                  <div className="space-y-3">
                    {topCategories.map((c: any, i: number) => (
                      <CategoryBar
                        key={c.name}
                        name={c.name}
                        amount={c.amount}
                        percent={parseFloat(c.pct)}
                        color={PALETTE[i % PALETTE.length]}
                        index={i}
                      />
                    ))}
                    {topCategories.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">Nenhum gasto registrado</p>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Status bar chart */}
              {statusData.length > 0 && (
                <motion.div
                  className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Gastos por Status</span>
                  </div>
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusData} layout="vertical" barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v: number) => formatCurrency(v)}
                        />
                        <YAxis
                          type="category" dataKey="name"
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          width={70}
                        />
                        <RechartsTooltip
                          formatter={(v: number) => formatCurrency(v)}
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: 12, fontSize: 11,
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                          {statusData.map((d, i) => (
                            <Cell key={i} fill={d.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </TabsContent>

            {/* ─── AI INSIGHTS TAB ─── */}
            <TabsContent value="ai" className="space-y-4 mt-0">
              {!aiGenerated ? (
                <motion.div
                  className="text-center py-10 space-y-4"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                >
                  <div className="relative inline-flex">
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                    <div className="relative rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-5">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1">Análise Inteligente</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Gere uma análise completa com recomendações personalizadas baseadas nos seus dados financeiros.
                    </p>
                  </div>
                  <Button
                    onClick={generateAI}
                    className="rounded-xl gap-2"
                    size="sm"
                  >
                    <Sparkles className="h-4 w-4" />
                    Gerar Análise com IA
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold">Insights da IA</span>
                    </div>
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 rounded-xl gap-1.5 text-[11px]"
                      onClick={generateAI}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Regerar
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[420px]">
                    <div className="rounded-2xl border border-border/40 bg-background/50 p-4 prose prose-sm dark:prose-invert max-w-none [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-xs [&>table]:text-[11px] [&_li]:text-xs [&_p]:text-xs">
                      <ReactMarkdown>{aiReport || "Gerando análise..."}</ReactMarkdown>
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
