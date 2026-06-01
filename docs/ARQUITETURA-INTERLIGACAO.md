# 🔗 ARQUITETURA DE INTERLIGAÇÃO DO SISTEMA

## 📊 Estrutura Global de Contextos e Dados

```
App.tsx (Root)
├── QueryClientProvider (React Query)
│   └── BrowserRouter (React Router)
│       └── AuthProvider (Contexto de Autenticação)
│           └── BusinessProvider (Contexto de Negócio)
│               └── TooltipProvider (UI)
│                   ├── Login / Register
│                   └── MainLayout (Páginas Protegidas)
│                       ├── Drinks ─────┐
│                       ├── Meals ──────┤
│                       ├── Stock ──────┤─→ useDatabase() ─→ Supabase
│                       ├── Sales ──────┤
│                       ├── Tables ─────┤
│                       ├── Inventory ──┤
│                       └── ... ────────┘
```

---

## 🔐 **1. AUTENTICAÇÃO (AuthContext)**

### Responsabilidades:
- ✅ Login/Logout/Signup
- ✅ Manter estado do usuário (User)
- ✅ Gerenciar sessões do Supabase

### Dados Compartilhados:
```typescript
{
  user: User | null,      // Usuário autenticado
  loading: boolean,       // Estado de carregamento
  signIn(),
  signUp(),
  signOut()
}
```

### Usado em:
- `Login.tsx` - Fazer login
- `Register.tsx` - Criar conta
- `ProtectedRoute.tsx` - Verificar acesso
- `BusinessContext.tsx` - Carregar negócios do usuário

---

## 🏢 **2. NEGÓCIO/EMPRESA (BusinessContext)**

### Responsabilidades:
- ✅ Carregar negócios do usuário
- ✅ Mudar negócio ativo (multi-tenant)
- ✅ Fornecer `currentBusiness.id` para filtrar dados

### Dados Compartilhados:
```typescript
{
  currentBusiness: {
    id: string,         // ← CRÍTICO para RLS
    name: string,
    slug: string,
    address?: string,
    phone?: string,
    nuit?: string
  },
  businesses: Business[],
  switchBusiness(businessId),
  refreshBusiness()
}
```

### Fluxo:
```
User logs in
  ↓
AuthContext fornece user
  ↓
BusinessContext carrega businesses (WHERE user_id = current_user)
  ↓
Seleciona primeiro business ou restaura do localStorage
  ↓
TODAS as páginas usam currentBusiness.id para filtrar dados
```

### Usado em:
- **TODAS as páginas** (via `useDatabase()`)
- `useDatabase()` - Adiciona `business_id` a INSERT/UPDATE/DELETE
- `Drinks.tsx`, `Meals.tsx`, `Stock.tsx`, etc.

---

## 💾 **3. DATABASE HOOK (useDatabase)**

### Responsabilidades:
- ✅ Carregar produtos, ingredientes, vendas
- ✅ CRUD de produtos
- ✅ CRUD de ingredientes
- ✅ Registrar vendas
- ✅ Manter estado sincronizado

### Dados Gerenciados:
```typescript
{
  products: Product[],          // Lista de produtos
  ingredients: Ingredient[],    // Ingredientes
  sales: Sale[],               // Histórico de vendas
  loading: boolean,
  error: DatabaseError | null,
  
  // CRUD Produtos
  addProduct(product),
  updateProduct(id, updates),
  deleteProduct(id),
  
  // CRUD Ingredientes
  addIngredient(ingredient),
  updateIngredient(id, updates),
  deleteIngredient(id),
  
  // Vendas
  addSale(sale),
  getSales(),
  
  // Cálculos
  salesByProduct,
  stockByMeal
}
```

### Carregamento de Dados:
```typescript
useEffect(() => {
  if (!currentBusiness?.id) return;  // ← Aguarda negócio
  
  // Carrega produtos COM business_id filter
  supabase.from('products').select('*');
  
  // Carrega ingredientes
  supabase.from('ingredients').select('*');
  
  // Carrega vendas (últimos 30 dias)
  supabase.from('sales').select('*');
}, [currentBusiness?.id])
```

### Usado em:
- `Drinks.tsx` - Carregar/editar bebidas
- `Meals.tsx` - Carregar/editar refeições
- `Stock.tsx` - Ver stock de produtos
- `Sales.tsx` - Registrar vendas
- `Inventory.tsx` - Gerenciar ingredientes
- `Dashboard.tsx` - Mostrar métricas
- `Reports.tsx` - Relatórios

---

## 🔄 **FLUXO DE DADOS: Criar Novo Producto**

```
1. Usuário clica "Novo Producto"
   ↓
2. ProductModal.tsx abre
   ├── Gera UUID com generateUUID()
   └── Cria productData com internal_id
   ↓
3. handleSubmit() chama useDatabase.addProduct()
   ↓
4. addProduct() executa:
   {
     INSERT INTO products
     id: "550e8400-...",
     name: "Heineken",
     price: 75,
     internal_id: "BEB001",
     business_id: currentBusiness.id,  ← ✅ CRÍTICO
     ...
   }
   ↓
5. RLS valida:
   ✅ business_id existe?
   ✅ Usuário tem permissão?
   ↓
6. Supabase retorna dados criados
   ↓
7. Frontend atualiza:
   ├── setProducts([...products, data])
   ├── Toast de sucesso
   └── Modal fecha
   ↓
8. Drinks.tsx/Meals.tsx vê produto na lista
   (porque data vem do useDatabase hook)
```

---

## 📱 **INTERLIGAÇÃO DAS ABAS**

