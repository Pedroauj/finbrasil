import { useState } from "react";
import { Budget, DEFAULT_CATEGORIES, formatCurrency, getCategoryColor } from "@/types/expense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings2, DollarSign, PieChart, Save, TrendingUp } from "lucide-react";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/ui/animations";
import { motion, AnimatePresence } from "framer-motion";

interface BudgetSettingsProps {
  budget: Budget;
  customCategories: string[];
  onSave: (budget: Budget) => void;
}

export function BudgetSettings({ budget, customCategories, onSave }: BudgetSettingsProps) {
  const [total, setTotal] = useState(budget.total.toString());
  const [byCategory, setByCategory] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(budget.byCategory).map(([k, v]) => [k, v.toString()]))
  );
  const [showCategoryBudgets, setShowCategoryBudgets] = useState(Object.keys(budget.byCategory).length > 0);

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const totalNum = parseFloat(total) || 0;
  const categoryTotal = Object.values(byCategory).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const categoryPercent = totalNum > 0 && showCategoryBudgets ? Math.min((categoryTotal / totalNum) * 100, 100) : 0;

  const handleSave = () => {
    const catBudgets: Record<string, number> = {};
    if (showCategoryBudgets) {
      Object.entries(byCategory).forEach(([k, v]) => {
        const num = parseFloat(v);
        if (num > 0) catBudgets[k] = num;
      });
    }
    onSave({ total: parseFloat(total) || 0, byCategory: catBudgets });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <Card className="border-0 shadow-lg rounded-2xl card-hover">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Renda Mensal</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(totalNum)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Orçamento definido</p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="border-0 shadow-lg rounded-2xl card-hover">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Por Categoria</p>
                  <p className="text-2xl font-bold mt-1">{showCategoryBudgets ? formatCurrency(categoryTotal) : '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{showCategoryBudgets ? `${categoryPercent.toFixed(0)}% alocado` : 'Desativado'}</p>
                </div>
                <div className="rounded-2xl bg-accent/10 p-3">
                  <PieChart className="h-5 w-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="border-0 shadow-lg rounded-2xl card-hover">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Não Alocado</p>
                  <p className={`text-2xl font-bold mt-1 ${showCategoryBudgets && totalNum > 0 && categoryTotal > totalNum ? 'text-destructive' : 'text-[hsl(var(--success))]'}`}>
                    {showCategoryBudgets && totalNum > 0 ? formatCurrency(totalNum - categoryTotal) : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Disponível</p>
                </div>
                <div className="rounded-2xl bg-[hsl(var(--success))]/10 p-3">
                  <TrendingUp className="h-5 w-5 text-[hsl(var(--success))]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Settings Card */}
      <FadeIn delay={0.2}>
        <Card className="border-0 shadow-lg rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Configuração de Orçamento</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Defina sua renda mensal e, opcionalmente, limites por categoria.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="budget-total" className="text-base font-medium">Orçamento Mensal Total (R$)</Label>
              <Input
                id="budget-total"
                type="number"
                step="0.01"
                min="0"
                value={total}
                onChange={e => setTotal(e.target.value)}
                placeholder="Ex: 3000"
                className="text-lg rounded-xl"
              />
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-4">
              <Switch checked={showCategoryBudgets} onCheckedChange={setShowCategoryBudgets} />
              <div>
                <Label className="text-sm font-medium">Definir limites por categoria</Label>
                <p className="text-xs text-muted-foreground">Distribua o orçamento entre as categorias de gastos.</p>
              </div>
            </div>

            <AnimatePresence>
              {showCategoryBudgets && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 overflow-hidden"
                >
                  {totalNum > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{categoryPercent.toFixed(0)}% alocado ({formatCurrency(categoryTotal)})</span>
                        <span>{formatCurrency(totalNum)}</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                        <motion.div
                          className={`h-full rounded-full ${categoryTotal > totalNum ? 'bg-destructive' : 'bg-primary'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(categoryPercent, 100)}%` }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    {allCategories.map(cat => (
                      <div key={cat} className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3 transition-colors hover:bg-secondary/70">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(cat) }} />
                        <Label className="flex-1 text-sm">{cat}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={byCategory[cat] || ""}
                          onChange={e => setByCategory(prev => ({ ...prev, [cat]: e.target.value }))}
                          placeholder="R$"
                          className="w-28 text-sm rounded-xl"
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button onClick={handleSave} className="w-full sm:w-auto gap-2 rounded-xl">
              <Save className="h-4 w-4" />
              Salvar Orçamento
            </Button>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}