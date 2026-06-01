# 🏠 Sistema Kynitas - Modo Localhost

## ⚡ Início Rápido

### Opção 1: Script Automático
```
Clique duas vezes em: INICIAR.bat
```

### Opção 2: Manual
```bash
npm run dev
```

Acesse: **http://localhost:5173**

---

## ✅ O Que Funciona

- ✅ Login e autenticação
- ✅ Gestão de produtos
- ✅ Vendas e pagamentos
- ✅ Gaveta de dinheiro (HTTP)
- ✅ Impressão de recibos
- ✅ Atualização de stock
- ✅ Relatórios e dashboard
- ✅ Gestão de clientes
- ✅ Gestão de fornecedores
- ✅ Sistema de vales/créditos

---

## 🔧 Configuração

### Supabase (Já Configurado)
```env
VITE_SUPABASE_URL=https://fqnelrzqvtovwegvimgj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Gaveta (Configure em Settings)
```
IP: 192.168.1.100 (exemplo)
Porta: 9100
Pino: 2 ou 5
```

---

## 📊 Arquitetura

```
┌─────────────────┐
│   Localhost     │
│  (Frontend)     │
│  Port: 5173     │
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│   Supabase      │
│  (Backend)      │
│  PostgreSQL     │
└─────────────────┘
```

---

## 🎯 Vantagens

1. **Desenvolvimento Rápido**
   - Hot reload automático
   - Debug fácil no console

2. **Todas Funcionalidades**
   - Gaveta funciona (HTTP)
   - Impressora funciona
   - Sem limitações

3. **Sem Custos**
   - Não precisa Vercel
   - Supabase free tier

4. **Dados Seguros**
   - Supabase na nuvem
   - Backup automático
   - Sincronização real-time

---

## 🔄 Fluxo de Trabalho

### Desenvolvimento:
```bash
1. npm run dev
2. Fazer alterações
3. Testar no navegador
4. Commit quando pronto
```

### Produção (Futuro):
```bash
1. npm run build
2. Deploy no Vercel
3. Ou criar app desktop
```

---

## 🆘 Solução de Problemas

### Vendas não finalizam?
```sql
-- Execute no Supabase SQL Editor:
-- Arquivo: supabase-fix-urgente.sql
```

### Gaveta não abre?
```
1. Verifique IP da impressora
2. Teste ping: ping 192.168.1.100
3. Configure em Settings
```

### Porta em uso?
```bash
npx kill-port 5173
# Ou
npm run dev -- --port 3000
```

---

## 📝 Comandos Úteis

```bash
# Iniciar
npm run dev

# Build
npm run build

# Preview build
npm run preview

# Limpar
rm -rf node_modules
npm install

# Ver versão
npm --version
node --version
```

---

## 🎉 Pronto!

Sistema configurado para rodar em **localhost** com:
- ✅ Base de dados Supabase funcionando
- ✅ Todas funcionalidades ativas
- ✅ Gaveta e impressora funcionando
- ✅ Sem deploy necessário

**Basta executar**: `INICIAR.bat` ou `npm run dev`

---

## 📚 Documentação

- **RODAR-LOCALHOST.md** - Guia detalhado
- **supabase-fix-urgente.sql** - Correção de banco
- **INICIAR.bat** - Script de início rápido

---

**Desenvolvido para Kynitas Bar** 🍺
