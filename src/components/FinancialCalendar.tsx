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
import { Plus, Edit2, Trash2, Filter, FileDown, Loader2, TrendingDown, CalendarDays } from "lucide-react";
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

  const monthlyTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const selectedDateExpenses = useMemo(() => {
    if (!selectedDate) return [];
    return filteredExpenses.filter(e => isSameDay(parseISO(e.date), selectedDate));
  }, [filteredExpenses, selectedDate]);

  const dayContent = (day: Date) => {
    const dayExpenses = filteredExpenses.filter(e => isSameDay(parseISO(e.date), day));
    if (dayExpenses.length === 0) return null;

    const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

    return (
      <div className="w-full h-full flex flex-col items-center justify-end pb-1.5">
        <div className="flex flex-wrap justify-center gap-1 mb-1">
          {dayExpenses.slice(0, 4).map((e) => (
            <div
              key={e.id}
              className="w-2 h-2 rounded-full border border-background shadow-sm"
              style={{ backgroundColor: getCategoryColor(e.category) }}
              title={e.category}
            />
          ))}
          {dayExpenses.length > 4 && (
            <div className="w-2 h-2 rounded-full bg-muted-foreground border border-background shadow-sm" />
          )}
        </div>
        <span className="text-[10px] sm:text-[11px] font-bold text-primary bg-primary/10 px-1 rounded shadow-sm whitespace-nowrap">
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
        backgroundColor: document.documentElement.classList.contains("dark") ? "#09090b" : "#ffffff",
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
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto w-full">
      {/* Header com Filtros e Ações */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Filter className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Filtrar Categoria</span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px] h-9 border-none bg-transparent p-0 focus:ring-0">
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
          </div>
          
          <div className="h-10 w-[1px] bg-border hidden sm:block" />
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total no Mês</span>
              <span className="text-lg font-bold leading-none">{formatCurrency(monthlyTotal)}</span>
            </div>
          </div>
        </div>

        <Button 
          variant="outline" 
          onClick={handleExportPDF} 
          disabled={isExporting}
          className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground transition-all rounded-lg w-full sm:w-auto"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4" />
          )}
          {isExporting ? "Gerando PDF..." : "Exportar PDF"}
        </Button>
      </div>

      {/* Grid Principal */}
      <div ref={calendarRef} className="grid gap-6 lg:grid-cols-[1fr_350px] w-full">
        {/* Calendário */}
        <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm w-full">
          <CardHeader className="bg-primary/5 border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <CalendarDays className="h-5 w-5 text-primary" />
                {format(currentDate, "MMMM yyyy", { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 flex justify-center w-full overflow-x-auto">
            <div className="w-full min-w-[300px] flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentDate}
                disableNavigation
                locale={ptBR}
                className="w-full"
                classNames={{
                  months: "w-full flex justify-center",
                  month: "w-full space-y-4 flex flex-col items-center",
                  table: "w-full border-collapse mx-auto",
                  head_row: "flex w-full justify-between",
                  head_cell: "text-muted-foreground rounded-md flex-1 font-bold text-[10px] sm:text-[12px] uppercase tracking-widest pb-4 text-center",
                  row: "flex w-full mt-2 justify-between",
                  day: cn(
                    "h-16 sm:h-24 flex-1 p-0 font-normal transition-all hover:bg-primary/5 relative group flex items-center justify-center",
                    "border border-border/40"
                  ),
                  day_selected: "bg-primary/10 text-primary font-bold hover:bg-primary/20 border-primary/50",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside: "opacity-20 pointer-events-none",
                  day_disabled: "opacity-50",
                  day_hidden: "invisible",
                }}
                components={{
                  DayContent: ({ date }) => (
                    <div className="relative w-full h-full flex flex-col items-center pt-2 px-1">
                      <span className={cn(
                        "text-xs sm:text-sm z-10 transition-colors",
                        isSameDay(date, new Date()) ? "bg-primary text-primary-foreground px-1.5 sm:px-2 py-0.5 rounded-full" : "text-foreground/70 group-hover:text-primary"
                      )}>
                        {date.getDate()}
                      </span>
                      {dayContent(date)}
                    </div>
                  ),
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista Lateral de Detalhes */}
        <div className="space-y-6 w-full">
          <Card className="flex flex-col h-auto lg:h-[650px] border-none shadow-md overflow-hidden w-full">
            <CardHeader className="bg-primary/5 border-b pb-4 flex flex-row items-center justify-between space-y-0">
              <div className="flex flex-col">
                <CardTitle className="text-lg font-bold">
                  {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : "Selecione um dia"}
                </CardTitle>
                <span className="text-xs text-muted-foreground font-medium">Detalhamento de compromissos</span>
              </div>
              <Button 
                size="icon" 
                className="rounded-full h-10 w-10 shadow-lg hover:scale-110 transition-transform" 
                onClick={handleAddClick}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-[400px] lg:h-full px-4">
                <div className="space-y-4 py-6">
                  {selectedDateExpenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="bg-muted p-4 rounded-full mb-4">
                        <CalendarDays className="h-8 w-8 text-muted-foreground opacity-50" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground max-w-[200px]">
                        {selectedCategory === "all" 
                          ? "Nenhum compromisso financeiro registrado para este dia." 
                          : `Nenhum gasto na categoria "${selectedCategory}" para este dia.`}
                      </p>
                      <Button variant="link" className="mt-2 text-primary" onClick={handleAddClick}>
                        Adicionar agora
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateExpenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="group relative flex flex-col gap-2 rounded-xl border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-sm leading-tight">{expense.description}</span>
                              <Badge 
                                variant="secondary" 
                                className="w-fit text-[10px] font-bold px-2 py-0 h-5"
                                style={{ 
                                  backgroundColor: `${getCategoryColor(expense.category)}20`,
                                  color: getCategoryColor(expense.category),
                                  borderColor: `${getCategoryColor(expense.category)}40`
                                }}
                              >
                                {expense.category}
                              </Badge>
                            </div>
                            <span className="font-black text-base text-primary">
                              {formatCurrency(expense.amount)}
                            </span>
                          </div>
                          
                          <div className="flex justify-end gap-2 pt-2 border-t border-dashed opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-muted-foreground hover:text-primary"
                              onClick={() => handleEditClick(expense)}
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                              <span className="text-xs">Editar</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-muted-foreground hover:text-destructive"
                              onClick={() => onDelete(expense.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              <span className="text-xs">Excluir</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl overflow-hidden p-0 border-none shadow-2xl">
          <DialogHeader className="bg-primary p-6 text-primary-foreground">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {editingExpense ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingExpense ? "Editar Compromisso" : "Novo Compromisso Financeiro"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
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
