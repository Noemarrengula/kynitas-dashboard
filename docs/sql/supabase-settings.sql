-- ============================================================================
-- TABELA DE VENDAS (SALES)
-- ============================================================================

-- Dropar tabela existente se tiver tipo errado
DROP TABLE IF EXISTS sales CASCADE;

-- Criar tabela com tipos corretos
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number SERIAL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  payment_details JSONB NOT NULL,
  table_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sales_business ON sales(business_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_number ON sales(sale_number);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business sales" ON sales
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sales" ON sales
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE sales IS 'Vendas realizadas no negócio';

-- ============================================================================
-- TABELA DE CONFIGURAÇÕES (SETTINGS)
-- ============================================================================

-- Tabela: Configurações do Negócio
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_business_settings_business ON business_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_business_settings_key ON business_settings(setting_key);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business settings" ON business_settings;
CREATE POLICY "Users can view their business settings" ON business_settings
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their business settings" ON business_settings;
CREATE POLICY "Users can manage their business settings" ON business_settings
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_business_settings_updated_at ON business_settings;
CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE business_settings IS 'Configurações personalizadas do negócio (categorias, preferências, etc)';

-- ============================================================================
-- TABELA DE PERFIS DE USUÁRIO
-- ============================================================================

-- Tabela: Perfis de Usuário
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE user_profiles IS 'Perfis personalizados dos usuários do sistema';

-- ============================================================================
-- ADICIONAR COLUNAS À TABELA BUSINESSES (SE NÃO EXISTIREM)
-- ============================================================================

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS nuit TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- ============================================================================
-- TABELA DE PRODUTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  category TEXT,
  stock INTEGER DEFAULT 0,
  image TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

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

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE products IS 'Produtos/itens do cardápio do negócio';

-- ============================================================================
-- TABELA DE MESAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  capacity INTEGER,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, table_number)
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
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS update_tables_updated_at ON tables;
CREATE TRIGGER update_tables_updated_at
  BEFORE UPDATE ON tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE tables IS 'Mesas do estabelecimento';

-- ============================================================================
-- FUNÇÃO PARA ATUALIZAR updated_at (SE NÃO EXISTIR)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABELA DE CONFIGURAÇÕES DE IMPRESSORA
-- ============================================================================

CREATE TABLE IF NOT EXISTS printer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  printer_name TEXT NOT NULL,
  printer_type TEXT DEFAULT 'thermal',
  char_width INTEGER DEFAULT 48,
  connection_type TEXT DEFAULT 'usb',
  ip_address TEXT,
  port INTEGER,
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  last_test_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_printer_settings_business ON printer_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_printer_settings_default ON printer_settings(business_id, is_default);

ALTER TABLE printer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business printer settings" ON printer_settings;
CREATE POLICY "Users can view their business printer settings" ON printer_settings
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their business printer settings" ON printer_settings;
CREATE POLICY "Users can manage their business printer settings" ON printer_settings
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

DROP TRIGGER IF EXISTS update_printer_settings_updated_at ON printer_settings;
CREATE TRIGGER update_printer_settings_updated_at
  BEFORE UPDATE ON printer_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE printer_settings IS 'Configurações de impressoras térmicas do negócio';

-- ============================================================================
-- TABELA DE TRABALHOS DE IMPRESSÃO
-- ============================================================================

CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  reference_id TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  printed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_business ON print_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_reference ON print_jobs(reference_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created ON print_jobs(created_at);

ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business print jobs" ON print_jobs;
CREATE POLICY "Users can view their business print jobs" ON print_jobs
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert print jobs" ON print_jobs;
CREATE POLICY "Users can insert print jobs" ON print_jobs
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their print jobs" ON print_jobs;
CREATE POLICY "Users can update their print jobs" ON print_jobs
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE print_jobs IS 'Histórico de trabalhos de impressão';

-- ============================================================================
-- VIEWS ÚTEIS
-- ============================================================================

-- View: Vendas com informações do negócio
CREATE OR REPLACE VIEW sales_with_business AS
SELECT 
  s.*,
  b.name as business_name,
  b.type as business_type
FROM sales s
JOIN businesses b ON s.business_id = b.id;

-- View: Resumo de vendas por dia
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
  business_id,
  DATE(created_at) as sale_date,
  COUNT(*) as total_sales,
  SUM(total) as total_revenue
FROM sales
GROUP BY business_id, DATE(created_at);

COMMENT ON VIEW sales_with_business IS 'Vendas com informações do negócio associado';
COMMENT ON VIEW daily_sales_summary IS 'Resumo diário de vendas por negócio';========

CREATE TABLE IF NOT EXISTS printer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  printer_name TEXT NOT NULL,
  printer_type TEXT DEFAULT 'thermal',
  char_width INTEGER DEFAULT 48,
  connection_type TEXT DEFAULT 'usb',
  ip_address TEXT,
  port INTEGER,
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  last_test_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_printer_settings_business ON printer_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_printer_settings_default ON printer_settings(business_id, is_default);

ALTER TABLE printer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business printer settings" ON printer_settings;
CREATE POLICY "Users can view their business printer settings" ON printer_settings
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their business printer settings" ON printer_settings;
CREATE POLICY "Users can manage their business printer settings" ON printer_settings
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

DROP TRIGGER IF EXISTS update_printer_settings_updated_at ON printer_settings;
CREATE TRIGGER update_printer_settings_updated_at
  BEFORE UPDATE ON printer_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE printer_settings IS 'Configurações de impressoras térmicas do negócio';

-- ============================================================================
-- TABELA DE TRABALHOS DE IMPRESSÃO
-- ============================================================================

CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  reference_id TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  printed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_business ON print_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_reference ON print_jobs(reference_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created ON print_jobs(created_at);

ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business print jobs" ON print_jobs;
CREATE POLICY "Users can view their business print jobs" ON print_jobs
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert print jobs" ON print_jobs;
CREATE POLICY "Users can insert print jobs" ON print_jobs
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their print jobs" ON print_jobs;
CREATE POLICY "Users can update their print jobs" ON print_jobs
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE print_jobs IS 'Histórico de trabalhos de impressão';

-- ============================================================================
-- VIEWS ÚTEIS
-- ============================================================================

-- View: Vendas com informações do negócio
CREATE OR REPLACE VIEW sales_with_business AS
SELECT 
  s.*,
  b.name as business_name,
  b.type as business_type
FROM sales s
JOIN businesses b ON s.business_id = b.id;

-- View: Resumo de vendas por dia
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
  business_id,
  DATE(created_at) as sale_date,
  COUNT(*) as total_sales,
  SUM(total) as total_revenue
FROM sales
GROUP BY business_id, DATE(created_at);

COMMENT ON VIEW sales_with_business IS 'Vendas com informações do negócio associado';
COMMENT ON VIEW daily_sales_summary IS 'Resumo diário de vendas por negócio';

