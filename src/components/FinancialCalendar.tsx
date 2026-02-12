import { useState, useMemo, useRef } from "react";
import { 
  format, 
  parseISO, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Expense, formatCurrency, getCategoryColor } from "@/types/expense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/ExpenseForm";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Filter, FileDown, Loader2, TrendingDown, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Geração da grade rígida de dias (7 colunas x 6 linhas = 42 dias)
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    
    let days = eachDayOfInterval({ start, end });
    
    // Forçar sempre 42 dias (6 semanas) para manter a altura da grade constante
    while (days.length < 42) {
      const lastDay = days[days.length - 1];
      const nextDay = new Date(lastDay);
      nextDay.setDate(nextDay.getDate() + 1);
      days.push(nextDay);
    }
    
    return days.slice(0, 42);
  }, [currentDate]);

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const categories = useMemo(() => [
    "Alimentação", "Transporte", "Moradia", "Saúde", "Lazer", "Educação", "Outros",
    ...customCategories
  ], [customCategories]);

  const filteredExpenses = useMemo(() => {
    if (selectedCategory === "all") return expenses;
    return expenses.filter(e => e.category === selectedCategory);
  }, [expenses, selectedCategory]);

  const monthlyTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const selectedDateExpenses = useMemo(() => {
    return filteredExpenses.filter(e => isSameDay(parseISO(e.date), selectedDate));
  }, [filteredExpenses, selectedDate]);

  const getDayData = (day: Date) => {
    const dayExpenses = filteredExpenses.filter(e => isSameDay(parseISO(e.date), day));
    const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    return { dayExpenses, total };
  };

  const handleExportPDF = async () => {
    if (!calendarRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(calendarRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: document.documentElement.classList.contains("dark") ? "#09090b" : "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`calendario-${format(currentDate, "MMMM-yyyy", { locale: ptBR })}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar o PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSubmit = (data: Omit<Expense, "id">) => {
    if (editingExpense) onUpdate(editingExpense.id, data);
    else onAdd(data);
    setIsFormOpen(false);
    setEditingExpense(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto w-full">
      {/* Header Consolidado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg"><Filter className="h-4 w-4 text-primary" /></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Categoria</span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[160px] h-8 border-none bg-transparent p-0 focus:ring-0 font-semibold">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="h-10 w-[1px] bg-border hidden sm:block" />
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg"><TrendingDown className="h-4 w-4 text-destructive" /></div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Mensal</span>
              <span className="text-lg font-bold leading-none">{formatCurrency(monthlyTotal)}</span>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={handleExportPDF} disabled={isExporting} className="gap-2 rounded-lg shadow-sm">
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Exportar PDF
        </Button>
      </div>

      {/* Grade de Calendário Rígida */}
      <div ref={calendarRef} className="grid gap-6 lg:grid-cols-[1fr_350px] w-full items-start">
        <Card className="border-none shadow-lg bg-card overflow-hidden">
          <CardHeader className="border-b bg-muted/30 py-4">
            <CardTitle className="flex items-center gap-2 text-xl font-bold justify-center">
              <CalendarDays className="h-5 w-5 text-primary" />
              <span className="capitalize">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Header da Grade (Dias da Semana) */}
            <div className="grid grid-cols-7 border-b bg-muted/10">
              {weekDays.map(day => (
                <div key={day} className="py-3 text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Grade Principal 7x6 */}
            <div className="grid grid-cols-7 grid-rows-6 bg-border/20 gap-[1px]">
              {calendarDays.map((day, idx) => {
                const { dayExpenses, total } = getDayData(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "relative flex flex-col items-center justify-start min-h-[80px] sm:min-h-[110px] p-2 transition-all group bg-card hover:bg-accent/50",
                      !isCurrentMonth && "bg-muted/30 opacity-40",
                      isSelected && "ring-2 ring-inset ring-primary z-10 bg-primary/5"
                    )}
                  >
                    <span className={cn(
                      "text-sm font-semibold mb-1 w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                      isToday ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/70 group-hover:text-primary",
                      isSelected && !isToday && "text-primary font-bold"
                    )}>
                      {day.getDate()}
                    </span>
                    
                    {/* Indicadores de Gastos */}
                    <div className="flex-1 w-full flex flex-col items-center justify-center gap-1.5">
                      <div className="flex flex-wrap justify-center gap-1 px-1">
                        {dayExpenses.slice(0, 3).map(e => (
                          <div 
                            key={e.id} 
                            className="w-2 h-2 rounded-full shadow-sm" 
                            style={{ backgroundColor: getCategoryColor(e.category) }} 
                          />
                        ))}
                        {dayExpenses.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />}
                      </div>
                      {total > 0 && (
                        <span className="text-[10px] sm:text-[11px] font-black text-primary/90 px-1.5 py-0.5 rounded bg-primary/5 border border-primary/10 shadow-sm">
                          R${total.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Lista Lateral de Detalhes */}
        <Card className="border-none shadow-lg h-fit lg:h-[715px] flex flex-col">
          <CardHeader className="border-b bg-primary/5 py-5 flex flex-row items-center justify-between space-y-0">
            <div className="flex flex-col">
              <CardTitle className="text-lg font-bold">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</CardTitle>
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-tighter">Lançamentos do dia</span>
            </div>
            <Button size="icon" className="rounded-full shadow-md hover:scale-105 transition-transform" onClick={() => { setEditingExpense(null); setIsFormOpen(true); }}>
              <Plus className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-[400px] lg:h-full">
              <div className="p-4 space-y-3">
                {selectedDateExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                    <CalendarDays className="h-10 w-10 mb-2" />
                    <p className="text-sm font-medium">Nenhum registro</p>
                  </div>
                ) : (
                  selectedDateExpenses.map(expense => (
                    <div key={expense.id} className="group p-3 rounded-xl border bg-muted/20 hover:bg-card hover:shadow-md hover:border-primary/30 transition-all border-transparent">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-sm">{expense.description}</span>
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/20 text-primary uppercase font-bold">
                            {expense.category}
                          </Badge>
                        </div>
                        <span className="font-black text-sm text-primary">{formatCurrency(expense.amount)}</span>
                      </div>
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 hover:text-primary" onClick={() => { setEditingExpense(expense); setIsFormOpen(true); }}>
                          <Edit2 className="h-3 w-3" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 hover:text-destructive" onClick={() => onDelete(expense.id)}>
                          <Trash2 className="h-3 w-3" /> Excluir
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 border-none shadow-2xl rounded-2xl overflow-hidden">
          <div className="bg-primary p-6 text-primary-foreground">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {editingExpense ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingExpense ? "Editar" : "Novo Registro"}
            </DialogTitle>
          </div>
          <div className="p-6">
            <ExpenseForm
              expense={editingExpense}
              currentDate={selectedDate}
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
