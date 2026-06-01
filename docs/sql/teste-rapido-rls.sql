-- ============================================================================
-- TESTE RÁPIDO: Verificar se dados estão acessíveis
-- Execute este script para testar se o problema é RLS ou dados
-- ============================================================================

-- 1. DESABILITAR RLS TEMPORARIAMENTE
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_users DISABLE ROW LEVEL SECURITY;

-- 2. VERIFICAR DADOS BRUTOS
SELECT 'USUÁRIO' as tipo, email, id FROM auth.users WHERE email = 'noemarrengula1@gmail.com'
UNION ALL
SELECT 'BUSINESSES' as tipo, name, id::text FROM businesses
UNION ALL
SELECT 'BUSINESS_USERS' as tipo, 
       CONCAT(role, ' - ', (SELECT name FROM businesses WHERE id = business_id)), 
       user_id::text 
FROM business_users 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'noemarrengula1@gmail.com');

-- 3. QUERY EXATA QUE O FRONTEND FAZ
SELECT 
  bu.business_id,
  bu.role,
  bu.active,
  b.id,
  b.name,
  b.slug,
  b.address,
  b.phone
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
WHERE bu.user_id = (SELECT id FROM auth.users WHERE email = 'noemarrengula1@gmail.com')
AND bu.active = true
AND b.active = true;

-- 4. REABILITAR RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;

-- 5. TESTAR COM RLS ATIVO (pode falhar se RLS estiver bloqueando)
SELECT 
  bu.business_id,
  bu.role,
  bu.active,
  b.name,
  b.slug
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
WHERE bu.user_id = (SELECT id FROM auth.users WHERE email = 'noemarrengula1@gmail.com')
AND bu.active = true;