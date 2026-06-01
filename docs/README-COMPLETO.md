# 🍹 Kynitas Dashboard - Sistema Completo de Gestão

Sistema completo de gestão para bares e restaurantes com autenticação, gestão de produtos, vendas, inventário e relatórios.

## ✨ Funcionalidades

### 🔐 Autenticação & Segurança
- Login e registro de usuários
- Proteção de rotas
- Gestão de sessão automática
- Logout com confirmação
- Row Level Security (RLS) no Supabase

### 🏢 Gestão de Negócio
- Múltiplos negócios por usuário
- Troca rápida entre negócios
- Configurações personalizadas (NUIT, endereço, telefone)
- Isolamento completo de dados por negócio

### 📦 Produtos
- Cadastro de bebidas e refeições
- Categorização
- Gestão de receitas e ingredientes
- Upload de imagens
- Busca e filtros
- Export para Excel/CSV

### 🥘 Inventário
- Controle de ingredientes
- Alertas de estoque baixo
- Unidades de medida personalizadas
- Custo por unidade
- Movimentações de estoque

### 💰 Vendas
- PDV (Ponto de Venda) completo
- Múltiplos métodos de pagamento
- Cálculo automático de troco
- Impressão de recibos térmicos
- Histórico completo

### 📊 Relatórios
- Dashboard com métricas
- Histórico de vendas com filtros
- Produtos mais vendidos
- Análise de receita
- Export de dados

### 🍽️ Mesas
- Gestão de mesas
- Status (disponível, ocupada, reservada)
- Pedidos por mesa
- Fechamento de conta

## 🛠️ Tecnologias

### Frontend
- **React 18** - UI Library
- **TypeScript** - Type Safety
- **Vite** - Build Tool
- **TailwindCSS** - Styling
- **shadcn/ui** - Component Library
- **React Router** - Routing
- **Zustand** - State Management (local)
- **date-fns** - Date Manipulation
- **xlsx** - Excel Export

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL Database
  - Authentication
  - Row Level Security
  - Real-time subscriptions
  - Storage

### Deploy
- **Vercel** - Hosting & CI/CD
- **GitHub** - Version Control

## 📁 Estrutura do Projeto

```
kynitas-dashboard/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── layout/         # Layout (Sidebar, Topbar)
│   │   ├── products/       # Produtos
│   │   ├── sales/          # Vendas
│   │   ├── ui/             # UI primitivos (shadcn)
│   │   ├── SearchInput.tsx
│   │   ├── DateRangeFilter.tsx
│   │   ├── ExportButton.tsx
│   │   ├── Pagination.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/           # React Contexts
│   │   ├── AuthContext.tsx
│   │   └── BusinessContext.tsx
│   ├── hooks/              # Custom Hooks
│   │   ├── useDatabase.ts
│   │   ├── usePagination.ts
│   │   └── useSearch.ts
│   ├── lib/                # Utilities
│   │   ├── supabase.ts
│   │   ├── export.ts
│   │   └── utils.ts
│   ├── pages/              # Páginas
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Sales.tsx
│   │   ├── SalesHistory.tsx
│   │   ├── Inventory.tsx
│   │   ├── Tables.tsx
│   │   ├── Settings.tsx
│   │   └── products/
│   │       ├── Drinks.tsx
│   │       └── Meals.tsx
│   ├── types/              # TypeScript Types
│   └── App.tsx             # App Root
├── supabase-completo.sql   # Database Schema
├── vercel.json             # Vercel Config
├── .env.production         # Production Env Template
├── DEPLOY-VERCEL.md        # Deploy Guide
├── CHECKLIST-DEPLOY.md     # Deploy Checklist
└── package.json
```

## 🚀 Instalação

### Pré-requisitos
- Node.js 18+ e npm
- Conta Supabase
- Conta Vercel (para deploy)

### 1. Clone o Repositório

```bash
git clone <seu-repositorio>
cd kynitas-dashboard
```

### 2. Instale Dependências

```bash
npm install
```

### 3. Configure Supabase

1. Crie projeto no [Supabase](https://supabase.com)
2. Execute o script `supabase-completo.sql` no SQL Editor
3. Copie URL e Anon Key

### 4. Configure Variáveis de Ambiente

Crie `.env` na raiz:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

### 5. Crie Negócio Inicial

No Supabase SQL Editor:

```sql
SELECT create_initial_business(
  auth.uid(),
  'Nome do Seu Negócio',
  'slug-do-negocio'
);
```

### 6. Inicie o Servidor

```bash
npm run dev
```

Acesse: http://localhost:5173

## 📦 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview

# Verificar tipos TypeScript
npm run type-check

# Lint
npm run lint
```

## 🌐 Deploy

Siga o guia completo em [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md)

### Resumo Rápido:

1. Push para GitHub
2. Import no Vercel
3. Configure variáveis de ambiente
4. Deploy automático

## 📚 Documentação

- [MELHORIAS-IMPLEMENTADAS.md](./MELHORIAS-IMPLEMENTADAS.md) - Todas melhorias implementadas
- [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md) - Guia completo de deploy
- [CHECKLIST-DEPLOY.md](./CHECKLIST-DEPLOY.md) - Checklist pré-deploy

## 🔑 Funcionalidades Principais

### Autenticação
- Registro com criação automática de negócio
- Login com email/senha
- Sessão persistente
- Logout seguro

### Dashboard
- Métricas em tempo real
- Vendas do dia/mês
- Produtos mais vendidos
- Alertas de estoque baixo

### Vendas
- Interface PDV intuitiva
- Múltiplos pagamentos
- Impressão térmica
- Histórico completo com filtros

### Produtos
- Cadastro rápido
- Gestão de receitas
- Controle de ingredientes
- Export de dados

### Relatórios
- Filtros por data
- Export Excel/CSV
- Análise de vendas
- Performance de produtos

## 🎨 Temas e Personalização

O sistema usa TailwindCSS e shadcn/ui, permitindo fácil personalização:

- Cores: `tailwind.config.js`
- Componentes: `src/components/ui/`
- Layout: `src/components/layout/`

## 🔒 Segurança

- Row Level Security (RLS) no Supabase
- Autenticação JWT
- Proteção de rotas no frontend
- Validação de dados
- HTTPS obrigatório em produção

## 📱 Responsividade

- Mobile-first design
- Breakpoints otimizados
- Touch-friendly
- Menu adaptativo

## 🐛 Troubleshooting

### Build Errors
```bash
rm -rf node_modules dist
npm install
npm run build
```

### Supabase Connection
- Verifique URL e Key
- Verifique CORS
- Verifique RLS policies

### Deploy Issues
- Consulte [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md)
- Verifique logs no Vercel Dashboard

## 📈 Roadmap

### Próximas Features
- [ ] Relatórios avançados
- [ ] Integração com impressoras fiscais
- [ ] App mobile (React Native)
- [ ] Multi-idioma
- [ ] Modo offline
- [ ] Backup automático

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é proprietário e confidencial.

## 👥 Suporte

Para suporte, entre em contato:
- Email: suporte@kynitas.com
- WhatsApp: +258 XX XXX XXXX

## 🎉 Agradecimentos

Desenvolvido com ❤️ para Kynitas Bar

---

**Versão**: 1.0.0  
**Última Atualização**: Dezembro 2024  
**Status**: ✅ Produção Ready
