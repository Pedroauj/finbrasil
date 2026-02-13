import { useState } from "react";
import { FinancialAccount, AccountType, formatCurrency } from "@/types/expense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Wallet, Building2, PiggyBank, CreditCard, TrendingUp, ArrowRightLeft, Trash2, Pencil } from "lucide-react";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  wallet: "Carteira",
  checking: "Conta Corrente",
  savings: "Poupança",
  credit_card: "Cartão de Crédito",
  investment: "Investimentos",
};

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ReactNode> = {
  wallet: <Wallet className="h-5 w-5" />,
  checking: <Building2 className="h-5 w-5" />,
  savings: <PiggyBank className="h-5 w-5" />,
  credit_card: <CreditCard className="h-5 w-5" />,
  investment: <TrendingUp className="h-5 w-5" />,
};

const ACCOUNT_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

interface AccountManagerProps {
  accounts: FinancialAccount[];
  onAdd: (account: Omit<FinancialAccount, "id" | "isActive">) => void;
  onUpdate: (id: string, updates: Partial<FinancialAccount>) => void;
  onDelete: (id: string) => void;
  onTransfer: (fromId: string, toId: string, amount: number, description?: string) => void;
}

export function AccountManager({ accounts, onAdd, onUpdate, onDelete, onTransfer }: AccountManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Add form state
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [balance, setBalance] = useState("");
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);

  // Transfer state
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDesc, setTransferDesc] = useState("");

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const resetForm = () => {
    setName("");
    setType("checking");
    setBalance("");
    setColor(ACCOUNT_COLORS[0]);
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    if (editingId) {
      onUpdate(editingId, { name, type, balance: parseFloat(balance || "0"), color });
    } else {
      onAdd({ name, type, balance: parseFloat(balance || "0"), color, icon: type });
    }
    resetForm();
  };

  const handleEdit = (account: FinancialAccount) => {
    setName(account.name);
    setType(account.type);
    setBalance(account.balance.toString());
    setColor(account.color);
    setEditingId(account.id);
    setShowAddForm(true);
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId || !transferAmount || fromAccountId === toAccountId) return;
    onTransfer(fromAccountId, toAccountId, parseFloat(transferAmount), transferDesc || undefined);
    setFromAccountId("");
    setToAccountId("");
    setTransferAmount("");
    setTransferDesc("");
    setShowTransfer(false);
  };

  return (
    <div className="space-y-6">
      {/* Total Balance Card */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Patrimônio Total</p>
              <p className={`text-3xl font-bold tracking-tight ${totalBalance < 0 ? "text-destructive" : "text-[hsl(var(--success))]"}`}>
                {formatCurrency(totalBalance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{accounts.length} conta(s) ativa(s)</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowTransfer(true)} variant="outline" className="gap-2" disabled={accounts.length < 2}>
                <ArrowRightLeft className="h-4 w-4" /> Transferir
              </Button>
              <Button onClick={() => { resetForm(); setShowAddForm(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Nova Conta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-semibold">{editingId ? "Editar Conta" : "Nova Conta"}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nubank" required />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={v => setType(v as AccountType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map(t => (
                        <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Saldo Atual (R$)</Label>
                  <Input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0,00" />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2 flex-wrap">
                    {ACCOUNT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        className={`h-8 w-8 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingId ? "Salvar" : "Adicionar"}</Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir entre Contas</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="space-y-2">
              <Label>De</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta de origem" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Para</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecione a conta de destino" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.id !== fromAccountId).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0.01" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input value={transferDesc} onChange={e => setTransferDesc(e.target.value)} placeholder="Ex: Reserva de emergência" />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Transferir</Button>
              <Button type="button" variant="outline" onClick={() => setShowTransfer(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Account Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map(account => (
          <Card key={account.id} className="border-0 shadow-lg overflow-hidden">
            <div className="h-1.5 w-full" style={{ backgroundColor: account.color }} />
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-2.5" style={{ backgroundColor: account.color + "20" }}>
                    <span style={{ color: account.color }}>{ACCOUNT_TYPE_ICONS[account.type]}</span>
                  </div>
                  <div>
                    <p className="font-semibold">{account.name}</p>
                    <Badge variant="secondary" className="text-[10px] mt-0.5">
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(account)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(account.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${account.balance < 0 ? "text-destructive" : ""}`}>
                {formatCurrency(account.balance)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {accounts.length === 0 && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center text-muted-foreground">
            Nenhuma conta cadastrada. Clique em "Nova Conta" para começar.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
