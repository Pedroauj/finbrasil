import { useState } from "react";
import { RecurringExpense, DEFAULT_CATEGORIES, formatCurrency, getCategoryColor } from "@/types/expense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, RefreshCw, DollarSign, CheckCircle2, XCircle, CalendarClock } from "lucide-react";

interface RecurringExpensesProps {
  recurringExpenses: RecurringExpense[];
  customCategories: string[];
  onAdd: (recurring: Omit<RecurringExpense, "id" | "active">) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onAddCategory: (cat: string) => void;
}

export function RecurringExpenses({
  recurringExpenses, customCategories, onAdd, onToggle, onDelete, onAddCategory,
}: RecurringExpensesProps) {
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0]);
  const [dayOfMonth, setDayOfMonth] = useState("1");

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const activeExpenses = recurringExpenses.filter(r => r.active);
  const inactiveExpenses = recurringExpenses.filter(r => !r.active);
  const totalActive = activeExpenses.reduce((s, r) => s + r.amount, 0);
  const totalInactive = inactiveExpenses.reduce((s, r) => s + r.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !category) return;
    onAdd({
      description,
      amount: parseFloat(amount),
      category,
      dayOfMonth: parseInt(dayOfMonth) || 1,
    });
    setDescription("");
    setAmount("");
    setDayOfMonth("1");
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Mensal</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(totalActive)}</p>
                <p className="text-xs text-muted-foreground mt-1">Compromisso fixo</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ativos</p>
                <p className="text-2xl font-bold mt-1 text-[hsl(var(--success))]">{activeExpenses.length}</p>
                <p className="text-xs text-muted-foreground mt-1">recorrência(s)</p>
              </div>
              <div className="rounded-xl bg-[hsl(var(--success))]/10 p-3">
                <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Inativos</p>
                <p className="text-2xl font-bold mt-1 text-muted-foreground">{inactiveExpenses.length}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatCurrency(totalInactive)} pausados</p>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Gastos Recorrentes</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Gastos que se repetem todo mês automaticamente.
              </p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Recorrente
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {showForm && (
            <form onSubmit={handleSubmit} className="border-b p-4 space-y-4 bg-muted/30">
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                Novo Gasto Recorrente
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="rec-desc">Descrição</Label>
                  <Input
                    id="rec-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Aluguel"
                    required
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rec-amount">Valor (R$)</Label>
                  <Input
                    id="rec-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rec-day">Dia do mês</Label>
                  <Input
                    id="rec-day"
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Adicionar</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-36">Categoria</TableHead>
                  <TableHead className="w-28 text-right">Valor</TableHead>
                  <TableHead className="w-24 text-center">Dia</TableHead>
                  <TableHead className="w-24 text-center">Ativo</TableHead>
                  <TableHead className="w-20 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-8 w-8 text-muted-foreground/40" />
                        <p>Nenhum gasto recorrente cadastrado.</p>
                        <p className="text-xs">Clique em "Novo Recorrente" para começar.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  recurringExpenses.map((rec) => (
                    <TableRow key={rec.id} className={!rec.active ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{rec.description}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="font-normal"
                          style={{ borderLeft: `3px solid ${getCategoryColor(rec.category)}` }}
                        >
                          {rec.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(rec.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">{rec.dayOfMonth}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={rec.active}
                          onCheckedChange={(checked) => onToggle(rec.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onDelete(rec.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {recurringExpenses.length > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                {activeExpenses.length} ativo(s) · {inactiveExpenses.length} inativo(s)
              </span>
              <span className="font-semibold">
                Total ativo: {formatCurrency(totalActive)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}