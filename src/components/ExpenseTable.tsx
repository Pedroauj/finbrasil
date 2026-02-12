import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Pencil, Trash2, Search, X, RefreshCw } from "lucide-react";
import { Expense, DEFAULT_CATEGORIES, formatCurrency, getCategoryColor } from "@/types/expense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExpenseForm } from "./ExpenseForm";

interface ExpenseTableProps {
  expenses: Expense[];
  customCategories: string[];
  currentDate: Date;
  onAdd: (expense: Omit<Expense, "id">) => void;
  onUpdate: (id: string, updates: Partial<Omit<Expense, "id">>) => void;
  onDelete: (id: string) => void;
  onAddCategory: (cat: string) => void;
}

export function ExpenseTable({
  expenses, customCategories, currentDate, onAdd, onUpdate, onDelete, onAddCategory,
}: ExpenseTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const filtered = expenses
    .filter(e => filterCategory === "all" || e.category === filterCategory)
    .filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-xl">Gastos do Mês</CardTitle>
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
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {showForm && (
          <div className="border-b p-4">
            <ExpenseForm
              expense={editingExpense}
              currentDate={currentDate}
              categories={allCategories}
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
                <TableHead className="w-32 text-right">Valor</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    {expenses.length === 0 ? "Nenhum gasto registrado ainda." : "Nenhum resultado encontrado."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(expense => (
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
                ))
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
  );
}
