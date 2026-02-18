import { addDays, format, isValid, parse } from "date-fns";

export type ParsedExpense = {
    date: string; // ISO yyyy-MM-dd
    description: string;
    category: string;
    amount: number;
    status: "paid" | "planned" | "overdue";
    confidence: number;
    missing?: Array<keyof Omit<ParsedExpense, "confidence" | "missing">>;
};

const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
    { category: "Transporte", keywords: ["uber", "99", "onibus", "ônibus", "metrô", "metro", "gasolina", "combust", "estacion"] },
    { category: "Alimentação", keywords: ["mercado", "ifood", "iFood", "lanche", "restaurante", "padaria", "pizza", "burguer", "hamburg"] },
    { category: "Moradia", keywords: ["aluguel", "condominio", "condomínio", "luz", "energia", "água", "internet", "net", "vivo", "claro", "tim"] },
    { category: "Saúde", keywords: ["farmacia", "farmácia", "remedio", "remédio", "consulta", "médico", "medico", "exame"] },
    { category: "Lazer", keywords: ["cinema", "show", "bar", "balada", "jogo", "steam", "psn", "xbox"] },
    { category: "Educação", keywords: ["curso", "udemy", "alura", "faculdade", "mensalidade", "livro"] },
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseAmount(text: string): number | null {
    // aceita: 47,90 | 47.90 | R$ 47,90 | 47
    const m = text.match(/(?:r\$?\s*)?(\d{1,3}(?:[.\s]\d{3})*|\d+)([.,]\d{1,2})?/i);
    if (!m) return null;
    const intPart = m[1].replace(/[.\s]/g, "");
    const decPart = (m[2] ?? "").replace(",", ".");
    const num = Number(`${intPart}${decPart}`);
    return Number.isFinite(num) ? num : null;
}

function parseStatus(text: string): "paid" | "planned" | "overdue" {
    const t = normalize(text);
    if (t.includes("atrasad") || t.includes("vencid")) return "overdue";
    if (t.includes("previst") || t.includes("agend") || t.includes("vai pagar")) return "planned";
    // padrão: pago
    return "paid";
}

function parseDateISO(text: string, baseDate: Date): string | null {
    const t = normalize(text);

    if (t.includes("hoje")) return format(baseDate, "yyyy-MM-dd");
    if (t.includes("ontem")) return format(addDays(baseDate, -1), "yyyy-MM-dd");
    if (t.includes("amanha") || t.includes("amanhã")) return format(addDays(baseDate, 1), "yyyy-MM-dd");

    // dd/mm ou dd/mm/aaaa
    const dm = text.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
    if (dm) {
        const d = dm[1];
        const m = dm[2];
        const y = dm[3] ? dm[3] : String(baseDate.getFullYear());
        const yyyy = y.length === 2 ? `20${y}` : y;

        const parsed = parse(`${d}/${m}/${yyyy}`, "d/M/yyyy", baseDate);
        if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
    }

    return null;
}

function guessCategory(text: string): string | null {
    const t = normalize(text);
    for (const rule of CATEGORY_RULES) {
        if (rule.keywords.some((k) => t.includes(normalize(k)))) return rule.category;
    }
    return null;
}

function guessDescription(text: string): string {
    // tira valores/keywords comuns e limpa
    const cleaned = text
        .replace(/r\$\s*/gi, "")
        .replace(/\b\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d{1,2})?\b/g, "")
        .replace(/\b(hoje|ontem|amanha|amanhã|pago|paguei|previsto|atrasado|vencido)\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();

    return cleaned.length >= 3 ? cleaned : "Gasto";
}

export function parseExpenseText(input: string, baseDate: Date): ParsedExpense {
    const amount = parseAmount(input);
    const status = parseStatus(input);
    const date = parseDateISO(input, baseDate) ?? format(baseDate, "yyyy-MM-dd");
    const category = guessCategory(input) ?? "Outros";
    const description = guessDescription(input);

    const missing: ParsedExpense["missing"] = [];
    if (amount == null) missing.push("amount");
    if (!description) missing.push("description");

    // confiança simples
    let confidence = 0.55;
    if (amount != null) confidence += 0.25;
    if (guessCategory(input)) confidence += 0.10;
    if (parseDateISO(input, baseDate)) confidence += 0.10;

    return {
        date,
        description,
        category,
        amount: amount ?? 0,
        status,
        confidence: Math.min(0.95, confidence),
        ...(missing.length ? { missing } : {}),
    };
}