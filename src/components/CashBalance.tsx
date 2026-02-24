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

  const accent = isNegative ? "destructive" : "success";

  return (
    <Card
      className={[
        "relative overflow-hidden rounded-3xl",
        "border border-border/50 bg-card/80 backdrop-blur-xl",
        "shadow-2xl shadow-primary/5",
        isNegative ? "ring-1 ring-destructive/25" : "ring-1 ring-primary/15",
        className ?? "",
      ].join(" ")}
    >
      <div
        className={[
          "h-1 w-full",
          isNegative ? "bg-destructive" : "bg-[hsl(var(--success))]",
        ].join(" ")}
      />

      <CardContent className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div
            className={[
              "rounded-2xl p-3 ring-1",
              isNegative
                ? "bg-destructive/10 ring-destructive/20"
                : "bg-[hsl(var(--success))]/10 ring-[hsl(var(--success))]/20",
            ].join(" ")}
          >
            <Landmark
              className={[
                "h-6 w-6",
                isNegative ? "text-destructive" : "text-[hsl(var(--success))]",
              ].join(" ")}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Caixa Total
            </p>
            <p
              className={[
                "mt-1 text-2xl font-bold tracking-tight",
                isNegative ? "text-destructive" : "text-[hsl(var(--success))]",
              ].join(" ")}
            >
              {formatCurrency(balance.balance)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/30 p-3">
            <div
              className={[
                "rounded-xl p-1.5 ring-1",
                carryNegative
                  ? "bg-destructive/10 ring-destructive/20"
                  : "bg-[hsl(var(--success))]/10 ring-[hsl(var(--success))]/20",
              ].join(" ")}
            >
              {carryNegative ? (
                <MinusCircle className="h-4 w-4 text-destructive" />
              ) : (
                <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Saldo Inicial</p>
              <p className={["text-sm font-bold", carryNegative ? "text-destructive" : "text-foreground/90"].join(" ")}>
                {formatCurrency(balance.carryOver)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/30 p-3">
            <div className="rounded-xl p-1.5 ring-1 bg-[hsl(var(--success))]/10 ring-[hsl(var(--success))]/20">
              <ArrowUp className="h-4 w-4 text-[hsl(var(--success))]" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Receita</p>
              <p className="text-sm font-bold text-foreground/90">
                {formatCurrency(balance.income)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/30 p-3">
            <div className="rounded-xl p-1.5 ring-1 bg-destructive/10 ring-destructive/20">
              <ArrowDown className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Despesas</p>
              <p className="text-sm font-bold text-foreground/90">
                {formatCurrency(balance.expenses)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/30 p-3">
            <div
              className={[
                "rounded-xl p-1.5 ring-1",
                accent === "destructive"
                  ? "bg-destructive/10 ring-destructive/20"
                  : "bg-[hsl(var(--success))]/10 ring-[hsl(var(--success))]/20",
              ].join(" ")}
            >
              {isNegative ? (
                <TrendingDown className="h-4 w-4 text-destructive" />
              ) : (
                <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Saldo Final</p>
              <p
                className={[
                  "text-sm font-bold",
                  isNegative ? "text-destructive" : "text-[hsl(var(--success))]",
                ].join(" ")}
              >
                {formatCurrency(balance.balance)}
              </p>
            </div>
          </div>
        </div>

        {balance.paidInvoices > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/30 p-3">
            <div className="rounded-xl p-1.5 ring-1 bg-destructive/10 ring-destructive/20">
              <MinusCircle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Faturas Pagas</p>
              <p className="text-sm font-bold text-foreground/90">
                {formatCurrency(balance.paidInvoices)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
