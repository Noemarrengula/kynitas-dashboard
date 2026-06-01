# Fix: Credenciais Admin não Reconhecidas no Vercel

## 🔍 Problema
Após deploy no Vercel, as credenciais de admin não funcionam para login.

## ✅ Soluções

### Solução 1: Configurar Variáveis de Ambiente no Vercel

1. **Acesse o Painel do Vercel**
   - https://vercel.com/dashboard
   - Selecione seu projeto `kynitas-dashboard`

2. **Vá para Settings → Environment Variables**
   - Clique em "Settings" no menu superior
   - Clique em "Environment Variables" no menu lateral

3. **Adicione as Variáveis**
   ```
   VITE_SUPABASE_URL = sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY = sua_chave_anonima_do_supabase
   ```

4. **Onde Encontrar os Valores**
   - Acesse: https://supabase.com/dashboard
   - Selecione seu projeto
   - Settings → API
   - Copie:
     - Project URL → `VITE_SUPABASE_URL`
     - anon/public key → `VITE_SUPABASE_ANON_KEY`

5. **Redeploy**
   - Deployments → Clique nos 3 pontos do último deploy
   - "Redeploy"

### Solução 2: Verificar Usuário Admin no Supabase

1. **Acesse Supabase Dashboard**
   - https://supabase.com/dashboard
   - Selecione seu projeto

2. **Vá para Authentication → Users**
   - Verifique se seu usuário admin existe
   - Verifique se o email está confirmado

3. **Se Não Existir, Criar Admin**
   - Clique em "Add user" → "Create new user"
   - Email: `admin@kynitas.com` (ou seu email)
   - Password: `Admin@123` (ou sua senha)
   - ✅ Marque "Auto Confirm User"
   - Clique em "Create user"

### Solução 3: Criar Admin via SQL

Execute no Supabase SQL Editor:

```sql
-- 1. Criar usuário admin (se não existir)
-- Substitua email e senha
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@kynitas.com', -- SEU EMAIL
  crypt('Admin@123', gen_salt('bf')), -- SUA SENHA
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Admin"}',
  false,
  ''
) ON CONFLICT (email) DO NOTHING;

-- 2. Criar negócio para o admin
INSERT INTO businesses (id, name, slug, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Kynitas Bar',
  'kynitas-bar',
  NOW(),
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- 3. Associar admin ao negócio
INSERT INTO business_users (business_id, user_id, role, created_at)
SELECT 
  b.id,
  u.id,
  'admin',
  NOW()
FROM businesses b, auth.users u
WHERE b.slug = 'kynitas-bar'
  AND u.email = 'admin@kynitas.com'
ON CONFLICT (business_id, user_id) DO NOTHING;
```

### Solução 4: Verificar RLS Policies

Execute no Supabase SQL Editor:

```sql
-- Verificar se RLS está configurado corretamente
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Se necessário, recriar policies básicas
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Policy para business_users
DROP POLICY IF EXISTS "Users can view their business associations" ON business_users;
CREATE POLICY "Users can view their business associations" ON business_users
  FOR SELECT USING (user_id = auth.uid());

-- Policy para businesses
DROP POLICY IF EXISTS "Users can view their businesses" ON businesses;
CREATE POLICY "Users can view their businesses" ON businesses
  FOR SELECT USING (
    id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
  );

-- Policy para products
DROP POLICY IF EXISTS "Users can view their business products" ON products;
CREATE POLICY "Users can view their business products" ON products
  FOR ALL USING (
    business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
  );

-- Policy para sales
DROP POLICY IF EXISTS "Users can manage their business sales" ON sales;
CREATE POLICY "Users can manage their business sales" ON sales
  FOR ALL USING (
    business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
  );
```

### Solução 5: Verificar URL do Vercel no Supabase

1. **Acesse Supabase Dashboard**
   - Settings → Authentication → URL Configuration

2. **Adicione URL do Vercel**
   - Site URL: `https://seu-projeto.vercel.app`
   - Redirect URLs: 
     - `https://seu-projeto.vercel.app/**`
     - `http://localhost:5173/**` (para desenvolvimento)

3. **Salve as Alterações**

## 🧪 Testar Localmente Primeiro

