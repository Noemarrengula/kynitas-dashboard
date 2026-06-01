-- ============================================================================
-- KYNITAS ERP - FUNÇÕES E RLS POLICIES
-- Execute APÓS o multitenant-schema-simples.sql
-- ============================================================================

-- PARTE 1: FUNÇÕES AUXILIARES
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

-- Função para criar business inicial
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

-- Função para migrar dados existentes
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
END;
$$;

-- PARTE 2: ENABLE RLS
-- ============================================================================

-- Enable RLS em todas as tabelas
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- PARTE 3: DROP POLÍTICAS ANTIGAS
-- ============================================================================

-- Drop políticas existentes se houver
DROP POLICY IF EXISTS "Enable all for authenticated users" ON ingredients;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON sales;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON stock_movements;

-- PARTE 4: POLÍTICAS PARA BUSINESSES
-- ============================================================================

-- Políticas para Businesses
DROP POLICY IF EXISTS "Users can view their businesses" ON businesses;
CREATE POLICY "Users can view their businesses" ON businesses
  FOR SELECT USING (id IN (SELECT get_user_businesses()));

DROP POLICY IF EXISTS "Super admins can manage all businesses" ON businesses;
CREATE POLICY "Super admins can manage all businesses" ON businesses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_users 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin' 
      AND active = true
    )
  );

-- PARTE 5: POLÍTICAS PARA BUSINESS_USERS
-- ============================================================================

-- Políticas para Business Users
DROP POLICY IF EXISTS "Users can view business users of their businesses" ON business_users;
CREATE POLICY "Users can view business users of their businesses" ON business_users
  FOR SELECT USING (business_id IN (SELECT get_user_businesses()));

DROP POLICY IF EXISTS "Owners and super admins can manage business users" ON business_users;
CREATE POLICY "Owners and super admins can manage business users" ON business_users
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'super_admin') 
      AND active = true
    )
  );

-- PARTE 6: POLÍTICAS GENÉRICAS PARA TABELAS COM BUSINESS_ID
-- ============================================================================

-- Ingredients
DROP POLICY IF EXISTS "Users can view ingredients of their businesses" ON ingredients;
CREATE POLICY "Users can view ingredients of their businesses" ON ingredients
  FOR SELECT USING (business_id IN (SELECT get_user_businesses()));

DROP POLICY IF EXISTS "Users can manage ingredients of their businesses" ON ingredients;
CREATE POLICY "Users can manage ingredients of their businesses" ON ingredients
  FOR ALL USING (business_id IN (SELECT get_user_businesses()));

-- Products
DROP POLICY IF EXISTS "Users can view products of their businesses" ON products;
CREATE POLICY "Users can view products of their businesses" ON products
  FOR SELECT USING (business_id IN (SELECT get_user_businesses()));

DROP POLICY IF EXISTS "Users can manage products of their businesses" ON products;
CREATE POLICY "Users can manage products of their businesses" ON products
  FOR ALL USING (business_id IN (SELECT get_user_businesses()));

-- Sales
DROP POLICY IF EXISTS "Users can view sales of their businesses" ON sales;
CREATE POLICY "Users can view sales of their businesses" ON sales
  FOR SELECT USING (business_id IN (SELECT get_user_businesses()));

DROP POLICY IF EXISTS "Users can manage sales of their businesses" ON sales;
CREATE POLICY "Users can manage sales of their businesses" ON sales
  FOR ALL USING (business_id IN (SELECT get_user_businesses()));

-- Stock Movements
DROP POLICY IF EXISTS "Users can view stock_movements of their businesses" ON stock_movements;
CREATE POLICY "Users can view stock_movements of their businesses" ON stock_movements
  FOR SELECT USING (business_id IN (SELECT get_user_businesses()));

DROP POLICY IF EXISTS "Users can manage stock_movements of their businesses" ON stock_movements;
CREATE POLICY "Users can manage stock_movements of their businesses" ON stock_movements
  FOR ALL USING (business_id IN (SELECT get_user_businesses()));

