import { useState, useMemo, useRef } from "react";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Expense, formatCurrency, getCategoryColor } from "@/types/expense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/ExpenseForm";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Filter, FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface FinancialCalendarProps {
  expenses: Expense[];
  customCategories: string[];
  currentDate: Date;
  onAdd: (data: Omit<Expense, "id">) => void;
  onUpdate: (id: string, data: Partial<Omit<Expense, "id">>) => void;
  onDelete: (id: string) => void;
  onAddCategory: (cat: string) => void;
}

export function FinancialCalendar({
  expenses,
  customCategories,
  currentDate,
  onAdd,
  onUpdate,
  onDelete,
  onAddCategory,
}: FinancialCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => [
    "Alimentação", "Transporte", "Moradia", "Saúde", "Lazer", "Educação", "Outros",
    ...customCategories
  ], [customCategories]);

  const filteredExpenses = useMemo(() => {
    if (selectedCategory === "all") return expenses;
    return expenses.filter(e => e.category === selectedCategory);
  }, [expenses, selectedCategory]);

  const selectedDateExpenses = useMemo(() => {
    if (!selectedDate) return [];
    return filteredExpenses.filter(e => isSameDay(parseISO(e.date), selectedDate));
  }, [filteredExpenses, selectedDate]);

  const dayContent = (day: Date) => {
    const dayExpenses = filteredExpenses.filter(e => isSameDay(parseISO(e.date), day));
    if (dayExpenses.length === 0) return null;

    const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

    return (
      <div className="w-full h-full flex flex-col items-center justify-end pb-1">
        <div className="flex flex-wrap justify-center gap-0.5 mb-1">
          {dayExpenses.slice(0, 3).map((e, i) => (
            <div
              key={e.id}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: getCategoryColor(e.category) }}
            />
          ))}
          {dayExpenses.length > 3 && (
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
          )}
        </div>
        <span className="text-[10px] font-bold text-primary truncate max-w-full px-0.5">
          {total > 0 && `R$${total.toFixed(0)}`}
        </span>
      </div>
    );
  };

  const handleExportPDF = async () => {
    if (!calendarRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(calendarRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#09090b", // Match app background color
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      
      const monthName = format(currentDate, "MMMM-yyyy", { locale: ptBR });
      pdf.save(`calendario-financeiro-${monthName}.pdf`);
      
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o PDF. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddClick = () => {
    setEditingExpense(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleSubmit = (data: Omit<Expense, "id">) => {
    if (editingExpense) {
      onUpdate(editingExpense.id, data);
    } else {
      onAdd(data);
    }
    setIsFormOpen(false);
    setEditingExpense(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtrar por Categoria:</span>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          variant="outline" 
          onClick={handleExportPDF} 
          disabled={isExporting}
          className="flex items-center gap-2"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {isExporting ? "Gerando PDF..." : "Exportar PDF"}
        </Button>
      </div>

      <div ref={calendarRef} className="grid gap-6 md:grid-cols-[1fr_300px] bg-background p-4 rounded-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Calendário de Gastos - {format(currentDate, "MMMM yyyy", { locale: ptBR })}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentDate}
              disableNavigation
              locale={ptBR}
              className="rounded-md border shadow-sm w-full"
              classNames={{
                day: "h-16 w-16 p-0 font-normal aria-selected:opacity-100",
                cell: "h-16 w-16 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
              }}
              components={{
                DayContent: ({ date }) => (
                  <div className="relative w-full h-full flex flex-col items-center pt-1">
                    <span className={isSameDay(date, new Date()) ? "font-bold text-primary" : ""}>
                      {date.getDate()}
                    </span>
                    {dayContent(date)}
                  </div>
                ),
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="flex flex-col h-[500px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "Selecione um dia"}
              </CardTitle>
              <Button size="icon" variant="ghost" onClick={handleAddClick}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full px-4">
                <div className="space-y-4 py-4">
                  {selectedDateExpenses.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      {selectedCategory === "all" 
                        ? "Nenhum gasto neste dia." 
                        : `Nenhum gasto em "${selectedCategory}" neste dia.`}
                    </p>
                  ) : (
                    selectedDateExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="group relative flex flex-col gap-1 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{expense.description}</span>
                          <span className="font-bold text-sm">{formatCurrency(expense.amount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                            {expense.category}
                          </Badge>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditClick(expense)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => onDelete(expense.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Editar Compromisso" : "Novo Compromisso"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ExpenseForm
              expense={editingExpense}
              currentDate={selectedDate || new Date()}
              categories={categories}
              onSubmit={handleSubmit}
              onCancel={() => setIsFormOpen(false)}
              onAddCategory={onAddCategory}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
