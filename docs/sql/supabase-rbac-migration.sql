-- ============================================================================
-- MIGRAÇÃO: Multi-Tenant + RBAC (Super Admin, Manager, Staff)
-- ============================================================================

-- 1. ADICIONAR ROLE 'super_admin' AO CHECK CONSTRAINT
-- ============================================================================
ALTER TABLE business_users 
  DROP CONSTRAINT IF EXISTS business_users_role_check;

ALTER TABLE business_users 
  ADD CONSTRAINT business_users_role_check 
  CHECK (role IN ('super_admin', 'owner', 'manager', 'staff'));

-- 2. CRIAR ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_business_users_role ON business_users(role);
CREATE INDEX IF NOT EXISTS idx_business_users_active ON business_users(active);

-- 3. POLÍTICAS RLS PARA SUPER_ADMIN
-- ============================================================================

DROP POLICY IF EXISTS "super_admin can view all businesses" ON businesses;
CREATE POLICY "super_admin can view all businesses" ON businesses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM business_users 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "super_admin can manage businesses" ON businesses;
CREATE POLICY "super_admin can manage businesses" ON businesses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_users 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "super_admin can view all business_users" ON business_users;
CREATE POLICY "super_admin can view all business_users" ON business_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM business_users 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "super_admin can manage business_users" ON business_users;
CREATE POLICY "super_admin can manage business_users" ON business_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_users 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- 4. FUNÇÃO: CRIAR UTILIZADOR E ASSOCIAR A UM BAR
-- ============================================================================
CREATE OR REPLACE FUNCTION create_business_user(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_business_id UUID,
  p_role TEXT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing_id UUID;
BEGIN
  -- Verificar se o executante é super_admin
  IF NOT EXISTS (
    SELECT 1 FROM business_users 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Apenas super_admin pode criar utilizadores';
  END IF;

  -- Validar role
  IF p_role NOT IN ('manager', 'staff') THEN
    RAISE EXCEPTION 'Role inválida: %', p_role;
  END IF;

  -- Verificar se o email já existe
  SELECT id INTO v_existing_id FROM auth.users WHERE email = p_email;
  
  IF v_existing_id IS NOT NULL THEN
    -- Utilizador já existe, associar ao bar
    INSERT INTO business_users (business_id, user_id, role, active)
    VALUES (p_business_id, v_existing_id, p_role, true)
    ON CONFLICT (business_id, user_id) 
    DO UPDATE SET role = p_role, active = true;
    
    RETURN jsonb_build_object('user_id', v_existing_id, 'created', false);
  ELSE
    -- Criar novo utilizador no auth
    v_user_id := extensions.uuid_generate_v4();
    
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at, 
      raw_user_meta_data, created_at, updated_at
    ) VALUES (
      v_user_id,
      p_email,
      crypt(p_password, gen_salt('bf')),
      NOW(),
      jsonb_build_object('name', p_name),
      NOW(),
      NOW()
    );
    
    -- Inserir na tabela business_users
    INSERT INTO business_users (business_id, user_id, role, active)
    VALUES (p_business_id, v_user_id, p_role, true);
    
    RETURN jsonb_build_object('user_id', v_user_id, 'created', true);
  END IF;
END;
$$;

-- 5. FUNÇÃO: LISTAR UTILIZADORES DE UM BAR (para super_admin)
-- ============================================================================
CREATE OR REPLACE FUNCTION list_business_users(
  p_business_id UUID DEFAULT NULL
) RETURNS TABLE (
  user_id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  active BOOLEAN,
  business_id UUID,
  business_name TEXT,
  created_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar permissão
  IF NOT EXISTS (
    SELECT 1 FROM business_users 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) AND p_business_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM business_users 
    WHERE user_id = auth.uid() AND business_id = p_business_id AND role IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'Sem permissão para listar utilizadores';
  END IF;

  RETURN QUERY
  SELECT 
    bu.user_id,
    u.email::TEXT,
    (u.raw_user_meta_data->>'name')::TEXT as name,
    bu.role,
    bu.active,
    bu.business_id,
    b.name::TEXT as business_name,
    bu.created_at
  FROM business_users bu
  JOIN auth.users u ON u.id = bu.user_id
  JOIN businesses b ON b.id = bu.business_id
  WHERE (p_business_id IS NULL OR bu.business_id = p_business_id)
    AND (EXISTS (SELECT 1 FROM business_users WHERE user_id = auth.uid() AND role = 'super_admin')
         OR bu.business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()))
  ORDER BY bu.created_at DESC;
END;
$$;

-- 6. FUNÇÃO: REMOVER UTILIZADOR DE UM BAR (desativar)
-- ============================================================================
CREATE OR REPLACE FUNCTION deactivate_business_user(
  p_user_id UUID,
  p_business_id UUID
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM business_users 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Apenas super_admin pode remover utilizadores';
  END IF;

  UPDATE business_users 
  SET active = false 
  WHERE user_id = p_user_id AND business_id = p_business_id;
  
  RETURN FOUND;
END;
$$;

-- 7. ATUALIZAR POLÍTICAS RLS DAS TABELAS PARA SUPER_ADMIN
-- ============================================================================

-- Função auxiliar para verificar se user é super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_users 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Atualizar políticas das tabelas principais para incluir super_admin
-- (super_admin vê todos os registos de todas as businesses)

DO $$
DECLARE
  tables_list TEXT[] := ARRAY['products', 'ingredients', 'sales', 'stock_movements', 'credits', 'credit_payments', 'tables'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_list
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "super_admin can view all %s" ON %I;
      CREATE POLICY "super_admin can view all %s" ON %I
        FOR SELECT USING (is_super_admin());
    ', t, t, t, t);
    
    EXECUTE format('
      DROP POLICY IF EXISTS "super_admin can manage all %s" ON %I;
      CREATE POLICY "super_admin can manage all %s" ON %I
        FOR ALL USING (is_super_admin());
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- 8. ASSOCIAR SUPER_ADMIN A TODOS OS BARES EXISTENTES
-- ============================================================================
-- NOTA: Substitua 'SEU-EMAIL-AQUI' pelo teu email
-- Descomente e execute após substituir:
/*
DO $$
DECLARE
  v_user_id UUID;
  v_business RECORD;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'SEU-EMAIL-AQUI';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não encontrado';
  END IF;

  FOR v_business IN SELECT id FROM businesses LOOP
    INSERT INTO business_users (business_id, user_id, role, active)
    VALUES (v_business.id, v_user_id, 'super_admin', true)
    ON CONFLICT (business_id, user_id) 
    DO UPDATE SET role = 'super_admin', active = true;
  END LOOP;
END;
$$;
*/

-- 9. VERIFICAR MIGRAÇÃO
-- ============================================================================
SELECT 'Migração concluída!' as status;
SELECT role, COUNT(*) as total FROM business_users GROUP BY role;