-- Customers
DROP POLICY IF EXISTS "Users can view customers of their businesses" ON customers;
CREATE POLICY "Users can view customers of their businesses" ON customers
  FOR SELECT USING (business_id IN (SELECT get_user_businesses()));

DROP POLICY IF EXISTS "Users can manage customers of their businesses" ON customers;
CREATE POLICY "Users can manage customers of their businesses" ON customers
  FOR ALL USING (business_id IN (SELECT get_user_businesses()));

-- Tables
DROP POLICY IF EXISTS "Users can view tables of their businesses" ON tables;
CREATE POLICY "Users can view tables of their businesses" ON tables
  FOR SELECT USING (business_id IN (SELECT get_user_businesses()));

DROP POLICY IF EXISTS "Users can manage tables of their businesses" ON tables;
CREATE POLICY "Users can manage tables of their businesses" ON tables
  FOR ALL USING (business_id IN (SELECT get_user_businesses()));

-- Orders
DROP POLICY IF EXISTS "Users can view orders of their businesses" ON orders;
CREATE POLICY "Users can view orders of their businesses" ON orders
  FOR SELECT USING (business_id IN (SELECT get_user_businesses()));

DROP POLICY IF EXISTS "Users can manage orders of their businesses" ON orders;
CREATE POLICY "Users can manage orders of their businesses" ON orders
  FOR ALL USING (business_id IN (SELECT get_user_businesses()));

-- Suppliers
DROP POLICY IF EXISTS "Users can view suppliers of their businesses" ON suppliers;
CREATE POLICY "Users can view suppliers of their businesses" ON suppliers
  FOR SELECT USING (business_id IN (SELECT get_user_businesses()));

DROP POLICY IF EXISTS "Users can manage suppliers of their businesses" ON suppliers;
CREATE POLICY "Users can manage suppliers of their businesses" ON suppliers
  FOR ALL USING (business_id IN (SELECT get_user_businesses()));

-- Purchase Orders
DROP POLICY IF EXISTS "Users can view purchase_orders of their businesses" ON purchase_orders;
CREATE POLICY "Users can view purchase_orders of their businesses" ON purchase_orders
  FOR SELECT USING (business_id IN (SELECT get_user_businesses()));

DROP POLICY IF EXISTS "Users can manage purchase_orders of their businesses" ON purchase_orders;
CREATE POLICY "Users can manage purchase_orders of their businesses" ON purchase_orders
  FOR ALL USING (business_id IN (SELECT get_user_businesses()));

-- Employees
DROP POLICY IF EXISTS "Users can view employees of their businesses" ON employees;
CREATE POLICY "Users can view employees of their businesses" ON employees
  FOR SELECT USING (business_id IN (SELECT get_user_businesses()));

DROP POLICY IF EXISTS "Users can manage employees of their businesses" ON employees;
CREATE POLICY "Users can manage employees of their businesses" ON employees
  FOR ALL USING (business_id IN (SELECT get_user_businesses()));

-- Financial Transactions
DROP POLICY IF EXISTS "Users can view financial_transactions of their businesses" ON financial_transactions;
CREATE POLICY "Users can view financial_transactions of their businesses" ON financial_transactions
  FOR SELECT USING (business_id IN (SELECT get_user_businesses()));

DROP POLICY IF EXISTS "Users can manage financial_transactions of their businesses" ON financial_transactions;
CREATE POLICY "Users can manage financial_transactions of their businesses" ON financial_transactions
  FOR ALL USING (business_id IN (SELECT get_user_businesses()));

-- Credits
DROP POLICY IF EXISTS "Users can view credits of their businesses" ON credits;
CREATE POLICY "Users can view credits of their businesses" ON credits
  FOR SELECT USING (business_id IN (SELECT get_user_businesses()));

DROP POLICY IF EXISTS "Users can manage credits of their businesses" ON credits;
CREATE POLICY "Users can manage credits of their businesses" ON credits
  FOR ALL USING (business_id IN (SELECT get_user_businesses()));

-- PARTE 7: MIGRAR DADOS EXISTENTES
-- ============================================================================

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