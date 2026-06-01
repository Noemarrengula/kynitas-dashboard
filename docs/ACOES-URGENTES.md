# 🚨 AÇÕES URGENTES - Resolver Problemas Agora

## ⚡ FAÇA ISSO AGORA (5 minutos)

### 1️⃣ Configurar Vercel (CRÍTICO)
```
1. Acesse: https://vercel.com
2. Vá em: Seu Projeto > Settings > Environment Variables
3. Adicione estas 2 variáveis:

   Nome: VITE_SUPABASE_URL
   Valor: https://fqnelrzqvtovwegvimgj.supabase.co
   Ambiente: ✅ Production ✅ Preview ✅ Development

   Nome: VITE_SUPABASE_ANON_KEY
   Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxbmVscnpxdnRvdndlZ3ZpbWdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NzU1MjcsImV4cCI6MjA4MDI1MTUyN30._410oTepMSgwwF03-ZfDJqbR_rUTeZ4goASdi7msZtQ
   Ambiente: ✅ Production ✅ Preview ✅ Development

4. Clique em "Save"
```

### 2️⃣ Corrigir Supabase (CRÍTICO)
```
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto: fqnelrzqvtovwegvimgj
3. Vá em: SQL Editor
4. Cole e execute o arquivo: supabase-fix-urgente.sql
5. Verifique se não há erros
```

### 3️⃣ Fazer Deploy (CRÍTICO)
```bash
# No terminal, execute:
git add .
git commit -m "fix: corrigir vendas e gaveta pós-deploy"
git push origin main

# Aguarde 2-3 minutos para o deploy completar
```

---

## 🧪 TESTAR (3 minutos)

### Teste 1: Abrir o Sistema
```
1. Acesse: https://seu-dominio.vercel.app
2. Faça login
3. Abra o Console (F12)
4. Vá para a aba "Console"
```

### Teste 2: Tentar Venda
```
1. Vá em: Vendas
2. Adicione 1 produto
3. Clique em "Finalizar Venda"
4. Preencha: 100 MT em dinheiro
5. Clique em "Confirmar"
6. OBSERVE O CONSOLE - procure por erros
```

### Teste 3: Verificar Resultado
```
✅ Venda apareceu em "Histórico de Vendas"?
✅ Recibo foi impresso?
✅ Stock foi atualizado?
❌ Gaveta não abriu? (NORMAL em produção HTTPS)
```

---

## 🔧 PROBLEMAS COMUNS

### Problema: "Erro ao processar venda"
**Solução**:
1. Verifique se as variáveis do Vercel foram salvas
2. Faça um novo deploy
3. Limpe o cache do navegador (Ctrl+Shift+Delete)

### Problema: "Negócio não encontrado"
**Solução**:
1. Faça logout
2. Faça login novamente
3. Tente a venda novamente

### Problema: "Erro de permissão no banco"
**Solução**:
1. Execute o SQL: `supabase-fix-urgente.sql`
2. Verifique se seu usuário está em `business_users`

### Problema: Gaveta não abre
**Solução**:
- Em PRODUÇÃO (HTTPS): Gaveta NÃO funcionará
- Em DESENVOLVIMENTO (HTTP): Gaveta funciona
- **Opções**:
  - Usar impressora USB
  - Criar app desktop (Electron)
  - Aceitar limitação temporária

---

## 📊 VERIFICAÇÃO FINAL

Execute este checklist:

```
✅ Variáveis configuradas no Vercel
✅ SQL executado no Supabase
✅ Deploy realizado
✅ Login funcionando
✅ Vendas finalizando
✅ Dados salvando no banco
✅ Recibos imprimindo
⚠️ Gaveta: Aceitar limitação ou implementar solução
```

---

## 🆘 SE NADA FUNCIONAR

### Debug Avançado:

1. **Ver logs do Vercel**:
   - https://vercel.com/seu-projeto/deployments
   - Clique no último deploy
   - Veja os logs de build e runtime

2. **Ver logs do Supabase**:
   - Dashboard > Logs > API Logs
   - Filtre por "error"

3. **Ver erros do navegador**:
   - F12 > Console
   - F12 > Network
   - Tente fazer venda
   - Copie os erros

4. **Testar localmente**:
   ```bash
   npm run build
   npm run preview
   # Acesse: http://localhost:4173
   ```

---

## 📞 RESUMO

### O que foi corrigido:
✅ `.env.production` com chave correta
✅ Logs detalhados para debug
✅ Tratamento de erros melhorado
✅ Gaveta com aviso de limitação HTTPS

### O que VOCÊ precisa fazer:
1. ⏳ Configurar variáveis no Vercel
2. ⏳ Executar SQL no Supabase
3. ⏳ Fazer deploy
4. ⏳ Testar vendas

### Tempo estimado: 10 minutos

---

**IMPORTANTE**: A gaveta NÃO funcionará em produção (HTTPS) por limitações de segurança do navegador. Isso é NORMAL e esperado. Você precisará de uma solução alternativa (USB, app desktop, ou proxy local).

**Data**: 2024
**Prioridade**: 🔴 URGENTE
