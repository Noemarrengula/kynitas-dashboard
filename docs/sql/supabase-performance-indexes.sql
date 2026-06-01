-- ============================================================================
-- ÍNDICES COMPOSTOS PARA PERFORMANCE
-- ============================================================================
-- Otimiza queries mais comuns do sistema

-- ============================================================================
-- VENDAS (SALES)
-- ============================================================================

-- Índice composto para buscar vendas por negócio e data (query mais comum)
CREATE INDEX IF NOT EXISTS idx_sales_business_date 
  ON sales(business_id, created_at DESC);

-- Índice para buscar vendas por número
CREATE INDEX IF NOT EXISTS idx_sales_business_number 
  ON sales(business_id, sale_number DESC);

-- Índice para filtrar vendas por mesa
CREATE INDEX IF NOT EXISTS idx_sales_business_table 
  ON sales(business_id, table_id) 
  WHERE table_id IS NOT NULL;

-- Índice GIN para buscar dentro do JSONB de items
CREATE INDEX IF NOT EXISTS idx_sales_items_gin 
  ON sales USING gin(items);

-- Índice GIN para buscar dentro do JSONB de payment_details
CREATE INDEX IF NOT EXISTS idx_sales_payment_gin 
  ON sales USING gin(payment_details);

-- ============================================================================
-- PRODUTOS (PRODUCTS)
-- ============================================================================

-- Índice composto para buscar produtos por negócio e categoria
CREATE INDEX IF NOT EXISTS idx_products_business_category 
  ON products(business_id, category) 
  WHERE active = true;

-- Índice composto para produtos com stock baixo
CREATE INDEX IF NOT EXISTS idx_products_business_stock 
  ON products(business_id, stock) 
  WHERE active = true AND stock <= 15;

-- Índice composto para produtos ativos
CREATE INDEX IF NOT EXISTS idx_products_business_active 
  ON products(business_id, active, created_at DESC);

-- Índice para busca de texto em nome de produtos (trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm 
  ON products USING gin(name gin_trgm_ops);

-- Índice para busca por código interno
CREATE INDEX IF NOT EXISTS idx_products_internal_id 
  ON products(business_id, internal_id) 
  WHERE internal_id IS NOT NULL;

-- ============================================================================
-- INGREDIENTES (INGREDIENTS)
-- ============================================================================

-- Índice composto para ingredientes por negócio
CREATE INDEX IF NOT EXISTS idx_ingredients_business_stock 
  ON ingredients(business_id, stock);

-- Índice para ingredientes com stock crítico
CREATE INDEX IF NOT EXISTS idx_ingredients_critical 
  ON ingredients(business_id) 
  WHERE stock <= min_stock;

-- Índice para busca de texto em ingredientes
CREATE INDEX IF NOT EXISTS idx_ingredients_name_trgm 
  ON ingredients USING gin(name gin_trgm_ops);

-- ============================================================================
-- MESAS (TABLES)
-- ============================================================================

-- Índice composto para mesas por negócio e status
CREATE INDEX IF NOT EXISTS idx_tables_business_status 
  ON tables(business_id, status);

-- Índice para buscar mesa por número
CREATE INDEX IF NOT EXISTS idx_tables_business_number 
  ON tables(business_id, table_number);

-- ============================================================================
-- CONFIGURAÇÕES (BUSINESS_SETTINGS)
-- ============================================================================

-- Índice composto para buscar configurações
CREATE INDEX IF NOT EXISTS idx_settings_business_key 
  ON business_settings(business_id, setting_key);

-- ============================================================================
-- PERFIS DE USUÁRIO (USER_PROFILES)
-- ============================================================================

-- Índice para busca por email
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_lower 
  ON user_profiles(LOWER(email));

-- Índice para busca por telefone
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone 
  ON user_profiles(phone) 
  WHERE phone IS NOT NULL;

-- ============================================================================
-- ANÁLISE E MANUTENÇÃO
-- ============================================================================

-- Atualizar estatísticas das tabelas para otimizar planos de query
ANALYZE sales;
ANALYZE products;
ANALYZE ingredients;
ANALYZE tables;
ANALYZE business_settings;
ANALYZE user_profiles;

-- Comentários
COMMENT ON INDEX idx_sales_business_date IS 'Otimiza busca de vendas por negócio e período';
COMMENT ON INDEX idx_products_business_stock IS 'Otimiza busca de produtos com stock baixo';
COMMENT ON INDEX idx_products_name_trgm IS 'Permite busca fuzzy em nomes de produtos';
COMMENT ON INDEX idx_ingredients_critical IS 'Otimiza busca de ingredientes com stock crítico';
