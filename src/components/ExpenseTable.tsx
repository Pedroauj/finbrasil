import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Pencil, Trash2, Search, X, RefreshCw, CheckCircle2, Clock, AlertTriangle, DollarSign, TrendingUp, ListChecks } from "lucide-react";
import { Expense, DEFAULT_CATEGORIES, formatCurrency, getCategoryColor, FinancialAccount, TransactionStatus } from "@/types/expense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExpenseForm } from "./ExpenseForm";

const STATUS_CONFIG: Record<TransactionStatus, { label: string; icon: React.ReactNode; className: string }> = {
  paid: { label: "Pago", icon: <CheckCircle2 className="h-3 w-3" />, className: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20" },
  planned: { label: "Previsto", icon: <Clock className="h-3 w-3" />, className: "bg-primary/10 text-primary border-primary/20" },
  overdue: { label: "Atrasado", icon: <AlertTriangle className="h-3 w-3" />, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

interface ExpenseTableProps {
  expenses: Expense[];
  customCategories: string[];
  currentDate: Date;
  accounts?: FinancialAccount[];
  onAdd: (expense: Omit<Expense, "id">) => void;
  onUpdate: (id: string, updates: Partial<Omit<Expense, "id">>) => void;
  onDelete: (id: string) => void;
  onAddCategory: (cat: string) => void;
}

export function ExpenseTable({
  expenses, customCategories, currentDate, accounts = [], onAdd, onUpdate, onDelete, onAddCategory,
}: ExpenseTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const filtered = expenses
    .filter(e => filterCategory === "all" || e.category === filterCategory)
    .filter(e => filterStatus === "all" || e.status === filterStatus)
    .filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);
  const paidTotal = filtered.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
  const plannedTotal = filtered.filter(e => e.status === 'planned').reduce((s, e) => s + e.amount, 0);
  const overdueTotal = filtered.filter(e => e.status === 'overdue').reduce((s, e) => s + e.amount, 0);
  const overdueCount = filtered.filter(e => e.status === 'overdue').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total do Mês</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(total)}</p>
                <p className="text-xs text-muted-foreground mt-1">{filtered.length} transação(ões)</p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pagos</p>
                <p className="text-2xl font-bold mt-1 text-[hsl(var(--success))]">{formatCurrency(paidTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">{filtered.filter(e => e.status === 'paid').length} gasto(s)</p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Previstos</p>
                <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(plannedTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">{filtered.filter(e => e.status === 'planned').length} gasto(s)</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Atrasados</p>
                <p className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{formatCurrency(overdueTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">{overdueCount} gasto(s)</p>
              </div>
              <div className={`rounded-xl p-3 ${overdueCount > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                <AlertTriangle className={`h-5 w-5 ${overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Gastos do Mês</CardTitle>
            </div>
            <Button onClick={() => { setEditingExpense(null); setShowForm(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar Gasto
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row mt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {allCategories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="planned">Previsto</SelectItem>
                <SelectItem value="overdue">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {showForm && (
            <div className="border-b p-4">
              <ExpenseForm
                expense={editingExpense}
                currentDate={currentDate}
                categories={allCategories}
                accounts={accounts}
                onSubmit={(data) => {
                  if (editingExpense) {
                    onUpdate(editingExpense.id, data);
                  } else {
                    onAdd(data);
                  }
                  setShowForm(false);
                  setEditingExpense(null);
                }}
                onCancel={() => { setShowForm(false); setEditingExpense(null); }}
                onAddCategory={onAddCategory}
              />
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-28">Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-36">Categoria</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-32 text-right">Valor</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      {expenses.length === 0 ? "Nenhum gasto registrado ainda." : "Nenhum resultado encontrado."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(expense => {
                    const statusCfg = STATUS_CONFIG[expense.status];
                    return (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium text-sm">
                          {format(new Date(expense.date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            {expense.description}
                            {expense.isRecurring && (
                              <span title="Recorrente"><RefreshCw className="h-3 w-3 text-primary" /></span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="font-normal"
                            style={{ borderLeft: `3px solid ${getCategoryColor(expense.category)}` }}
                          >
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 text-[10px] font-semibold border ${statusCfg.className}`}>
                            {statusCfg.icon}
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => { setEditingExpense(expense); setShowForm(true); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => onDelete(expense.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {filtered.length > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">{filtered.length} gasto(s)</span>
              <span className="font-semibold">Total: {formatCurrency(total)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}