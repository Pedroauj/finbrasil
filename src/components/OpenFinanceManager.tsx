import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Building2, RefreshCw, Trash2, Plus, ShieldCheck, AlertTriangle, CheckCircle2, Loader2, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const PLUGGY_CONNECT_SRC = "https://cdn.pluggy.ai/pluggy-connect/v2.10.0/pluggy-connect.js";

declare global {
  interface Window {
    PluggyConnect?: any;
  }
}

interface PluggyConnection {
  id: string;
  pluggy_item_id: string;
  connector_name: string;
  connector_image_url: string | null;
  status: string;
  last_sync_at: string | null;
  is_active: boolean;
  mfa_required: boolean;
}

function statusInfo(status: string): { label: string; color: string; icon: typeof CheckCircle2 } {
  switch (status) {
    case "UPDATED":
      return { label: "Atualizado", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30", icon: CheckCircle2 };
    case "UPDATING":
    case "LOGIN_IN_PROGRESS":
      return { label: "Sincronizando", color: "text-blue-500 bg-blue-500/10 border-blue-500/30", icon: Loader2 };
    case "WAITING_USER_INPUT":
      return { label: "Requer 2FA", color: "text-amber-500 bg-amber-500/10 border-amber-500/30", icon: AlertTriangle };
    case "LOGIN_ERROR":
    case "OUTDATED":
      return { label: "Reconectar", color: "text-destructive bg-destructive/10 border-destructive/30", icon: AlertTriangle };
    default:
      return { label: status, color: "text-muted-foreground bg-muted/30 border-border", icon: Building2 };
  }
}

function loadPluggyScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PluggyConnect) return resolve();
    const existing = document.querySelector(`script[src="${PLUGGY_CONNECT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar Pluggy")));
      return;
    }
    const s = document.createElement("script");
    s.src = PLUGGY_CONNECT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar Pluggy Connect"));
    document.head.appendChild(s);
  });
}

interface Props {
  userId: string;
  userPlan: string;
}

export function OpenFinanceManager({ userId, userPlan }: Props) {
  const [connections, setConnections] = useState<PluggyConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [opening, setOpening] = useState(false);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pluggy_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setConnections((data as any) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  const triggerSync = useCallback(async (itemId: string, connId: string) => {
    setSyncing(connId);
    try {
      const { data, error } = await supabase.functions.invoke("pluggy-sync", { body: { itemId } });
      if (error) throw error;
      if (data?.status === "success") {
        toast.success(`${data.transactionsImported} lançamentos sincronizados`);
      } else {
        toast.info(data?.message ?? "Sincronização iniciada");
      }
      await loadConnections();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao sincronizar");
    } finally {
      setSyncing(null);
    }
  }, [loadConnections]);

  const openPluggy = useCallback(async (existingItemId?: string) => {
    setOpening(true);
    try {
      await loadPluggyScript();
      const { data, error } = await supabase.functions.invoke("pluggy-connect-token", {
        body: existingItemId ? { itemId: existingItemId } : {},
      });
      if (error) {
        const msg = (error as any)?.context?.body
          ? JSON.parse(await (error as any).context.text()).message
          : error.message;
        throw new Error(msg ?? "Erro ao abrir conexão");
      }
      if (!data?.accessToken) throw new Error("Token não recebido");

      const pc = new window.PluggyConnect({
        connectToken: data.accessToken,
        includeSandbox: true,
        onSuccess: async (itemData: any) => {
          toast.success("Banco conectado! Sincronizando dados...");
          const itemId = itemData?.item?.id ?? itemData?.itemId;
          if (itemId) {
            // Aguarda alguns segundos para Pluggy processar
            setTimeout(() => triggerSync(itemId, ""), 3000);
          }
          await loadConnections();
        },
        onError: (err: any) => {
          console.error("Pluggy error:", err);
          toast.error(err?.message ?? "Erro na conexão");
        },
        onClose: () => {
          loadConnections();
        },
      });
      pc.init();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao abrir Pluggy");
    } finally {
      setOpening(false);
      setConsentOpen(false);
    }
  }, [loadConnections, triggerSync]);

  const handleDisconnect = useCallback(async (conn: PluggyConnection) => {
    if (!confirm(`Desconectar ${conn.connector_name}? Os lançamentos importados permanecem no histórico.`)) return;
    try {
      const { error } = await supabase.functions.invoke("pluggy-disconnect", {
        body: { connectionId: conn.id },
      });
      if (error) throw error;
      toast.success("Banco desconectado");
      await loadConnections();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao desconectar");
    }
  }, [loadConnections]);

  const isPaid = userPlan && userPlan !== "free";
  const limitReached = !isPaid && connections.length >= 1;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">Open Finance</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Conecte seus bancos para importar extrato, faturas de cartão e investimentos automaticamente.
              Conexão segura e regulamentada pelo Banco Central.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : connections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">Nenhum banco conectado</p>
          <p className="text-xs text-muted-foreground mt-1">Comece conectando sua primeira conta</p>
        </div>
      ) : (
        <div className="space-y-2">
          {connections.map((conn) => {
            const info = statusInfo(conn.status);
            const StatusIcon = info.icon;
            const isSyncing = syncing === conn.id;
            const needsReconnect = conn.status === "LOGIN_ERROR" || conn.status === "OUTDATED";
            return (
              <div key={conn.id} className="rounded-2xl border border-border/50 bg-card/60 p-3 flex items-center gap-3">
                {conn.connector_image_url ? (
                  <img src={conn.connector_image_url} alt={conn.connector_name} className="h-10 w-10 rounded-lg object-contain bg-white p-1" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{conn.connector_name}</span>
                    <Badge variant="outline" className={cn("text-[10px] gap-1 border", info.color)}>
                      <StatusIcon className={cn("h-3 w-3", isSyncing && "animate-spin")} />
                      {info.label}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {conn.last_sync_at
                      ? `Sincronizado ${new Date(conn.last_sync_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
                      : "Aguardando primeira sincronização"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {needsReconnect ? (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openPluggy(conn.pluggy_item_id)}>
                      Reconectar
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={isSyncing}
                      onClick={() => triggerSync(conn.pluggy_item_id, conn.id)}
                      title="Sincronizar agora"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDisconnect(conn)}
                    title="Desconectar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {limitReached ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-3">
          <Crown className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Limite do plano gratuito atingido</p>
            <p className="text-xs text-muted-foreground mt-0.5">Faça upgrade para conectar bancos ilimitados</p>
          </div>
          <Button size="sm" variant="default" className="shrink-0">Upgrade</Button>
        </div>
      ) : (
        <Button
          onClick={() => { setConsentChecked(false); setConsentOpen(true); }}
          disabled={opening}
          className="w-full h-11 rounded-xl gap-2"
          variant="default"
        >
          {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Conectar banco
        </Button>
      )}

      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Consentimento Open Finance
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2 text-xs leading-relaxed">
              <p>Ao conectar seu banco, você autoriza o FinBrasil a acessar via Open Finance:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Saldos e movimentações de contas</li>
                <li>Faturas e transações de cartão de crédito</li>
                <li>Posição de investimentos</li>
              </ul>
              <p className="pt-2">Os dados são usados apenas para exibição no app e ficam armazenados de forma segura. Você pode revogar o acesso a qualquer momento.</p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 py-2">
            <Checkbox id="consent" checked={consentChecked} onCheckedChange={(v) => setConsentChecked(!!v)} />
            <label htmlFor="consent" className="text-xs leading-relaxed cursor-pointer">
              Li e concordo com o compartilhamento dos meus dados financeiros via Open Finance.
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConsentOpen(false)}>Cancelar</Button>
            <Button disabled={!consentChecked || opening} onClick={() => openPluggy()}>
              {opening ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
