# 🏠 Rodar Sistema em Localhost

## ✅ Configuração Atual

Sistema configurado para rodar localmente com Supabase na nuvem:
- Frontend: `http://localhost:5173`
- Backend: Supabase (nuvem)
- Gaveta: Funciona normalmente
- Impressora: Funciona normalmente

---

## 🚀 Como Iniciar

### 1. Verificar Supabase
```bash
# Arquivo .env já está configurado com:
VITE_SUPABASE_URL=https://fqnelrzqvtovwegvimgj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Instalar Dependências (se necessário)
```bash
npm install
```

### 3. Iniciar Servidor
```bash
npm run dev
```

### 4. Acessar Sistema
```
http://localhost:5173
```

---

## 🔧 Corrigir Base de Dados

Se vendas não estiverem funcionando, execute no Supabase:

### Opção 1: SQL Completo
```sql
-- Execute: supabase-fix-urgente.sql
-- No Supabase Dashboard > SQL Editor
```

### Opção 2: SQL Rápido
```sql
-- Verificar tabela sales
SELECT * FROM information_schema.columns 
WHERE table_name = 'sales';

-- Recriar políticas RLS
DROP POLICY IF EXISTS "Users can insert their business sales" ON sales;
CREATE POLICY "Users can insert their business sales" 
ON sales FOR INSERT 
WITH CHECK (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
);
```

---

## ✅ Checklist de Funcionamento

```
□ npm run dev rodando
□ Acesso em http://localhost:5173
□ Login funciona
□ Produtos carregam
□ Vendas finalizam
□ Gaveta abre (se configurada)
□ Recibos imprimem
□ Stock atualiza
```

---

## 🎯 Vantagens do Localhost

✅ Gaveta funciona (HTTP)
✅ Impressora funciona
✅ Mais rápido para desenvolvimento
✅ Sem custos de hospedagem
✅ Fácil de debugar

---

## 📊 Estrutura

```
Localhost (HTTP)
    ↓
Frontend React
    ↓
Supabase (HTTPS)
    ↓
PostgreSQL
```

---

## 🆘 Problemas Comuns

### Problema: "Supabase not configured"
**Solução**: Verifique arquivo `.env`

### Problema: "Vendas não finalizam"
**Solução**: Execute SQL de correção no Supabase

### Problema: "Gaveta não abre"
**Solução**: Verifique IP e porta da impressora em Settings

### Problema: "Porta 5173 em uso"
**Solução**: 
```bash
# Matar processo
npx kill-port 5173
# Ou usar outra porta
npm run dev -- --port 3000
```

---

## 🔄 Comandos Úteis

```bash
# Iniciar desenvolvimento
npm run dev

# Build para produção (teste local)
npm run build
npm run preview

# Limpar cache
npm run clean
npm install

# Ver logs
# Console do navegador (F12)
```

---

## 📝 Notas

- Sistema usa `.env` para localhost
- `.env.production` é apenas para Vercel
- Supabase sempre na nuvem
- Dados sincronizados em tempo real

---

**Pronto! Sistema rodando em localhost com todas as funcionalidades! 🎉**
