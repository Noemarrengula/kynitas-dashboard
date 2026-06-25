-- ============================================================================
-- FASE 4: Metas, Objectivos e Views Analíticas
-- ============================================================================

-- 1. Views analíticas (apenas leitura, não precisam de RLS — herdam da tabela base)

-- Drop existentes primeiro para evitar conflitos de colunas ao recriar
DROP VIEW IF EXISTS top_selling_products CASCADE;
DROP VIEW IF EXISTS sales_by_hour CASCADE;
DROP VIEW IF EXISTS sales_by_weekday CASCADE;
DROP VIEW IF EXISTS daily_performance CASCADE;

CREATE OR REPLACE VIEW sales_by_hour AS
SELECT
  business_id,
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as total_sales,
  SUM(total) as total_revenue,
  AVG(total) as avg_ticket
FROM sales
GROUP BY business_id, EXTRACT(HOUR FROM created_at)
ORDER BY hour;

CREATE OR REPLACE VIEW sales_by_weekday AS
SELECT
  business_id,
  EXTRACT(DOW FROM created_at) as day_of_week,
  TO_CHAR(created_at, 'Day') as day_name,
  COUNT(*) as total_sales,
  SUM(total) as total_revenue
FROM sales
GROUP BY business_id, EXTRACT(DOW FROM created_at), TO_CHAR(created_at, 'Day')
ORDER BY day_of_week;

CREATE OR REPLACE VIEW top_selling_products AS
SELECT
  s.business_id,
  (item->>'productId') as product_id,
  (item->'product'->>'name') as product_name,
  (item->'product'->>'category') as category,
  SUM((item->>'quantity')::NUMERIC) as total_quantity,
  SUM((item->>'subtotal')::NUMERIC) as total_revenue,
  COUNT(DISTINCT s.id) as times_sold
FROM sales s,
  jsonb_array_elements(s.items) as item
GROUP BY s.business_id, product_id, product_name, category
ORDER BY total_quantity DESC;

CREATE OR REPLACE VIEW daily_performance AS
SELECT
  business_id,
  DATE(created_at) as date,
  COUNT(*) as total_sales,
  SUM(total) as revenue,
  AVG(total) as avg_ticket,
  MIN(total) as min_sale,
  MAX(total) as max_sale
FROM sales
GROUP BY business_id, DATE(created_at)
ORDER BY date DESC;

-- 2. Tabela de metas
CREATE TABLE IF NOT EXISTS business_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'yearly')),
  category TEXT NOT NULL CHECK (category IN ('revenue', 'sales_count', 'avg_ticket', 'customer_retention', 'product_sales')),
  target NUMERIC NOT NULL,
  target_label TEXT,
  period DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_goals_business ON business_goals(business_id);
CREATE INDEX IF NOT EXISTS idx_business_goals_period ON business_goals(business_id, period);

ALTER TABLE business_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business goals"
  ON business_goals FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert goals for their business"
  ON business_goals FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their business goals"
  ON business_goals FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their business goals"
  ON business_goals FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- NOTA: Executar no Supabase SQL Editor
-- ============================================================================
