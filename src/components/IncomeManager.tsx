import { useState } from "react";
import { Salary, ExtraIncome, Budget, formatCurrency, INCOME_CATEGORIES, DEFAULT_CATEGORIES, getCategoryColor } from "@/types/expense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Landmark, PlusCircle, TrendingUp, DollarSign, Pencil, Trash2, Save, CalendarDays, Briefcase, Settings2 } from "lucide-react";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/ui/animations";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface IncomeManagerProps {
  salary: Salary | null;
  extraIncomes: ExtraIncome[];
  budget: Budget;
  customCategories: string[];
  currentDate: Date;
  onSaveSalary: (amount: number, dayOfReceipt: number, autoRepeat: boolean) => void;
  onDeleteSalary: () => void;
  onAddExtraIncome: (income: Omit<ExtraIncome, "id">) => void;
  onUpdateExtraIncome: (id: string, updates: Partial<Omit<ExtraIncome, "id">>) => void;
  onDeleteExtraIncome: (id: string) => void;
  onSaveBudget: (budget: Budget) => void;
}

export function IncomeManager({
  salary, extraIncomes, budget, customCategories, currentDate,
  onSaveSalary, onDeleteSalary, onAddExtraIncome, onUpdateExtraIncome, onDeleteExtraIncome, onSaveBudget,
}: IncomeManagerProps) {
  // Salary form
  const [salaryAmount, setSalaryAmount] = useState(salary?.amount?.toString() || "");
  const [salaryDay, setSalaryDay] = useState(salary?.dayOfReceipt?.toString() || "5");
  const [autoRepeat, setAutoRepeat] = useState(salary?.autoRepeat ?? true);
  const [editingSalary, setEditingSalary] = useState(!salary);

  // Extra income form
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [extraDesc, setExtraDesc] = useState("");
  const [extraAmount, setExtraAmount] = useState("");
  const [extraCategory, setExtraCategory] = useState("Outros");
  const [extraDate, setExtraDate] = useState(format(currentDate, "yyyy-MM-dd"));

  // Budget form
  const [budgetTotal, setBudgetTotal] = useState(budget.total.toString());
  const [byCategory, setByCategory] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(budget.byCategory).map(([k, v]) => [k, v.toString()]))
  );
  const [showCategoryBudgets, setShowCategoryBudgets] = useState(Object.keys(budget.byCategory).length > 0);

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  // Totals
  const salaryTotal = salary?.amount || 0;
  const extraTotal = extraIncomes.reduce((s, e) => s + e.amount, 0);
  const totalIncome = salaryTotal + extraTotal;

  const handleSaveSalary = () => {
    const amt = parseFloat(salaryAmount);
    if (!amt || amt <= 0) return;
    onSaveSalary(amt, parseInt(salaryDay) || 5, autoRepeat);
    setEditingSalary(false);
  };

  const handleAddExtra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraDesc || !extraAmount) return;
    onAddExtraIncome({
      amount: parseFloat(extraAmount),
      description: extraDesc,
      category: extraCategory,
      date: extraDate,
    });
    setExtraDesc("");
    setExtraAmount("");
    setExtraCategory("Outros");
    setShowExtraForm(false);
  };

  const handleSaveBudget = () => {
    const catBudgets: Record<string, number> = {};
    if (showCategoryBudgets) {
      Object.entries(byCategory).forEach(([k, v]) => {
        const num = parseFloat(v);
        if (num > 0) catBudgets[k] = num;
      });
    }
    onSaveBudget({ total: parseFloat(budgetTotal) || 0, byCategory: catBudgets });
  };

  const budgetTotalNum = parseFloat(budgetTotal) || 0;
  const categoryTotal = Object.values(byCategory).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const categoryPercent = budgetTotalNum > 0 && showCategoryBudgets ? Math.min((categoryTotal / budgetTotalNum) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-3">
        <StaggerItem>
          <Card className="border-0 shadow-lg rounded-2xl card-hover">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total de Renda</p>
                  <p className="text-2xl font-bold mt-1 text-[hsl(var(--success))]">{formatCurrency(totalIncome)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {extraIncomes.length > 0 ? `${extraIncomes.length} entrada(s) extra` : "Apenas salário"}
                  </p>
                </div>
                <div className="rounded-2xl bg-[hsl(var(--success))]/10 p-3">
                  <DollarSign className="h-5 w-5 text-[hsl(var(--success))]" />
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Salário Fixo</p>
                  <p className="text-2xl font-bold mt-1">{salary ? formatCurrency(salaryTotal) : "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {salary ? `Dia ${salary.dayOfReceipt} · ${salary.autoRepeat ? "Repetição ativa" : "Único"}` : "Não definido"}
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3">
                  <Landmark className="h-5 w-5 text-primary" />
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rendas Extras</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(extraTotal)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{extraIncomes.length} entrada(s)</p>
                </div>
                <div className="rounded-2xl bg-accent/10 p-3">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Salary Section */}
      <FadeIn delay={0.15}>
        <Card className="border-0 shadow-lg rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Salário Fixo Mensal</CardTitle>
              </div>
              {salary && !editingSalary && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => { setSalaryAmount(salary.amount.toString()); setSalaryDay(salary.dayOfReceipt.toString()); setAutoRepeat(salary.autoRepeat); setEditingSalary(true); }}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-destructive hover:text-destructive" onClick={onDeleteSalary}>
                    <Trash2 className="h-3.5 w-3.5" /> Remover
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {salary && !editingSalary ? (
              <div className="flex items-center gap-4 rounded-2xl bg-muted/50 p-4">
                <div className="rounded-xl bg-primary/10 p-3">
                  <Landmark className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold">{formatCurrency(salary.amount)}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Dia {salary.dayOfReceipt}</span>
                    <Badge variant={salary.autoRepeat ? "default" : "secondary"} className="text-[10px] rounded-lg">
                      {salary.autoRepeat ? "Repete automaticamente" : "Mês único"}
                    </Badge>
                  </div>
                </div>
                <Badge className="bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20 rounded-lg" variant="outline">
                  ✓ Ativo no mês
                </Badge>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Valor do Salário (R$)</Label>
                    <Input type="number" step="0.01" min="0" value={salaryAmount} onChange={e => setSalaryAmount(e.target.value)} placeholder="Ex: 5000" className="rounded-xl text-lg" />
                  </div>
                  <div className="space-y-2">
                    <Label>Dia do Recebimento</Label>
                    <Input type="number" min="1" max="31" value={salaryDay} onChange={e => setSalaryDay(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 w-full">
                      <Switch checked={autoRepeat} onCheckedChange={setAutoRepeat} />
                      <div>
                        <Label className="text-sm font-medium">Repetir próximos meses</Label>
                        <p className="text-[10px] text-muted-foreground">Copia automaticamente</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveSalary} className="gap-2 rounded-xl">
                    <Save className="h-4 w-4" /> Salvar Salário
                  </Button>
                  {salary && (
                    <Button variant="outline" onClick={() => setEditingSalary(false)} className="rounded-xl">Cancelar</Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Extra Income Section */}
      <FadeIn delay={0.2}>
        <Card className="border-0 shadow-lg rounded-2xl">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-accent" />
                <CardTitle className="text-xl">Rendas Extras</CardTitle>
              </div>
              <Button onClick={() => setShowExtraForm(!showExtraForm)} className="gap-2 rounded-xl">
                <PlusCircle className="h-4 w-4" /> Adicionar Renda Extra
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Rendas não programadas como freelances, vendas, bônus etc.</p>
          </CardHeader>
          <CardContent className="p-0">
            <AnimatePresence>
              {showExtraForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                  <form onSubmit={handleAddExtra} className="border-b p-4 space-y-4 bg-muted/30">
                    <h3 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-accent" /> Nova Renda Extra
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Input value={extraDesc} onChange={e => setExtraDesc(e.target.value)} placeholder="Ex: Freelance design" required className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor (R$)</Label>
                        <Input type="number" step="0.01" min="0.01" value={extraAmount} onChange={e => setExtraAmount(e.target.value)} placeholder="0,00" required className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select value={extraCategory} onValueChange={setExtraCategory}>
                          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {INCOME_CATEGORIES.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Data</Label>
                        <Input type="date" value={extraDate} onChange={e => setExtraDate(e.target.value)} required className="rounded-xl" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="rounded-xl">Adicionar</Button>
                      <Button type="button" variant="outline" onClick={() => setShowExtraForm(false)} className="rounded-xl">Cancelar</Button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-28">Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-32">Categoria</TableHead>
                    <TableHead className="w-32 text-right">Valor</TableHead>
                    <TableHead className="w-20 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extraIncomes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
                          <p>Nenhuma renda extra neste mês.</p>
                          <p className="text-xs">Clique em "Adicionar Renda Extra" para começar.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    extraIncomes.map(income => (
                      <TableRow key={income.id} className="group transition-colors duration-150">
                        <TableCell className="font-medium text-sm">{format(new Date(income.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{income.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal rounded-lg">{income.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-[hsl(var(--success))]">
                          +{formatCurrency(income.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive opacity-60 group-hover:opacity-100 transition-opacity" onClick={() => onDeleteExtraIncome(income.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {extraIncomes.length > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                <span className="text-muted-foreground">{extraIncomes.length} entrada(s)</span>
                <span className="font-semibold text-[hsl(var(--success))]">Total: +{formatCurrency(extraTotal)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Budget Settings (preserved) */}
      <FadeIn delay={0.25}>
        <Card className="border-0 shadow-lg rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Limites de Orçamento</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Defina limites de gastos para controlar seu orçamento.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="budget-total" className="text-base font-medium">Limite de Gastos Mensal (R$)</Label>
              <Input
                id="budget-total"
                type="number" step="0.01" min="0"
                value={budgetTotal}
                onChange={e => setBudgetTotal(e.target.value)}
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
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="space-y-4 overflow-hidden">
                  {budgetTotalNum > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{categoryPercent.toFixed(0)}% alocado ({formatCurrency(categoryTotal)})</span>
                        <span>{formatCurrency(budgetTotalNum)}</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                        <motion.div
                          className={`h-full rounded-full ${categoryTotal > budgetTotalNum ? 'bg-destructive' : 'bg-primary'}`}
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
                        <Input type="number" step="0.01" min="0" value={byCategory[cat] || ""} onChange={e => setByCategory(prev => ({ ...prev, [cat]: e.target.value }))} placeholder="R$" className="w-28 text-sm rounded-xl" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button onClick={handleSaveBudget} className="w-full sm:w-auto gap-2 rounded-xl">
              <Save className="h-4 w-4" /> Salvar Orçamento
            </Button>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}