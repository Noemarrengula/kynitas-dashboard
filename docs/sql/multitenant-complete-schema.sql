-- ============================================================================
-- KYNITAS ERP - SCHEMA MULTI-TENANT COMPLETO
-- ============================================================================

-- 1. TABELAS PRINCIPAIS (já existem, mas vamos garantir estrutura)
-- ============================================================================

-- Businesses (Bares/Restaurantes)
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  nuit TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Business Users (Usuários por Bar)
CREATE TABLE IF NOT EXISTS business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'owner', 'manager', 'staff')),
  permissions JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- 2. ADICIONAR business_id A TODAS AS TABELAS EXISTENTES
-- ============================================================================

-- Ingredients
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_ingredients_business ON ingredients(business_id);

-- Products  
ALTER TABLE products ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);

-- Sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sales_business ON sales(business_id);

-- Stock Movements
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_stock_movements_business ON stock_movements(business_id);

-- 3. NOVAS TABELAS PARA ERP COMPLETO
-- ============================================================================

-- Customers (Clientes)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  nuit TEXT,
  credit_limit NUMERIC DEFAULT 0,
  current_credit NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tables (Mesas)
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
  current_order_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders (Comandas)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id),
  customer_id UUID REFERENCES customers(id),
  staff_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'preparing', 'ready', 'delivered', 'paid', 'cancelled')),
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Suppliers (Fornecedores)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  nuit TEXT,
  payment_terms TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Purchase Orders (Ordens de Compra)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  order_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'received', 'cancelled')),
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  notes TEXT,
  ordered_at TIMESTAMP DEFAULT NOW(),
  received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Employees (Funcionários)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  employee_number TEXT,
  name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  salary NUMERIC,
  hire_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  contact_info JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Financial Transactions (Transações Financeiras)
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_id UUID, -- pode referenciar sales, purchase_orders, etc
  reference_type TEXT, -- 'sale', 'purchase', 'expense', etc
  payment_method TEXT,
  account TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Credits (Sistema de Créditos)
CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'payment')),
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_id UUID,
  balance_after NUMERIC NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Business Users
CREATE INDEX IF NOT EXISTS idx_business_users_business ON business_users(business_id);
CREATE INDEX IF NOT EXISTS idx_business_users_user ON business_users(user_id);
CREATE INDEX IF NOT EXISTS idx_business_users_active ON business_users(active);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Tables
CREATE INDEX IF NOT EXISTS idx_tables_business ON tables(business_id);
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_business ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

-- Suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_business ON suppliers(business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- Purchase Orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_business ON purchase_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_business ON employees(business_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- Financial Transactions
CREATE INDEX IF NOT EXISTS idx_financial_transactions_business ON financial_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(date DESC);

-- Credits
CREATE INDEX IF NOT EXISTS idx_credits_business ON credits(business_id);
CREATE INDEX IF NOT EXISTS idx_credits_customer ON credits(customer_id);
CREATE INDEX IF NOT EXISTS idx_credits_created ON credits(created_at DESC);

-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS em todas as tabelas
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- Drop políticas existentes
DROP POLICY IF EXISTS "Enable all for authenticated users" ON ingredients;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON sales;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON stock_movements;

-- 6. POLÍTICAS RLS MULTI-TENANT
-- ============================================================================

-- Função helper para verificar acesso ao business
CREATE OR REPLACE FUNCTION user_has_business_access(business_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business_users 
    WHERE user_id = auth.uid() 
    AND business_id = business_uuid 
    AND active = true
  );
END;
$$;

-- Função para obter businesses do usuário
CREATE OR REPLACE FUNCTION get_user_businesses()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT business_id FROM business_users 
  WHERE user_id = auth.uid() AND active = true;
END;
$$;

-- Políticas para Businesses
CREATE POLICY "Users can view their businesses" ON businesses
  FOR SELECT USING (id IN (SELECT get_user_businesses()));

CREATE POLICY "Super admins can manage all businesses" ON businesses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_users 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin' 
      AND active = true
    )
  );

