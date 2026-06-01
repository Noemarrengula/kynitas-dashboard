-- FASE 3: Multi-tenant - Suporte para Múltiplos Estabelecimentos

-- Tabela de estabelecimentos
CREATE TABLE businesses (
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

-- Tabela de usuários do estabelecimento
CREATE TABLE business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff', -- 'owner', 'manager', 'staff'
  permissions JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- Adicionar business_id às tabelas existentes
ALTER TABLE ingredients ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE sales ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE stock_movements ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- Criar índices para business_id
CREATE INDEX idx_ingredients_business ON ingredients(business_id);
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_sales_business ON sales(business_id);
CREATE INDEX idx_stock_movements_business ON stock_movements(business_id);
CREATE INDEX idx_notifications_business ON notifications(business_id);
CREATE INDEX idx_business_users_business ON business_users(business_id);
CREATE INDEX idx_business_users_user ON business_users(user_id);

-- Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para businesses
CREATE POLICY "Users can view their businesses" ON businesses
  FOR SELECT USING (
    id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Owners can update their business" ON businesses
  FOR UPDATE USING (
    id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND role = 'owner' AND active = true
    )
  );

-- Políticas RLS para business_users
CREATE POLICY "Users can view their business memberships" ON business_users
  FOR SELECT USING (user_id = auth.uid());

-- Atualizar políticas das tabelas existentes para filtrar por business_id
DROP POLICY IF EXISTS "Enable all for authenticated users" ON ingredients;
CREATE POLICY "Users can access their business ingredients" ON ingredients
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

DROP POLICY IF EXISTS "Enable all for authenticated users" ON products;
CREATE POLICY "Users can access their business products" ON products
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

DROP POLICY IF EXISTS "Enable all for authenticated users" ON sales;
CREATE POLICY "Users can access their business sales" ON sales
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

DROP POLICY IF EXISTS "Enable all for authenticated users" ON stock_movements;
CREATE POLICY "Users can access their business stock movements" ON stock_movements
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

DROP POLICY IF EXISTS "Enable all for authenticated users" ON notifications;
CREATE POLICY "Users can access their business notifications" ON notifications
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Função para obter business_id do usuário atual
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM business_users
  WHERE user_id = auth.uid() AND active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Função para criar estabelecimento inicial
CREATE OR REPLACE FUNCTION create_initial_business(
  business_name TEXT,
  business_slug TEXT,
  owner_email TEXT
)
RETURNS UUID AS $$
DECLARE
  new_business_id UUID;
  owner_user_id UUID;
BEGIN
  -- Criar estabelecimento
  INSERT INTO businesses (name, slug)
  VALUES (business_name, business_slug)
  RETURNING id INTO new_business_id;
  
  -- Buscar user_id pelo email
  SELECT id INTO owner_user_id FROM auth.users WHERE email = owner_email;
  
  -- Adicionar owner
  INSERT INTO business_users (business_id, user_id, role)
  VALUES (new_business_id, owner_user_id, 'owner');
  
  RETURN new_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View para estatísticas por estabelecimento
CREATE VIEW business_stats AS
SELECT 
  b.id as business_id,
  b.name as business_name,
  COUNT(DISTINCT s.id) as total_sales,
  COALESCE(SUM(s.total), 0) as total_revenue,
  COUNT(DISTINCT i.id) as total_ingredients,
  COUNT(DISTINCT p.id) as total_products
FROM businesses b
LEFT JOIN sales s ON s.business_id = b.id
LEFT JOIN ingredients i ON i.business_id = b.id
LEFT JOIN products p ON p.business_id = b.id
GROUP BY b.id, b.name;

-- Inserir estabelecimento padrão (Kynitas Bar)
INSERT INTO businesses (name, slug, address, phone, nuit, settings)
VALUES (
  'Kynitas Bar',
  'kynitas-bar',
  'Maputo, Moçambique',
  '+258 84 000 0000',
  '000000000',
  '{"currency": "MZN", "timezone": "Africa/Maputo"}'
);
