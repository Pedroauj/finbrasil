import { MonthBalance } from "@/hooks/useExpenseStore";
import { formatCurrency } from "@/types/expense";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowDown,
  ArrowUp,
  Landmark,
  TrendingUp,
  TrendingDown,
  MinusCircle,
} from "lucide-react";

interface CashBalanceProps {
  balance: MonthBalance;
  className?: string;
}

export function CashBalance({ balance, className }: CashBalanceProps) {
  const isNegative = balance.balance < 0;
  const carryNegative = balance.carryOver < 0;

  const accentRing = isNegative ? "ring-destructive/20" : "ring-primary/15";
  const accentBar = isNegative ? "bg-destructive" : "bg-primary";

  const StatBox = ({
    label,
    value,
    icon,
    tone,
  }: {
    label: string;
    value: string;
    icon: React.ReactNode;
    tone?: "neutral" | "positive" | "negative";
  }) => {
    const wrap =
      tone === "negative"
        ? "bg-destructive/10 ring-destructive/15"
        : tone === "positive"
          ? "bg-primary/10 ring-primary/15"
          : "bg-muted/50 ring-border/60";

    const iconColor =
      tone === "negative"
        ? "text-destructive"
        : tone === "positive"
          ? "text-primary"
          : "text-foreground/80";

    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-3">
        <div className={`rounded-xl p-1.5 ring-1 ${wrap}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
          <p className="text-sm font-bold text-foreground">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <Card
      className={[
        "relative overflow-hidden",
        "ring-1",
        accentRing,
        className ?? "",
      ].join(" ")}
    >
      <div className={`h-1 w-full ${accentBar}`} />

      <CardContent className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div
            className={[
              "rounded-2xl p-3 ring-1",
              isNegative
                ? "bg-destructive/10 ring-destructive/15"
                : "bg-primary/10 ring-primary/15",
            ].join(" ")}
          >
            <Landmark className={["h-6 w-6", isNegative ? "text-destructive" : "text-primary"].join(" ")} />
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Caixa Total
            </p>
            <p
              className={[
                "mt-1 text-2xl font-bold tracking-tight",
                isNegative ? "text-destructive" : "text-foreground",
              ].join(" ")}
            >
              {formatCurrency(balance.balance)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatBox
            label="Saldo Inicial"
            value={formatCurrency(balance.carryOver)}
            tone={carryNegative ? "negative" : "positive"}
            icon={
              carryNegative ? (
                <MinusCircle className="h-4 w-4" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )
            }
          />

          <StatBox
            label="Receita"
            value={formatCurrency(balance.income)}
            tone="positive"
            icon={<ArrowUp className="h-4 w-4" />}
          />

          <StatBox
            label="Despesas"
            value={formatCurrency(balance.expenses)}
            tone="negative"
            icon={<ArrowDown className="h-4 w-4" />}
          />

          <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-3">
            <div
              className={[
                "rounded-xl p-1.5 ring-1",
                isNegative
                  ? "bg-destructive/10 ring-destructive/15"
                  : "bg-primary/10 ring-primary/15",
              ].join(" ")}
            >
              {isNegative ? (
                <TrendingDown className="h-4 w-4 text-destructive" />
              ) : (
                <TrendingUp className="h-4 w-4 text-primary" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Saldo Final</p>
              <p className={["text-sm font-bold", isNegative ? "text-destructive" : "text-foreground"].join(" ")}>
                {formatCurrency(balance.balance)}
              </p>
            </div>
          </div>
        </div>

        {balance.paidInvoices > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-3">
            <div className="rounded-xl p-1.5 ring-1 bg-muted/50 ring-border/60">
              <MinusCircle className="h-4 w-4 text-foreground/80" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Faturas Pagas</p>
              <p className="text-sm font-bold text-foreground">
                {formatCurrency(balance.paidInvoices)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}