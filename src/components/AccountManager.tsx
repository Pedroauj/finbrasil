import { useState, useMemo } from "react";
import { FinancialAccount, AccountType, AccountTransfer, AccountAdjustment, AdjustmentReason, ADJUSTMENT_REASON_LABELS, formatCurrency } from "@/types/expense";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Wallet, Building2, PiggyBank, CreditCard, TrendingUp, ArrowRightLeft,
  Trash2, Pencil, History, Scale, Archive, ArchiveRestore, Filter, Eye,
  Landmark, ArrowUpRight, ArrowDownLeft, CircleDot, ChevronDown, ChevronUp,
} from "lucide-react";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/ui/animations";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  wallet: "Carteira",
  checking: "Banco",
  savings: "Poupança",
  credit_card: "Corretora",
  investment: "Investimento",
};

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ReactNode> = {
  wallet: <Wallet className="h-5 w-5" />,
  checking: <Building2 className="h-5 w-5" />,
  savings: <PiggyBank className="h-5 w-5" />,
  credit_card: <Landmark className="h-5 w-5" />,
  investment: <TrendingUp className="h-5 w-5" />,
};

const ACCOUNT_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

interface AccountManagerProps {
  accounts: FinancialAccount[];
  transfers: AccountTransfer[];
  adjustments: AccountAdjustment[];
  onAdd: (account: Omit<FinancialAccount, "id" | "isActive">) => void;
  onUpdate: (id: string, updates: Partial<FinancialAccount>) => void;
  onDelete: (id: string) => void;
  onTransfer: (fromId: string, toId: string, amount: number, description?: string) => void;
  onAdjust: (accountId: string, amount: number, reason: AdjustmentReason, description?: string) => void;
  onDeleteAdjustment: (id: string) => void;
  onToggleArchive: (id: string, isActive: boolean) => void;
}