-- Políticas para Business Users
CREATE POLICY "Users can view business users of their businesses" ON business_users
  FOR SELECT USING (business_id IN (SELECT get_user_businesses()));

CREATE POLICY "Owners and super admins can manage business users" ON business_users
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'super_admin') 
      AND active = true
    )
  );

-- Políticas genéricas para tabelas com business_id
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
    -- Policy para SELECT
    EXECUTE format('
      CREATE POLICY "Users can view %I of their businesses" ON %I
      FOR SELECT USING (business_id IN (SELECT get_user_businesses()))
    ', table_name, table_name);
    
    -- Policy para INSERT/UPDATE/DELETE
    EXECUTE format('
      CREATE POLICY "Users can manage %I of their businesses" ON %I
      FOR ALL USING (business_id IN (SELECT get_user_businesses()))
    ', table_name, table_name);
  END LOOP;
END;
$$;

-- 7. TRIGGERS PARA UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas relevantes
DO $$
DECLARE
  table_name TEXT;
  tables_list TEXT[] := ARRAY[
    'businesses', 'business_users', 'ingredients', 'products', 
    'customers', 'tables', 'orders', 'suppliers', 'purchase_orders',
    'employees', 'financial_transactions'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables_list
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END;
$$;

-- 8. FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para criar business inicial (já existe, mas vamos garantir)
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

-- Função para migrar dados existentes para business específico
CREATE OR REPLACE FUNCTION migrate_existing_data_to_business(target_business_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Migrar ingredients sem business_id
  UPDATE ingredients 
  SET business_id = target_business_id 
  WHERE business_id IS NULL;
  
  -- Migrar products sem business_id
  UPDATE products 
  SET business_id = target_business_id 
  WHERE business_id IS NULL;
  
  -- Migrar sales sem business_id
  UPDATE sales 
  SET business_id = target_business_id 
  WHERE business_id IS NULL;
  
  -- Migrar stock_movements sem business_id
  UPDATE stock_movements 
  SET business_id = target_business_id 
  WHERE business_id IS NULL;
  
  RAISE NOTICE 'Dados migrados para business_id: %', target_business_id;
END;
$$;

-- 9. DADOS INICIAIS
-- ============================================================================

-- Garantir que existe pelo menos um business
INSERT INTO businesses (name, slug, address, phone)
VALUES ('Kynitas Bar', 'kynitas-bar', 'Maputo, Moçambique', '+258 84 123 4567')
ON CONFLICT (slug) DO NOTHING;

-- Auto-confirmar emails existentes
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;

-- Migrar dados existentes para o business principal
DO $$
DECLARE
  main_business_id UUID;
BEGIN
  SELECT id INTO main_business_id FROM businesses WHERE slug = 'kynitas-bar';
  
  IF main_business_id IS NOT NULL THEN
    PERFORM migrate_existing_data_to_business(main_business_id);
    RAISE NOTICE 'Dados migrados para business: %', main_business_id;
  ELSE
    RAISE WARNING 'Business kynitas-bar não encontrado!';
  END IF;
END;
$$;

-- 10. VERIFICAÇÃO FINAL
-- ============================================================================

-- Mostrar estrutura criada
SELECT 
  schemaname,
  tablename,
  attname as column_name,
  typname as data_type
FROM pg_tables t
JOIN pg_attribute a ON a.attrelid = (schemaname||'.'||tablename)::regclass
JOIN pg_type ty ON ty.oid = a.atttypid
WHERE schemaname = 'public' 
AND tablename IN ('businesses', 'business_users', 'customers', 'tables', 'orders')
AND a.attnum > 0
ORDER BY tablename, a.attnum;

-- Verificação final em bloco DO
DO $$
BEGIN
  RAISE NOTICE 'Schema multi-tenant completo criado com sucesso!';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '1. Configure um super admin executando:';
  RAISE NOTICE '   UPDATE business_users SET role = ''super_admin'' WHERE user_id = (SELECT id FROM auth.users WHERE email = ''seu-email@gmail.com'');';
  RAISE NOTICE '2. Teste o login no sistema';
  RAISE NOTICE '3. Verifique o Health Check Panel';
END;
$$;