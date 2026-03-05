import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, ArrowRightLeft, Globe, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CURRENCIES = [
  { code: "USD", name: "Dólar Americano", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", name: "Libra Esterlina", flag: "🇬🇧" },
  { code: "ARS", name: "Peso Argentino", flag: "🇦🇷" },
  { code: "JPY", name: "Iene Japonês", flag: "🇯🇵" },
  { code: "CAD", name: "Dólar Canadense", flag: "🇨🇦" },
  { code: "AUD", name: "Dólar Australiano", flag: "🇦🇺" },
  { code: "CHF", name: "Franco Suíço", flag: "🇨🇭" },
  { code: "CNY", name: "Yuan Chinês", flag: "🇨🇳" },
  { code: "BTC", name: "Bitcoin", flag: "₿" },
];

interface RateData {
  rate: number;
  timestamp: number;
  change24h?: number;
}

const CACHE_KEY = "finbrasil.rates";
const CACHE_TTL = 30 * 60 * 1000; // 30 min

function getCachedRates(): Record<string, RateData> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data._ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function setCachedRates(rates: Record<string, RateData>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...rates, _ts: Date.now() }));
  } catch {}
}

export function CurrencyConverter({ className }: { className?: string }) {
  const [from, setFrom] = useState("USD");
  const [amount, setAmount] = useState("1");
  const [rates, setRates] = useState<Record<string, RateData>>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchRates = useCallback(async (force = false) => {
    if (!force) {
      const cached = getCachedRates();
      if (cached) {
        setRates(cached);
        setLastUpdate(new Date(cached._ts as unknown as number));
        return;
      }
    }

    setLoading(true);
    try {
      // Using free exchangerate.host API (no key needed)
      const resp = await fetch("https://open.er-api.com/v6/latest/BRL");
      if (!resp.ok) throw new Error("Falha ao buscar taxas");
      const data = await resp.json();
      
      const newRates: Record<string, RateData> = {};
      CURRENCIES.forEach(c => {
        const rateFromBRL = data.rates?.[c.code];
        if (rateFromBRL) {
          newRates[c.code] = {
            rate: 1 / rateFromBRL, // Convert to "1 CURRENCY = X BRL"
            timestamp: Date.now(),
          };
        }
      });

      setRates(newRates);
      setCachedRates(newRates);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Currency fetch error:", err);
      toast.error("Erro ao buscar cotações. Tente novamente.");
      // Fallback static rates
      setRates({
        USD: { rate: 5.85, timestamp: Date.now() },
        EUR: { rate: 6.35, timestamp: Date.now() },
        GBP: { rate: 7.40, timestamp: Date.now() },
        ARS: { rate: 0.0052, timestamp: Date.now() },
        JPY: { rate: 0.039, timestamp: Date.now() },
        CAD: { rate: 4.10, timestamp: Date.now() },
        AUD: { rate: 3.70, timestamp: Date.now() },
        CHF: { rate: 6.60, timestamp: Date.now() },
        CNY: { rate: 0.80, timestamp: Date.now() },
        BTC: { rate: 520000, timestamp: Date.now() },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const currentRate = rates[from]?.rate ?? 0;
  const amountNum = parseFloat(amount) || 0;
  const converted = amountNum * currentRate;
  const currencyInfo = CURRENCIES.find(c => c.code === from);

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Card className={cn("relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Conversor de Câmbio
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-xl gap-1.5"
            onClick={() => fetchRates(true)}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Atualizar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5 space-y-4">
        {/* Converter */}
        <div className="rounded-2xl border border-border/40 bg-background/30 p-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            {/* From */}
            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">De</label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-2">
                        <span>{c.flag}</span>
                        <span>{c.code}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="h-10 rounded-xl text-center font-semibold"
                placeholder="1.00"
              />
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center pt-6">
              <div className="rounded-full bg-primary/10 p-2">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
              </div>
            </div>

            {/* To BRL */}
            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Para</label>
              <div className="h-10 rounded-xl border border-border/40 bg-muted/30 flex items-center justify-center text-sm font-medium">
                🇧🇷 BRL
              </div>
              <div className="h-10 rounded-xl border border-border/40 bg-muted/30 flex items-center justify-center text-sm font-bold text-primary tabular-nums">
                {fmtBRL(converted)}
              </div>
            </div>
          </div>

          {currentRate > 0 && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              1 {from} = {fmtBRL(currentRate)}
            </p>
          )}
        </div>

        {/* Quick rates */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cotações do dia</p>
          <div className="grid grid-cols-2 gap-2">
            {CURRENCIES.slice(0, 6).map(c => {
              const r = rates[c.code];
              if (!r) return null;
              return (
                <button
                  key={c.code}
                  onClick={() => setFrom(c.code)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all",
                    from === c.code
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/30 bg-background/20 hover:border-border/60"
                  )}
                >
                  <span className="text-base">{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{c.code}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {fmtBRL(r.rate)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {lastUpdate && (
          <p className="text-[10px] text-muted-foreground text-center">
            Última atualização: {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            {" · "}Fonte: Open Exchange Rates
          </p>
        )}
      </CardContent>
    </Card>
  );
}