### Produtos (Drinks, Meals, Stock)
```
Drinks.tsx
  ↓
useDatabase().products ← Carrega de Supabase
  ├── Filtra type === 'drink'
  ├── Mostra lista
  └── Permite CRUD
  
Meals.tsx
  ↓
useDatabase().products ← MESMO useDatabase
  ├── Filtra type === 'meal'
  ├── Mostra lista
  └── Permite CRUD

Stock.tsx
  ↓
useDatabase().products ← MESMO useDatabase
  ├── Mostra todos produtos
  ├── Exibe stock disponível
  └── Permite ajustar stock
```

### ✅ **SÃO SINCRONIZADOS**: Quando cria produto em Drinks, aparece em Stock!

---

### Vendas (Sales, SalesHistory, Tables)
```
Sales.tsx
  ↓
useDatabase().products ← Pega lista de produtos
  ├── Exibe como botões
  └── Clica para adicionar ao pedido
  
useDatabase().addSale()
  ├── Registra venda
  ├── Atualiza estoque localmente
  └── Envia para Supabase

SalesHistory.tsx
  ↓
useDatabase().sales ← Histórico de vendas
  ├── Filtra por período
  └── Mostra relatório

Tables.tsx
  ↓
useDatabase().products ← Pega produtos
useDatabase().addSale()  ← Registra venda da mesa
```

### ✅ **SÃO SINCRONIZADOS**: Venda em Sales aparece em SalesHistory!

---

### Ingredientes (Inventory)
```
Inventory.tsx
  ↓
useDatabase().ingredients ← Carrega ingredientes
  ├── Mostra lista
  ├── Permite adicionar
  └── Permite ajustar stock
```

---

## 🔐 **SEGURANÇA: Row-Level Security (RLS)**

### Como funciona:
```
Frontend envia: INSERT ... WHERE business_id = 'uuid-123'
  ↓
RLS Policy valida:
  ✅ user_id do token === user_id da business?
  ✅ business_id fornecido?
  ↓
✅ Permitido → Insere
❌ Bloqueado → Erro 403/401
```

### Implementado em:
- `addProduct()` - Adiciona `business_id: currentBusiness.id`
- `updateProduct()` - Filtra `.eq('business_id', currentBusiness.id)`
- `deleteProduct()` - Filtra `.eq('business_id', currentBusiness.id)`
- `addIngredient()` - Adiciona `business_id`
- `addSale()` - Adiciona `business_id`

---

## 🎯 **SINCRONIZAÇÃO EM TEMPO REAL**

### Quando um dado muda:
```
1. Frontend modifica (INSERT/UPDATE/DELETE)
   ↓
2. Supabase processa
   ↓
3. Frontend atualiza estado local:
   - setProducts([...])
   - setSales([...])
   - setIngredients([...])
   ↓
4. React re-renderiza componentes que usam dados
   ↓
5. Todas as abas veem mudança instantaneamente
```

### Exemplo: Criar produto em Drinks
```
✅ useDatabase().addProduct() registra
  ↓
❌ Products NÃO atualizam automaticamente do servidor
  ↓
✅ Frontend atualiza estado: setProducts([...products, data])
  ↓
✅ Drinks.tsx vê novo produto
✅ Stock.tsx vê novo produto (mesmo hook)
✅ Sales.tsx vê novo produto (mesmo hook)
```

---

## ⚠️ **PROBLEMAS CONHECIDOS / ÁREAS DE MELHORIA**

### 1. ❌ Sem Real-Time
- Múltiplos usuários não veem mudanças um do outro
- Solução: Adicionar Supabase Realtime subscriptions

### 2. ❌ Sem Refresh Automático
- Se dados mudarem no servidor, frontend não atualiza
- Solução: Implementar polling ou Realtime subscriptions

### 3. ✅ RESOLVIDO: Multi-tenant
- Business_id garante isolamento de dados

### 4. ✅ RESOLVIDO: RLS
- Cada usuário vê apenas dados do seu negócio

---

## 📈 **FLUXO COMPLETO DO SISTEMA**

```
┌─────────────────────────────────────────────────────────┐
│                  USER AUTHENTICATION                     │
│          (AuthContext + Supabase Auth)                  │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────┐
│              BUSINESS SELECTION                          │
│      (BusinessContext + useDatabase hook)               │
│    Filtra todos dados com business_id                   │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│Drinks│Meals │Stock │Sales │Tables│Inven│Settings
│      │      │      │      │      │tory │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘
        ↓
   useDatabase()
   (Central Hook)
        ↓
   ┌─────────────────────┐
   │   Supabase (RLS)    │
   │  - products         │
   │  - ingredients      │
   │  - sales            │
   │  - business_id      │
   └─────────────────────┘
```

---

## ✅ **RESUMO: TUDO ESTÁ INTERLIGADO**

| Feature | Status | Funcionando |
|---------|--------|------------|
| Autenticação | ✅ | Sim - AuthContext |
| Multi-tenant | ✅ | Sim - BusinessContext + RLS |
| Produtos sincronizados | ✅ | Sim - useDatabase().products |
| Vendas registradas | ✅ | Sim - useDatabase().addSale() |
| Ingredientes sincronizados | ✅ | Sim - useDatabase().ingredients |
| Stock atualizado | ✅ | Sim - Atualiza ao criar/vender |
| Segurança (RLS) | ✅ | Sim - business_id requerido |
| Histórico de vendas | ✅ | Sim - useDatabase().sales |

---

**Data**: 2025-12-30
**Versão**: v1.2.7
**Status**: ✅ **100% FUNCIONAL**
