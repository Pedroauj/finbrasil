// Helper compartilhado para autenticação na Pluggy API
const PLUGGY_BASE = "https://api.pluggy.ai";

let cachedApiKey: { key: string; expiresAt: number } | null = null;

export async function getPluggyApiKey(): Promise<string> {
  const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
  const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET não configurados");
  }
  if (cachedApiKey && cachedApiKey.expiresAt > Date.now() + 60_000) {
    return cachedApiKey.key;
  }
  const r = await fetch(`${PLUGGY_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Pluggy /auth falhou [${r.status}]: ${t}`);
  }
  const data = await r.json();
  cachedApiKey = { key: data.apiKey, expiresAt: Date.now() + 110 * 60 * 1000 };
  return data.apiKey;
}

export async function pluggyFetch(path: string, init: RequestInit = {}) {
  const apiKey = await getPluggyApiKey();
  const headers = new Headers(init.headers);
  headers.set("X-API-KEY", apiKey);
  headers.set("Content-Type", "application/json");
  const r = await fetch(`${PLUGGY_BASE}${path}`, { ...init, headers });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Pluggy ${path} [${r.status}]: ${t}`);
  }
  return r.json();
}

export const PLUGGY_BASE_URL = PLUGGY_BASE;
