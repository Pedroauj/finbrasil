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
import { Plus, X } from "lucide-react";

interface ExpenseFormProps {
  expense: Expense | null;
  currentDate: Date;
  categories: string[];
  accounts?: FinancialAccount[];
  onSubmit: (data: Omit<Expense, "id">) => void;
  onCancel: () => void;
  onAddCategory: (cat: string) => void;

  /** usado quando criando um gasto novo */
  defaultStatus?: TransactionStatus;
}

export function ExpenseForm({
  expense,
  currentDate,
  categories,
  accounts = [],
  onSubmit,
  onCancel,
  onAddCategory,
  defaultStatus,
}: ExpenseFormProps) {
  const defaultDate = expense?.date || format(new Date(), "yyyy-MM-dd");

  const computedInitialStatus = useMemo<TransactionStatus>(() => {
    if (expense?.status) return expense.status;
    if (defaultStatus) return defaultStatus;

    // evita inconsistência de timezone com string YYYY-MM-DD
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

  // ✅ mantém o form sincronizado ao alternar entre "novo" e "editar"
  useEffect(() => {
    setDate(defaultDate);
    setDescription(expense?.description || "");
    setCategory(expense?.category || categories?.[0] || "");
    setAmount(expense?.amount?.toString() || "");
    setAccountId(expense?.accountId || "none");
    setStatus(computedInitialStatus);

    setNewCategory("");
    setShowNewCategory(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expense?.id, defaultDate, computedInitialStatus, categories]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const desc = description.trim();
    if (!desc || !amount || !category) return;

    onSubmit({
      date,
      description: desc,
      category,
      amount: parseFloat(amount),
      status,
      accountId: accountId === "none" ? undefined : accountId,
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
          <Label htmlFor="amount">Valor (R$)</Label>
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
          {expense ? "Salvar" : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}