export function AccountManager({
  accounts, transfers, adjustments, onAdd, onUpdate, onDelete, onTransfer,
  onAdjust, onDeleteAdjustment, onToggleArchive,
}: AccountManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("");
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);
  const [appliedValue, setAppliedValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");

  // Transfer
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDesc, setTransferDesc] = useState("");

  // Adjust
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState<AdjustmentReason>("manual");
  const [adjustDesc, setAdjustDesc] = useState("");

  // Calculate dynamic balances
  const getAccountBalance = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return 0;
    const initialBalance = account.balance;
    const adjTotal = adjustments
      .filter(a => a.accountId === accountId)
      .reduce((s, a) => s + a.amount, 0);
    const transfersIn = transfers
      .filter(t => t.toAccountId === accountId)
      .reduce((s, t) => s + t.amount, 0);
    const transfersOut = transfers
      .filter(t => t.fromAccountId === accountId)
      .reduce((s, t) => s + t.amount, 0);
    return initialBalance + adjTotal + transfersIn - transfersOut;
  };

  const activeAccounts = accounts.filter(a => a.isActive);
  const archivedAccounts = accounts.filter(a => !a.isActive);

  const filteredAccounts = (showArchived ? archivedAccounts : activeAccounts)
    .filter(a => filterType === "all" || a.type === filterType);

  const totalBalance = activeAccounts.reduce((sum, a) => sum + getAccountBalance(a.id), 0);
  const bankTotal = activeAccounts.filter(a => a.type === "checking" || a.type === "savings").reduce((s, a) => s + getAccountBalance(a.id), 0);
  const investmentTotal = activeAccounts.filter(a => a.type === "investment" || a.type === "credit_card").reduce((s, a) => s + getAccountBalance(a.id), 0);
  const walletTotal = activeAccounts.filter(a => a.type === "wallet").reduce((s, a) => s + getAccountBalance(a.id), 0);

  // Pie chart data
  const pieData = activeAccounts.map(a => ({
    name: a.name, value: Math.max(0, getAccountBalance(a.id)), color: a.color,
  })).filter(d => d.value > 0);

  // History for selected account
  const accountHistory = useMemo(() => {
    if (!selectedAccountId) return [];
    const account = accounts.find(a => a.id === selectedAccountId);
    const items: { id: string; type: string; amount: number; description: string; date: string; icon: React.ReactNode }[] = [];

    // Initial balance
    if (account) {
      items.push({ id: "initial", type: "Saldo Inicial", amount: account.balance, description: "Saldo inicial da conta", date: "-", icon: <CircleDot className="h-4 w-4" /> });
    }

    transfers.filter(t => t.fromAccountId === selectedAccountId).forEach(t => {
      const toAcc = accounts.find(a => a.id === t.toAccountId);
      items.push({ id: t.id, type: "Transferência (saída)", amount: -t.amount, description: `Para ${toAcc?.name || "?"}${t.description ? ` - ${t.description}` : ""}`, date: t.date, icon: <ArrowUpRight className="h-4 w-4 text-destructive" /> });
    });

    transfers.filter(t => t.toAccountId === selectedAccountId).forEach(t => {
      const fromAcc = accounts.find(a => a.id === t.fromAccountId);
      items.push({ id: t.id, type: "Transferência (entrada)", amount: t.amount, description: `De ${fromAcc?.name || "?"}${t.description ? ` - ${t.description}` : ""}`, date: t.date, icon: <ArrowDownLeft className="h-4 w-4 text-[hsl(var(--success))]" /> });
    });

    adjustments.filter(a => a.accountId === selectedAccountId).forEach(a => {
      items.push({ id: a.id, type: `Ajuste: ${ADJUSTMENT_REASON_LABELS[a.reason]}`, amount: a.amount, description: a.description || "", date: a.date, icon: <Scale className="h-4 w-4 text-primary" /> });
    });

    return items.sort((a, b) => (a.date === "-" ? -1 : b.date === "-" ? 1 : b.date.localeCompare(a.date)));
  }, [selectedAccountId, transfers, adjustments, accounts]);

  const resetForm = () => {
    setName(""); setType("checking"); setBalance(""); setColor(ACCOUNT_COLORS[0]);
    setAppliedValue(""); setCurrentValue("");
    setShowAddForm(false); setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const accountData: any = { name, type, balance: parseFloat(balance || "0"), color, icon: type };
    if (type === "investment") {
      accountData.appliedValue = parseFloat(appliedValue || "0");
      accountData.currentValue = parseFloat(currentValue || "0");
    }
    if (editingId) {
      onUpdate(editingId, accountData);
    } else {
      onAdd(accountData);
    }
    resetForm();
  };

  const handleEdit = (account: FinancialAccount) => {
    setName(account.name); setType(account.type); setBalance(account.balance.toString());
    setColor(account.color); setEditingId(account.id);
    setAppliedValue((account.appliedValue || 0).toString());
    setCurrentValue((account.currentValue || 0).toString());
    setShowAddForm(true);
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId || !transferAmount || fromAccountId === toAccountId) return;
    onTransfer(fromAccountId, toAccountId, parseFloat(transferAmount), transferDesc || undefined);
    setFromAccountId(""); setToAccountId(""); setTransferAmount(""); setTransferDesc("");
    setShowTransfer(false);
  };

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !adjustAmount) return;
    onAdjust(selectedAccountId, parseFloat(adjustAmount), adjustReason, adjustDesc || undefined);
    setAdjustAmount(""); setAdjustReason("manual"); setAdjustDesc("");
    setShowAdjust(false);
  };

  const openAdjust = (accountId: string) => {
    setSelectedAccountId(accountId);
    setAdjustAmount(""); setAdjustReason("manual"); setAdjustDesc("");
    setShowAdjust(true);
  };

  const openHistory = (accountId: string) => {
    setSelectedAccountId(accountId);
    setShowHistory(true);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Patrimônio Total", value: totalBalance, icon: <TrendingUp className="h-5 w-5" /> },
          { label: "Total em Bancos", value: bankTotal, icon: <Building2 className="h-5 w-5" /> },
          { label: "Total Investido", value: investmentTotal, icon: <Landmark className="h-5 w-5" /> },
          { label: "Carteira / Dinheiro", value: walletTotal, icon: <Wallet className="h-5 w-5" /> },
        ].map((item, i) => (
          <StaggerItem key={i}>
            <Card className="border-0 shadow-lg rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="rounded-xl p-2 bg-primary/10 text-primary">{item.icon}</div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
                </div>
                <p className={`text-2xl font-bold tabular-nums ${item.value < 0 ? "text-destructive" : "text-[hsl(var(--success))]"}`}>
                  {formatCurrency(item.value)}
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Distribution Chart + Actions */}
      <FadeIn delay={0.1}>
        <Card className="border-0 shadow-lg rounded-2xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 w-full">
                {pieData.length > 0 && (
                  <div className="w-24 h-24 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={45} strokeWidth={2}>
                          {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button onClick={() => setShowTransfer(true)} variant="outline" className="gap-2 rounded-xl" disabled={activeAccounts.length < 2}>
                  <ArrowRightLeft className="h-4 w-4" /> Transferir
                </Button>
                <Button onClick={() => { resetForm(); setShowAddForm(true); }} className="gap-2 rounded-xl">
                  <Plus className="h-4 w-4" /> Nova Conta
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Filters */}
      <FadeIn delay={0.15}>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {["all", "checking", "savings", "wallet", "credit_card", "investment"].map(t => (
            <Button
              key={t} variant={filterType === t ? "default" : "outline"}
              size="sm" className="rounded-xl text-xs"
              onClick={() => setFilterType(t)}
            >
              {t === "all" ? "Todas" : ACCOUNT_TYPE_LABELS[t as AccountType]}
            </Button>
          ))}
          <div className="ml-auto">
            <Button
              variant="ghost" size="sm" className="gap-1.5 rounded-xl text-xs"
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="h-3.5 w-3.5" />
              {showArchived ? "Ver Ativas" : `Arquivadas (${archivedAccounts.length})`}
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
            <Card className="border-0 shadow-lg rounded-2xl">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="font-semibold">{editingId ? "Editar Conta" : "Nova Conta"}</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank" required className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={type} onValueChange={v => setType(v as AccountType)}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map(t => (
                            <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{editingId ? "Saldo Inicial (R$)" : "Saldo Inicial (R$)"}</Label>
                      <Input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0,00" className="rounded-xl" disabled={!!editingId} />
                      {editingId && <p className="text-[10px] text-muted-foreground">Use "Ajustar" para alterar o saldo</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Cor</Label>
                      <div className="flex gap-2 flex-wrap">
                        {ACCOUNT_COLORS.map(c => (
                          <button
                            key={c} type="button"
                            className={`h-8 w-8 rounded-full border-2 transition-all duration-200 ${color === c ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105"}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setColor(c)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {type === "investment" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Valor Aplicado (R$)</Label>
                        <Input type="number" step="0.01" value={appliedValue} onChange={e => setAppliedValue(e.target.value)} placeholder="0,00" className="rounded-xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor Atual (R$)</Label>
                        <Input type="number" step="0.01" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="0,00" className="rounded-xl" />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" className="rounded-xl">{editingId ? "Salvar" : "Adicionar"}</Button>
                    <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl">Cancelar</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Transferir entre Contas</DialogTitle></DialogHeader>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="space-y-2">
              <Label>De</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Conta de origem" /></SelectTrigger>
                <SelectContent>
                  {activeAccounts.map(a => (<SelectItem key={a.id} value={a.id}>{a.name} ({formatCurrency(getAccountBalance(a.id))})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Para</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Conta de destino" /></SelectTrigger>
                <SelectContent>
                  {activeAccounts.filter(a => a.id !== fromAccountId).map(a => (<SelectItem key={a.id} value={a.id}>{a.name} ({formatCurrency(getAccountBalance(a.id))})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0.01" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Input value={transferDesc} onChange={e => setTransferDesc(e.target.value)} placeholder="Ex: Reserva de emergência" className="rounded-xl" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="rounded-xl">Transferir</Button>
              <Button type="button" variant="outline" onClick={() => setShowTransfer(false)} className="rounded-xl">Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Adjust Dialog */}
      <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Ajustar Saldo</DialogTitle></DialogHeader>
          <form onSubmit={handleAdjust} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Saldo atual: <span className="font-semibold text-foreground">{selectedAccountId ? formatCurrency(getAccountBalance(selectedAccountId)) : "-"}</span>
            </p>
            <div className="space-y-2">
              <Label>Valor do Ajuste (R$)</Label>
              <Input type="number" step="0.01" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} required className="rounded-xl" placeholder="Ex: 50 ou -30" />
              <p className="text-[10px] text-muted-foreground">Positivo = soma, Negativo = subtrai</p>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={adjustReason} onValueChange={v => setAdjustReason(v as AdjustmentReason)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ADJUSTMENT_REASON_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea value={adjustDesc} onChange={e => setAdjustDesc(e.target.value)} placeholder="Detalhe o ajuste..." className="rounded-xl" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="rounded-xl">Ajustar</Button>
              <Button type="button" variant="outline" onClick={() => setShowAdjust(false)} className="rounded-xl">Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Histórico — {accounts.find(a => a.id === selectedAccountId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {accountHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma movimentação encontrada.</p>
            ) : (
              accountHistory.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="flex-shrink-0">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.type}</p>
                    {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                    {item.date !== "-" && <p className="text-[10px] text-muted-foreground">{new Date(item.date).toLocaleDateString("pt-BR")}</p>}
                  </div>
                  <p className={`text-sm font-semibold tabular-nums ${item.amount < 0 ? "text-destructive" : "text-[hsl(var(--success))]"}`}>
                    {item.amount >= 0 ? "+" : ""}{formatCurrency(item.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Cards */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAccounts.map(account => {
          const dynamicBalance = getAccountBalance(account.id);
          const isInvestment = account.type === "investment";
          const rentability = isInvestment && (account.appliedValue || 0) > 0
            ? (((account.currentValue || 0) - (account.appliedValue || 0)) / (account.appliedValue || 1)) * 100
            : null;

          return (
            <StaggerItem key={account.id}>
              <Card className={`border-0 shadow-lg overflow-hidden rounded-2xl card-hover ${!account.isActive ? "opacity-60" : ""}`}>
                <div className="h-1 w-full" style={{ backgroundColor: account.color }} />
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl p-2.5" style={{ backgroundColor: account.color + "20" }}>
                        <span style={{ color: account.color }}>{ACCOUNT_TYPE_ICONS[account.type]}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{account.name}</p>
                        <Badge variant="secondary" className="text-[10px] mt-0.5 rounded-lg">
                          {ACCOUNT_TYPE_LABELS[account.type]}
                        </Badge>
                      </div>
                    </div>
                    {!account.isActive && (
                      <Badge variant="outline" className="text-[10px] rounded-lg">Arquivada</Badge>
                    )}
                  </div>

                  <p className={`text-2xl font-bold tabular-nums ${dynamicBalance < 0 ? "text-destructive" : ""}`}>
                    {formatCurrency(dynamicBalance)}
                  </p>

                  {isInvestment && (account.appliedValue || 0) > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Aplicado</span>
                        <span>{formatCurrency(account.appliedValue || 0)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Valor Atual</span>
                        <span>{formatCurrency(account.currentValue || 0)}</span>
                      </div>
                      {rentability !== null && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Rentabilidade</span>
                          <span className={rentability >= 0 ? "text-[hsl(var(--success))] font-medium" : "text-destructive font-medium"}>
                            {rentability >= 0 ? "+" : ""}{rentability.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-1 mt-4 flex-wrap">
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg gap-1 text-xs" onClick={() => openAdjust(account.id)}>
                      <Scale className="h-3.5 w-3.5" /> Ajustar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg gap-1 text-xs" onClick={() => openHistory(account.id)}>
                      <History className="h-3.5 w-3.5" /> Histórico
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg gap-1 text-xs" onClick={() => handleEdit(account)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 rounded-lg gap-1 text-xs" onClick={() => onToggleArchive(account.id, !account.isActive)}>
                      {account.isActive ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => onDelete(account.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {filteredAccounts.length === 0 && (
        <FadeIn>
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p>{showArchived ? "Nenhuma conta arquivada." : "Nenhuma conta encontrada."}</p>
              {!showArchived && <p className="text-xs mt-1">Clique em "Nova Conta" para começar.</p>}
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
