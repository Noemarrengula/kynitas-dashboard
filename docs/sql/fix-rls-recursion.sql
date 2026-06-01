
-- ============================================================================
-- FIX: Recursão infinita nas RLS policies
-- ============================================================================
-- Substituir todas as policies que usam subquery inline em business_users
-- pela função is_super_admin() que tem SECURITY DEFINER (bypassa RLS)

-- 1. DROPAR policies problemáticas em businesses
DROP POLICY IF EXISTS "super_admin can view all businesses" ON businesses;
DROP POLICY IF EXISTS "super_admin can manage businesses" ON businesses;

-- 2. DROPAR policies problemáticas em business_users
DROP POLICY IF EXISTS "super_admin can view all business_users" ON business_users;
DROP POLICY IF EXISTS "super_admin can manage business_users" ON business_users;

-- 3. RECRIAR em businesses usando is_super_admin()
CREATE POLICY "super_admin can view all businesses" ON businesses
  FOR SELECT USING (
    is_super_admin()
  );

CREATE POLICY "super_admin can manage businesses" ON businesses
  FOR ALL USING (
    is_super_admin()
  );

-- 4. RECRIAR em business_users usando is_super_admin()
CREATE POLICY "super_admin can view all business_users" ON business_users
  FOR SELECT USING (
    is_super_admin()
  );

CREATE POLICY "super_admin can manage business_users" ON business_users
  FOR ALL USING (
    is_super_admin()
  );

-- 5. Verificar
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('businesses', 'business_users')
ORDER BY tablename, policyname;
