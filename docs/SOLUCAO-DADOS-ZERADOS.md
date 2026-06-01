# 🔧 SOLUÇÃO: Dados Zerados nos Relatórios

## 🎯 PROBLEMA IDENTIFICADO

**Causa raiz:** A base de dados Supabase está **completamente vazia**:
- ❌ 0 negócios (businesses)
- ❌ 0 produtos (products) 
- ❌ 0 vendas (sales)
- ❌ 0 usuários (business_users)

## ✅ CORREÇÕES IMPLEMENTADAS

### 1. **Correção no Hook useDatabase**
- Removido filtro de 30 dias
- Adicionado filtro por business_id
- Nova função `loadAllSales()` para carregar histórico completo

### 2. **Melhorias na Interface**
- Botão "📊 Carregar Histórico" no Dashboard e Relatórios
- Mensagem de aviso quando não há dados
- Indicadores visuais de dados vazios

## 📝 PASSOS PARA RESOLVER

### **PASSO 1: Executar SQL Inicial**
1. Abra: https://supabase.com/dashboard
2. Selecione projeto: `fqnelrzqvtovwegvimgj`
3. SQL Editor > New Query
4. Execute o arquivo: `supabase-completo.sql`

### **PASSO 2: Criar Dados Básicos**
1. **Faça login/registro** na aplicação
2. **Crie um negócio** (será criado automaticamente)
3. **Adicione produtos** na aba Produtos
4. **Faça algumas vendas** na aba Vendas

### **PASSO 3: Verificar Dados**
```bash
node VERIFICAR-ESTRUTURA.cjs
```

## 🚀 SOLUÇÃO RÁPIDA (DADOS DE TESTE)

Se quiser dados imediatos para testar:

### **Opção A: Via SQL (Recomendado)**
1. Execute `INSERIR-VENDAS-EXEMPLO.sql` no Supabase
2. Isso criará negócio, produtos e vendas automaticamente

### **Opção B: Via Interface**
1. Registre-se na aplicação
2. Vá em Produtos > Adicionar produtos
3. Vá em Vendas > Fazer vendas
4. Vá em Relatórios > Carregar Histórico

## 📊 ARQUIVOS CRIADOS

### **Scripts de Diagnóstico:**
- `VERIFICAR-ESTRUTURA.cjs` - Verifica dados na base
- `VERIFICAR-VENDAS.cjs` - Verifica vendas especificamente
- `VERIFICAR-SUPABASE.cjs` - Verifica conexão geral

### **Scripts de Correção:**
- `INSERIR-VENDAS-EXEMPLO.sql` - Insere dados de teste
- `INSERIR-VENDAS-API.cjs` - Insere via API REST

### **Correções no Código:**
- `src/hooks/useDatabase.ts` - Removido filtro de 30 dias
- `src/pages/Dashboard.tsx` - Botão carregar histórico
- `src/pages/Reports.tsx` - Botão carregar histórico + aviso

## 🎯 RESULTADO ESPERADO

Após executar os passos:
- ✅ Relatórios com dados históricos
- ✅ Gráficos populados
- ✅ Métricas calculadas corretamente
- ✅ Tabelas com vendas visíveis

## ⚡ EXECUÇÃO IMEDIATA

**Para resolver AGORA:**

1. **Abra Supabase Dashboard**
2. **SQL Editor > New Query**
3. **Cole e execute:**
```sql
-- Criar business de exemplo
INSERT INTO businesses (name, address, phone) 
VALUES ('Kynitas Bar', 'Luanda, Angola', '+244 900 000 000');

-- Criar produto de exemplo
INSERT INTO products (business_id, name, price, cost_price, stock, type)
VALUES (
  (SELECT id FROM businesses LIMIT 1),
  'Cerveja Cuca',
  500,
  300,
  100,
  'drink'
);

-- Criar vendas de exemplo
INSERT INTO sales (business_id, items, total, payment_details, created_at)
SELECT 
  b.id,
  jsonb_build_array(
    jsonb_build_object(
      'productId', p.id::text,
      'quantity', 2,
      'subtotal', 1000
    )
  ),
  1000,
  jsonb_build_object(
    'cash', 1000,
    'mpesa', 0,
    'emola', 0,
    'card', 0,
    'total', 1000,
    'change', 0
  ),
  '2024-01-15 10:30:00'
FROM businesses b, products p
LIMIT 1;
```

4. **Recarregue a aplicação**
5. **Vá em Relatórios > Carregar Histórico**

Os dados aparecerão imediatamente! 🚀

## 📞 VERIFICAÇÃO

Para confirmar que funcionou:
```bash
node VERIFICAR-ESTRUTURA.cjs
```

Deve mostrar:
- ✅ 1+ negócios
- ✅ 1+ produtos  
- ✅ 1+ vendas
- ✅ Relatórios populados