Antes de fazer deploy, teste localmente:

```bash
# 1. Configure .env.local
cp .env.example .env.local

# 2. Edite .env.local com suas credenciais
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui

# 3. Teste localmente
npm run dev

# 4. Tente fazer login
# Se funcionar localmente, o problema é no Vercel
```

## 📋 Checklist de Verificação

- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Usuário admin existe no Supabase
- [ ] Email do admin está confirmado
- [ ] Negócio (business) existe no Supabase
- [ ] Associação business_users existe
- [ ] RLS policies estão corretas
- [ ] URL do Vercel está nas Redirect URLs do Supabase
- [ ] Redeploy foi feito após configurar variáveis

## 🔐 Credenciais Padrão Recomendadas

Para produção, use:
```
Email: admin@kynitas.com
Senha: [senha forte e segura]
```

Para desenvolvimento:
```
Email: dev@kynitas.com
Senha: Dev@123456
```

## 🚨 Erros Comuns

### Erro: "Invalid login credentials"
**Causa**: Usuário não existe ou senha incorreta
**Solução**: Criar usuário via Supabase Dashboard ou SQL

### Erro: "Email not confirmed"
**Causa**: Email não foi confirmado
**Solução**: Marcar "Auto Confirm User" ao criar ou confirmar manualmente

### Erro: "No business found"
**Causa**: Usuário existe mas não tem negócio associado
**Solução**: Executar SQL da Solução 3

### Erro: Página em branco após login
**Causa**: RLS policies bloqueando acesso aos dados
**Solução**: Executar SQL da Solução 4

## 📞 Suporte Adicional

Se o problema persistir:

1. **Verifique Console do Navegador**
   - F12 → Console
   - Procure por erros relacionados a Supabase

2. **Verifique Logs do Vercel**
   - Vercel Dashboard → Deployments → Clique no deploy → Logs

3. **Verifique Logs do Supabase**
   - Supabase Dashboard → Logs → Auth Logs

4. **Teste Conexão Direta**
   ```javascript
   // No console do navegador (F12)
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'admin@kynitas.com',
     password: 'Admin@123'
   });
   console.log('Data:', data);
   console.log('Error:', error);
   ```

## ✅ Solução Rápida (Recomendada)

Execute este script completo no Supabase SQL Editor:

```sql
-- SCRIPT COMPLETO DE FIX DE AUTENTICAÇÃO

-- 1. Criar extensão para criptografia (se não existir)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Criar usuário admin
DO $$
DECLARE
  v_user_id UUID;
  v_business_id UUID;
BEGIN
  -- Criar usuário se não existir
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@kynitas.com',
    crypt('Admin@123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin Kynitas"}',
    false
  ) ON CONFLICT (email) DO UPDATE SET
    email_confirmed_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_user_id;

  -- Obter ID do usuário se já existia
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@kynitas.com';
  END IF;

  -- Criar negócio se não existir
  INSERT INTO businesses (id, name, slug, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Kynitas Bar',
    'kynitas-bar',
    NOW(),
    NOW()
  ) ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_business_id;

  -- Obter ID do negócio se já existia
  IF v_business_id IS NULL THEN
    SELECT id INTO v_business_id FROM businesses WHERE slug = 'kynitas-bar';
  END IF;

  -- Associar usuário ao negócio
  INSERT INTO business_users (business_id, user_id, role, created_at)
  VALUES (v_business_id, v_user_id, 'admin', NOW())
  ON CONFLICT (business_id, user_id) DO UPDATE SET
    role = 'admin',
    updated_at = NOW();

  RAISE NOTICE 'Admin criado com sucesso! Email: admin@kynitas.com | Senha: Admin@123';
END $$;

-- 3. Verificar criação
SELECT 
  u.email,
  u.email_confirmed_at,
  b.name as business_name,
  bu.role
FROM auth.users u
JOIN business_users bu ON bu.user_id = u.id
JOIN businesses b ON b.id = bu.business_id
WHERE u.email = 'admin@kynitas.com';
```

Após executar, use:
- **Email**: `admin@kynitas.com`
- **Senha**: `Admin@123`

---

**Última atualização**: 2024
**Status**: ✅ Testado e Funcional
