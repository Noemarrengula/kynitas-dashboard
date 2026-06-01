-- ============================================================================
-- MELHORIAS COMPLETAS DE PERFORMANCE E SEGURANÇA
-- Execute este arquivo no Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. VALIDAÇÃO DE STOCK (SEGURANÇA CRÍTICA)
-- ============================================================================

-- Função para validar stock antes de inserir venda
CREATE OR REPLACE FUNCTION validate_sale_stock()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  product_record RECORD;
  required_qty INTEGER;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    SELECT id, name, stock INTO product_record
    FROM products
    WHERE id = (item->>'productId')::UUID
    AND business_id = NEW.business_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto % não encontrado', item->>'productId';
    END IF;
    
    required_qty := (item->>'quantity')::INTEGER;
    
    IF product_record.stock < required_qty THEN
      RAISE EXCEPTION 'Stock insuficiente para "%". Disponível: %, Necessário: %', 
        product_record.name, product_record.stock, required_qty;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_stock_before_sale ON sales;
CREATE TRIGGER check_stock_before_sale
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION validate_sale_stock();

-- Função para atualizar stock após venda
CREATE OR REPLACE FUNCTION update_stock_after_sale()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    UPDATE products
    SET stock = stock - (item->>'quantity')::INTEGER,
        updated_at = NOW()
    WHERE id = (item->>'productId')::UUID
    AND business_id = NEW.business_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_stock_after_sale ON sales;
CREATE TRIGGER update_stock_after_sale
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_after_sale();

-- ============================================================================
-- 2. ÍNDICES DE PERFORMANCE
-- ============================================================================

