import { useEffect, useMemo, useState, type ReactNode } from "react";
import { format } from "date-fns";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  ListChecks,
} from "lucide-react";

import type { Expense, FinancialAccount, TransactionStatus } from "@/types/expense";
import { DEFAULT_CATEGORIES, formatCurrency, getCategoryColor } from "@/types/expense";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { ExpenseForm } from "./ExpenseForm";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/ui/animations";

// ── Visual tokens (mesmo padrão do Dashboard) ──
const appCard =
  "relative overflow-hidden rounded-2xl border border-border/50 bg-card/70 backdrop-blur shadow-sm " +
  "transition-all duration-200 will-change-transform hover:-translate-y-[1px] hover:shadow-md hover:border-border/80";

const tableCard =
  "relative overflow-hidden rounded-2xl border border-border/50 bg-card/70 backdrop-blur shadow-sm";

// ── Status config ──
const STATUS_CONFIG: Record<
  TransactionStatus,
  { label: string; icon: ReactNode; className: string }
> = {
  paid: {
    label: "Pago",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className:
      "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/25",
  },
  planned: {
    label: "Previsto",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-primary/10 text-primary border-primary/25",
  },
  overdue: {
    label: "Atrasado",
    icon: <AlertTriangle className="h-3 w-3" />,
    className: "bg-destructive/10 text-destructive border-destructive/25",
  },
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
  expenses,
  customCategories,
  currentDate,
  accounts = [],
  onAdd,
  onUpdate,
  onDelete,
  onAddCategory,
}: ExpenseTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TransactionStatus>("planned");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const allCategories = useMemo(
    () => [...DEFAULT_CATEGORIES, ...customCategories],
    [customCategories]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return expenses
      .filter((e) => filterCategory === "all" || e.category === filterCategory)
      .filter((e) => filterStatus === "all" || e.status === filterStatus)
      .filter((e) => e.description.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, filterCategory, filterStatus, searchTerm]);

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);
  const paidTotal = filtered.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount, 0);
  const plannedTotal = filtered.filter((e) => e.status === "planned").reduce((s, e) => s + e.amount, 0);
  const overdueTotal = filtered.filter((e) => e.status === "overdue").reduce((s, e) => s + e.amount, 0);
  const overdueCount = filtered.filter((e) => e.status === "overdue").length;

  function openNewExpense(status?: TransactionStatus) {
    setEditingExpense(null);
    setDefaultStatus(status ?? "planned");
    setDialogOpen(true);
  }

  function openEditExpense(expense: Expense) {
    setEditingExpense(expense);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingExpense(null);
  }

  useEffect(() => {
    const handler = () => openNewExpense("planned");
    window.addEventListener("open-add-expense", handler);
    return () => window.removeEventListener("open-add-expense", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">

      {/* ── Summary Cards ── */}
      <StaggerContainer className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

        {/* Total */}
        <StaggerItem>
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Total do mês
                  </p>
                  <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">
                    {formatCurrency(total)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {filtered.length} transação(ões)
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-xl border-border/60"
                    title="Adicionar gasto"
                    onClick={() => openNewExpense("planned")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <div className="rounded-xl bg-primary/10 ring-1 ring-primary/20 p-2.5">
                    <DollarSign className="h-4.5 w-4.5 text-primary" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Pagos */}
        <StaggerItem>
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Pagos
                  </p>
                  <p className="mt-1.5 text-2xl font-bold tracking-tight text-[hsl(var(--success))]">
                    {formatCurrency(paidTotal)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {filtered.filter((e) => e.status === "paid").length} gasto(s)
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-xl border-border/60"
                    title="Adicionar gasto pago"
                    onClick={() => openNewExpense("paid")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <div className="rounded-xl bg-[hsl(var(--success))]/10 ring-1 ring-[hsl(var(--success))]/20 p-2.5">
                    <CheckCircle2 className="h-4.5 w-4.5 text-[hsl(var(--success))]" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Previstos */}
        <StaggerItem>
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Previstos
                  </p>
                  <p className="mt-1.5 text-2xl font-bold tracking-tight text-primary">
                    {formatCurrency(plannedTotal)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {filtered.filter((e) => e.status === "planned").length} gasto(s)
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-xl border-border/60"
                    title="Adicionar gasto previsto"
                    onClick={() => openNewExpense("planned")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <div className="rounded-xl bg-primary/10 ring-1 ring-primary/20 p-2.5">
                    <Clock className="h-4.5 w-4.5 text-primary" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Atrasados */}
        <StaggerItem>
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Atrasados
                  </p>
                  <p className={`mt-1.5 text-2xl font-bold tracking-tight ${overdueCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {formatCurrency(overdueTotal)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{overdueCount} gasto(s)</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-xl border-border/60"
                    title="Adicionar gasto atrasado"
                    onClick={() => openNewExpense("overdue")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <div className={[
                    "rounded-xl p-2.5 ring-1",
                    overdueCount > 0
                      ? "bg-destructive/10 ring-destructive/20"
                      : "bg-muted/40 ring-border/50",
                  ].join(" ")}>
                    <AlertTriangle className={`h-4.5 w-4.5 ${overdueCount > 0 ? "text-destructive" : "text-foreground/50"}`} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

      </StaggerContainer>

      {/* ── Table Card ── */}
      <FadeIn delay={0.12}>
        <Card className={tableCard}>

          <CardHeader className="px-5 pt-5 pb-4">
            {/* Title row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-primary/10 ring-1 ring-primary/20 p-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Gastos do mês</CardTitle>
                </div>
              </div>

              <Button
                onClick={() => openNewExpense("planned")}
                className="h-9 gap-2 rounded-xl text-sm font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar gasto
              </Button>
            </div>

            {/* Filters row */}
            <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 rounded-xl border-border/60 bg-background/50 text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Limpar busca"
                    type="button"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-48 h-9 rounded-xl border-border/60 bg-background/50 text-sm">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {allCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-36 h-9 rounded-xl border-border/60 bg-background/50 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="planned">Previsto</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="w-28 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Data</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição</TableHead>
                    <TableHead className="w-44 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Categoria</TableHead>
                    <TableHead className="w-28 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                    <TableHead className="w-32 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Valor</TableHead>
                    <TableHead className="w-24 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-2.5">
                          <div className="rounded-2xl bg-muted/40 p-4">
                            <ListChecks className="h-6 w-6 text-muted-foreground/40" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {expenses.length === 0
                              ? "Nenhum gasto registrado ainda."
                              : "Nenhum resultado encontrado."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((expense) => {
                      const statusCfg = STATUS_CONFIG[expense.status];
                      return (
                        <TableRow
                          key={expense.id}
                          className="group border-border/30 transition-colors duration-100 hover:bg-muted/30"
                        >
                          <TableCell className="text-sm font-medium text-muted-foreground tabular-nums">
                            {format(new Date(expense.date), "dd/MM/yyyy")}
                          </TableCell>

                          <TableCell>
                            <span className="flex items-center gap-1.5">
                              <span className="text-sm text-foreground">{expense.description}</span>
                              {expense.isRecurring && (
                                <span title="Recorrente">
                                  <RefreshCw className="h-3 w-3 text-primary opacity-70" />
                                </span>
                              )}
                            </span>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="text-xs font-medium rounded-lg border border-border/50 bg-card/50 px-2 py-0.5"
                              style={{ borderLeft: `3px solid ${getCategoryColor(expense.category)}` }}
                            >
                              {expense.category}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`gap-1 text-[10px] font-semibold rounded-lg px-2 py-0.5 border ${statusCfg.className}`}
                            >
                              {statusCfg.icon}
                              {statusCfg.label}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right text-sm font-semibold tabular-nums text-foreground">
                            {formatCurrency(expense.amount)}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                                onClick={() => openEditExpense(expense)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
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
              <div className="flex items-center justify-between border-t border-border/40 px-5 py-3">
                <span className="text-xs text-muted-foreground">{filtered.length} gasto(s)</span>
                <span className="text-sm font-semibold text-foreground">
                  Total: {formatCurrency(total)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* ── Modal ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="sm:max-w-3xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingExpense ? "Editar gasto" : "Novo gasto"}
            </DialogTitle>
          </DialogHeader>

          <ExpenseForm
            expense={editingExpense}
            currentDate={currentDate}
            categories={allCategories}
            accounts={accounts}
            defaultStatus={defaultStatus}
            onSubmit={(data) => {
              if (editingExpense) onUpdate(editingExpense.id, data);
              else onAdd(data);
              closeDialog();
            }}
            onCancel={closeDialog}
            onAddCategory={onAddCategory}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
