# FASE 3: Multi-tenant (Múltiplos Estabelecimentos)

## Implementado

✅ Suporte para múltiplos estabelecimentos
✅ Isolamento de dados por estabelecimento
✅ Sistema de permissões (Owner, Manager, Staff)
✅ Troca rápida entre estabelecimentos
✅ RLS (Row Level Security) configurado
✅ Contexto de estabelecimento

## Como usar

### 1. Executar SQL no Supabase
Execute o arquivo `supabase-fase3.sql` no SQL Editor

### 2. Adicionar Providers no App
```tsx
// src/App.tsx
import { BusinessProvider } from '@/contexts/BusinessContext';

<AuthProvider>
  <BusinessProvider>
    {/* resto do app */}
  </BusinessProvider>
</AuthProvider>
```

### 3. Adicionar BusinessSwitcher ao Header
```tsx
// src/components/layout/Header.tsx
import { BusinessSwitcher } from '@/components/BusinessSwitcher';

// Adicionar no header:
<BusinessSwitcher />
```

### 4. Criar estabelecimento e vincular usuário
```sql
-- No SQL Editor do Supabase
SELECT create_initial_business(
  'Nome do Estabelecimento',
  'slug-do-estabelecimento',
  'email@usuario.com'
);
```

### 5. Atualizar queries para incluir business_id
```tsx
// Exemplo ao salvar venda
const { business } = useBusiness();

const newSale = {
  ...saleData,
  business_id: business?.id,
};
```

## Estrutura

**Tabelas:**
- `businesses` - Estabelecimentos
- `business_users` - Usuários e permissões

**Roles:**
- `owner` - Dono (acesso total)
- `manager` - Gerente (gestão operacional)
- `staff` - Funcionário (operações básicas)

## Benefícios

🏢 Múltiplos estabelecimentos na mesma conta
🔒 Dados isolados e seguros
👥 Gestão de equipe e permissões
📊 Relatórios por estabelecimento
🔄 Troca rápida entre estabelecimentos

## Próxima Fase

FASE 4: Relatórios Avançados e Dashboard em Tempo Real
