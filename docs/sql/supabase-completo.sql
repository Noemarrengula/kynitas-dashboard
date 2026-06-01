-- ============================================================================
-- SCRIPT COMPLETO DE MIGRAÇÃO - KYNITAS DASHBOARD
-- ============================================================================

-- LIMPEZA: Dropar views existentes
-- ============================================================================
DROP VIEW IF EXISTS low_stock_ingredients CASCADE;
DROP VIEW IF EXISTS daily_sales_stats CASCADE;
DROP VIEW IF EXISTS top_selling_products CASCADE;
DROP VIEW IF EXISTS api_usage_stats CASCADE;

-- FASE 1: ESTRUTURA BASE
-- ============================================================================

-- Tabela: Negócios
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  nuit TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business" ON businesses;
CREATE POLICY "Users can view their business" ON businesses
  FOR SELECT USING (
    id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their business" ON businesses;
CREATE POLICY "Users can update their business" ON businesses
  FOR UPDATE USING (
    id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Tabela: Usuários do Negócio
CREATE TABLE IF NOT EXISTS business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_users_business ON business_users(business_id);
CREATE INDEX IF NOT EXISTS idx_business_users_user ON business_users(user_id);

ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business associations" ON business_users;
CREATE POLICY "Users can view their business associations" ON business_users
  FOR SELECT USING (user_id = auth.uid());

-- Tabela: Produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('drink', 'meal')),
  price DECIMAL(10,2) NOT NULL,
  image TEXT,
  ingredients JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business products" ON products;
CREATE POLICY "Users can view their business products" ON products
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their business products" ON products;
CREATE POLICY "Users can manage their business products" ON products
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Tabela: Ingredientes
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingredients_business ON ingredients(business_id);

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business ingredients" ON ingredients;
CREATE POLICY "Users can view their business ingredients" ON ingredients
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their business ingredients" ON ingredients;
CREATE POLICY "Users can manage their business ingredients" ON ingredients
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'staff')
    )
  );

-- Tabela: Vendas
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  payment_details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_business ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at DESC);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business sales" ON sales;
CREATE POLICY "Users can view their business sales" ON sales
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create sales" ON sales;
CREATE POLICY "Users can create sales" ON sales
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- FASE 2: MESAS E PEDIDOS
-- ============================================================================

-- Tabela: Mesas
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, number)
);

CREATE INDEX IF NOT EXISTS idx_tables_business ON tables(business_id);
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);

ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business tables" ON tables;
CREATE POLICY "Users can view their business tables" ON tables
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their business tables" ON tables;
CREATE POLICY "Users can manage their business tables" ON tables
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Tabela: Pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_business ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business orders" ON orders;
CREATE POLICY "Users can view their business orders" ON orders
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage orders" ON orders;
CREATE POLICY "Users can manage orders" ON orders
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- FASE 3: IMPRESSORAS E CONFIGURAÇÕES
-- ============================================================================

-- Tabela: Configurações de Impressora
CREATE TABLE IF NOT EXISTS printer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('thermal', 'standard')),
  connection_type TEXT NOT NULL CHECK (connection_type IN ('usb', 'network', 'bluetooth')),
  ip_address TEXT,
  port INTEGER,
  paper_width INTEGER DEFAULT 80,
  auto_print BOOLEAN DEFAULT false,
  print_copies INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_printer_settings_business ON printer_settings(business_id);

ALTER TABLE printer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their business printer settings" ON printer_settings;
CREATE POLICY "Users can manage their business printer settings" ON printer_settings
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Tabela: Jobs de Impressão
CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  printer_id UUID REFERENCES printer_settings(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('receipt', 'order', 'report')),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_business ON print_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created ON print_jobs(created_at DESC);

ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business print jobs" ON print_jobs;
CREATE POLICY "Users can view their business print jobs" ON print_jobs
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create print jobs" ON print_jobs;
CREATE POLICY "Users can create print jobs" ON print_jobs
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- FASE 4: FUNÇÕES E TRIGGERS
-- ============================================================================

-- Função: Atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_ingredients_updated_at ON ingredients;
CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_printer_settings_updated_at ON printer_settings;
CREATE TRIGGER update_printer_settings_updated_at
  BEFORE UPDATE ON printer_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Função: Atualizar status da mesa quando pedido é criado/atualizado
