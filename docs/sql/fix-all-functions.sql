
-- ============================================================================
-- CRIAR FUNÇÕES EM FALTA E CORRIGIR list_business_users
-- ============================================================================

-- 1. create_initial_business (usada no registo)
-- ============================================================================
CREATE OR REPLACE FUNCTION create_initial_business(
  user_uuid UUID,
  business_name TEXT,
  business_slug TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_business_id UUID;
BEGIN
  INSERT INTO businesses (name, slug)
  VALUES (business_name, business_slug)
  RETURNING id INTO new_business_id;

  INSERT INTO business_users (business_id, user_id, role)
  VALUES (new_business_id, user_uuid, 'owner');

  RETURN new_business_id;
END;
$$;

-- 2. create_business_user (usada pelo Super Admin na UI)
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
  IF NOT EXISTS (
    SELECT 1 FROM business_users 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Apenas super_admin pode criar utilizadores';
  END IF;

  IF p_role NOT IN ('manager', 'staff') THEN
    RAISE EXCEPTION 'Role inválida: %', p_role;
  END IF;

  SELECT id INTO v_existing_id FROM auth.users WHERE email = p_email;
  
  IF v_existing_id IS NOT NULL THEN
    INSERT INTO business_users (business_id, user_id, role, active)
    VALUES (p_business_id, v_existing_id, p_role, true)
    ON CONFLICT (business_id, user_id) 
    DO UPDATE SET role = p_role, active = true;
    
    RETURN jsonb_build_object('user_id', v_existing_id, 'created', false);
  ELSE
    v_user_id := gen_random_uuid();
    
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
    
    INSERT INTO business_users (business_id, user_id, role, active)
    VALUES (p_business_id, v_user_id, p_role, true);
    
    RETURN jsonb_build_object('user_id', v_user_id, 'created', true);
  END IF;
END;
$$;

-- 3. list_business_users (CORRIGIDA - coluna ambígua)
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
  IF NOT EXISTS (
    SELECT 1 FROM business_users bu2
    WHERE bu2.user_id = auth.uid() AND bu2.role = 'super_admin'
  ) AND p_business_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM business_users bu3
    WHERE bu3.user_id = auth.uid() AND bu3.business_id = p_business_id 
    AND bu3.role IN ('owner', 'manager')
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
    AND (EXISTS (SELECT 1 FROM business_users bu4 WHERE bu4.user_id = auth.uid() AND bu4.role = 'super_admin')
         OR bu.business_id IN (SELECT bu5.business_id FROM business_users bu5 WHERE bu5.user_id = auth.uid()))
  ORDER BY bu.created_at DESC;
END;
$$;

-- 4. deactivate_business_user
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

-- 5. Verificar
SELECT 'Todas as funções criadas!' as status;
