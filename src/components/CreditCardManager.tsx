import { useState, useMemo } from "react";
import { CreditCard, CreditCardInvoice, InvoiceItem, formatCurrency } from "@/types/expense";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, CreditCard as CardIcon, Trash2, Receipt } from "lucide-react";
import { format } from "date-fns";
import { InvoiceManager } from "./InvoiceManager";
import { cn } from "@/lib/utils";

interface CreditCardManagerProps {
  cards: CreditCard[];
  invoices: CreditCardInvoice[];
  categories: string[];
  currentDate: Date;
  onAddCard: (card: Omit<CreditCard, "id">) => void;
  onDeleteCard: (id: string) => void;
  onAddInvoiceItem: (cardId: string, month: string, item: Omit<InvoiceItem, "id">) => void;
  onAddInstallments: (cardId: string, items: { month: string; item: Omit<InvoiceItem, "id"> }[]) => void;
  onRemoveInvoiceItem: (invoiceId: string, itemId: string) => void;
  onRemoveInstallmentGroup: (cardId: string, groupId: string) => void;
  onTogglePaid: (invoiceId: string) => void;
}

export function CreditCardManager({
  cards,
  invoices,
  categories,
  currentDate,
  onAddCard,
  onDeleteCard,
  onAddInvoiceItem,
  onAddInstallments,
  onRemoveInvoiceItem,
  onRemoveInstallmentGroup,
  onTogglePaid,
}: CreditCardManagerProps) {
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const [newCard, setNewCard] = useState({
    name: "",
    limit: "",
    closingDay: "1",
    dueDay: "10",
    color: "hsl(250, 84%, 54%)",
  });

  const monthKey = format(currentDate, "yyyy-MM");
  const selectedCard = useMemo(() => cards.find(c => c.id === selectedCardId), [cards, selectedCardId]);

  const handleAddCard = () => {
    if (!newCard.name || !newCard.limit) return;
    onAddCard({
      name: newCard.name,
      limit: Number(newCard.limit),
      closingDay: Number(newCard.closingDay),
      dueDay: Number(newCard.dueDay),
      color: newCard.color,
    });
    setNewCard({ name: "", limit: "", closingDay: "1", dueDay: "10", color: "hsl(250, 84%, 54%)" });
    setIsAddCardOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CardIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Meus Cartões</h2>
            <p className="text-xs text-muted-foreground">Gerencie seus limites e faturas</p>
          </div>
        </div>

        <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-lg shadow-sm">
              <Plus className="h-4 w-4" /> Novo Cartão
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Cartão</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome do Cartão</Label>
                <Input id="name" placeholder="Ex: Nubank, Inter..." value={newCard.name} onChange={e => setNewCard({ ...newCard, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="limit">Limite Total</Label>
                <Input id="limit" type="number" placeholder="0,00" value={newCard.limit} onChange={e => setNewCard({ ...newCard, limit: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="closing">Dia Fechamento</Label>
                  <Input id="closing" type="number" min="1" max="31" value={newCard.closingDay} onChange={e => setNewCard({ ...newCard, closingDay: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="due">Dia Vencimento</Label>
                  <Input id="due" type="number" min="1" max="31" value={newCard.dueDay} onChange={e => setNewCard({ ...newCard, dueDay: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleAddCard} className="w-full mt-2">Salvar Cartão</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        <div className="space-y-4">
          {cards.length === 0 ? (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                <CardIcon className="h-10 w-10 mb-2" />
                <p className="text-sm font-medium">Nenhum cartão cadastrado</p>
              </CardContent>
            </Card>
          ) : (
            cards.map(card => {
              const invoice = invoices.find(i => i.cardId === card.id && i.month === monthKey);
              const totalSpent = invoice?.items.reduce((sum, item) => sum + item.amount, 0) || 0;
              const available = card.limit - totalSpent;
              const percent = (totalSpent / card.limit) * 100;

              // Count installment groups for this card
              const installmentGroupIds = new Set(
                invoices
                  .filter(i => i.cardId === card.id)
                  .flatMap(i => i.items)
                  .filter(i => i.installmentGroupId && i.installmentCurrent !== i.installmentTotal)
                  .map(i => i.installmentGroupId!)
              );

              return (
                <Card
                  key={card.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md overflow-hidden border-l-4",
                    selectedCardId === card.id ? "ring-2 ring-primary/20 border-primary" : "border-transparent"
                  )}
                  onClick={() => setSelectedCardId(card.id)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-5 rounded bg-primary/20 flex items-center justify-center">
                          <div className="w-4 h-1 bg-primary/40 rounded-full" />
                        </div>
                        <span className="font-bold text-sm">{card.name}</span>
                        {installmentGroupIds.size > 0 && (
                          <span className="text-[9px] bg-amber-500/15 text-amber-600 font-black px-1.5 py-0.5 rounded-full border border-amber-500/20">
                            {installmentGroupIds.size} parcela{installmentGroupIds.size > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={e => { e.stopPropagation(); onDeleteCard(card.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Fatura Atual</span>
                        <span className="text-lg font-black text-primary">{formatCurrency(totalSpent)}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Limite Disp.</span>
                        <span className="text-sm font-bold">{formatCurrency(available)}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full transition-all", percent > 90 ? "bg-destructive" : "bg-primary")}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                      <span>FECHAMENTO: DIA {card.closingDay}</span>
                      <span>VENCIMENTO: DIA {card.dueDay}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="w-full min-h-[500px]">
          {selectedCard ? (
            <InvoiceManager
              card={selectedCard}
              invoice={invoices.find(i => i.cardId === selectedCard.id && i.month === monthKey)}
              allInvoices={invoices.filter(i => i.cardId === selectedCard.id)}
              categories={categories}
              monthKey={monthKey}
              onAddItem={item => onAddInvoiceItem(selectedCard.id, monthKey, item)}
              onAddInstallments={onAddInstallments}
              onRemoveItem={onRemoveInvoiceItem}
              onRemoveInstallmentGroup={onRemoveInstallmentGroup}
              onTogglePaid={onTogglePaid}
            />
          ) : (
            <Card className="h-full border-none shadow-lg bg-muted/10 flex flex-col items-center justify-center text-center p-10">
              <div className="bg-card p-6 rounded-full shadow-sm mb-4">
                <Receipt className="h-12 w-12 text-primary opacity-20" />
              </div>
              <h3 className="text-lg font-bold mb-2">Selecione um Cartão</h3>
              <p className="text-sm text-muted-foreground max-w-[300px]">
                Escolha um cartão na lista lateral para visualizar e gerenciar os itens da fatura deste mês.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