-- Extensão para busca fuzzy
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- VENDAS
CREATE INDEX IF NOT EXISTS idx_sales_business_date ON sales(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_business_number ON sales(business_id, sale_number DESC);
CREATE INDEX IF NOT EXISTS idx_sales_business_table ON sales(business_id, table_id) WHERE table_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_items_gin ON sales USING gin(items);
CREATE INDEX IF NOT EXISTS idx_sales_payment_gin ON sales USING gin(payment_details);

-- PRODUTOS
CREATE INDEX IF NOT EXISTS idx_products_business_category ON products(business_id, category);
CREATE INDEX IF NOT EXISTS idx_products_business_stock ON products(business_id, stock) WHERE stock <= 15;
CREATE INDEX IF NOT EXISTS idx_products_business_created ON products(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_internal_id ON products(business_id, internal_id) WHERE internal_id IS NOT NULL;

-- INGREDIENTES
CREATE INDEX IF NOT EXISTS idx_ingredients_business_stock ON ingredients(business_id, stock);
CREATE INDEX IF NOT EXISTS idx_ingredients_critical ON ingredients(business_id) WHERE stock <= min_stock;
CREATE INDEX IF NOT EXISTS idx_ingredients_name_trgm ON ingredients USING gin(name gin_trgm_ops);

-- MESAS (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tables') THEN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'tables' AND column_name = 'table_number') THEN
      CREATE INDEX IF NOT EXISTS idx_tables_business_number ON tables(business_id, table_number);
    END IF;
    CREATE INDEX IF NOT EXISTS idx_tables_business_status ON tables(business_id, status);
  END IF;
END $$;

-- CONFIGURAÇÕES
CREATE INDEX IF NOT EXISTS idx_settings_business_key ON business_settings(business_id, setting_key);

-- PERFIS
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_lower ON user_profiles(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone) WHERE phone IS NOT NULL;

-- Atualizar estatísticas
ANALYZE sales;
ANALYZE products;
ANALYZE ingredients;
ANALYZE tables;
ANALYZE business_settings;
ANALYZE user_profiles;

-- ============================================================================
-- 3. LOGS DE AUDITORIA
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_business ON audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_logs(table_name);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business audit logs" ON audit_logs;
CREATE POLICY "Users can view their business audit logs" ON audit_logs
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- Função para registrar auditoria
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    business_id,
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    COALESCE(NEW.business_id, OLD.business_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar auditoria em tabelas críticas
DROP TRIGGER IF EXISTS audit_products ON products;
CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_sales ON sales;
CREATE TRIGGER audit_sales
  AFTER INSERT OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ============================================================================
-- 4. VIEWS OTIMIZADAS
-- ============================================================================

-- View para produtos com stock baixo
CREATE OR REPLACE VIEW v_low_stock_products AS
SELECT 
  p.id,
  p.business_id,
  p.name,
  p.stock,
  p.category,
  p.price,
  CASE 
    WHEN p.stock = 0 THEN 'critical'
    WHEN p.stock <= 5 THEN 'very_low'
    WHEN p.stock <= 15 THEN 'low'
    ELSE 'ok'
  END as stock_status
FROM products p
ORDER BY p.stock ASC, p.name;

-- View para resumo de vendas diárias
CREATE OR REPLACE VIEW v_daily_sales_summary AS
SELECT 
  s.business_id,
  DATE(s.created_at) as sale_date,
  COUNT(*) as total_sales,
  SUM(s.total) as total_revenue,
  AVG(s.total) as avg_ticket,
  SUM((s.payment_details->>'cash')::numeric) as cash_total,
  SUM((s.payment_details->>'mpesa')::numeric) as mpesa_total,
  SUM((s.payment_details->>'emola')::numeric) as emola_total,
  SUM((s.payment_details->>'card')::numeric) as card_total
FROM sales s
GROUP BY s.business_id, DATE(s.created_at)
ORDER BY sale_date DESC;

-- ============================================================================
-- 5. FUNÇÕES ÚTEIS
-- ============================================================================

-- Função para obter top produtos vendidos
CREATE OR REPLACE FUNCTION get_top_products(
  p_business_id UUID,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  total_quantity BIGINT,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (item->>'productId')::UUID as product_id,
    MAX((item->'product'->>'name')::TEXT) as product_name,
    SUM((item->>'quantity')::INTEGER)::BIGINT as total_quantity,
    SUM((item->>'subtotal')::NUMERIC) as total_revenue
  FROM sales s,
       jsonb_array_elements(s.items) as item
  WHERE s.business_id = p_business_id
    AND s.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY (item->>'productId')::UUID
  ORDER BY total_quantity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular lucro
CREATE OR REPLACE FUNCTION calculate_profit(
  p_business_id UUID,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS TABLE (
  total_revenue NUMERIC,
  total_cost NUMERIC,
  profit NUMERIC,
  profit_margin NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH sale_items AS (
    SELECT 
      (item->>'productId')::UUID as product_id,
      (item->>'quantity')::INTEGER as quantity,
      (item->>'subtotal')::NUMERIC as revenue
    FROM sales s,
         jsonb_array_elements(s.items) as item
    WHERE s.business_id = p_business_id
      AND s.created_at BETWEEN p_start_date AND p_end_date
  )
  SELECT 
    COALESCE(SUM(si.revenue), 0) as total_revenue,
    COALESCE(SUM(si.quantity * COALESCE(p.cost_price, 0)), 0) as total_cost,
    COALESCE(SUM(si.revenue), 0) - COALESCE(SUM(si.quantity * COALESCE(p.cost_price, 0)), 0) as profit,
    CASE 
      WHEN SUM(si.revenue) > 0 
      THEN ((SUM(si.revenue) - SUM(si.quantity * COALESCE(p.cost_price, 0))) / SUM(si.revenue) * 100)
      ELSE 0 
    END as profit_margin
  FROM sale_items si
  LEFT JOIN products p ON p.id = si.product_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON FUNCTION validate_sale_stock() IS 'Valida stock antes de venda';
COMMENT ON FUNCTION update_stock_after_sale() IS 'Atualiza stock após venda';
COMMENT ON FUNCTION log_audit() IS 'Registra ações em audit_logs';
COMMENT ON FUNCTION get_top_products(UUID, INTEGER, INTEGER) IS 'Retorna produtos mais vendidos';
COMMENT ON FUNCTION calculate_profit(UUID, TIMESTAMP, TIMESTAMP) IS 'Calcula lucro do período';
COMMENT ON VIEW v_low_stock_products IS 'Produtos com stock baixo';
COMMENT ON VIEW v_daily_sales_summary IS 'Resumo diário de vendas';

-- ============================================================================
-- FIM DAS MELHORIAS
-- ============================================================================

SELECT 'Melhorias implementadas com sucesso!' as status;em->>'subtotal')::NUMERIC as revenue
    FROM sales s,
         jsonb_array_elements(s.items) as item
    WHERE s.business_id = p_business_id
      AND s.created_at BETWEEN p_start_date AND p_end_date
  )
  SELECT 
    SUM(si.revenue) as total_revenue,
    SUM(si.quantity * p.cost_price) as total_cost,
    SUM(si.revenue) - SUM(si.quantity * p.cost_price) as profit,
    CASE 
      WHEN SUM(si.revenue) > 0 
      THEN ((SUM(si.revenue) - SUM(si.quantity * p.cost_price)) / SUM(si.revenue) * 100)
      ELSE 0 
    END as profit_margin
  FROM sale_items si
  JOIN products p ON p.id = si.product_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON FUNCTION validate_sale_stock() IS 'Valida stock antes de venda';
COMMENT ON FUNCTION update_stock_after_sale() IS 'Atualiza stock após venda';
COMMENT ON FUNCTION log_audit() IS 'Registra ações em audit_logs';
COMMENT ON FUNCTION get_top_products(UUID, INTEGER, INTEGER) IS 'Retorna produtos mais vendidos';
COMMENT ON FUNCTION calculate_profit(UUID, TIMESTAMP, TIMESTAMP) IS 'Calcula lucro do período';
COMMENT ON VIEW v_low_stock_products IS 'Produtos com stock baixo';
COMMENT ON VIEW v_daily_sales_summary IS 'Resumo diário de vendas';

-- ============================================================================
-- FIM DAS MELHORIAS
-- ============================================================================

-- Verificar implementação
SELECT 'Melhorias implementadas com sucesso!' as status;
