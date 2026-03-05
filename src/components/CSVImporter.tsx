import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Upload, FileSpreadsheet, Check, AlertTriangle, X, ArrowRight, Loader2, Download,
} from "lucide-react";
import { DEFAULT_CATEGORIES } from "@/types/expense";

const cardClass = "rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm";

interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  category: string;
  valid: boolean;
  error?: string;
}

interface CSVImporterProps {
  accounts: Array<{ id: string; name: string }>;
  categories: string[];
  onImport: (expenses: Array<{
    date: string;
    description: string;
    amount: number;
    category: string;
    status: "paid";
    account_id?: string;
  }>) => void;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if ((char === "," || char === ";") && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}

function guessCategory(desc: string): string {
  const lower = desc.toLowerCase();
  const map: Record<string, string[]> = {
    "Alimentação": ["restaurante", "ifood", "mercado", "supermercado", "padaria", "lanche", "pizza", "burger", "mcdonald", "subway", "rappi"],
    "Transporte": ["uber", "99", "combustível", "gasolina", "estacionamento", "pedágio", "metrô", "ônibus"],
    "Moradia": ["aluguel", "condomínio", "iptu", "luz", "energia", "água", "gás"],
    "Saúde": ["farmácia", "médico", "hospital", "plano de saúde", "drogaria", "consulta"],
    "Educação": ["curso", "faculdade", "escola", "livro", "udemy", "alura"],
    "Lazer": ["cinema", "netflix", "spotify", "show", "viagem", "hotel", "bar"],
    "Compras": ["amazon", "mercado livre", "shopee", "magalu", "americanas", "roupa"],
  };
  for (const [cat, keywords] of Object.entries(map)) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return "Outros";
}

function parseDate(raw: string): string | null {
  // Try DD/MM/YYYY
  const brMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Try YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function parseAmount(raw: string): number | null {
  // Handle "R$ 1.234,56" or "1234.56" or "-1234,56"
  let cleaned = raw.replace(/[R$\s]/g, "");
  // BR format: 1.234,56
  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.abs(num);
}

export function CSVImporter({ accounts, categories, onImport }: CSVImporterProps) {
  const [step, setStep] = useState<"upload" | "mapping" | "review" | "done">("upload");
  const [rawLines, setRawLines] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{ date: number; description: number; amount: number }>({ date: 0, description: 1, amount: 2 });
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        toast.error("Arquivo vazio ou sem dados suficientes.");
        return;
      }

      const parsed = lines.map(l => parseCSVLine(l));
      setHeaders(parsed[0]);
      setRawLines(parsed.slice(1));

      // Auto-detect columns
      const h = parsed[0].map(x => x.toLowerCase());
      const dateIdx = h.findIndex(x => ["data", "date", "dt"].some(k => x.includes(k)));
      const descIdx = h.findIndex(x => ["descri", "desc", "histórico", "historico", "memo", "detail"].some(k => x.includes(k)));
      const amtIdx = h.findIndex(x => ["valor", "amount", "value", "vl", "quantia"].some(k => x.includes(k)));

      setMapping({
        date: dateIdx >= 0 ? dateIdx : 0,
        description: descIdx >= 0 ? descIdx : 1,
        amount: amtIdx >= 0 ? amtIdx : 2,
      });

      setStep("mapping");
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const processMapping = useCallback(() => {
    const rows: ParsedRow[] = rawLines.map(cols => {
      const rawDate = cols[mapping.date] || "";
      const rawDesc = cols[mapping.description] || "";
      const rawAmt = cols[mapping.amount] || "";

      const date = parseDate(rawDate);
      const amount = parseAmount(rawAmt);
      const description = rawDesc.trim();

      if (!date) return { date: "", description, amount: 0, category: "Outros", valid: false, error: "Data inválida" };
      if (!amount || amount === 0) return { date, description, amount: 0, category: "Outros", valid: false, error: "Valor inválido" };
      if (!description) return { date, description: "Sem descrição", amount: amount || 0, category: "Outros", valid: false, error: "Sem descrição" };

      return {
        date,
        description,
        amount,
        category: guessCategory(description),
        valid: true,
      };
    });

    setParsedRows(rows);
    setStep("review");
  }, [rawLines, mapping]);

  const handleImport = useCallback(async () => {
    const validRows = parsedRows.filter(r => r.valid);
    if (validRows.length === 0) {
      toast.error("Nenhuma linha válida para importar.");
      return;
    }

    setImporting(true);
    try {
      const toImport = validRows.map(r => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        category: r.category,
        status: "paid" as const,
        account_id: selectedAccount || undefined,
      }));

      onImport(toImport);
      toast.success(`${validRows.length} despesas importadas com sucesso!`);
      setStep("done");
    } catch {
      toast.error("Erro ao importar despesas.");
    } finally {
      setImporting(false);
    }
  }, [parsedRows, selectedAccount, onImport]);

  const validCount = parsedRows.filter(r => r.valid).length;
  const invalidCount = parsedRows.filter(r => !r.valid).length;

  return (
    <Card className={cn(cardClass, "overflow-hidden")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          Importar Extrato CSV
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {/* STEP: UPLOAD */}
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div
                className="border-2 border-dashed border-border/60 rounded-2xl p-10 text-center cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm font-medium mb-1">Arraste ou clique para enviar</p>
                <p className="text-xs text-muted-foreground">
                  Aceita arquivos .csv com colunas de data, descrição e valor
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>
              <div className="mt-4 rounded-2xl bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Formatos aceitos:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Datas: DD/MM/AAAA ou AAAA-MM-DD</li>
                  <li>• Valores: R$ 1.234,56 ou 1234.56</li>
                  <li>• Separador: vírgula (,) ou ponto-e-vírgula (;)</li>
                  <li>• Categorias detectadas automaticamente pela descrição</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* STEP: MAPPING */}
          {step === "mapping" && (
            <motion.div key="mapping" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Identifiquemos as colunas do seu arquivo ({rawLines.length} linhas encontradas):
              </p>

              <div className="grid gap-3">
                {(["date", "description", "amount"] as const).map(field => (
                  <div key={field} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-24">
                      {field === "date" ? "📅 Data" : field === "description" ? "📝 Descrição" : "💰 Valor"}
                    </span>
                    <Select
                      value={String(mapping[field])}
                      onValueChange={v => setMapping(prev => ({ ...prev, [field]: parseInt(v) }))}
                    >
                      <SelectTrigger className="h-10 rounded-xl flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {headers.map((h, i) => (
                          <SelectItem key={i} value={String(i)}>{h || `Coluna ${i + 1}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="rounded-2xl bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Prévia (3 primeiras linhas):</p>
                {rawLines.slice(0, 3).map((cols, i) => (
                  <div key={i} className="text-xs text-muted-foreground flex gap-4 py-1">
                    <span>📅 {cols[mapping.date]}</span>
                    <span className="flex-1 truncate">📝 {cols[mapping.description]}</span>
                    <span>💰 {cols[mapping.amount]}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="h-10 rounded-xl" onClick={() => setStep("upload")}>Voltar</Button>
                <Button className="h-10 rounded-xl flex-1 gap-2" onClick={processMapping}>
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP: REVIEW */}
          {step === "review" && (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="rounded-lg gap-1.5 bg-primary/10 text-primary border-primary/20">
                  <Check className="h-3 w-3" /> {validCount} válidas
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="outline" className="rounded-lg gap-1.5 bg-destructive/10 text-destructive border-destructive/20">
                    <AlertTriangle className="h-3 w-3" /> {invalidCount} inválidas
                  </Badge>
                )}
              </div>

              {accounts.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Conta destino:</span>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger className="h-10 rounded-xl flex-1">
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1.5">
                  {parsedRows.slice(0, 50).map((row, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-2 text-xs rounded-xl px-3 py-2",
                        row.valid ? "bg-muted/20" : "bg-destructive/5 text-destructive"
                      )}
                    >
                      {row.valid ? <Check className="h-3 w-3 text-primary shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                      <span className="w-20 shrink-0">{row.date}</span>
                      <span className="flex-1 truncate">{row.description}</span>
                      <Badge variant="outline" className="text-[10px] rounded-md shrink-0">{row.category}</Badge>
                      <span className="font-semibold shrink-0 w-24 text-right">
                        {row.valid ? `R$ ${row.amount.toFixed(2)}` : row.error}
                      </span>
                    </div>
                  ))}
                  {parsedRows.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      ... e mais {parsedRows.length - 50} linhas
                    </p>
                  )}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Button variant="outline" className="h-10 rounded-xl" onClick={() => setStep("mapping")}>Voltar</Button>
                <Button
                  className="h-10 rounded-xl flex-1 gap-2"
                  onClick={handleImport}
                  disabled={importing || validCount === 0}
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {importing ? "Importando..." : `Importar ${validCount} despesas`}
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP: DONE */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
              <div className="h-16 w-16 rounded-full bg-primary/10 mx-auto mb-4 grid place-items-center">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-semibold mb-1">Importação concluída!</p>
              <p className="text-sm text-muted-foreground mb-6">{validCount} despesas foram adicionadas com sucesso.</p>
              <Button variant="outline" className="h-10 rounded-xl" onClick={() => { setStep("upload"); setParsedRows([]); setRawLines([]); }}>
                Importar outro arquivo
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
