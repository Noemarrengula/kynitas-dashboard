-- ============================================================================
-- EMERGÊNCIA: Desabilitar RLS completamente para teste
-- Execute se ainda houver erro "ao carregar negócios"
-- ============================================================================

-- DESABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE credits DISABLE ROW LEVEL SECURITY;

-- REMOVER TODAS AS POLÍTICAS
DROP POLICY IF EXISTS "Allow authenticated users" ON businesses;
DROP POLICY IF EXISTS "Allow authenticated users" ON business_users;
DROP POLICY IF EXISTS "Users can view their businesses" ON businesses;
DROP POLICY IF EXISTS "Super admins can manage all businesses" ON businesses;
DROP POLICY IF EXISTS "Users can view business users of their businesses" ON business_users;
DROP POLICY IF EXISTS "Owners and super admins can manage business users" ON business_users;

-- Remover políticas das outras tabelas
DO $$
DECLARE
  table_name TEXT;
  tables_list TEXT[] := ARRAY[
    'ingredients', 'products', 'sales', 'stock_movements',
    'customers', 'tables', 'orders', 'suppliers', 'purchase_orders',
    'employees', 'financial_transactions', 'credits'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables_list
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Users can view %I of their businesses" ON %I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Users can manage %I of their businesses" ON %I', table_name, table_name);
  END LOOP;
END;
$$;

-- VERIFICAR DADOS AGORA (deve funcionar sem RLS)
SELECT 
  'SEM RLS - Teste' as status,
  u.email,
  bu.role,
  bu.active,
  b.name as business_name,
  b.slug
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
JOIN auth.users u ON u.id = bu.user_id
WHERE u.email = 'noemarrengula1@gmail.com';

-- GARANTIR DADOS CORRETOS
UPDATE business_users SET active = true WHERE active IS NULL OR active = false;
UPDATE businesses SET active = true WHERE active IS NULL OR active = false;

-- MOSTRAR RESULTADO FINAL
SELECT 
  'RESULTADO FINAL' as status,
  COUNT(*) as total_businesses_acessiveis
FROM business_users bu
JOIN businesses b ON b.id = bu.business_id
WHERE bu.user_id = (SELECT id FROM auth.users WHERE email = 'noemarrengula1@gmail.com');