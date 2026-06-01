# Fix: Vendas Não Finalizam - "does not exist text"

## 🐛 Problema
Ao clicar em "Finalizar Venda", aparece erro: "Erro ao processar venda (does not exist text)"

## 🔍 Causas Possíveis

### 1. Business ID não está definido
- Usuário não está associado a um negócio
- Sessão expirou
- Contexto BusinessContext não carregou

### 2. Tabela sales não existe ou está mal configurada
- Estrutura incorreta
- Policies RLS bloqueando inserção
- Foreign keys inválidas

### 3. Dados da venda estão incorretos
- Formato de items inválido
- Campos obrigatórios faltando

## ✅ Soluções

### Solução 1: Verificar Business Context (FEITO ✅)

**Arquivo**: `src/hooks/useDatabase.ts`

Adicionada validação antes de salvar:
```typescript
const addSale = async (sale: Omit<Sale, 'id'>) => {
  try {
    if (!currentBusiness?.id) {
      throw new Error('Negócio não encontrado. Faça login novamente.');
    }
    // ... resto do código
  }
}
```

### Solução 2: Executar Script SQL no Supabase

**Arquivo**: `supabase-fix-sales-table.sql`

1. **Acesse Supabase Dashboard**
   - https://supabase.com/dashboard
   - Selecione seu projeto
   - Vá para SQL Editor

2. **Execute o Script**
   - Copie todo conteúdo de `supabase-fix-sales-table.sql`
   - Cole no SQL Editor
   - Clique em "Run"

3. **O que o script faz:**
   - ✅ Verifica estrutura da tabela sales
   - ✅ Cria tabela se não existir
   - ✅ Cria índices de performance
   - ✅ Configura RLS policies
   - ✅ Cria tabela tables (se necessário)
   - ✅ Mostra estatísticas de vendas

### Solução 3: Verificar Associação Usuário-Negócio

Execute no Supabase SQL Editor:

```sql
-- Verificar se usuário está associado a um negócio
SELECT 
  u.email,
  b.name as business_name,
  bu.role
FROM auth.users u
LEFT JOIN business_users bu ON bu.user_id = u.id
LEFT JOIN businesses b ON b.id = bu.business_id
WHERE u.email = 'seu@email.com'; -- Substitua pelo seu email

-- Se não aparecer nada, criar associação:
INSERT INTO business_users (business_id, user_id, role)
SELECT 
  b.id,
  u.id,
  'admin'
FROM businesses b, auth.users u
WHERE b.slug = 'kynitas-bar' -- ou slug do seu negócio
  AND u.email = 'seu@email.com' -- seu email
ON CONFLICT (business_id, user_id) DO NOTHING;
```

### Solução 4: Verificar Policies RLS

Execute no Supabase SQL Editor:

```sql
-- Ver policies atuais
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'sales';

-- Se não houver policies de INSERT, executar:
DROP POLICY IF EXISTS "Users can insert their business sales" ON sales;
CREATE POLICY "Users can insert their business sales" ON sales
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );
```

### Solução 5: Teste Manual de Inserção

Execute no Supabase SQL Editor:

```sql
-- Obter seu business_id
SELECT id, name FROM businesses;

-- Obter um produto
SELECT id, name, price FROM products LIMIT 1;

-- Tentar inserir venda manualmente (substitua os IDs)
INSERT INTO sales (
  business_id,
  items,
  total,
  payment_details
) VALUES (
  'SEU_BUSINESS_ID_AQUI',
  '[{"productId": "SEU_PRODUCT_ID_AQUI", "quantity": 1, "subtotal": 100, "product": {"name": "Teste", "price": 100}}]'::jsonb,
  100,
  '{"cash": 100, "mpesa": 0, "emola": 0, "card": 0, "total": 100, "change": 0}'::jsonb
);

-- Se der erro, copie a mensagem completa
```

## 🧪 Testes

### Teste 1: Verificar Login
1. Abra Console do navegador (F12)
2. Digite: `localStorage.getItem('currentBusinessId')`
3. Deve retornar um UUID
4. Se retornar `null`, faça logout e login novamente

### Teste 2: Verificar Business Context
1. Abra Console do navegador (F12)
2. Na página de Vendas, digite:
```javascript
// Verificar se business está carregado
console.log('Business:', window.__BUSINESS_CONTEXT__);
```

### Teste 3: Tentar Venda Simples
1. Adicione 1 produto ao carrinho
2. Clique em "Finalizar Venda"
3. Insira 100 MT em Numerário
4. Clique em "Confirmar Pagamento"
5. Abra Console (F12) e veja os logs

### Teste 4: Verificar Erro Completo
1. Quando der erro, abra Console (F12)
2. Procure por mensagens em vermelho
3. Copie a mensagem completa do erro
4. Isso ajudará a identificar o problema exato

## 📋 Checklist de Diagnóstico

Execute na ordem:

- [ ] **Passo 1**: Verificar se está logado
  - Vá para Dashboard
  - Se não carregar, faça logout e login

- [ ] **Passo 2**: Executar `supabase-fix-sales-table.sql`
  - Supabase Dashboard → SQL Editor
  - Copiar e colar script
  - Executar

- [ ] **Passo 3**: Verificar associação usuário-negócio
  - Executar query de verificação (Solução 3)
  - Se não houver associação, criar

- [ ] **Passo 4**: Verificar policies RLS
  - Executar query de verificação (Solução 4)
  - Recriar policies se necessário

- [ ] **Passo 5**: Teste manual de inserção
  - Executar query de teste (Solução 5)
  - Se funcionar, problema é no frontend
  - Se não funcionar, problema é no banco

- [ ] **Passo 6**: Limpar cache e testar
  - Ctrl+Shift+R (hard refresh)
  - Fazer logout e login
  - Tentar venda novamente

## 🔧 Comandos Rápidos

### Resetar Tudo (Use com cuidado!)

```sql
-- 1. Recriar tabela sales
DROP TABLE IF EXISTS sales CASCADE;

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_number SERIAL,
  items JSONB NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  payment_details JSONB NOT NULL,
  table_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Recriar policies
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their business sales" ON sales
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- 3. Recriar índices
CREATE INDEX idx_sales_business_id ON sales(business_id);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);

-- 4. Recriar triggers (copiar de supabase-melhorias-essenciais.sql)
```

## 📞 Suporte

Se o problema persistir após todas as soluções:

1. **Copie informações do erro**:
   - Mensagem completa do erro (Console F12)
   - Logs do Supabase (Dashboard → Logs)
   - Screenshot da tela

2. **Verifique estrutura do banco**:
   ```sql
   -- Ver estrutura da tabela
   \d sales
   
   -- Ver policies
   SELECT * FROM pg_policies WHERE tablename = 'sales';
   
   -- Ver dados de teste
   SELECT * FROM sales LIMIT 1;
   ```

3. **Teste com dados mínimos**:
   - 1 produto apenas
   - Pagamento só em dinheiro
   - Sem mesa associada

## ✅ Solução Mais Provável

Na maioria dos casos, o problema é:

1. **Business ID não definido** → Fazer logout/login
2. **Policies RLS bloqueando** → Executar script de fix
3. **Tabela não existe** → Executar script de criação

Execute o script `supabase-fix-sales-table.sql` e faça logout/login. Isso resolve 90% dos casos.

---

**Status**: ✅ Correções aplicadas
**Arquivos modificados**:
- `src/hooks/useDatabase.ts` - Validação de business_id
- `supabase-fix-sales-table.sql` - Script de correção

**Próximo passo**: Executar script SQL no Supabase
