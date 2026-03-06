import { useState, useMemo } from "react";
import { CreditCard, CreditCardInvoice, InvoiceItem, CardRecurringItem, CardPayment, formatCurrency, getCategoryColor } from "@/types/expense";
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
  Layers, ChevronDown, ChevronUp, FastForward, X, AlertCircle, Info,
  RefreshCw, DollarSign,
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function getInvoicePaymentMonth(purchaseDate: string, closingDay: number): string {
  const [year, month, day] = purchaseDate.split("-").map(Number);
  const monthsToAdd = day <= closingDay ? 1 : 2;
  const target = addMonths(new Date(year, month - 1, 1), monthsToAdd);
  return format(target, "yyyy-MM");
}

function getInvoicePurchasePeriod(paymentMonthKey: string, closingDay: number): { start: string; end: string } {
  const [year, month] = paymentMonthKey.split("-").map(Number);
  const closingMonth = addMonths(new Date(year, month - 1, 1), -1);
  const prevClosingMonth = addMonths(closingMonth, -1);
  const startDay = closingDay + 1;
  const endDay = closingDay;
  return {
    start: format(prevClosingMonth, "yyyy-MM") + `-${String(startDay).padStart(2, "0")}`,
    end: format(closingMonth, "yyyy-MM") + `-${String(endDay).padStart(2, "0")}`,
  };
}

interface InvoiceManagerProps {
  card: CreditCard;
  invoice?: CreditCardInvoice;
  allInvoices: CreditCardInvoice[];
  categories: string[];
  monthKey: string;
  cardRecurringItems: CardRecurringItem[];
  cardPayments: CardPayment[];
  onAddItem: (month: string, item: Omit<InvoiceItem, "id">) => void;
  onAddInstallments: (cardId: string, items: { month: string; item: Omit<InvoiceItem, "id"> }[]) => void;
  onRemoveItem: (invoiceId: string, itemId: string) => void;
  onRemoveInstallmentGroup: (cardId: string, groupId: string) => void;
  onTogglePaid: (invoiceId: string) => void;
  onAddCardRecurringItem: (item: Omit<CardRecurringItem, "id" | "cardId">) => void;
  onToggleCardRecurringItem: (id: string) => void;
  onDeleteCardRecurringItem: (id: string) => void;
  onAddCardPayment: (payment: Omit<CardPayment, "id" | "cardId">) => void;
  onDeleteCardPayment: (id: string) => void;
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
  cardRecurringItems,
  cardPayments,
  onAddItem,
  onAddInstallments,
  onRemoveItem,
  onRemoveInstallmentGroup,
  onTogglePaid,
  onAddCardRecurringItem,
  onToggleCardRecurringItem,
  onDeleteCardRecurringItem,
  onAddCardPayment,
  onDeleteCardPayment,
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

  // Recurring item form
  const [newRecurring, setNewRecurring] = useState({ description: "", amount: "", category: "Outros" });

  // Payment form
  const [newPayment, setNewPayment] = useState({ amount: "", description: "", date: format(new Date(), "yyyy-MM-dd") });

  const activeRecurring = cardRecurringItems.filter(r => r.active);
  const recurringTotal = activeRecurring.reduce((s, r) => s + r.amount, 0);
  const invoiceItemsTotal = invoice?.items.reduce((sum, item) => sum + item.amount, 0) || 0;
  const totalSpent = invoiceItemsTotal + recurringTotal;
  const isPaid = invoice?.isPaid || false;

  const monthPayments = cardPayments.filter(p => p.month === monthKey);
  const totalPayments = monthPayments.reduce((s, p) => s + p.amount, 0);

