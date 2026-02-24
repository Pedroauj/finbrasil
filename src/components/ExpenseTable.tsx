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

const glassCard =
  "relative overflow-hidden rounded-3xl " +
  "border border-white/10 " +
  "bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl " +
  "shadow-[0_10px_40px_rgba(0,0,0,0.35)] shadow-emerald-500/5 " +
  "transition-all duration-300 will-change-transform " +
  "hover:-translate-y-[2px] hover:border-emerald-400/20 hover:shadow-emerald-500/12 " +
  "before:content-[''] before:absolute before:inset-0 before:pointer-events-none " +
  "before:bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.10),transparent_35%)] " +
  "after:content-[''] after:absolute after:inset-0 after:pointer-events-none after:opacity-0 " +
  "after:bg-[radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.18),transparent_60%)] " +
  "hover:after:opacity-100 after:transition-opacity after:duration-300";

const tableCard =
  "relative overflow-hidden rounded-3xl " +
  "border border-white/10 " +
  "bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl " +
  "shadow-[0_10px_40px_rgba(0,0,0,0.35)] shadow-emerald-500/5";

const STATUS_CONFIG: Record<
  TransactionStatus,
  { label: string; icon: ReactNode; className: string }
> = {
  paid: {
    label: "Pago",
    icon: <CheckCircle2 className="h-3 w-3" />,
    className:
      "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20",
  },
  planned: {
    label: "Previsto",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  overdue: {
    label: "Atrasado",
    icon: <AlertTriangle className="h-3 w-3" />,
    className: "bg-destructive/10 text-destructive border-destructive/20",
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

  // 👇 quando abre "novo gasto", a gente pode pré-definir o status
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
  const paidTotal = filtered
    .filter((e) => e.status === "paid")
    .reduce((s, e) => s + e.amount, 0);
  const plannedTotal = filtered
    .filter((e) => e.status === "planned")
    .reduce((s, e) => s + e.amount, 0);
  const overdueTotal = filtered
    .filter((e) => e.status === "overdue")
    .reduce((s, e) => s + e.amount, 0);
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

  // ✅ Conecta com o FAB do Index.tsx (evento global)
  useEffect(() => {
    const handler = () => openNewExpense("planned");
    window.addEventListener("open-add-expense", handler);
    return () => window.removeEventListener("open-add-expense", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <Card className={glassCard}>
            <CardContent className="relative z-10 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Total do Mês
                  </p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(total)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filtered.length} transação(ões)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    title="Adicionar gasto"
                    onClick={() => openNewExpense("planned")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <div className="relative overflow-hidden rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
                    <DollarSign className="relative z-10 h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className={glassCard}>
            <CardContent className="relative z-10 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Pagos
                  </p>
                  <p className="text-2xl font-bold mt-1 text-[hsl(var(--success))]">
                    {formatCurrency(paidTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filtered.filter((e) => e.status === "paid").length} gasto(s)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    title="Adicionar gasto pago"
                    onClick={() => openNewExpense("paid")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <div className="relative overflow-hidden rounded-2xl bg-[hsl(var(--success))]/10 p-3 ring-1 ring-[hsl(var(--success))]/20">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
                    <CheckCircle2 className="relative z-10 h-5 w-5 text-[hsl(var(--success))]" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className={glassCard}>
            <CardContent className="relative z-10 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Previstos
                  </p>
                  <p className="text-2xl font-bold mt-1 text-primary">
                    {formatCurrency(plannedTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filtered.filter((e) => e.status === "planned").length} gasto(s)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    title="Adicionar gasto previsto"
                    onClick={() => openNewExpense("planned")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <div className="relative overflow-hidden rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/20">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
                    <Clock className="relative z-10 h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className={glassCard}>
            <CardContent className="relative z-10 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Atrasados
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? "text-destructive" : "text-muted-foreground"
                      }`}
                  >
                    {formatCurrency(overdueTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{overdueCount} gasto(s)</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    title="Adicionar gasto atrasado"
                    onClick={() => openNewExpense("overdue")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <div
                    className={[
                      "relative overflow-hidden rounded-2xl p-3 ring-1",
                      overdueCount > 0
                        ? "bg-destructive/10 ring-destructive/20"
                        : "bg-muted/40 ring-white/10",
                    ].join(" ")}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_45%)]" />
                    <AlertTriangle
                      className={`relative z-10 h-5 w-5 ${overdueCount > 0 ? "text-destructive" : "text-muted-foreground"
                        }`}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Table Card */}
      <FadeIn delay={0.2}>
        <Card className={tableCard}>
          {/* Reflexo sutil no vidro */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.10),transparent_35%)]" />

          <CardHeader className="relative z-10 pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Gastos do Mês</CardTitle>
              </div>
              <Button onClick={() => openNewExpense("planned")} className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" /> Adicionar Gasto
              </Button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Limpar busca"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-48 rounded-xl">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {allCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-36 rounded-xl">
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

          <CardContent className="relative z-10 p-0">
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
                        <div className="flex flex-col items-center gap-2">
                          <ListChecks className="h-8 w-8 text-muted-foreground/40" />
                          <p>
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
                          className="group transition-colors duration-150 hover:bg-white/5"
                        >
                          <TableCell className="font-medium text-sm">
                            {format(new Date(expense.date), "dd/MM/yyyy")}
                          </TableCell>

                          <TableCell>
                            <span className="flex items-center gap-1.5">
                              {expense.description}
                              {expense.isRecurring && (
                                <span title="Recorrente">
                                  <RefreshCw className="h-3 w-3 text-primary" />
                                </span>
                              )}
                            </span>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="font-normal rounded-lg"
                              style={{
                                borderLeft: `3px solid ${getCategoryColor(expense.category)}`,
                              }}
                            >
                              {expense.category}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`gap-1 text-[10px] font-semibold border rounded-lg ${statusCfg.className}`}
                            >
                              {statusCfg.icon}
                              {statusCfg.label}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatCurrency(expense.amount)}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => openEditExpense(expense)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
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
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm">
                <span className="text-muted-foreground">{filtered.length} gasto(s)</span>
                <span className="font-semibold">Total: {formatCurrency(total)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* ✅ Modal flutuante (popup) */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Editar gasto" : "Novo gasto"}</DialogTitle>
          </DialogHeader>

          <ExpenseForm
            expense={editingExpense}
            currentDate={currentDate}
            categories={allCategories}
            accounts={accounts}
            defaultStatus={defaultStatus}

489e63fe15ed92c5982d1413edd36868aab287f5
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