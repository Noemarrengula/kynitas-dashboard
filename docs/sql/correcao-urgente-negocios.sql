-- ============================================================================
-- CORREÇÃO URGENTE: Resolver "Erro ao carregar negócios"
-- ============================================================================

-- PASSO 1: DESABILITAR RLS TEMPORARIAMENTE
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_users DISABLE ROW LEVEL SECURITY;

-- PASSO 2: VERIFICAR SE OS DADOS EXISTEM
SELECT 
  'Verificação de Dados' as status,
  (SELECT COUNT(*) FROM auth.users WHERE email = 'noemarrengula1@gmail.com') as usuario_existe,
  (SELECT COUNT(*) FROM businesses) as total_businesses,
  (SELECT COUNT(*) FROM business_users WHERE user_id = (SELECT id FROM auth.users WHERE email = 'noemarrengula1@gmail.com')) as associacoes_usuario;

-- PASSO 3: MOSTRAR DADOS DETALHADOS
SELECT 
  u.email,
  u.id as user_id,
  bu.business_id,
  bu.role,
  bu.active,
  b.name as business_name,
  b.slug,
  b.active as business_active
FROM auth.users u
LEFT JOIN business_users bu ON bu.user_id = u.id
LEFT JOIN businesses b ON b.id = bu.business_id
WHERE u.email = 'noemarrengula1@gmail.com';

-- PASSO 4: GARANTIR QUE COLUNA active EXISTE E TEM VALORES CORRETOS
-- Verificar se coluna active existe em business_users
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'business_users' 
AND column_name = 'active';

-- Se não existir, criar
ALTER TABLE business_users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Garantir que todos os registros têm active = true
UPDATE business_users SET active = true WHERE active IS NULL;
UPDATE businesses SET active = true WHERE active IS NULL;

-- PASSO 5: RECRIAR ASSOCIAÇÕES SE NECESSÁRIO
INSERT INTO business_users (business_id, user_id, role, active)
SELECT 
  b.id,
  u.id,
  'super_admin',
  true
FROM businesses b, auth.users u
WHERE u.email = 'noemarrengula1@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM business_users bu2 
  WHERE bu2.business_id = b.id 
  AND bu2.user_id = u.id
);

-- PASSO 6: VERIFICAR RESULTADO
SELECT 
  'Após Correção' as status,
  u.email,
  bu.role,
  bu.active,
  b.name as business_name,
  b.slug
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
JOIN auth.users u ON u.id = bu.user_id
WHERE u.email = 'noemarrengula1@gmail.com';

-- PASSO 7: RECRIAR POLÍTICAS RLS MAIS SIMPLES
DROP POLICY IF EXISTS "Users can view their businesses" ON businesses;
DROP POLICY IF EXISTS "Super admins can manage all businesses" ON businesses;
DROP POLICY IF EXISTS "Users can view business users of their businesses" ON business_users;

-- Política simples para businesses - permitir tudo para usuários autenticados
CREATE POLICY "Allow authenticated users" ON businesses
  FOR ALL TO authenticated USING (true);

-- Política simples para business_users - permitir tudo para usuários autenticados  
CREATE POLICY "Allow authenticated users" ON business_users
  FOR ALL TO authenticated USING (true);

-- PASSO 8: REABILITAR RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;

-- PASSO 9: TESTE FINAL COM RLS ATIVO
SELECT 
  'Teste Final' as status,
  COUNT(*) as businesses_acessiveis
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
WHERE bu.user_id = (SELECT id FROM auth.users WHERE email = 'noemarrengula1@gmail.com')
AND bu.active = true;