-- ============================================================================
-- MELHORIAS ESSENCIAIS (SEM DEPENDÊNCIAS)
-- Execute este arquivo se houver erros com o arquivo completo
-- ============================================================================

-- ============================================================================
-- 1. VALIDAÇÃO DE STOCK (CRÍTICO)
-- ============================================================================

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
-- 2. ÍNDICES BÁSICOS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- VENDAS
CREATE INDEX IF NOT EXISTS idx_sales_business_date ON sales(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_items_gin ON sales USING gin(items);
CREATE INDEX IF NOT EXISTS idx_sales_payment_gin ON sales USING gin(payment_details);

-- PRODUTOS
CREATE INDEX IF NOT EXISTS idx_products_business_category ON products(business_id, category);
CREATE INDEX IF NOT EXISTS idx_products_business_stock ON products(business_id, stock);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

-- INGREDIENTES (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ingredients') THEN
    CREATE INDEX IF NOT EXISTS idx_ingredients_business_stock ON ingredients(business_id, stock);
    CREATE INDEX IF NOT EXISTS idx_ingredients_name_trgm ON ingredients USING gin(name gin_trgm_ops);
  END IF;
END $$;

-- Atualizar estatísticas
ANALYZE sales;
ANALYZE products;

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
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_business ON audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business audit logs" ON audit_logs;
CREATE POLICY "Users can view their business audit logs" ON audit_logs
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

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

DROP TRIGGER IF EXISTS audit_sales ON sales;
CREATE TRIGGER audit_sales
  AFTER INSERT OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ============================================================================
-- 4. FUNÇÕES ÚTEIS
-- ============================================================================

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

SELECT 'Melhorias essenciais implementadas com sucesso!' as status;
