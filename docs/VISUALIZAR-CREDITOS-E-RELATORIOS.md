# Visualização de Créditos e Integração em Relatórios

## Respostas às Suas Perguntas

### 1. Onde Visualizar Créditos?
Existem **2 formas de visualizar** quem levou produtos a crédito:

#### **Forma 1: Página Dedicada de Créditos**
- **Acesso:** Menu lateral → Clique em **"Créditos"** 🏦
- **URL:** `/credits-vendas`
- **Informações Disponíveis:**
  - Lista completa de clientes que levaram a crédito
  - Nome e telefone do cliente
  - Total levado, valor já pago, saldo pendente
  - Status (Pendente, Parcialmente Pago, Pago)
  - Data do crédito e último pagamento
  - **Ações:** Registar pagamento, editar notas, eliminar crédito

#### **Forma 2: Relatórios**
- **Acesso:** Menu lateral → Clique em **"Relatórios"** 📊
- **URL:** `/reports`
- **Nova Seção: Resumo de Créditos** com:
  - Total de créditos registados
  - Total já pago
  - Total ainda pendente
  - Número de clientes em crédito
  - **Contador por status:**
    - 🔴 Pendentes (não iniciou pagamento)
    - 🟡 Parcialmente Pagos (pagamento em andamento)
    - 🟢 Finalizados (crédito quitado)
  - **Tabela:** Histórico detalhado de todos os créditos do período

---

## Alterações Implementadas

### 1. **Sidebar.tsx - Menu de Navegação**
Adicionada nova opção no menu:
```
🏦 Créditos → /credits-vendas
```

Localização: Entre "Mesas" e "Clientes"

### 2. **Reports.tsx - Integração de Créditos**

#### **Imports Adicionados:**
- `Credit` interface do types
- `Check`, `Users` icons do lucide-react

#### **Estados/Variáveis Adicionadas:**
```typescript
const { sales: dbSales, products: dbProducts, credits } = useDatabase();

// Filtra créditos por período
const filteredCredits = credits.filter(c =>
  isWithinInterval(new Date(c.createdAt), range)
);

// Métricas de crédito
const totalCreditsAmount = filteredCredits.reduce((acc, c) => acc + c.total, 0);
const totalCreditsPaid = filteredCredits.reduce((acc, c) => acc + c.amountPaid, 0);
const totalCreditsRemaining = filteredCredits.reduce((acc, c) => acc + c.remainingBalance, 0);
const pendingCredits = filteredCredits.filter(c => c.status === 'pending').length;
const partialCredits = filteredCredits.filter(c => c.status === 'partial').length;
const paidCredits = filteredCredits.filter(c => c.status === 'paid').length;
```

#### **Novos Cards de Créditos Adicionados:**

**Seção 1 - Resumo Total (4 Cards):**
1. **Total Créditos** - Montante total em crédito
2. **Créditos Pagos** - Quanto já foi recebido
3. **Créditos Pendentes** - Saldo ainda a receber
4. **Total de Clientes** - Número de clientes em crédito

**Seção 2 - Status dos Créditos (3 Cards):**
1. **Pendentes** - Não iniciou pagamento (vermelho)
2. **Parcialmente Pagos** - Em andamento (amarelo)
3. **Finalizados** - Crédito quitado (verde)

#### **Tabela de Créditos:**
Nova tabela "Histórico de Créditos" com colunas:
- Cliente (nome)
- Telefone
- Total (montante levado)
- Pago (montante já pago)
- Pendente (saldo restante)
- Status (badge colorida)
- Data (quando foi registado)

---

## Funcionalidades do Sistema

### **Na Página de Créditos (CreditsVendas.tsx):**
- ✅ Visualizar todos os créditos com filtros
- ✅ Procurar por nome ou telefone
- ✅ Filtrar por status (Pendente, Parcial, Pago)
- ✅ Registar novo crédito
- ✅ Registar pagamento
- ✅ Editar notas
- ✅ Eliminar crédito

### **Nos Relatórios (Reports.tsx):**
- ✅ Visualizar resumo de créditos
- ✅ Ver histórico filtrado por período (Hoje, Semana, Mês)
- ✅ Estatísticas detalhadas por status
- ✅ Tabela dos últimos 10 créditos
- ✅ Integração com filtros de data existentes

---

## Exemplo de Uso

### **Cenário: Maria Silva levou produtos a crédito**

1. **Registar Crédito (na Venda ou Mesa)**
   - Clique "Finalizar Venda" ou "Pedir Conta"
   - Selecione "Pedir a Crédito" 
   - Insira "Maria Silva"
   - Sistema guarda em 📊 Créditos

2. **Visualizar em Créditos**
   - Menu → **Créditos**
   - Procure "Maria Silva"
   - Veja: Total 5000 MT, Pago 2000 MT, Pendente 3000 MT, Status "Parcial"

3. **Visualizar em Relatórios**
   - Menu → **Relatórios**
   - Veja card: "Total Créditos: 5000 MT"
   - Veja card: "Créditos Pendentes: 3000 MT"
   - Veja tabela com Maria Silva listada
   - Status visual com badge amarela (Parcial)

4. **Quando Maria Paga**
   - Em **Créditos**, clique em Maria Silva
   - Registar pagamento de 3000 MT
   - Status muda para "Pago" (verde)
   - Relatórios atualizam automaticamente

---

## Integração com Sistema Existente

| Recurso | Antes | Depois |
|---------|-------|--------|
| Visualizar créditos | Apenas em CreditsVendas | ✅ CreditsVendas + Relatórios |
| Menu | Sem acesso direto | ✅ Menu "Créditos" |
| Relatórios | Só vendas | ✅ Vendas + Créditos |
| Filtros | Apenas por cliente | ✅ Por cliente + período + status |
| Estatísticas | Não havia | ✅ 7 cards com métricas |
| Histórico | Tabela simples | ✅ Tabela filtrada por período |

---

## Dados Refletidos nos Relatórios

Quando você acede a **Relatórios → Período (Hoje/Semana/Mês)**:

✅ **Créditos de Vendas.tsx** aparecem
✅ **Créditos de Tables.tsx (Mesas)** aparecem  
✅ **Todos integrados na mesma tabela**
✅ **Período filtrado automaticamente**

Exemplo:
- Hoje registou 3 créditos em Vendas
- Hoje registou 2 créditos em Mesas
- **Relatórios mostra:** "Total de Clientes a Crédito: 5"

---

## Arquivos Modificados

1. **src/components/layout/Sidebar.tsx**
   - ✅ Adicionado icon `Banknote`
   - ✅ Adicionado menu item "Créditos" com path `/credits-vendas`

2. **src/pages/Reports.tsx**
   - ✅ Adicionado import `Credit` type
   - ✅ Adicionado import `Check`, `Users` icons
   - ✅ Adicionado estado `credits` do hook
   - ✅ Adicionado filtro de créditos por período
   - ✅ Adicionado cálculo de 8 métricas de crédito
   - ✅ Adicionados 7 cards de estatísticas
   - ✅ Adicionada tabela de histórico de créditos

---

## Status
✅ **COMPLETO**

- Menu de navegação atualizado
- Créditos integrados em Relatórios
- Todas as métricas funcionando
- Filtros de período funcionando
- Sem erros de compilação

---

**Data:** 30 Dez 2024
**Versão:** 2.0 (Com Relatórios Integrados)
