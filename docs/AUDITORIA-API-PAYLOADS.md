# Auditoria — Erros 400 (PGRST204) em payloads de escrita

> Data: 2026-09-30 · Método: cruzamento dos **85 ficheiros SQL** (schema) com os **58 call-sites** de `.insert/.update/.upsert` no `src/` + cobertura do `DB_FIELD_MAP`.

## Classe de bug em causa

Payloads enviados ao PostgREST com colunas que **não existem** na tabela → HTTP **400 `PGRST204 "Could not find the '<coluna>' column"`**. Causa raiz típica: **camelCase sem conversão para snake_case** (o `DB_FIELD_MAP` é manual e incompleto) ou **coluna usada no código que nunca foi criada nos SQL**.

## Fixes aplicados nesta auditoria

| Bug | Ficheiro | Estado |
|---|---|---|
| `ivaRate` enviado em vez de `iva_rate` (criar produto em Stock) | `src/hooks/useDatabase.ts` (DB_FIELD_MAP) | ✅ corrigido (commit `8ce84f5`) |
| `targetLabel` enviado em vez de `target_label` (criar/editar metas) | `src/pages/Goals.tsx:60` | ✅ corrigido (commit `8ce84f5`) |
| `customers.metadata` sem coluna no schema (criar cliente) | SQL `fix-campos-auditoria.sql` | ✅ coluna adicionada (a correr) |
| Colunas de `products` em falta na DB (iva_rate, fracionavel, preco_dose, doses_por_garrafa, estimated_cost, daily_stock) | SQL `fix-products-campos-400.sql` | ✅ a correr (ida: já aplicado) |

## Scripts de certificação

- `docs/sql/fix-campos-auditoria.sql` — colunas que a app escreve e faltavam no schema (idempotente).
- `docs/sql/verificar-schema-vs-app.sql` — devolve as colunas/tabelas em falta. **0 linhas = certificado.**

## Waybackdo restante (verificados sem risco de 400)

- `useAccountsPayable.ts:94` (update de `Partial<AccountPayable>`) — a intersecção com `accounts_payable` está toda em snake_case no tipo (`src/types/index.ts:25`). OK.
- `useSuppliers.ts:155/231` — os tipos de `Supplier`/`PurchaseOrder` são snake_case (`src/types/domains/purchase.ts`). OK.
- `useCredits.ts:185` — `dbUpdates` só inclui colunas existentes. OK.
- `useTablesPersistence` — `dbData` de `tables`/`orders` = colunas existentes. OK.
- `supabaseSync.ts:62/117` — `saveSale`/`saveStockMovement` sem `business_id` (quebra RLS). **Código morto** (nenhum import em `src/`). Recomenda-se apagar o ficheiro.
- `sales.is_credit`/`credit_id` (`Sale`) — campos TS nunca enviados no payload (só condicionais existentes). OK.

## Riscos/achados de segurança (fora do 400, para decisão futura)

1. **Tabelas sem `business_id` nem RLS** (fuga multi-tenant): `monthly_targets`, `loyalty_transactions`, `config de `settings`, `alert_settings`, `user_profiles`, `webhook_logs`, `audit_log` (duplicado legado de `audit_logs`).
2. **Check constraints `business_users.role` conflitantes** entre ficheiros — a ordem de execução decide; `migracao-privilegios.sql` até rebaixa `super_admin` para `admin`.
3. **`toSnakeCase` só existe em 4 sites** (`useDatabase.ts`). Qualquer novo hook de escrita com payload camelCase pode reintroduzir esta classe de bug.

## Recomendação preventiva (opcional)

Introduzir um conversor genérico `camelCase → snake_case` (ex.: `targetLabel → target_label`, mantendo `DB_FIELD_MAP` para exceções como `internal_id`/`business_id`) e aplicá-lo em **todos** os payloads de escrita, eliminando a dependência do mapa manual.