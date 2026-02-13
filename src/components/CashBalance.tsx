import { MonthBalance } from "@/hooks/useExpenseStore";
import { formatCurrency } from "@/types/expense";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Landmark, TrendingUp, TrendingDown, MinusCircle } from "lucide-react";

interface CashBalanceProps {
  balance: MonthBalance;
}

export function CashBalance({ balance }: CashBalanceProps) {
  const isNegative = balance.balance < 0;
  const carryNegative = balance.carryOver < 0;

  return (
    <Card className={`border-0 shadow-lg overflow-hidden ${isNegative ? "ring-2 ring-destructive/30" : "ring-2 ring-[hsl(var(--success))]/20"}`}>
      <div className={`h-1.5 w-full ${isNegative ? "bg-destructive" : "bg-[hsl(var(--success))]"}`} />
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className={`rounded-xl p-3 ${isNegative ? "bg-destructive/10" : "bg-[hsl(var(--success))]/10"}`}>
            <Landmark className={`h-6 w-6 ${isNegative ? "text-destructive" : "text-[hsl(var(--success))]"}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Caixa Total</p>
            <p className={`text-2xl font-bold tracking-tight ${isNegative ? "text-destructive" : "text-[hsl(var(--success))]"}`}>
              {formatCurrency(balance.balance)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <div className={`rounded-md p-1.5 ${carryNegative ? "bg-destructive/10" : "bg-primary/10"}`}>
              {carryNegative ? <MinusCircle className="h-4 w-4 text-destructive" /> : <TrendingUp className="h-4 w-4 text-primary" />}
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Saldo Inicial</p>
              <p className={`text-sm font-bold ${carryNegative ? "text-destructive" : ""}`}>
                {formatCurrency(balance.carryOver)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <div className="rounded-md p-1.5 bg-[hsl(var(--success))]/10">
              <ArrowUp className="h-4 w-4 text-[hsl(var(--success))]" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Receita</p>
              <p className="text-sm font-bold">{formatCurrency(balance.income)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <div className="rounded-md p-1.5 bg-destructive/10">
              <ArrowDown className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Despesas</p>
              <p className="text-sm font-bold">{formatCurrency(balance.expenses)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <div className={`rounded-md p-1.5 ${isNegative ? "bg-destructive/10" : "bg-[hsl(var(--success))]/10"}`}>
              {isNegative ? <TrendingDown className="h-4 w-4 text-destructive" /> : <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />}
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Saldo Final</p>
              <p className={`text-sm font-bold ${isNegative ? "text-destructive" : "text-[hsl(var(--success))]"}`}>
                {formatCurrency(balance.balance)}
              </p>
            </div>
          </div>
        </div>

        {balance.paidInvoices > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <div className="rounded-md p-1.5 bg-destructive/10">
              <MinusCircle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Faturas Pagas</p>
              <p className="text-sm font-bold">{formatCurrency(balance.paidInvoices)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