  const purchasePeriod = useMemo(() => {
    const period = getInvoicePurchasePeriod(monthKey, card.closingDay);
    const [sy, sm, sd] = period.start.split("-").map(Number);
    const [ey, em, ed] = period.end.split("-").map(Number);
    const startDate = new Date(sy, sm - 1, sd);
    const endDate = new Date(ey, em - 1, ed);
    return {
      startLabel: format(startDate, "dd/MMM", { locale: ptBR }),
      endLabel: format(endDate, "dd/MMM", { locale: ptBR }),
    };
  }, [monthKey, card.closingDay]);

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
    return Array.from(groups.values()).filter(g =>
      g.items.some(i => i.monthKey === monthKey)
    );
  })();

  const regularItems = (invoice?.items || []).filter(i => !i.installmentGroupId);

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
      const firstPaymentMonth = getInvoicePaymentMonth(newItem.date, card.closingDay);
      const [baseYear, baseMonth] = firstPaymentMonth.split("-").map(Number);
      const itemsToCreate: { month: string; item: Omit<InvoiceItem, "id"> }[] = [];

      for (let i = 0; i < count; i++) {
        const targetDate = addMonths(new Date(baseYear, baseMonth - 1, 1), i);
        const targetMonth = format(targetDate, "yyyy-MM");
        itemsToCreate.push({
          month: targetMonth,
          item: {
            description: `${newItem.description} (${i + 1}/${count})`,
            amount: installmentAmount,
            category: newItem.category,
            date: newItem.date,
            installmentGroupId: groupId,
            installmentCurrent: i + 1,
            installmentTotal: count,
            totalPurchaseAmount: total,
          },
        });
      }
      onAddInstallments(card.id, itemsToCreate);
    } else {
      const targetMonth = getInvoicePaymentMonth(newItem.date, card.closingDay);
      onAddItem(targetMonth, {
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

  const handleAddRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecurring.description || !newRecurring.amount) return;
    onAddCardRecurringItem({
      description: newRecurring.description,
      amount: parseFloat(newRecurring.amount),
      category: newRecurring.category,
      active: true,
    });
    setNewRecurring({ description: "", amount: "", category: "Outros" });
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.amount) return;
    onAddCardPayment({
      amount: parseFloat(newPayment.amount),
      date: newPayment.date,
      description: newPayment.description || "Pagamento antecipado",
      month: monthKey,
    });
    setNewPayment({ amount: "", description: "", date: format(new Date(), "yyyy-MM-dd") });
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
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={isPaid ? "default" : "destructive"} className="text-[10px] uppercase font-black">
              {isPaid ? "Paga" : "Aberta"}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">
              Vence dia {card.dueDay} de {format(new Date(monthKey + "-01"), "MMM", { locale: ptBR })}
            </span>
            <span className="text-[10px] text-muted-foreground">
              • Compras de {purchasePeriod.startLabel} a {purchasePeriod.endLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total da Fatura</p>
            <p className="text-xl font-black text-primary">{formatCurrency(totalSpent)}</p>
            {totalPayments > 0 && (
              <p className="text-[10px] text-emerald-600 font-bold">
                Créditos: -{formatCurrency(totalPayments)}
              </p>
            )}
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
        {/* Form sidebar */}
        <div className="w-full lg:w-[340px] p-4 border-b lg:border-b-0 lg:border-r bg-muted/5 overflow-y-auto">
          <Tabs defaultValue="item" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="item" className="text-xs">Item</TabsTrigger>
              <TabsTrigger value="recurring" className="text-xs">Recorrente</TabsTrigger>
              <TabsTrigger value="payment" className="text-xs">Crédito</TabsTrigger>
            </TabsList>

            {/* Add Item Tab */}
            <TabsContent value="item" className="space-y-4 mt-0">
              <form onSubmit={handleAddItem} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Novo Item</Label>
                  <Input
                    placeholder="O que você comprou?"
                    value={newItem.description}
                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                    className="bg-card"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
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
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold uppercase text-muted-foreground">Data</Label>
                    <Input
                      type="date" value={newItem.date}
                      onChange={e => setNewItem({ ...newItem, date: e.target.value })}
                      className="bg-card p-1"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Categoria</Label>
                  <Select value={newItem.category} onValueChange={v => setNewItem({ ...newItem, category: v })}>
                    <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Parcelado?</span>
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
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold uppercase text-muted-foreground">Nº de Parcelas</Label>
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

              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    O item será adicionado na fatura correta com base na data e no fechamento ({card.closingDay}).
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Recurring Tab */}
            <TabsContent value="recurring" className="space-y-4 mt-0">
              <form onSubmit={handleAddRecurring} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Gasto Recorrente</Label>
                  <Input
                    placeholder="Ex: Netflix, Spotify..."
                    value={newRecurring.description}
                    onChange={e => setNewRecurring({ ...newRecurring, description: e.target.value })}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Valor Mensal</Label>
                  <Input
                    type="number" placeholder="0,00"
                    value={newRecurring.amount}
                    onChange={e => setNewRecurring({ ...newRecurring, amount: e.target.value })}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Categoria</Label>
                  <Select value={newRecurring.category} onValueChange={v => setNewRecurring({ ...newRecurring, category: v })}>
                    <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full gap-2 shadow-md">
                  <RefreshCw className="h-4 w-4" />
                  Adicionar Recorrente
                </Button>
              </form>

              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Gastos recorrentes aparecem automaticamente em todas as faturas enquanto estiverem ativos.
                  </p>
                </div>
              </div>

              {/* List of recurring items */}
              {cardRecurringItems.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Seus Recorrentes</Label>
                  {cardRecurringItems.map(item => (
                    <div key={item.id} className={cn(
                      "flex items-center justify-between p-3 rounded-xl border bg-card",
                      !item.active && "opacity-50"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: getCategoryColor(item.category) }}>
                          <RefreshCw className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                          <span className="text-sm font-bold">{item.description}</span>
                          <p className="text-[10px] text-muted-foreground">{item.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-primary">{formatCurrency(item.amount)}</span>
                        <Switch checked={item.active} onCheckedChange={() => onToggleCardRecurringItem(item.id)} />
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onDeleteCardRecurringItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Payment/Credit Tab */}
            <TabsContent value="payment" className="space-y-4 mt-0">
              <form onSubmit={handleAddPayment} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Valor do Crédito</Label>
                  <Input
                    type="number" placeholder="0,00"
                    value={newPayment.amount}
                    onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Descrição</Label>
                  <Input
                    placeholder="Ex: Pagamento antecipado"
                    value={newPayment.description}
                    onChange={e => setNewPayment({ ...newPayment, description: e.target.value })}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Data</Label>
                  <Input
                    type="date" value={newPayment.date}
                    onChange={e => setNewPayment({ ...newPayment, date: e.target.value })}
                    className="bg-card p-1"
                  />
                </div>
                <Button type="submit" className="w-full gap-2 shadow-md">
                  <DollarSign className="h-4 w-4" />
                  Lançar Crédito
                </Button>
              </form>

              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Créditos liberam limite no cartão. Use para pagamentos antecipados ou estornos que aumentam o limite disponível neste mês.
                  </p>
                </div>
              </div>

              {/* List of payments for current month */}
              {monthPayments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground">Créditos deste mês</Label>
                  {monthPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border bg-card">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-sm font-bold">{p.description}</span>
                          <p className="text-[10px] text-muted-foreground">
                            {(() => { const [y,m,d] = p.date.split("-").map(Number); return format(new Date(y,m-1,d), "dd/MM/yyyy"); })()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-emerald-600">+{formatCurrency(p.amount)}</span>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onDeleteCardPayment(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {futureInstallments > 0 && (
            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 mt-4">
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
              {!invoice && installmentGroups.length === 0 && regularItems.length === 0 && activeRecurring.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                  <ShoppingBag className="h-12 w-12 mb-3" />
                  <p className="text-sm font-medium">Sua fatura está vazia</p>
                  <p className="text-xs">Comece adicionando seus gastos</p>
                </div>
              ) : (
                <>
                  {/* Active recurring items */}
                  {activeRecurring.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                        <RefreshCw className="h-3 w-3" /> Recorrentes ({formatCurrency(recurringTotal)})
                      </p>
                      {activeRecurring.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm"
                              style={{ backgroundColor: getCategoryColor(item.category) }}
                            >
                              <RefreshCw className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm leading-tight">{item.description}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[9px] font-black">Recorrente</Badge>
                                <span className="text-[10px] font-black text-primary/60 uppercase">{item.category}</span>
                              </div>
                            </div>
                          </div>
                          <span className="font-black text-base text-primary">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

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
                                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Linha do tempo</p>
                                  <Button
                                    variant="ghost" size="sm"
                                    className="h-6 text-[10px] text-destructive hover:text-destructive gap-1 px-2"
                                    onClick={() => onRemoveInstallmentGroup(card.id, group.groupId)}
                                  >
                                    <X className="h-3 w-3" /> Excluir todas
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
                              {(() => { const [y,m,d] = item.date.split("-").map(Number); return format(new Date(y,m-1,d), "dd 'de' MMM", { locale: ptBR }); })()}
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

                  {/* Payments/Credits in list */}
                  {monthPayments.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                        <DollarSign className="h-3 w-3" /> Créditos ({formatCurrency(totalPayments)})
                      </p>
                      {monthPayments.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm leading-tight">{p.description}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {(() => { const [y,m,d] = p.date.split("-").map(Number); return format(new Date(y,m-1,d), "dd 'de' MMM", { locale: ptBR }); })()}
                              </span>
                            </div>
                          </div>
                          <span className="font-black text-base text-emerald-600">+{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
