-- ============================================================================
-- CRIAR USERS VIA SQL (sem depender de signup)
-- ============================================================================

-- 1. SUPER ADMIN: marrengula1@gmail.com
DO $$
DECLARE
  v_kynitas UUID;
  v_bahules UUID;
  v_id UUID;
  v_existing UUID;
BEGIN
  -- IDs dos bares
  SELECT id INTO v_kynitas FROM businesses WHERE slug = 'kynitas-bar';
  SELECT id INTO v_bahules FROM businesses WHERE slug = 'bahules-rooftop';
  
  -- Verificar se já existe
  SELECT id INTO v_existing FROM auth.users WHERE email = 'marrengula1@gmail.com';
  
  IF v_existing IS NULL THEN
    v_id := gen_random_uuid();
    
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, confirmation_sent_at, confirmed_at, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (
      v_id,
      'marrengula1@gmail.com',
      crypt('Admin@2024', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      jsonb_build_object('name', 'Marrengula IT'),
      'authenticated', 'authenticated',
      NOW(), NOW()
    );
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    VALUES (
      v_id, v_id,
      jsonb_build_object('sub', v_id::text, 'email', 'marrengula1@gmail.com'),
      'email', 'marrengula1@gmail.com',
      NOW(), NOW(), NOW()
    );
    
    INSERT INTO business_users (business_id, user_id, role, active)
    VALUES (v_kynitas, v_id, 'super_admin', true),
           (v_bahules, v_id, 'super_admin', true);
    
    RAISE NOTICE 'marrengula1@gmail.com CRIADO como Super Admin (senha: Admin@2024)';
  ELSE
    -- Já existe, atualizar role
    INSERT INTO business_users (business_id, user_id, role, active)
    VALUES (v_kynitas, v_existing, 'super_admin', true),
           (v_bahules, v_existing, 'super_admin', true)
    ON CONFLICT (business_id, user_id) DO UPDATE SET role = 'super_admin', active = true;
    RAISE NOTICE 'marrengula1@gmailance JA existia, roles atualizadas';
  END IF;
END;
$$;

-- 2. MANAGER BAHULES: admin@bahules.com
DO $$
DECLARE
  v_bahules UUID;
  v_id UUID;
  v_existing UUID;
BEGIN
  SELECT id INTO v_bahules FROM businesses WHERE slug = 'bahules-rooftop';
  SELECT id INTO v_existing FROM auth.users WHERE email = 'admin@bahules.com';
  
  IF v_existing IS NULL THEN
    v_id := gen_random_uuid();
    
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, confirmation_sent_at, confirmed_at, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (
      v_id,
      'admin@bahules.com',
      crypt('Bahules@2024', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      jsonb_build_object('name', 'Bahules Manager'),
      'authenticated', 'authenticated',
      NOW(), NOW()
    );
    
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    VALUES (
      v_id, v_id,
      jsonb_build_object('sub', v_id::text, 'email', 'admin@bahules.com'),
      'email', 'admin@bahules.com',
      NOW(), NOW(), NOW()
    );
    
    INSERT INTO business_users (business_id, user_id, role, active)
    VALUES (v_bahules, v_id, 'manager', true);
    
    RAISE NOTICE 'admin@bahules.com CRIADO como Manager Bahules Rooftop (senha: Bahules@2024)';
  ELSE
    INSERT INTO business_users (business_id, user_id, role, active)
    VALUES (v_bahules, v_existing, 'manager', true)
    ON CONFLICT (business_id, user_id) DO UPDATE SET role = 'manager', active = true;
    RAISE NOTICE 'admin@bahulesances JA existia, role atualizada';
  END IF;
END;
$$;

-- 3. VERIFICAR
SELECT b.name, bu.role, u.email
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
JOIN auth.users u ON u.id = bu.user_id
ORDER BY b.name, bu.role;
