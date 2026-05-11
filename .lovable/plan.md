
# Open Finance via Pluggy

Integrar bancos brasileiros ao FinBrasil usando Pluggy como agregador. Usuário conecta seu banco uma vez e o app sincroniza extrato, faturas de cartão e investimentos automaticamente.

## Pré-requisitos (você precisa fazer)

1. Criar conta gratuita em https://dashboard.pluggy.ai
2. Em **Aplicações**, gerar:
   - `PLUGGY_CLIENT_ID`
   - `PLUGGY_CLIENT_SECRET`
3. Habilitar sandbox (gratuito, com bancos de teste tipo "Pluggy Bank")
4. Para produção depois: ativar bancos reais (custo ~R$ 0,50–2/conexão/mês)

Vou pedir as duas chaves via secrets quando você aprovar o plano.

## Arquitetura

```text
[Frontend React]
   │ 1. pede connect token
   ▼
[Edge Fn: pluggy-connect-token] ──► Pluggy API
   │ 2. retorna token
   ▼
[Pluggy Connect Widget] ◄── usuário escolhe banco e autentica
   │ 3. itemId criado
   ▼
[Edge Fn: pluggy-sync] ──► Pluggy API (accounts, transactions, investments)
   │ 4. grava no Supabase
   ▼
[Tabelas: pluggy_connections, financial_accounts, expenses, extra_incomes]

[Webhook Pluggy] ──► [Edge Fn: pluggy-webhook] (sync incremental automático)
```

## Banco de dados

Nova tabela `pluggy_connections`:
- `user_id`, `pluggy_item_id`, `connector_name` (ex: "Itaú"), `connector_image_url`
- `status` (UPDATED, OUTDATED, LOGIN_ERROR, WAITING_USER_INPUT, etc)
- `last_sync_at`, `next_sync_at`
- `mfa_required` (boolean para 2FA)

Nova tabela `pluggy_account_links`:
- mapeia `pluggy_account_id` ↔ `financial_account_id` do FinBrasil
- evita duplicação ao re-sincronizar

Nova coluna em `expenses` e `extra_incomes`:
- `pluggy_transaction_id` (text, único por usuário) — chave de deduplicação
- `auto_imported` (boolean) — distingue de lançamentos manuais

Nova coluna em `profiles`:
- `pluggy_connections_limit` (default 1 para free)

## Edge Functions

| Função | Responsabilidade |
|---|---|
| `pluggy-connect-token` | Gera connect_token de curta duração para o widget. Verifica limite do plano. |
| `pluggy-sync` | Recebe `itemId`, busca contas/transações/investimentos, faz upsert nas tabelas, dedupe por `pluggy_transaction_id`. |
| `pluggy-webhook` | Endpoint público que Pluggy chama quando há atualização. Dispara sync. |
| `pluggy-disconnect` | Remove item da Pluggy + marca conexão como inativa (mantém histórico). |

Categorização: usar a categoria que a Pluggy retorna como sugestão e mapear para as categorias do FinBrasil (alimentação, transporte, etc). Usuário pode editar depois.

## Frontend

**Novo componente** `OpenFinanceManager.tsx` (acessível em Configurações ou aba dedicada):
- Botão "Conectar banco" → abre Pluggy Connect (script CDN oficial)
- Lista de conexões ativas com: logo do banco, status, último sync, botão "sincronizar agora", botão "remover"
- Badge de status: ✅ Atualizado / ⚠️ Requer atenção / 🔄 Sincronizando
- Banner se atingiu limite do free: "Conecte mais bancos no plano Pro"

**Integração no `ExpenseTable`**:
- Ícone discreto 🔗 ao lado de transações `auto_imported`
- Tooltip "Importado automaticamente do [Banco]"

**Plano free**:
- Bloqueio no edge function (não confiar só no client)
- Modal de upgrade quando tentar conectar a 2ª conta

## Fluxo de sincronização

1. Conexão inicial: sync completo (últimos 12 meses)
2. Webhook da Pluggy quando item atualiza → sync incremental
3. Botão manual "Sincronizar agora" no UI
4. Cron diário (pg_cron) para forçar refresh de items OUTDATED

## Detalhes técnicos importantes

- **MFA/2FA**: alguns bancos pedem código. Pluggy Connect lida com isso no widget.
- **Status LOGIN_ERROR**: mostrar CTA "Reconectar" que reabre o widget com `itemId` existente.
- **Investimentos**: criar `financial_account` do tipo `investment` para cada carteira, atualizar `current_value` e `applied_value` (campos já existem!).
- **Cartões de crédito**: cada cartão Pluggy vira uma `credit_card` no FinBrasil (tabela já existe), faturas viram `invoices`.
- **Dedup**: `pluggy_transaction_id` é único globalmente na Pluggy, então índice único `(user_id, pluggy_transaction_id)` resolve.
- **LGPD**: adicionar checkbox de consentimento antes de abrir o widget + texto explicando o que é coletado.
- **Sandbox primeiro**: começar com `PLUGGY_USE_SANDBOX=true`. Bancos fake da Pluggy pra testar tudo sem custo.

## Entregáveis em ordem

1. Migration: tabelas `pluggy_connections`, `pluggy_account_links`, colunas novas
2. Edge function `pluggy-connect-token` + secrets
3. Componente `OpenFinanceManager` com Pluggy Connect widget
4. Edge function `pluggy-sync` (contas + transações)
5. Suporte a cartões e investimentos no sync
6. Edge function `pluggy-webhook` + cron de refresh
7. Bloqueio de plano + modal de upgrade
8. Indicadores visuais de transação importada

## Fora de escopo (V2 futuro)

- Pagamentos/PIX via Open Finance (Iniciador de Pagamento — outro nível de regulação)
- Categorização inteligente via IA das transações importadas (pode ser feature separada depois)
- Conciliação automática com lançamentos manuais já existentes

---

**Aprovando o plano, eu começo pedindo as credenciais da Pluggy e implemento na ordem acima.** Posso entregar tudo de uma vez ou ir por fases — você prefere?
