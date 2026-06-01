# 🧪 Teste de Vendas - Guia Rápido

## 🚀 Passo 1: Iniciar Sistema

```bash
npm run dev
```

Ou clique em: **INICIAR.bat**

---

## 🔍 Passo 2: Abrir Console

1. Abra o navegador em: http://localhost:5173
2. Pressione **F12**
3. Vá na aba **Console**
4. Deixe aberto

---

## 🧪 Passo 3: Testar Venda

### 3.1 Fazer Login
- Email e senha do seu usuário

### 3.2 Ir para Vendas
- Menu lateral > Vendas

### 3.3 Adicionar Produto
- Clique em um produto
- Veja se aparece no carrinho

### 3.4 Finalizar Venda
- Clique em "Finalizar Venda"
- Preencha: 100 MT em dinheiro
- Clique em "Confirmar"

---

## ❌ Se Aparecer Erro

### No Console, procure por:

1. **"Negócio não encontrado"**
   - Faça logout e login novamente

2. **"Erro ao salvar venda"**
   - Execute SQL no Supabase (veja abaixo)

3. **"Cannot read property"**
   - Recarregue a página (F5)

4. **Erro de rede**
   - Verifique conexão com internet
   - Verifique se Supabase está acessível

---

## 🔧 Corrigir Banco de Dados

Se vendas não funcionarem:

### Opção 1: SQL Rápido
```sql
-- Execute no Supabase SQL Editor

-- Verificar se tabela existe
SELECT * FROM sales LIMIT 1;

-- Recriar política de INSERT
DROP POLICY IF EXISTS "Users can insert their business sales" ON sales;
CREATE POLICY "Users can insert their business sales" 
ON sales FOR INSERT 
WITH CHECK (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
);
```

### Opção 2: SQL Completo
```
Execute o arquivo: supabase-fix-urgente.sql
No Supabase Dashboard > SQL Editor
```

---

## ✅ Resultado Esperado

Após finalizar venda:

```
✅ Mensagem: "Venda registrada com sucesso!"
✅ Recibo imprime (2 cópias)
✅ Carrinho limpa
✅ Venda aparece no histórico
✅ Stock atualiza
✅ Gaveta abre (se configurada)
```

---

## 📊 Verificar no Supabase

1. Acesse: https://supabase.com/dashboard
2. Seu projeto > Table Editor
3. Tabela: **sales**
4. Veja se a venda apareceu

---

## 🆘 Ainda Não Funciona?

### Copie e cole aqui:

1. **Erro do Console**:
   ```
   (Cole o erro que aparece no console)
   ```

2. **Erro do Network**:
   - F12 > Network
   - Tente fazer venda
   - Veja requisição falhada
   - Copie o erro

3. **Dados do Usuário**:
   ```sql
   -- Execute no Supabase
   SELECT 
     u.email,
     bu.business_id,
     b.name as business_name
   FROM auth.users u
   LEFT JOIN business_users bu ON bu.user_id = u.id
   LEFT JOIN businesses b ON b.id = bu.business_id
   WHERE u.email = 'seu-email@exemplo.com';
   ```

---

## 🎯 Checklist de Debug

```
□ npm run dev rodando
□ Acesso em localhost:5173
□ Console aberto (F12)
□ Login feito
□ Business selecionado
□ Produtos carregam
□ Produto adiciona ao carrinho
□ Modal de pagamento abre
□ Erro aparece ao confirmar? (qual?)
```

---

**Teste agora e me diga qual erro aparece no console!**
