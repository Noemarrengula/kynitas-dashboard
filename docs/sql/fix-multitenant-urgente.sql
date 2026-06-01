-- ============================================================================
-- FIX URGENTE: Multi-Tenant (Bares)
-- ============================================================================

-- 1. GARANTIR COLUNA active NA business_users
ALTER TABLE business_users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 2. GARANTIR COLUNA permissions
ALTER TABLE business_users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- 3. CORRIGIR CHECK CONSTRAINT para incluir super_admin
ALTER TABLE business_users DROP CONSTRAINT IF EXISTS business_users_role_check;
ALTER TABLE business_users ADD CONSTRAINT business_users_role_check 
  CHECK (role IN ('super_admin', 'owner', 'manager', 'staff'));

-- 4. AUTO-CONFIRMAR EMAILS (resolve "Email not confirmed")
-- ============================================================================
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;

-- 5. GARANTIR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_business_users_active ON business_users(active);

-- 6. GARANTIR EMPRESAS EXISTEM
INSERT INTO businesses (name, slug)
VALUES ('Kynitas Bar', 'kynitas-bar')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO businesses (name, slug)
VALUES ('Bahules Rooftop', 'bahules-rooftop')
ON CONFLICT (slug) DO NOTHING;

-- 7. GARANTIR SUPER ADMIN NOS BARES
DO $$
DECLARE
  v_kynitas_id UUID;
  v_bahules_id UUID;
  v_super_id   UUID;
BEGIN
  SELECT id INTO v_kynitas_id FROM businesses WHERE slug = 'kynitas-bar';
  SELECT id INTO v_bahules_id FROM businesses WHERE slug = 'bahules-rooftop';

  -- Tentar encontrar o super admin por email
  SELECT id INTO v_super_id FROM auth.users WHERE email = 'marrengula1@gmail.com';

  IF v_super_id IS NOT NULL THEN
    INSERT INTO business_users (business_id, user_id, role, active)
    VALUES (v_kynitas_id, v_super_id, 'super_admin', true)
    ON CONFLICT (business_id, user_id) DO UPDATE SET role = 'super_admin', active = true;

    INSERT INTO business_users (business_id, user_id, role, active)
    VALUES (v_bahules_id, v_super_id, 'super_admin', true)
    ON CONFLICT (business_id, user_id) DO UPDATE SET role = 'super_admin', active = true;

    RAISE NOTICE 'Super Admin marrengula1@gmail.com vinculado a ambos os bares';
  ELSE
    RAISE WARNING 'Super Admin marrengula1@gmail.com não encontrado em auth.users';
  END IF;
END;
$$;

-- 8. CORRIGIR FUNÇÃO create_initial_business (usada no registo)
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

  INSERT INTO business_users (business_id, user_id, role, active)
  VALUES (new_business_id, user_uuid, 'owner', true);

  RETURN new_business_id;
END;
$$;

-- 9. CORRIGIR FUNÇÃO create_business_user
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
    WHERE user_id = auth.uid() AND role = 'super_admin' AND active = true
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

-- 10. VERIFICAR RESULTADO
SELECT b.name AS bar, bu.role, u.email, bu.active
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
JOIN auth.users u ON u.id = bu.user_id
ORDER BY b.name, bu.role;
