-- ============================================================================
-- SETUP: Criar Bares + Utilizadores (com ON CONFLICT)
-- ============================================================================

-- 1. CRIAR BARES (ignorar se já existirem)
-- ============================================================================
INSERT INTO businesses (name, slug)
VALUES ('Kynitas Bar', 'kynitas-bar')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO businesses (name, slug)
VALUES ('Bahules Rooftop', 'bahules-rooftop')
ON CONFLICT (slug) DO NOTHING;

-- 2. CRIAR SUPER ADMIN (marrengula1@gmail.com)
-- ============================================================================
DO $$
DECLARE
  v_kynitas_id UUID;
  v_bahules_id UUID;
  v_super_id  UUID;
  v_existing  UUID;
BEGIN
  -- IDs dos bares
  SELECT id INTO v_kynitas_id FROM businesses WHERE slug = 'kynitas-bar';
  SELECT id INTO v_bahules_id FROM businesses WHERE slug = 'bahules-rooftop';

  -- Verificar se user já existe
  SELECT id INTO v_existing FROM auth.users WHERE email = 'marrengula1@gmail.com';

  IF v_existing IS NULL THEN
    v_super_id := gen_random_uuid();

    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (
      v_super_id,
      'marrengula1@gmail.com',
      crypt('Admin@2024', gen_salt('bf')),
      NOW(),
      jsonb_build_object('name', 'Marrengula IT'),
      'authenticated',
      'authenticated',
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Super Admin marrengula1@gmail.com criado (senha: Admin@2024)';
  ELSE
    v_super_id := v_existing;
    RAISE NOTICE 'Super Admin marrengula1@gmail.com já existia';
  END IF;

  -- Associar como super_admin a ambos os bares
  INSERT INTO business_users (business_id, user_id, role, active)
  VALUES (v_kynitas_id, v_super_id, 'super_admin', true)
  ON CONFLICT (business_id, user_id) DO UPDATE SET role = 'super_admin', active = true;

  INSERT INTO business_users (business_id, user_id, role, active)
  VALUES (v_bahules_id, v_super_id, 'super_admin', true)
  ON CONFLICT (business_id, user_id) DO UPDATE SET role = 'super_admin', active = true;

  RAISE NOTICE 'Super Admin associado a todos os bares';
END;
$$;

-- 3. CRIAR GERENTE DA BAHULES ROOFTOP (admin@bahules.com)
-- ============================================================================
DO $$
DECLARE
  v_bahules_id UUID;
  v_manager_id UUID;
  v_existing   UUID;
BEGIN
  SELECT id INTO v_bahules_id FROM businesses WHERE slug = 'bahules-rooftop';

  SELECT id INTO v_existing FROM auth.users WHERE email = 'admin@bahules.com';

  IF v_existing IS NULL THEN
    v_manager_id := gen_random_uuid();

    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (
      v_manager_id,
      'admin@bahules.com',
      crypt('Bahules@2024', gen_salt('bf')),
      NOW(),
      jsonb_build_object('name', 'Bahules Manager'),
      'authenticated',
      'authenticated',
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Gerente admin@bahules.com criado (senha: Bahules@2024)';
  ELSE
    v_manager_id := v_existing;
    RAISE NOTICE 'Gerente admin@bahules.com já existia';
  END IF;

  INSERT INTO business_users (business_id, user_id, role, active)
  VALUES (v_bahules_id, v_manager_id, 'manager', true)
  ON CONFLICT (business_id, user_id) DO UPDATE SET role = 'manager', active = true;

  RAISE NOTICE 'Gerente associado a Bahules Rooftop';
END;
$$;

-- 4. ATUALIZAR admin@kynitas.com para super_admin se existir
-- ============================================================================
DO $$
DECLARE
  v_kynitas_id UUID;
  v_user_id    UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@kynitas.com';

  IF v_user_id IS NOT NULL THEN
    SELECT id INTO v_kynitas_id FROM businesses WHERE slug = 'kynitas-bar';
    
    INSERT INTO business_users (business_id, user_id, role, active)
    VALUES (v_kynitas_id, v_user_id, 'owner', true)
    ON CONFLICT (business_id, user_id) DO UPDATE SET role = 'owner', active = true;
    
    RAISE NOTICE 'admin@kynitas.com mantido como owner do Kynitas Bar';
  END IF;
END;
$$;

-- 5. VERIFICAR
-- ============================================================================
SELECT b.name, bu.role, u.email
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
JOIN auth.users u ON u.id = bu.user_id
ORDER BY b.name, bu.role;
