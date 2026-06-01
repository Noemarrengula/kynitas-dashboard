-- ============================================================================
-- DIAGNÓSTICO: Por que os bares não aparecem para noemarrengula1@gmail.com
-- ============================================================================

-- 1. VERIFICAR SE O USUÁRIO EXISTE
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'noemarrengula1@gmail.com';

-- 2. VERIFICAR ASSOCIAÇÕES BUSINESS_USERS
SELECT 
  bu.id,
  bu.business_id,
  bu.user_id,
  bu.role,
  bu.active,
  b.name as business_name,
  b.slug,
  u.email
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
JOIN auth.users u ON u.id = bu.user_id
WHERE u.email = 'noemarrengula1@gmail.com';

-- 3. VERIFICAR TODOS OS BUSINESSES EXISTENTES
SELECT 
  id,
  name,
  slug,
  active,
  created_at
FROM businesses
ORDER BY name;

-- 4. TESTAR FUNÇÃO get_user_businesses() 
-- (Substitua USER_ID_AQUI pelo ID real do usuário)
SELECT get_user_businesses() as business_ids;

-- 5. VERIFICAR RLS POLICIES EM business_users
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'business_users';

-- 6. VERIFICAR SE RLS ESTÁ ATIVO
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('businesses', 'business_users')
AND schemaname = 'public';

-- 7. TESTAR QUERY DIRETA (como o frontend faz)
SELECT 
  bu.business_id,
  bu.role,
  b.*
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
WHERE bu.user_id = (SELECT id FROM auth.users WHERE email = 'noemarrengula1@gmail.com')
AND bu.active = true;