-- ============================================================================
-- KYNITAS ERP - CONFIGURAR SUPER ADMIN (VERSÃO SIMPLES)
-- ============================================================================

-- 1. VERIFICAR SE USUÁRIO EXISTE
SELECT 
  id,
  email,
  email_confirmed_at
FROM auth.users 
WHERE email = 'noemarrengula1@gmail.com';

-- 2. CONFIRMAR EMAIL (se necessário)
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'noemarrengula1@gmail.com' 
AND email_confirmed_at IS NULL;

-- 3. VERIFICAR SE BUSINESS EXISTE
SELECT id, name, slug FROM businesses WHERE slug = 'kynitas-bar';

-- 4. CONFIGURAR COMO SUPER ADMIN (versão simples)
INSERT INTO business_users (business_id, user_id, role, active)
SELECT 
  b.id,
  u.id,
  'super_admin',
  true
FROM businesses b, auth.users u
WHERE b.slug = 'kynitas-bar' 
AND u.email = 'noemarrengula1@gmail.com'
ON CONFLICT (business_id, user_id) 
DO UPDATE SET 
  role = 'super_admin',
  active = true;

-- 5. VERIFICAR RESULTADO
SELECT 
  u.email,
  bu.role,
  bu.active,
  b.name as business_name
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
JOIN auth.users u ON u.id = bu.user_id
WHERE u.email = 'noemarrengula1@gmail.com';

-- 6. CRIAR SEGUNDO BUSINESS (opcional)
INSERT INTO businesses (name, slug, address, phone)
VALUES ('Bahules Rooftop', 'bahules-rooftop', 'Maputo, Polana', '+258 84 987 6543')
ON CONFLICT (slug) DO NOTHING;

-- 7. ASSOCIAR AO SEGUNDO BUSINESS TAMBÉM
INSERT INTO business_users (business_id, user_id, role, active)
SELECT 
  b.id,
  u.id,
  'super_admin',
  true
FROM businesses b, auth.users u
WHERE b.slug = 'bahules-rooftop' 
AND u.email = 'noemarrengula1@gmail.com'
ON CONFLICT (business_id, user_id) 
DO UPDATE SET 
  role = 'super_admin',
  active = true;

-- 8. VERIFICAÇÃO FINAL
SELECT 
  b.name as business_name,
  b.slug,
  bu.role,
  bu.active,
  u.email
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
JOIN auth.users u ON u.id = bu.user_id
WHERE u.email = 'noemarrengula1@gmail.com'
ORDER BY b.name;