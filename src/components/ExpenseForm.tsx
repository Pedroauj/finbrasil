import { useEffect, useMemo, useState, type FormEvent } from "react";
import { format, parseISO } from "date-fns";
import type { Expense, TransactionStatus, FinancialAccount } from "@/types/expense";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from "lucide-react";

interface ExpenseFormProps {
  expense: Expense | null;
  currentDate: Date;
  categories: string[];
  accounts?: FinancialAccount[];
  existingExpenses?: Expense[];
  onSubmit: (data: Omit<Expense, "id">) => void;
  onCancel: () => void;
  onAddCategory: (cat: string) => void;
  defaultStatus?: TransactionStatus;
}

export function ExpenseForm({
  expense,
  currentDate,
  categories,
  accounts = [],
  existingExpenses = [],
  onSubmit,
  onCancel,
  onAddCategory,
  defaultStatus,
}: ExpenseFormProps) {
  const defaultDate = expense?.date || format(new Date(), "yyyy-MM-dd");

  const computedInitialStatus = useMemo<TransactionStatus>(() => {
    if (expense?.status) return expense.status;
    if (defaultStatus) return defaultStatus;
    const d = parseISO(defaultDate);
    const today = new Date();
    return d <= today ? "paid" : "planned";
  }, [expense?.status, defaultStatus, defaultDate]);

  const [date, setDate] = useState(defaultDate);
  const [description, setDescription] = useState(expense?.description || "");
  const [category, setCategory] = useState(
    expense?.category || categories?.[0] || ""
  );
  const [amount, setAmount] = useState(expense?.amount?.toString() || "");
  const [status, setStatus] = useState<TransactionStatus>(computedInitialStatus);
  const [accountId, setAccountId] = useState(expense?.accountId || "none");

  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  // Installment fields
  const [isInstallment, setIsInstallment] = useState(expense?.isInstallment || false);
  const [installmentCount, setInstallmentCount] = useState(
    expense?.installmentCount?.toString() || "2"
  );

  // Disable installment toggle when editing
  const isEditing = !!expense;

  useEffect(() => {
    setDate(defaultDate);
    setDescription(expense?.description || "");
    setCategory(expense?.category || categories?.[0] || "");
    setAmount(expense?.amount?.toString() || "");
    setAccountId(expense?.accountId || "none");
    setStatus(computedInitialStatus);
    setIsInstallment(expense?.isInstallment || false);
    setInstallmentCount(expense?.installmentCount?.toString() || "2");
    setNewCategory("");
    setShowNewCategory(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expense?.id, defaultDate, computedInitialStatus, categories]);

  const parsedAmount = parseFloat(amount) || 0;
  const parsedCount = parseInt(installmentCount) || 2;
  const perInstallment = isInstallment && parsedCount > 1 ? parsedAmount / parsedCount : 0;

  // Duplicate detection
  const duplicateWarning = useMemo(() => {
    if (isEditing || !description.trim() || !amount || !date) return null;
    const descLower = description.trim().toLowerCase();
    const found = existingExpenses.find(
      (e) =>
        e.date === date &&
        Math.abs(e.amount - parsedAmount) < 0.01 &&
        e.description.toLowerCase().includes(descLower)
    );
    return found ? found : null;
  }, [isEditing, description, amount, date, parsedAmount, existingExpenses]);

  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const desc = description.trim();
    if (!desc || !amount || !category) return;

    if (duplicateWarning && !duplicateConfirmed) {
      setDuplicateConfirmed(true);
      return;
    }

    onSubmit({
      date,
      description: desc,
      category,
      amount: parseFloat(amount),
      status,
      accountId: accountId === "none" ? undefined : accountId,
      isInstallment: isInstallment && parsedCount > 1,
      installmentCount: isInstallment && parsedCount > 1 ? parsedCount : undefined,
    });
  }

  function handleAddCategory() {
    const c = newCategory.trim();
    if (!c) return;
    onAddCategory(c);
    setCategory(c);
    setNewCategory("");
    setShowNewCategory(false);
  }

  const statusLabels: Record<TransactionStatus, string> = {
    planned: "Previsto",
    paid: "Pago",
    overdue: "Atrasado",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight">
            {expense ? "Editar gasto" : "Novo gasto"}
          </h3>
          <p className="text-xs text-muted-foreground">
            Preencha os dados e salve para atualizar seu controle.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          className="rounded-xl"
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Almoço, Mercado, Uber…"
            required
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>

          {showNewCategory ? (
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nova categoria"
                className="rounded-xl"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="rounded-xl"
                onClick={handleAddCategory}
                aria-label="Adicionar categoria"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="rounded-xl"
                onClick={() => {
                  setShowNewCategory(false);
                  setNewCategory("");
                }}
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="flex-1 rounded-xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="rounded-xl"
                onClick={() => setShowNewCategory(true)}
                aria-label="Nova categoria"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">
            {isInstallment && parsedCount > 1 ? "Valor total (R$)" : "Valor (R$)"}
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            required
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as TransactionStatus)}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(statusLabels) as TransactionStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {accounts.length > 0 && (
          <div className="space-y-2">
            <Label>Conta</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem conta</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ── Installment section ── */}
      {!isEditing && (
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Parcelamento</p>
              <p className="text-xs text-muted-foreground">
                Divide o valor em parcelas mensais automáticas
              </p>
            </div>
            <Switch
              checked={isInstallment}
              onCheckedChange={setIsInstallment}
            />
          </div>

          {isInstallment && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="installmentCount">Nº de parcelas</Label>
                <Input
                  id="installmentCount"
                  type="number"
                  min="2"
                  max="48"
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Valor por parcela</Label>
                <div className="flex h-10 items-center rounded-xl border border-input bg-background px-3 text-sm font-semibold tabular-nums">
                  {parsedAmount > 0 && parsedCount > 1
                    ? `R$ ${perInstallment.toFixed(2)}`
                    : "—"}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Installment info when editing ── */}
      {isEditing && expense?.isInstallment && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-medium text-primary">
            📆 Parcela {expense.currentInstallment}/{expense.installmentCount}
          </p>
        </div>
      )}
      {/* Duplicate warning */}
      {duplicateWarning && duplicateConfirmed && (
        <div className="rounded-2xl border border-[hsl(var(--warning))]/25 bg-[hsl(var(--warning))]/8 p-3">
          <p className="text-xs font-medium text-[hsl(var(--warning))]">
            ⚠️ Esse gasto parece duplicado ({duplicateWarning.description} — {format(new Date(duplicateWarning.date), "dd/MM")}). Clique novamente para confirmar.
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={onCancel}
        >
          Voltar
        </Button>
        <Button type="submit" className="rounded-xl">
          {duplicateWarning && !duplicateConfirmed
            ? "Verificar duplicidade"
            : expense
            ? "Salvar"
            : isInstallment && parsedCount > 1
            ? `Criar ${parsedCount}x parcelas`
            : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}
