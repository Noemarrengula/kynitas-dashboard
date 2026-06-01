# ⚡ Comandos Rápidos - Kynitas Dashboard

## 🚀 Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Abrir no navegador
# http://localhost:5173
```

## 🏗️ Build

```bash
# Build para produção
npm run build

# Preview da build
npm run preview

# Limpar e rebuild
rm -rf dist && npm run build
```

## 🧪 Testes

```bash
# Verificar erros TypeScript
npm run type-check

# Lint código
npm run lint

# Fix lint automaticamente
npm run lint --fix
```

## 📦 Dependências

```bash
# Instalar dependências
npm install

# Atualizar dependências
npm update

# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install
```

## 🗄️ Supabase

### Executar Schema

```sql
-- No Supabase SQL Editor, executar:
-- 1. Copiar conteúdo de supabase-completo.sql
-- 2. Colar e executar
```

### Criar Negócio

```sql
SELECT create_initial_business(
  auth.uid(),
  'Kynitas Bar',
  'kynitas-bar'
);
```

### Associar Usuário

```sql
INSERT INTO business_users (business_id, user_id, role)
SELECT 
  b.id, 
  u.id,
  'owner'
FROM businesses b
CROSS JOIN auth.users u
WHERE b.slug = 'kynitas-bar'
LIMIT 1
ON CONFLICT (business_id, user_id) DO NOTHING;
```

### Verificar Dados

```sql
-- Ver negócios
SELECT * FROM businesses;

-- Ver usuários do negócio
SELECT * FROM business_users;

-- Ver produtos
SELECT * FROM products;

-- Ver vendas
SELECT * FROM sales ORDER BY created_at DESC LIMIT 10;
```

## 🌐 Deploy Vercel

### Primeira Vez

```bash
# 1. Commit código
git add .
git commit -m "feat: sistema completo"
git push origin main

# 2. No Vercel Dashboard:
# - Import repository
# - Configure environment variables
# - Deploy
```

### Deploys Subsequentes

```bash
# Commit e push (deploy automático)
git add .
git commit -m "fix: correção de bug"
git push origin main
```

### Rollback

```bash
# No Vercel Dashboard:
# Deployments > Selecionar versão anterior > Promote to Production
```

## 🔧 Troubleshooting

### Erro de Build

```bash
# Limpar tudo
rm -rf node_modules dist .next
npm install
npm run build
```

### Erro de TypeScript

```bash
# Verificar erros
npm run type-check

# Regenerar types
rm -rf node_modules/@types
npm install
```

### Erro de Supabase

```bash
# Verificar conexão
# 1. Abrir console do navegador
# 2. Verificar Network tab
# 3. Procurar por erros 401/403
```

### Limpar Cache

```bash
# Limpar cache do navegador
# Chrome: Ctrl+Shift+Delete

# Limpar cache do Vite
rm -rf node_modules/.vite
```

## 📊 Monitoramento

### Logs Vercel

```bash
# No Vercel Dashboard:
# Deployments > Selecionar deploy > View Function Logs
```

### Logs Supabase

```bash
# No Supabase Dashboard:
# Logs > Selecionar tipo de log
```

## 🔑 Variáveis de Ambiente

### Local (.env)

```env
VITE_SUPABASE_URL=https://fqnelrzqvtovwegvimgj.supabase.co
VITE_SUPABASE_ANON_KEY=sua-key-aqui
```

### Vercel

```bash
# No Vercel Dashboard:
# Settings > Environment Variables
# Adicionar:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
```

## 📱 Testes Rápidos

### Testar Autenticação

```bash
# 1. Abrir http://localhost:5173/login
# 2. Registrar novo usuário
# 3. Fazer login
# 4. Verificar redirect para dashboard
```

### Testar Produtos

```bash
# 1. Ir para Produtos > Bebidas
# 2. Adicionar nova bebida
# 3. Editar bebida
# 4. Deletar bebida (confirmar)
```

### Testar Vendas

```bash
# 1. Ir para Vendas
# 2. Adicionar produtos ao carrinho
# 3. Finalizar venda
# 4. Verificar histórico
```

### Testar Export

```bash
# 1. Ir para Histórico de Vendas
# 2. Clicar em Exportar
# 3. Escolher Excel ou CSV
# 4. Verificar download
```

## 🎯 Atalhos Úteis

### VS Code

```
Ctrl+P - Quick Open
Ctrl+Shift+P - Command Palette
Ctrl+` - Terminal
Ctrl+B - Toggle Sidebar
F5 - Debug
```

### Chrome DevTools

```
F12 - Abrir DevTools
Ctrl+Shift+C - Inspect Element
Ctrl+Shift+J - Console
Ctrl+Shift+I - DevTools
```

## 📋 Checklist Rápido

### Antes de Commitar

- [ ] `npm run build` - Build funciona
- [ ] `npm run type-check` - Sem erros TypeScript
- [ ] Testar funcionalidade alterada
- [ ] Verificar console sem erros

### Antes de Deploy

- [ ] Build local funciona
- [ ] Variáveis de ambiente configuradas
- [ ] Supabase funcionando
- [ ] Testes básicos passam

### Após Deploy

- [ ] Site carrega
- [ ] Login funciona
- [ ] Dados carregam
- [ ] Sem erros no console

## 🆘 Comandos de Emergência

### Sistema Travado

```bash
# Matar processos Node
taskkill /F /IM node.exe

# Ou no Linux/Mac
killall node
```

### Porta em Uso

```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5173 | xargs kill -9
```

### Git Reset

```bash
# Desfazer último commit (manter alterações)
git reset --soft HEAD~1

# Desfazer alterações não commitadas
git checkout .

# Voltar para commit específico
git reset --hard <commit-hash>
```

## 📞 Contatos Rápidos

- **Supabase Support**: https://supabase.com/support
- **Vercel Support**: https://vercel.com/support
- **Documentação**: Ver README-COMPLETO.md

---

**Dica**: Salve este arquivo nos favoritos para acesso rápido! 🌟
