import { useState } from "react";
import { CreditCard, CreditCardInvoice, InvoiceItem, formatCurrency, getCategoryColor } from "@/types/expense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Receipt, Trash2, CheckCircle2, Circle, ShoppingBag,
  Layers, ChevronDown, ChevronUp, FastForward, X, AlertCircle,
} from "lucide-react";
import { format, parseISO, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface InvoiceManagerProps {
  card: CreditCard;
  invoice?: CreditCardInvoice;
  allInvoices: CreditCardInvoice[];
  categories: string[];
  monthKey: string;
  onAddItem: (item: Omit<InvoiceItem, "id">) => void;
  onAddInstallments: (cardId: string, items: { month: string; item: Omit<InvoiceItem, "id"> }[]) => void;
  onRemoveItem: (invoiceId: string, itemId: string) => void;
  onRemoveInstallmentGroup: (cardId: string, groupId: string) => void;
  onTogglePaid: (invoiceId: string) => void;
}

interface InstallmentGroup {
  groupId: string;
  description: string;
  category: string;
  totalAmount: number;
  installmentTotal: number;
  items: (InvoiceItem & { monthKey: string; invoiceId: string })[];
}

export function InvoiceManager({
  card,
  invoice,
  allInvoices,
  categories,
  monthKey,
  onAddItem,
  onAddInstallments,
  onRemoveItem,
  onRemoveInstallmentGroup,
  onTogglePaid,
}: InvoiceManagerProps) {
  const [newItem, setNewItem] = useState({
    description: "",
    amount: "",
    category: "Outros",
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState("2");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const totalSpent = invoice?.items.reduce((sum, item) => sum + item.amount, 0) || 0;
  const isPaid = invoice?.isPaid || false;

  // Gather all installment groups for this card across all months
  const installmentGroups: InstallmentGroup[] = (() => {
    const groups = new Map<string, InstallmentGroup>();
    allInvoices
      .filter(inv => inv.cardId === card.id)
      .forEach(inv => {
        inv.items.forEach(item => {
          if (item.installmentGroupId) {
            if (!groups.has(item.installmentGroupId)) {
              groups.set(item.installmentGroupId, {
                groupId: item.installmentGroupId,
                description: item.description.replace(/ \(\d+\/\d+\)$/, ""),
                category: item.category,
                totalAmount: item.totalPurchaseAmount || item.amount * (item.installmentTotal || 1),
                installmentTotal: item.installmentTotal || 1,
                items: [],
              });
            }
            groups.get(item.installmentGroupId)!.items.push({
              ...item,
              monthKey: inv.month,
              invoiceId: inv.id,
            });
          }
        });
      });
    // Only return groups that have at least one installment in the current month
    return Array.from(groups.values()).filter(g =>
      g.items.some(i => i.monthKey === monthKey)
    );
  })();

  // Regular items (non-installment) in current invoice
  const regularItems = (invoice?.items || []).filter(i => !i.installmentGroupId);

  // Future commitments (parcelas after current month from this card)
  const futureInstallments = allInvoices
    .filter(inv => inv.cardId === card.id && inv.month > monthKey)
    .flatMap(inv => inv.items.filter(i => i.installmentGroupId))
    .reduce((sum, i) => sum + i.amount, 0);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description || !newItem.amount) return;
    const total = parseFloat(newItem.amount);
    const count = parseInt(installmentCount) || 1;

    if (isInstallment && count > 1) {
      const groupId = crypto.randomUUID();
      const installmentAmount = parseFloat((total / count).toFixed(2));
      const [baseYear, baseMonth] = monthKey.split("-").map(Number);
      const itemsToCreate: { month: string; item: Omit<InvoiceItem, "id"> }[] = [];

      for (let i = 0; i < count; i++) {
        const targetDate = addMonths(new Date(baseYear, baseMonth - 1, 1), i);
        const targetMonth = format(targetDate, "yyyy-MM");
        const targetDay = newItem.date.split("-")[2];
        const targetDateStr = `${targetMonth}-${targetDay}`;

        itemsToCreate.push({
          month: targetMonth,
          item: {
            description: `${newItem.description} (${i + 1}/${count})`,
            amount: installmentAmount,
            category: newItem.category,
            date: targetDateStr,
            installmentGroupId: groupId,
            installmentCurrent: i + 1,
            installmentTotal: count,
            totalPurchaseAmount: total,
          },
        });
      }
      onAddInstallments(card.id, itemsToCreate);
    } else {
      onAddItem({
        description: newItem.description,
        amount: total,
        category: newItem.category,
        date: newItem.date,
      });
    }

    setNewItem({ description: "", amount: "", category: "Outros", date: format(new Date(), "yyyy-MM-dd") });
    setIsInstallment(false);
    setInstallmentCount("2");
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  };

  const installmentValue = isInstallment && parseFloat(newItem.amount) > 0 && parseInt(installmentCount) > 1
    ? parseFloat(newItem.amount) / parseInt(installmentCount)
    : null;

  return (
    <Card className="border-none shadow-lg h-full flex flex-col overflow-hidden bg-card/50 backdrop-blur-sm">
      <CardHeader className="bg-primary/5 border-b py-5 flex flex-row items-center justify-between space-y-0">
        <div className="flex flex-col">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Fatura de {format(new Date(monthKey + "-01"), "MMMM", { locale: ptBR })}
          </CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={isPaid ? "default" : "destructive"} className="text-[10px] uppercase font-black">
              {isPaid ? "Paga" : "Aberta"}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">Vence dia {card.dueDay}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total da Fatura</p>
            <p className="text-xl font-black text-primary">{formatCurrency(totalSpent)}</p>
            {futureInstallments > 0 && (
              <p className="text-[10px] text-muted-foreground">
                + {formatCurrency(futureInstallments)} em parcelas futuras
              </p>
            )}
          </div>
          {invoice && (
            <Button
              variant="outline" size="sm"
              className={cn("gap-2 rounded-lg", isPaid && "bg-primary/10 text-primary border-primary/20")}
              onClick={() => onTogglePaid(invoice.id)}
            >
              {isPaid ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              {isPaid ? "Paga" : "Marcar Paga"}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Form */}
        <div className="w-full lg:w-[320px] p-6 border-b lg:border-b-0 lg:border-r bg-muted/5 space-y-4">
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase text-muted-foreground">Novo Item</Label>
              <Input
                placeholder="O que você comprou?"
                value={newItem.description}
                onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                className="bg-card"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase text-muted-foreground">
                  {isInstallment ? "Valor Total" : "Valor"}
                </Label>
                <Input
                  type="number" placeholder="0,00"
                  value={newItem.amount}
                  onChange={e => setNewItem({ ...newItem, amount: e.target.value })}
                  className="bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase text-muted-foreground">Data</Label>
                <Input
                  type="date" value={newItem.date}
                  onChange={e => setNewItem({ ...newItem, date: e.target.value })}
                  className="bg-card p-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase text-muted-foreground">Categoria</Label>
              <Select value={newItem.category} onValueChange={v => setNewItem({ ...newItem, category: v })}>
                <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Installment toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Compra parcelada?</span>
              </div>
              <Switch checked={isInstallment} onCheckedChange={setIsInstallment} />
            </div>

            <AnimatePresence>
              {isInstallment && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-3"
                >
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase text-muted-foreground">
                      Nº de Parcelas
                    </Label>
                    <div className="flex gap-2 flex-wrap">
                      {[2, 3, 4, 6, 10, 12, 18, 24].map(n => (
                        <button
                          key={n} type="button"
                          onClick={() => setInstallmentCount(String(n))}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                            installmentCount === String(n)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border hover:border-primary/50"
                          )}
                        >
                          {n}x
                        </button>
                      ))}
                      <Input
                        type="number" min="2" max="60"
                        value={installmentCount}
                        onChange={e => setInstallmentCount(e.target.value)}
                        className="w-16 h-8 text-xs bg-card text-center"
                        placeholder="Nº"
                      />
                    </div>
                  </div>
                  {installmentValue !== null && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-card border">
                      <AlertCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="text-xs">
                        <span className="font-bold">{installmentCount}x </span>
                        <span className="text-primary font-black">{formatCurrency(installmentValue)}</span>
                        <span className="text-muted-foreground"> por mês</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" className="w-full gap-2 shadow-md">
              <Plus className="h-4 w-4" />
              {isInstallment ? `Parcelar em ${installmentCount}x` : "Adicionar na Fatura"}
            </Button>
          </form>

          {/* Future commitments summary */}
          {futureInstallments > 0 && (
            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-1">
                <FastForward className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[11px] font-bold uppercase text-amber-600">Compromisso Futuro</span>
              </div>
              <p className="text-sm font-black text-amber-600">{formatCurrency(futureInstallments)}</p>
              <p className="text-[10px] text-muted-foreground">em parcelas nos próximos meses</p>
            </div>
          )}
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 h-[400px] lg:h-full">
            <div className="p-6 space-y-3">
              {!invoice && installmentGroups.length === 0 && regularItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                  <ShoppingBag className="h-12 w-12 mb-3" />
                  <p className="text-sm font-medium">Sua fatura está vazia</p>
                  <p className="text-xs">Comece adicionando seus gastos acima</p>
                </div>
              ) : (
                <>
                  {/* Installment groups */}
                  {installmentGroups.map(group => {
                    const currentItem = group.items.find(i => i.monthKey === monthKey);
                    const isExpanded = expandedGroups.has(group.groupId);
                    const paidCount = group.items.filter(i => i.monthKey <= monthKey).length;

                    return (
                      <motion.div
                        key={group.groupId}
                        layout
                        className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* Header row */}
                        <div className="flex items-center justify-between p-4 gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0 relative"
                              style={{ backgroundColor: getCategoryColor(group.category) }}
                            >
                              <Layers className="h-5 w-5" />
                              <div className="absolute -bottom-0.5 -right-0.5 bg-primary rounded-full w-4 h-4 flex items-center justify-center">
                                <span className="text-[8px] font-black text-primary-foreground">
                                  {currentItem?.installmentCurrent}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm leading-tight truncate">{group.description}</span>
                                <Badge variant="secondary" className="text-[9px] font-black shrink-0">
                                  {currentItem?.installmentCurrent}/{group.installmentTotal}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-primary/60 uppercase">{group.category}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  Total: {formatCurrency(group.totalAmount)}
                                </span>
                              </div>
                              {/* Progress bar */}
                              <div className="w-full h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${(paidCount / group.installmentTotal) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-right">
                              <p className="font-black text-base text-primary">
                                {formatCurrency(currentItem?.amount || 0)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">por mês</p>
                            </div>
                            <button
                              onClick={() => toggleGroup(group.groupId)}
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Expanded parcelas timeline */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t px-4 py-3 bg-muted/20 space-y-1.5">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                                    Linha do tempo
                                  </p>
                                  <Button
                                    variant="ghost" size="sm"
                                    className="h-6 text-[10px] text-destructive hover:text-destructive gap-1 px-2"
                                    onClick={() => onRemoveInstallmentGroup(card.id, group.groupId)}
                                  >
                                    <X className="h-3 w-3" /> Excluir todas as parcelas
                                  </Button>
                                </div>
                                {group.items
                                  .sort((a, b) => (a.installmentCurrent || 0) - (b.installmentCurrent || 0))
                                  .map(item => {
                                    const isPast = item.monthKey < monthKey;
                                    const isCurrent = item.monthKey === monthKey;
                                    const isFuture = item.monthKey > monthKey;
                                    return (
                                      <div
                                        key={item.id}
                                        className={cn(
                                          "flex items-center justify-between py-1.5 px-2 rounded-lg text-xs",
                                          isCurrent && "bg-primary/10 border border-primary/20 font-semibold",
                                          isPast && "opacity-50",
                                          isFuture && "text-muted-foreground"
                                        )}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            isPast ? "bg-muted-foreground" : isCurrent ? "bg-primary" : "bg-border"
                                          )} />
                                          <span>
                                            {item.installmentCurrent}/{group.installmentTotal} —{" "}
                                            {format(new Date(item.monthKey + "-01"), "MMM/yy", { locale: ptBR })}
                                          </span>
                                          {isCurrent && <Badge variant="secondary" className="text-[8px]">Atual</Badge>}
                                          {isFuture && <Badge variant="outline" className="text-[8px] text-muted-foreground">Futuro</Badge>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold">{formatCurrency(item.amount)}</span>
                                          {isCurrent && (
                                            <button
                                              onClick={() => onRemoveItem(item.invoiceId, item.id)}
                                              className="text-muted-foreground hover:text-destructive"
                                            >
                                              <X className="h-3 w-3" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}

                  {/* Regular items */}
                  {regularItems.map(item => (
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
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => onRemoveItem(invoice!.id, item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
