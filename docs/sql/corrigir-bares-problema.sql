-- ============================================================================
-- CORREÇÃO: Resolver problema dos bares não aparecerem
-- ============================================================================

-- 1. DESABILITAR RLS TEMPORARIAMENTE PARA VERIFICAR
ALTER TABLE business_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;

-- 2. VERIFICAR DADOS SEM RLS
SELECT 
  u.email,
  bu.role,
  bu.active,
  b.name as business_name,
  b.slug
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
JOIN auth.users u ON u.id = bu.user_id
WHERE u.email = 'noemarrengula1@gmail.com';

-- 3. RECRIAR FUNÇÃO get_user_businesses() MAIS SIMPLES
CREATE OR REPLACE FUNCTION get_user_businesses()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id 
  FROM business_users 
  WHERE user_id = auth.uid() 
  AND active = true;
$$;

-- 4. RECRIAR POLÍTICAS RLS MAIS SIMPLES
DROP POLICY IF EXISTS "Users can view their businesses" ON businesses;
CREATE POLICY "Users can view their businesses" ON businesses
  FOR ALL USING (
    id IN (
      SELECT business_id 
      FROM business_users 
      WHERE user_id = auth.uid() 
      AND active = true
    )
  );

DROP POLICY IF EXISTS "Super admins can manage all businesses" ON businesses;
CREATE POLICY "Super admins can manage all businesses" ON businesses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_users 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin' 
      AND active = true
    )
  );

-- 5. POLÍTICAS PARA business_users
DROP POLICY IF EXISTS "Users can view business users of their businesses" ON business_users;
CREATE POLICY "Users can view business users of their businesses" ON business_users
  FOR ALL USING (
    business_id IN (
      SELECT business_id 
      FROM business_users bu2 
      WHERE bu2.user_id = auth.uid() 
      AND bu2.active = true
    )
  );

-- 6. REABILITAR RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;

-- 7. TESTAR NOVAMENTE
SELECT 
  u.email,
  bu.role,
  bu.active,
  b.name as business_name,
  b.slug
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
JOIN auth.users u ON u.id = bu.user_id
WHERE u.email = 'noemarrengula1@gmail.com';

-- 8. VERIFICAR SE auth.uid() ESTÁ FUNCIONANDO
-- Execute isso quando logado no sistema:
SELECT 
  auth.uid() as current_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as current_email;

-- 9. GARANTIR QUE COLUNA active EXISTE E TEM VALOR CORRETO
UPDATE business_users 
SET active = true 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'noemarrengula1@gmail.com');

-- 10. VERIFICAÇÃO FINAL
SELECT 
  'Total businesses' as tipo,
  COUNT(*) as quantidade
FROM businesses
UNION ALL
SELECT 
  'Business users para noemarrengula1@gmail.com' as tipo,
  COUNT(*) as quantidade
FROM business_users bu
JOIN auth.users u ON u.id = bu.user_id
WHERE u.email = 'noemarrengula1@gmail.com'
AND bu.active = true;