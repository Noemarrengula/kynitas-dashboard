# Estado Atual do Código - Kynitas Dashboard
**Data:** 2025-01-24

## 📋 Informações do Projeto

**Nome:** Kynitas Dashboard  
**Tipo:** Sistema de Gestão para Bar/Restaurante  
**Versão:** 0.0.0  
**Tecnologias:** React + TypeScript + Vite + Shadcn-ui + Tailwind CSS

---

## 🏗️ Estrutura do Projeto

### Páginas Principais
- **Login** - Autenticação de usuários
- **Dashboard** - Visão geral com métricas e gráficos
- **Products** (Drinks/Meals) - Gestão de produtos (bebidas e refeições)
- **Stock** - Controle de estoque
- **Sales** - Gestão de vendas
- **Tables** - Gestão de mesas
- **Reports** - Relatórios
- **Settings** - Configurações

### Componentes
- **Layout:** MainLayout, Sidebar, Topbar
- **Dashboard:** MetricCard, SalesChart, TopProducts
- **Products:** ProductModal
- **UI:** 50+ componentes Shadcn-ui (Button, Card, Dialog, Table, etc.)

---

## 📊 Modelos de Dados (Types)

### Product
```typescript
{
  id, name, category, price, costPrice, stock, image, internalId,
  type: 'drink' | 'meal',
  ingredients?, estimatedCost?, dailyStock?
}
```

### Order
```typescript
{
  id, tableId, items: OrderItem[],
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'paid',
  total, createdAt, paymentMethod?: 'mpesa' | 'cash' | 'card'
}
```

### Table
```typescript
{
  id, number,
  status: 'free' | 'occupied' | 'awaiting_payment',
  currentOrderId?
}
```

### Sale
```typescript
{
  id, items: OrderItem[], total,
  paymentMethod: 'mpesa' | 'cash' | 'card',
  createdAt, tableId?
}
```

### User
```typescript
{
  id, name, email,
  role: 'admin' | 'manager' | 'waiter' | 'cashier',
  avatar?
}
```

---

## 🗄️ Estado Global (Zustand Store)

### Gerenciamento de Estado
- **User:** user, setUser
- **Products:** products, setProducts, addProduct, updateProduct, deleteProduct
- **Tables:** tables, setTables, updateTable
- **Orders:** orders, setOrders, addOrder, updateOrder
- **Sales:** sales, setSales, addSale
- **Stock Movements:** stockMovements, addStockMovement
- **UI:** sidebarOpen, setSidebarOpen

### Dados Mock Atuais
- **8 Produtos** (4 bebidas + 4 refeições)
- **8 Mesas** (3 livres, 3 ocupadas, 2 aguardando pagamento)
- **2 Pedidos** ativos
- **7 Vendas** históricas

---

## 🔧 Dependências Principais

### Produção
- **React 18.3.1** + React Router DOM 6.30.1
- **Zustand 5.0.8** - Gerenciamento de estado
- **TanStack Query 5.83.0** - Gestão de dados assíncronos
- **Radix UI** - Componentes acessíveis
- **Lucide React** - Ícones
- **Recharts 2.15.4** - Gráficos
- **React Hook Form 7.61.1** + Zod 3.25.76 - Formulários e validação
- **Date-fns 3.6.0** - Manipulação de datas
- **Sonner** - Notificações toast

### Desenvolvimento
- **Vite 5.4.19** - Build tool
- **TypeScript 5.8.3**
- **ESLint 9.32.0**
- **Tailwind CSS 3.4.17**

---

## 🎯 Funcionalidades Implementadas

### ✅ Estrutura Base
- Sistema de rotas configurado
- Layout responsivo com sidebar
- Autenticação (página de login)
- Sistema de notificações (toast)

### ✅ Gestão de Produtos
- CRUD de produtos (bebidas e refeições)
- Categorização
- Controle de preço de custo e venda
- Gestão de estoque
- Imagens de produtos

### ✅ Gestão de Mesas
- Visualização de status das mesas
- Associação com pedidos

### ✅ Gestão de Pedidos
- Criação de pedidos
- Status de pedidos
- Itens do pedido com subtotais

### ✅ Gestão de Vendas
- Registro de vendas
- Métodos de pagamento (M-Pesa, Dinheiro, Cartão)
- Histórico de vendas

---

## 🚧 Estado Atual do Desenvolvimento

### Pontos Fortes
- Arquitetura bem estruturada
- Tipagem TypeScript completa
- UI moderna com Shadcn-ui
- Sistema de estado centralizado
- Componentes reutilizáveis

### Áreas de Atenção
- Dados mock (não conectado a backend)
- Autenticação não implementada (apenas UI)
- Falta validação de formulários em algumas páginas
- Relatórios podem precisar de mais funcionalidades
- Sistema de permissões por role não implementado

---

## 📝 Observações Técnicas

1. **Build Tool:** Vite com React SWC para compilação rápida
2. **Estilo:** Tailwind CSS com tema customizável
3. **Componentes:** Shadcn-ui (50+ componentes prontos)
4. **Roteamento:** React Router v6 com layout aninhado
5. **Formulários:** React Hook Form + Zod para validação
6. **Gráficos:** Recharts para visualização de dados

---

## 🔄 Próximos Passos Sugeridos

1. Integração com backend/API
2. Implementação de autenticação real
3. Sistema de permissões por role
4. Validação completa de formulários
5. Testes unitários e de integração
6. Otimização de performance
7. Documentação de componentes

---

**Documento gerado automaticamente**  
**Última atualização:** 2025-01-24
