import { useState } from "react";
import { Budget, DEFAULT_CATEGORIES, formatCurrency, getCategoryColor } from "@/types/expense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";

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
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Settings2 className="h-5 w-5" /> Configuração de Orçamento
        </CardTitle>
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
            className="text-lg"
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={showCategoryBudgets} onCheckedChange={setShowCategoryBudgets} />
          <Label>Definir limites por categoria</Label>
        </div>

        {showCategoryBudgets && (
          <div className="grid gap-3 sm:grid-cols-2">
            {allCategories.map(cat => (
              <div key={cat} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: getCategoryColor(cat) }} />
                <Label className="flex-1 text-sm">{cat}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={byCategory[cat] || ""}
                  onChange={e => setByCategory(prev => ({ ...prev, [cat]: e.target.value }))}
                  placeholder="R$"
                  className="w-28 text-sm"
                />
              </div>
            ))}
          </div>
        )}

        <Button onClick={handleSave} className="w-full sm:w-auto">Salvar Orçamento</Button>
      </CardContent>
    </Card>
  );
}
