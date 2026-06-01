# Deploy no Vercel - Passo a Passo Completo

## 📋 Pré-requisitos

- [ ] Conta no GitHub (código já está lá)
- [ ] Conta no Vercel (criar em https://vercel.com)
- [ ] Conta no Supabase (criar em https://supabase.com)
- [ ] Projeto Supabase configurado

## 🚀 Passo 1: Preparar Supabase

### 1.1 Criar Projeto Supabase (se ainda não tiver)

1. Acesse https://supabase.com/dashboard
2. Clique em "New Project"
3. Preencha:
   - Name: `kynitas-dashboard`
   - Database Password: [senha forte]
   - Region: `South America (São Paulo)` (mais próximo de Moçambique)
4. Clique em "Create new project"
5. Aguarde 2-3 minutos

### 1.2 Executar Scripts SQL

1. No Supabase Dashboard, vá para **SQL Editor**
2. Clique em "New query"
3. Execute os scripts nesta ordem:

**Script 1: Schema Básico**
```sql
-- Copie e cole o conteúdo de: supabase-schema.sql
```

**Script 2: Melhorias Essenciais**
```sql
-- Copie e cole o conteúdo de: supabase-melhorias-essenciais.sql
```

**Script 3: Criar Admin**
```sql
-- Copie do arquivo VERCEL-AUTH-FIX.md (Solução Rápida)
```

### 1.3 Obter Credenciais do Supabase

1. No Supabase Dashboard, vá para **Settings → API**
2. Copie e guarde:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (chave longa)

## 🚀 Passo 2: Deploy no Vercel

### 2.1 Conectar GitHub ao Vercel

1. Acesse https://vercel.com/dashboard
2. Clique em "Add New..." → "Project"
3. Clique em "Import Git Repository"
4. Se não aparecer seu repositório:
   - Clique em "Adjust GitHub App Permissions"
   - Autorize acesso ao repositório `kynitas-dashboard`
5. Selecione o repositório `kynitas-dashboard`
6. Clique em "Import"

### 2.2 Configurar Projeto

1. **Project Name**: `kynitas-dashboard` (ou outro nome)
2. **Framework Preset**: Vite (deve detectar automaticamente)
3. **Root Directory**: `./` (deixar padrão)
4. **Build Command**: `npm run build` (deixar padrão)
5. **Output Directory**: `dist` (deixar padrão)

### 2.3 Adicionar Variáveis de Ambiente

**IMPORTANTE**: Antes de clicar em "Deploy", adicione as variáveis:

1. Clique em "Environment Variables"
2. Adicione:

```
Name: VITE_SUPABASE_URL
Value: https://xxxxx.supabase.co
(Cole a URL do Supabase que você copiou)

Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGc...
(Cole a chave anon do Supabase que você copiou)
```

3. Clique em "Add" para cada variável

### 2.4 Fazer Deploy

1. Clique em "Deploy"
2. Aguarde 2-5 minutos
3. Quando terminar, clique em "Visit" para abrir o site

## 🔧 Passo 3: Configurar URLs no Supabase

### 3.1 Adicionar URL do Vercel

1. Copie a URL do seu site Vercel (ex: `https://kynitas-dashboard.vercel.app`)
2. No Supabase Dashboard, vá para **Authentication → URL Configuration**
3. Configure:

**Site URL**:
```
https://kynitas-dashboard.vercel.app
```

**Redirect URLs** (adicione ambas):
```
https://kynitas-dashboard.vercel.app/**
http://localhost:5173/**
```

4. Clique em "Save"

## ✅ Passo 4: Testar Login

### 4.1 Acessar Site

1. Abra `https://seu-projeto.vercel.app`
2. Você deve ver a tela de login

### 4.2 Fazer Login

Use as credenciais criadas no SQL:
```
Email: admin@kynitas.com
Senha: Admin@123
```

### 4.3 Se Login Falhar

Execute o **Script Completo de Fix** do arquivo `VERCEL-AUTH-FIX.md` no Supabase SQL Editor.

## 🎨 Passo 5: Personalizar (Opcional)

### 5.1 Domínio Customizado

1. No Vercel Dashboard, vá para **Settings → Domains**
2. Clique em "Add"
3. Digite seu domínio (ex: `dashboard.kynitas.com`)
4. Siga instruções para configurar DNS

### 5.2 Alterar Nome do Negócio

1. Faça login no sistema
2. Vá para **Configurações → Negócio**
3. Altere:
   - Nome do Estabelecimento
   - Endereço
   - Telefone
   - NUIT
4. Clique em "Guardar Alterações"

## 🔄 Passo 6: Atualizações Futuras

### 6.1 Deploy Automático

Qualquer push para o GitHub faz deploy automático:

```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

Vercel detecta e faz deploy automaticamente em 2-3 minutos.

### 6.2 Deploy Manual

1. No Vercel Dashboard, vá para **Deployments**
2. Clique nos 3 pontos do último deploy
3. Clique em "Redeploy"

## 🐛 Troubleshooting

### Problema: Build Falha

**Erro**: `Command "npm run build" exited with 1`

**Solução**:
1. Verifique se variáveis de ambiente foram adicionadas
2. Verifique logs do build no Vercel
3. Teste build localmente: `npm run build`

### Problema: Página em Branco

**Causa**: Erro de JavaScript

**Solução**:
1. Abra Console do navegador (F12)
2. Verifique erros
3. Geralmente é problema de variáveis de ambiente

### Problema: Login Não Funciona

**Causa**: Credenciais incorretas ou usuário não existe

**Solução**:
1. Siga guia completo em `VERCEL-AUTH-FIX.md`
2. Execute script de criação de admin
3. Verifique variáveis de ambiente no Vercel

### Problema: Dados Não Aparecem

**Causa**: RLS policies bloqueando acesso

**Solução**:
1. Execute script de policies em `VERCEL-AUTH-FIX.md` (Solução 4)
2. Verifique se usuário está associado ao negócio

## 📊 Passo 7: Adicionar Dados Iniciais

### 7.1 Produtos de Exemplo

Execute no Supabase SQL Editor:

```sql
-- Obter business_id
SELECT id FROM businesses WHERE slug = 'kynitas-bar';

-- Inserir produtos (substitua BUSINESS_ID_AQUI)
INSERT INTO products (business_id, name, type, category, price, stock, created_at, updated_at)
VALUES
  ('BUSINESS_ID_AQUI', 'Cerveja 2M', 'drink', 'Cervejas', 80, 100, NOW(), NOW()),
  ('BUSINESS_ID_AQUI', 'Coca-Cola', 'drink', 'Não Alcoólicas', 50, 150, NOW(), NOW()),
  ('BUSINESS_ID_AQUI', 'Frango Assado', 'meal', 'Carnes', 250, 50, NOW(), NOW()),
  ('BUSINESS_ID_AQUI', 'Camarão Grelhado', 'meal', 'Frutos do Mar', 450, 30, NOW(), NOW());
```

### 7.2 Verificar Produtos

1. Faça login no sistema
2. Vá para **Produtos → Bebidas** ou **Produtos → Refeições**
3. Produtos devem aparecer

## 🎯 Checklist Final

- [ ] Projeto Supabase criado
- [ ] Scripts SQL executados
- [ ] Admin criado no Supabase
- [ ] Projeto conectado ao Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] URL do Vercel adicionada no Supabase
- [ ] Login funciona
- [ ] Dashboard carrega corretamente
- [ ] Produtos aparecem
- [ ] Vendas podem ser registradas

## 📞 Suporte

Se tiver problemas:

1. **Verifique Logs**:
   - Vercel: Dashboard → Deployments → Logs
   - Supabase: Dashboard → Logs
   - Navegador: F12 → Console

2. **Documentação**:
   - `VERCEL-AUTH-FIX.md` - Problemas de autenticação
   - `CASH-DRAWER-IMPLEMENTADO.md` - Configurar gaveta
   - `BACKUP-AUTOMATICO-IMPLEMENTADO.md` - Sistema de backup

3. **Comandos Úteis**:
   ```bash
   # Testar build localmente
   npm run build
   
   # Testar preview da build
   npm run preview
   
   # Ver logs do Vercel
   vercel logs
   ```

## 🎉 Pronto!

Seu sistema está no ar em:
- **URL**: `https://seu-projeto.vercel.app`
- **Admin**: `admin@kynitas.com` / `Admin@123`

Próximos passos:
1. Alterar senha do admin
2. Adicionar produtos reais
3. Configurar impressora térmica
4. Configurar gaveta de dinheiro
5. Treinar equipe

---

**Tempo estimado**: 15-30 minutos
**Dificuldade**: Fácil
**Status**: ✅ Testado e Funcional
