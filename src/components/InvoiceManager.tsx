import { useState } from "react";
import { CreditCard, CreditCardInvoice, formatCurrency, getCategoryColor } from "@/types/expense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt, Trash2, Calendar, CheckCircle2, Circle, ShoppingBag } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface InvoiceManagerProps {
  card: CreditCard;
  invoice?: CreditCardInvoice;
  categories: string[];
  monthKey: string;
  onAddItem: (item: any) => void;
  onRemoveItem: (invoiceId: string, itemId: string) => void;
  onTogglePaid: (invoiceId: string) => void;
}

export function InvoiceManager({
  card,
  invoice,
  categories,
  monthKey,
  onAddItem,
  onRemoveItem,
  onTogglePaid,
}: InvoiceManagerProps) {
  const [newItem, setNewItem] = useState({
    description: "",
    amount: "",
    category: "Outros",
    date: format(new Date(), "yyyy-MM-dd")
  });

  const totalSpent = invoice?.items.reduce((sum, item) => sum + item.amount, 0) || 0;
  const isPaid = invoice?.isPaid || false;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description || !newItem.amount) return;
    onAddItem({
      description: newItem.description,
      amount: Number(newItem.amount),
      category: newItem.category,
      date: newItem.date
    });
    setNewItem({
      description: "",
      amount: "",
      category: "Outros",
      date: format(new Date(), "yyyy-MM-dd")
    });
  };

  return (
    <Card className="border-none shadow-lg h-full flex flex-col overflow-hidden bg-card/50 backdrop-blur-sm">
      <CardHeader className="bg-primary/5 border-b py-5 flex flex-row items-center justify-between space-y-0">
        <div className="flex flex-col">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Fatura de {format(new Date(monthKey + "-01"), "MMMM", { locale: ptBR })}
          </CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={isPaid ? "success" : "warning"} className="text-[10px] uppercase font-black">
              {isPaid ? "Paga" : "Aberta"}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">Vence dia {card.dueDay}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total da Fatura</p>
            <p className="text-xl font-black text-primary">{formatCurrency(totalSpent)}</p>
          </div>
          {invoice && (
            <Button 
              variant="outline" 
              size="sm" 
              className={cn("gap-2 rounded-lg", isPaid && "bg-success/10 text-success border-success/20")}
              onClick={() => onTogglePaid(invoice.id)}
            >
              {isPaid ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              {isPaid ? "Paga" : "Marcar Paga"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Formulário de Adição */}
        <div className="w-full lg:w-[300px] p-6 border-b lg:border-b-0 lg:border-r bg-muted/5">
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase text-muted-foreground">Novo Item</Label>
              <Input 
                placeholder="O que você comprou?" 
                value={newItem.description} 
                onChange={e => setNewItem({...newItem, description: e.target.value})}
                className="bg-card"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase text-muted-foreground">Valor</Label>
                <Input 
                  type="number" 
                  placeholder="0,00" 
                  value={newItem.amount} 
                  onChange={e => setNewItem({...newItem, amount: e.target.value})}
                  className="bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase text-muted-foreground">Data</Label>
                <Input 
                  type="date" 
                  value={newItem.date} 
                  onChange={e => setNewItem({...newItem, date: e.target.value})}
                  className="bg-card p-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase text-muted-foreground">Categoria</Label>
              <Select value={newItem.category} onValueChange={v => setNewItem({...newItem, category: v})}>
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full gap-2 shadow-md">
              <Plus className="h-4 w-4" /> Adicionar na Fatura
            </Button>
          </form>
        </div>

        {/* Lista de Itens */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 h-[400px] lg:h-full">
            <div className="p-6">
              {!invoice || invoice.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                  <ShoppingBag className="h-12 w-12 mb-3" />
                  <p className="text-sm font-medium">Sua fatura está vazia</p>
                  <p className="text-xs">Comece adicionando seus gastos acima</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoice.items.map((item) => (
                    <div 
                      key={item.id} 
                      className="group flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm"
                          style={{ backgroundColor: getCategoryColor(item.category) }}
                        >
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm leading-tight">{item.description}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-medium text-muted-foreground uppercase">
                              {format(parseISO(item.date), "dd 'de' MMM", { locale: ptBR })}
                            </span>
                            <span className="text-[10px] font-black text-primary/60 uppercase">{item.category}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-base text-primary">{formatCurrency(item.amount)}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onRemoveItem(invoice.id, item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
