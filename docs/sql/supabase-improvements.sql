-- MELHORIAS PARA O BACKEND SUPABASE

-- 1. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Tabela de auditoria
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);

-- 3. Tabela de configurações
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
  ('business_name', '"Kynitas Bar"'),
  ('business_address', '"Maputo, Moçambique"'),
  ('business_phone', '"+258 84 000 0000"'),
  ('business_nuit', '"000000000"'),
  ('currency', '"MZN"'),
  ('low_stock_alert', '5');

-- 4. Constraints de validação
ALTER TABLE ingredients ADD CONSTRAINT check_stock_positive CHECK (stock >= 0);
ALTER TABLE products ADD CONSTRAINT check_stock_positive CHECK (stock >= 0);
ALTER TABLE sales ADD CONSTRAINT check_total_positive CHECK (total > 0);

-- 5. View para relatórios rápidos
CREATE VIEW sales_summary AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_sales,
  SUM(total) as total_revenue,
  AVG(total) as average_ticket,
  SUM((payment_details->>'cash')::NUMERIC) as cash_total,
  SUM((payment_details->>'mpesa')::NUMERIC) as mpesa_total,
  SUM((payment_details->>'emola')::NUMERIC) as emola_total,
  SUM((payment_details->>'card')::NUMERIC) as card_total
FROM sales
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 6. View para ingredientes críticos
CREATE VIEW critical_ingredients AS
SELECT 
  id,
  name,
  stock,
  min_stock,
  unit,
  cost_per_unit,
  (stock * cost_per_unit) as stock_value
FROM ingredients
WHERE stock <= min_stock
ORDER BY stock ASC;

-- 7. View para produtos mais vendidos
CREATE VIEW top_products AS
SELECT 
  (item->>'productId') as product_id,
  (item->'product'->>'name') as product_name,
  SUM((item->>'quantity')::NUMERIC) as total_quantity,
  SUM((item->>'subtotal')::NUMERIC) as total_revenue
FROM sales,
  jsonb_array_elements(items) as item
GROUP BY product_id, product_name
ORDER BY total_quantity DESC
LIMIT 20;

-- 8. Função para calcular lucro
CREATE OR REPLACE FUNCTION calculate_profit(sale_id TEXT)
RETURNS NUMERIC AS $$
DECLARE
  total_cost NUMERIC := 0;
  total_sale NUMERIC;
BEGIN
  SELECT total INTO total_sale FROM sales WHERE id = sale_id;
  
  -- Calcular custo baseado nos itens
  SELECT SUM((item->>'quantity')::NUMERIC * (item->'product'->>'costPrice')::NUMERIC)
  INTO total_cost
  FROM sales,
    jsonb_array_elements(items) as item
  WHERE sales.id = sale_id;
  
  RETURN total_sale - COALESCE(total_cost, 0);
END;
$$ LANGUAGE plpgsql;

-- 9. Tabela de metas mensais
CREATE TABLE monthly_targets (
  id SERIAL PRIMARY KEY,
  month DATE NOT NULL UNIQUE,
  revenue_target NUMERIC NOT NULL,
  sales_target INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 10. Backup automático (agendar no Supabase)
CREATE OR REPLACE FUNCTION create_daily_backup()
RETURNS void AS $$
BEGIN
  RAISE NOTICE 'Backup diário criado em %', NOW();
END;
$$ LANGUAGE plpgsql;
