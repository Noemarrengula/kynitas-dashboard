# ✅ PASSO 1: EXECUTAR SCRIPT SQL NO SUPABASE

## 📋 Instruções Passo-a-Passo

### PASSO 1: Acessar Supabase
1. Abra: https://supabase.com/dashboard
2. Faça login
3. Selecione o projeto: **fqnelrzqvtovwegvimgj**

### PASSO 2: Abrir SQL Editor
1. No menu lateral esquerdo, clique em: **SQL Editor**
2. Clique em **New query** (botão azul)

### PASSO 3: Copiar Script
1. Abra o arquivo: `supabase-completo.sql` (está na raiz do projeto)
2. Selecione **TUDO** (Ctrl+A)
3. Copie (Ctrl+C)

### PASSO 4: Executar no Supabase
1. Cole no SQL Editor (Ctrl+V)
2. Clique em **Run** (ou pressione Ctrl+Enter)
3. Aguarde **5-10 segundos**

### PASSO 5: Verificar Resultado
Deve aparecer:
```
✅ Query executed successfully
```

Se houver erros, veja o painel de erros abaixo.

---

## ⚠️ SE HOUVER ERRO

### Erro: "relation 'businesses' already exists"
**Solução:** É normal! Significa que a tabela já existe. Continue.

### Erro: "permission denied"
**Solução:**
1. Você é admin do projeto?
2. Tente fazer login novamente

### Erro: "syntax error"
**Solução:**
1. Abra o arquivo `supabase-completo.sql`
2. Verifique se copiou o conteúdo inteiro (até o final)
3. Tente novamente

---

## ✅ DEPOIS DE EXECUTAR

1. Vá para **Database** > **Tables** (menu lateral)
2. Verifique se existem estas tabelas:
   - ✅ businesses
   - ✅ business_users
   - ✅ products
   - ✅ ingredients
   - ✅ sales
   - ✅ customers
   - ✅ suppliers
   - ✅ stock_movements

Se todas existem, o SQL foi executado com sucesso! ✅

---

## 🔍 PRÓXIMO PASSO

Depois de executar o SQL, você pode:
1. Executar o comando de verificação: `VERIFICAR-BASE-DADOS.sql`
2. Ou passar para o **Passo 2: Criar Health Check**