CREATE OR REPLACE FUNCTION update_table_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.table_id IS NOT NULL THEN
    UPDATE tables SET status = 'occupied' WHERE id = NEW.table_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IN ('delivered', 'cancelled') THEN
    IF NOT EXISTS (
      SELECT 1 FROM orders 
      WHERE table_id = NEW.table_id 
        AND status NOT IN ('delivered', 'cancelled')
        AND id != NEW.id
    ) THEN
      UPDATE tables SET status = 'available' WHERE id = NEW.table_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_table_status ON orders;
CREATE TRIGGER trigger_update_table_status
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_table_status();

-- Função: Atualizar estoque após venda
CREATE OR REPLACE FUNCTION update_stock_after_sale()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  product RECORD;
  ingredient JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    SELECT * INTO product FROM products 
    WHERE id = (item->>'id')::UUID AND business_id = NEW.business_id;
    
    IF FOUND AND product.ingredients IS NOT NULL THEN
      FOR ingredient IN SELECT * FROM jsonb_array_elements(product.ingredients)
      LOOP
        UPDATE ingredients 
        SET stock = stock - ((ingredient->>'quantity')::DECIMAL * (item->>'quantity')::INTEGER)
        WHERE id = (ingredient->>'id')::UUID AND business_id = NEW.business_id;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock_after_sale ON sales;
CREATE TRIGGER trigger_update_stock_after_sale
  AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION update_stock_after_sale();

-- FASE 5: VIEWS E RELATÓRIOS
-- ============================================================================

-- View: Produtos com baixo estoque
CREATE OR REPLACE VIEW low_stock_ingredients AS
SELECT 
  i.id,
  i.business_id,
  i.name,
  i.unit,
  i.stock,
  i.min_stock,
  i.cost_per_unit,
  (i.min_stock - i.stock) as deficit
FROM ingredients i
WHERE i.stock <= i.min_stock;

-- View: Estatísticas de vendas diárias
CREATE OR REPLACE VIEW daily_sales_stats AS
SELECT 
  business_id,
  DATE(created_at) as sale_date,
  COUNT(*) as total_sales,
  SUM(total) as total_revenue,
  AVG(total) as avg_sale_value
FROM sales
GROUP BY business_id, DATE(created_at);

-- View: Produtos mais vendidos
CREATE OR REPLACE VIEW top_selling_products AS
SELECT 
  s.business_id,
  item->>'id' as product_id,
  item->>'name' as product_name,
  SUM((item->>'quantity')::INTEGER) as total_quantity,
  COUNT(*) as times_sold,
  SUM((item->>'price')::DECIMAL * (item->>'quantity')::INTEGER) as total_revenue
FROM sales s,
  jsonb_array_elements(s.items) as item
GROUP BY s.business_id, item->>'id', item->>'name'
ORDER BY total_quantity DESC;

-- FASE 6: FUNÇÕES AUXILIARES
-- ============================================================================

-- Função: Obter estatísticas do negócio
CREATE OR REPLACE FUNCTION get_business_stats(business_uuid UUID, days INTEGER DEFAULT 30)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_sales', (
      SELECT COUNT(*) FROM sales 
      WHERE business_id = business_uuid 
        AND created_at >= CURRENT_DATE - days
    ),
    'total_revenue', (
      SELECT COALESCE(SUM(total), 0) FROM sales 
      WHERE business_id = business_uuid 
        AND created_at >= CURRENT_DATE - days
    ),
    'total_products', (
      SELECT COUNT(*) FROM products WHERE business_id = business_uuid
    ),
    'low_stock_count', (
      SELECT COUNT(*) FROM ingredients 
      WHERE business_id = business_uuid AND stock <= min_stock
    ),
    'active_orders', (
      SELECT COUNT(*) FROM orders 
      WHERE business_id = business_uuid 
        AND status NOT IN ('delivered', 'cancelled')
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Criar negócio inicial para usuário
CREATE OR REPLACE FUNCTION create_initial_business(
  user_uuid UUID,
  business_name TEXT,
  business_slug TEXT
)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
