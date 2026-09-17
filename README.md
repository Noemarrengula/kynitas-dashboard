# Marrengula IT ERP

Sistema de gestão empresarial multi-negócio (multi-tenant) para retalho/hospitalidade com foco no mercado moçambicano.

## Funcionalidades

**Vendas (POS)**
- Ponto de venda com pagamentos mistos (Dinheiro, M-Pesa, E-Mola, Cartão)
- Descontos e preços customizáveis (peso/kg, dose/garrafa)
- Impressão de recibos térmicos (cliente + empresa)
- Vendas por mesa e pedidos em tempo real (KDS — Kitchen Display System)
- **Modo offline**: vendas sem internet são guardadas localmente e sincronizadas quando a ligação volta

**Facturação fiscal (Moçambique)**
- Tipos de documento: FT, FS, FC, NC — com séries de numeração e IVA por produto
- Factura A4 com QRCode e reimpressão

**Stock e Inventário**
- Produtos com receitas (listas de ingredientes)
- Dedução automática de stock por ingrediente na venda
- Movimentos de stock, stock mínimo e alertas
- Previsão de stock (30 dias) por produto e ingrediente
- Custo real (food cost) a partir dos ingredientes

**Clientes, fidelização e créditos**
- Base de clientes com limite de crédito
- Programa de fidelização: 1 ponto por cada 10 MT de compra, resgate de 1 pt = 1 MT
- Dívidas/créditos (vales) com pagamentos parciais e histórico

**Gestão e operações**
- Utilizadores, funções (RBAC) e permissões por negócio
- Turnos de caixa (abertura/fecho com contagem por método de pagamento)
- Fornecedores, ordens e receções de compra
- Metas (goals), financeiro, multi-moeda (MZN/AOA/USD) e IVA
- Relatórios, exportação (CSV/JSON/XLSX) e backup
- Auditoria, centro de notificações em tempo real e dashboard executivo
- **Multi-idioma**: Português (padrão) e Inglês

## Tecnologias

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui (Radix)
- **Estado**: Zustand + React Query
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + RLS multi-tenant)
- **Desktop**: Electron + Capacitor (build do instalador para Windows)
- **Gráficos**: Recharts; **Impressão**: jspdf/autotable; **Excel**: xlsx

## Estrutura

```
src/
  components/    Componentes de UI e de domínio (modais, layout, dashboard...)
  contexts/      BusinessContext, I18nContext
  hooks/         useDatabase, useCredits, useInvoices, useOfflineSync...
  i18n/          Dicionários PT/EN
  lib/           supabase, utils, sanitize, offline, invoice
  pages/         Vendas, Stock, Caixa, KDS, Facturas, Créditos, Relatórios...
  store/         Zustand (estado global)
  types/         Tipos de domínio
docs/sql/        Scripts SQL (schema, RLS, triggers, correções)
electron/        Pacote desktop (Electron + electron-builder)
```

## Configuração

Pré-requisitos: Node.js 18+ e npm.

1. Instalar dependências

```bash
npm install
```

2. Configurar o Supabase (projecto, auth e as tabelas/triggers). Copiar `.env.example` para `.env`:

```bash
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon
```

> Sem as variáveis, a aplicação corre em modo local (guardando na `localStorage`). Os scripts SQL vivem em `docs/sql/` (schema, RLS, triggers de stock/fidelização, facturação, turnos, realtime).

3. Correr em desenvolvimento:

```bash
npm run dev
```

Servidor: http://localhost:8080

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Build de produção (`dist/`) |
| `npm run lint` | ESLint |
| `npm run test` / `npm run test:run` | Testes (Vitest) |
| `npm run electron:dev` | Aplicação desktop em desenvolvimento |
| `npm run electron:build:win` | Instalador Windows (NSIS) em `release/` |

## Notas de operação

- **Vendas offline**: a fila fica em `localStorage` (`erp-offline-sales:<businessId>`) e sincroniza ao recuperar ligação.
- **Séries de facturação**: só são criadas para negócios novos — para negócios já existentes, correr `docs/sql/seedar-series-faturacao.sql`.
- **RLS**: todos os dados são isolados por `business_id` com políticas de linha. Correr `docs/sql/habilitar-rls-faltante.sql` se o lint do Supabase acusar "Policy Exists RLS Disabled".