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
        "border border-white/10 bg-white/5 backdrop-blur-xl",
        "shadow-2xl shadow-emerald-500/5",
        isNegative ? "ring-1 ring-destructive/25" : "ring-1 ring-emerald-400/15",
        className ?? "",
      ].join(" ")}
    >
      {/* barra superior */}
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
                : "bg-emerald-500/10 ring-emerald-400/20",
            ].join(" ")}
          >
            <Landmark
              className={[
                "h-6 w-6",
                isNegative ? "text-destructive" : "text-emerald-200",
              ].join(" ")}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
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
          {/* Saldo Inicial */}
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div
              className={[
                "rounded-xl p-1.5 ring-1",
                carryNegative
                  ? "bg-destructive/10 ring-destructive/20"
                  : "bg-emerald-500/10 ring-emerald-400/20",
              ].join(" ")}
            >
              {carryNegative ? (
                <MinusCircle className="h-4 w-4 text-destructive" />
              ) : (
                <TrendingUp className="h-4 w-4 text-emerald-200" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium text-white/60">Saldo Inicial</p>
              <p className={["text-sm font-bold", carryNegative ? "text-destructive" : "text-white/90"].join(" ")}>
                {formatCurrency(balance.carryOver)}
              </p>
            </div>
          </div>

          {/* Receita */}
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="rounded-xl p-1.5 ring-1 bg-emerald-500/10 ring-emerald-400/20">
              <ArrowUp className="h-4 w-4 text-emerald-200" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-white/60">Receita</p>
              <p className="text-sm font-bold text-white/90">
                {formatCurrency(balance.income)}
              </p>
            </div>
          </div>

          {/* Despesas */}
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="rounded-xl p-1.5 ring-1 bg-destructive/10 ring-destructive/20">
              <ArrowDown className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-white/60">Despesas</p>
              <p className="text-sm font-bold text-white/90">
                {formatCurrency(balance.expenses)}
              </p>
            </div>
          </div>

          {/* Saldo Final */}
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div
              className={[
                "rounded-xl p-1.5 ring-1",
                accent === "destructive"
                  ? "bg-destructive/10 ring-destructive/20"
                  : "bg-emerald-500/10 ring-emerald-400/20",
              ].join(" ")}
            >
              {isNegative ? (
                <TrendingDown className="h-4 w-4 text-destructive" />
              ) : (
                <TrendingUp className="h-4 w-4 text-emerald-200" />
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium text-white/60">Saldo Final</p>
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
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="rounded-xl p-1.5 ring-1 bg-destructive/10 ring-destructive/20">
              <MinusCircle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-white/60">Faturas Pagas</p>
              <p className="text-sm font-bold text-white/90">
                {formatCurrency(balance.paidInvoices)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}