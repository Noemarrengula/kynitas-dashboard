# 🚨 FIX URGENTE - Tabela Sales Não Existe

## ❌ Problema Identificado:
```
404 - Tabela 'sales' não existe no Supabase
```

## ✅ Solução (2 minutos):

### PASSO 1: Abrir Supabase
```
1. Acesse: https://supabase.com/dashboard
2. Login
3. Selecione projeto: fqnelrzqvtovwegvimgj
```

### PASSO 2: Abrir SQL Editor
```
1. Menu lateral > SQL Editor
2. Clique em "New query"
```

### PASSO 3: Executar SQL
```
1. Abra o arquivo: CRIAR-TABELA-SALES.sql
2. Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
3. Cole no SQL Editor (Ctrl+V)
4. Clique em "Run" (ou F5)
5. Aguarde 5 segundos
```

### PASSO 4: Verificar
```
Deve aparecer:
✅ "Tabela sales criada com sucesso!"
✅ Lista de colunas da tabela
```

### PASSO 5: Testar Venda
```
1. Volte para o sistema: http://localhost:5173
2. Recarregue a página (F5)
3. Vá em Vendas
4. Adicione produto
5. Finalize venda
6. Deve funcionar! ✅
```

---

## 🎯 Resultado Esperado

Após executar o SQL:
```
✅ Tabela sales criada
✅ Políticas RLS configuradas
✅ Trigger de stock criado
✅ Vendas funcionando
```

---

## 🆘 Se Ainda Não Funcionar

### Erro: "relation businesses does not exist"
Execute primeiro:
```sql
-- Criar tabela businesses se não existir
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Erro: "relation business_users does not exist"
Execute:
```sql
-- Criar tabela business_users se não existir
CREATE TABLE IF NOT EXISTS business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 📊 Verificar Tabelas Existentes

Execute no SQL Editor:
```sql
-- Ver todas as tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Deve ter pelo menos:
- ✅ businesses
- ✅ business_users
- ✅ products
- ✅ sales

---

**Execute o SQL agora e teste novamente!**
