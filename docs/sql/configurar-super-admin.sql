-- ============================================================================
-- KYNITAS ERP - CONFIGURAR SUPER ADMIN
-- Execute APÓS multitenant-schema-simples.sql e multitenant-rls-policies.sql
-- ============================================================================

-- Email configurado: noemarrengula1@gmail.com

-- PASSO 1: Verificar se o usuário existe
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'noemarrengula1@gmail.com';

-- Se o usuário não existir, você precisa se registrar primeiro no sistema

-- PASSO 2: Confirmar email (se necessário)
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'noemarrengula1@gmail.com' 
AND email_confirmed_at IS NULL;

-- PASSO 3: Verificar se existe associação com business
SELECT 
  bu.id,
  bu.role,
  bu.active,
  b.name as business_name,
  u.email
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
JOIN auth.users u ON u.id = bu.user_id
WHERE u.email = 'noemarrengula1@gmail.com';

-- PASSO 4: Criar associação se não existir
DO $$
DECLARE
  user_uuid UUID;
  business_uuid UUID;
BEGIN
  -- Buscar usuário
  SELECT id INTO user_uuid FROM auth.users WHERE email = 'noemarrengula1@gmail.com';
  
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Usuário com email noemarrengula1@gmail.com não encontrado! Registre-se primeiro no sistema.';
  END IF;
  
  -- Buscar business principal
  SELECT id INTO business_uuid FROM businesses WHERE slug = 'kynitas-bar';
  
  IF business_uuid IS NULL THEN
    RAISE EXCEPTION 'Business kynitas-bar não encontrado! Execute primeiro o schema.';
  END IF;
  
  -- Criar ou atualizar associação como super_admin
  INSERT INTO business_users (business_id, user_id, role, active)
  VALUES (business_uuid, user_uuid, 'super_admin', true)
  ON CONFLICT (business_id, user_id) 
  DO UPDATE SET 
    role = 'super_admin',
    active = true;
    
  RAISE NOTICE 'Super admin configurado com sucesso para: noemarrengula1@gmail.com';
END;
$$;

-- PASSO 5: Verificar configuração final
SELECT 
  u.email,
  bu.role,
  bu.active,
  b.name as business_name,
  bu.created_at
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
JOIN auth.users u ON u.id = bu.user_id
WHERE u.email = 'noemarrengula1@gmail.com';

-- PASSO 6: Criar segundo business para testar multi-tenant (opcional)
INSERT INTO businesses (name, slug, address, phone)
VALUES ('Bahules Rooftop', 'bahules-rooftop', 'Maputo, Polana', '+258 84 987 6543')
ON CONFLICT (slug) DO NOTHING;

-- Associar super admin ao segundo business também
DO $$
DECLARE
  user_uuid UUID;
  business_uuid UUID;
BEGIN
  SELECT id INTO user_uuid FROM auth.users WHERE email = 'noemarrengula1@gmail.com';
  SELECT id INTO business_uuid FROM businesses WHERE slug = 'bahules-rooftop';
  
  IF user_uuid IS NOT NULL AND business_uuid IS NOT NULL THEN
    INSERT INTO business_users (business_id, user_id, role, active)
    VALUES (business_uuid, user_uuid, 'super_admin', true)
    ON CONFLICT (business_id, user_id) 
    DO UPDATE SET 
      role = 'super_admin',
      active = true;
      
    RAISE NOTICE 'Super admin também configurado para Bahules Rooftop';
  END IF;
END;
$$;

-- VERIFICAÇÃO FINAL: Mostrar todos os businesses do super admin
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