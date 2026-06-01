# Integração Frontend-Backend - Kynitas Dashboard

## 📊 Status Atual da Integração

### ⚠️ SITUAÇÃO ATUAL: **PARCIALMENTE INTEGRADO**

O sistema está atualmente usando **Zustand (estado local)** para a maioria das operações, com **integração parcial ao Supabase**.

---

## 🔄 Componentes da Integração

### 1. **Backend (Supabase)**

#### ✅ Configurado:
- **Autenticação**: Supabase Auth
- **Base de Dados PostgreSQL**: Todas as tabelas criadas
- **Row Level Security (RLS)**: Políticas configuradas
- **Realtime**: Subscriptions disponíveis
- **Storage**: Disponível para imagens

#### 📋 Tabelas Criadas:
```sql
- businesses (negócios)
- business_users (usuários por negócio)
- ingredients (ingredientes)
- products (produtos)
- sales (vendas)
- stock_movements (movimentações de stock)
- notifications (notificações)
- customers (clientes)
- employees (funcionários)
- api_keys (chaves API)
- webhooks (webhooks)
- printer_settings (configurações impressora)
- print_jobs (trabalhos de impressão)
```

---

### 2. **Frontend (React + Zustand)**

#### ✅ Implementado:
- **Zustand Store**: Gerenciamento de estado local
- **Supabase Client**: Cliente configurado
- **Contexts**: AuthContext, BusinessContext

#### ⚠️ Usando Estado Local (Zustand):
```typescript
// Atualmente armazenado apenas em memória:
- products (produtos)
- ingredients (ingredientes)
- sales (vendas)
- tables (mesas)
- orders (pedidos)
- stockMovements (movimentações)
```

---

## 🔌 Pontos de Integração Atuais

### ✅ **Integrado com Supabase:**

1. **Autenticação**
   - Login/Logout
   - Sessão persistente
   - Proteção de rotas

2. **Negócios (Settings)**
   - Leitura de dados do negócio
   - Atualização de informações (NUIT, endereço, telefone)

3. **Contextos**
   - `AuthContext`: Gerencia autenticação
   - `BusinessContext`: Gerencia dados do negócio atual

### ❌ **NÃO Integrado (Usando Zustand):**

1. **Produtos**
   - Criação, edição, exclusão
   - Listagem
   - Stock

2. **Ingredientes**
   - Criação, edição, exclusão
   - Listagem
   - Stock

3. **Vendas**
   - Registro de vendas
   - Histórico
   - Relatórios

4. **Mesas e Pedidos**
   - Gestão de mesas
   - Pedidos por mesa
   - Status

5. **Movimentações de Stock**
   - Entradas
   - Saídas
   - Histórico

---

## 🚀 Como Integrar Completamente

### Passo 1: Migrar Produtos para Supabase

```typescript
// src/hooks/useProducts.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useBusiness } from '@/contexts/BusinessContext';

export function useProducts() {
  const { business } = useBusiness();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', business.id);

      if (!error && data) {
        setProducts(data);
      }
      setLoading(false);
    };

    fetchProducts();

    // Realtime subscription
    const subscription = supabase
      .channel('products')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products',
        filter: `business_id=eq.${business.id}`
      }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [business?.id]);

  return { products, loading };
}
```

---

## 📊 Vantagens da Integração Completa

### ✅ Com Supabase (Recomendado):

1. **Persistência de Dados**
   - Dados salvos permanentemente
   - Não perde dados ao recarregar página
   - Backup automático

2. **Multi-dispositivo**
   - Acesso de qualquer lugar
   - Sincronização automática
   - Múltiplos usuários simultâneos

3. **Realtime**
   - Atualizações em tempo real
   - Notificações instantâneas
   - Colaboração em equipe

4. **Segurança**
   - Row Level Security
   - Autenticação robusta
   - Controle de permissões

### ❌ Com Zustand (Atual):

1. **Dados Temporários**
   - Perde tudo ao recarregar
   - Sem backup
   - Apenas local

2. **Sem Sincronização**
   - Não funciona em múltiplos dispositivos
   - Sem colaboração

---

## 🎯 Plano de Migração Recomendado

### Fase 1: Produtos e Ingredientes (1-2 dias)
- [ ] Criar hook `useProducts`
- [ ] Criar hook `useIngredients`
- [ ] Migrar páginas de produtos
- [ ] Migrar página de inventário

### Fase 2: Vendas e Mesas (2-3 dias)
- [ ] Criar hook `useSales`
- [ ] Criar hook `useTables`
- [ ] Migrar página de vendas
- [ ] Migrar página de mesas

### Fase 3: Relatórios (1-2 dias)
- [ ] Migrar histórico de vendas
- [ ] Implementar relatórios
- [ ] Dashboard com dados reais

---

## 📈 Status de Integração por Módulo

| Módulo | Status | Prioridade |
|--------|--------|-----------|
| Autenticação | ✅ Integrado | - |
| Negócios | ✅ Integrado | - |
| Produtos | ❌ Local | 🔴 Alta |
| Ingredientes | ❌ Local | 🔴 Alta |
| Vendas | ❌ Local | 🔴 Alta |
| Mesas | ❌ Local | 🟡 Média |
| Stock | ❌ Local | 🔴 Alta |
| Impressora | ✅ Integrado | - |

---

## 💡 Recomendação

**MIGRAR PARA SUPABASE O MAIS RÁPIDO POSSÍVEL**

Motivos:
1. Sistema atual perde dados ao recarregar
2. Não é adequado para produção
3. Sem backup ou recuperação
4. Não suporta múltiplos usuários

**Tempo estimado: 5-7 dias**

---

**Status**: ⚠️ Parcialmente Integrado
**Ação Recomendada**: 🚀 Migrar para Supabase
