import { useState } from "react";
import { format } from "date-fns";
import { Expense, DEFAULT_CATEGORIES } from "@/types/expense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

interface ExpenseFormProps {
  expense: Expense | null;
  currentDate: Date;
  categories: string[];
  onSubmit: (data: Omit<Expense, "id">) => void;
  onCancel: () => void;
  onAddCategory: (cat: string) => void;
}

export function ExpenseForm({ expense, currentDate, categories, onSubmit, onCancel, onAddCategory }: ExpenseFormProps) {
  const defaultDate = expense?.date || format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(defaultDate);
  const [description, setDescription] = useState(expense?.description || "");
  const [category, setCategory] = useState(expense?.category || categories[0]);
  const [amount, setAmount] = useState(expense?.amount?.toString() || "");
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !category) return;
    onSubmit({ date, description, category, amount: parseFloat(amount) });
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      onAddCategory(newCategory.trim());
      setCategory(newCategory.trim());
      setNewCategory("");
      setShowNewCategory(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold">{expense ? "Editar Gasto" : "Novo Gasto"}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Almoço" required />
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          {showNewCategory ? (
            <div className="flex gap-2">
              <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nova categoria" />
              <Button type="button" size="icon" variant="outline" onClick={handleAddCategory}><Plus className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" onClick={() => setShowNewCategory(false)}>✕</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" size="icon" variant="outline" onClick={() => setShowNewCategory(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Valor (R$)</Label>
          <Input id="amount" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" required />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit">{expense ? "Salvar" : "Adicionar"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}
