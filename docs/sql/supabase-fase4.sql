-- FASE 4: Relatórios Avançados e Dashboard em Tempo Real

-- View: Vendas por hora do dia
CREATE VIEW sales_by_hour AS
SELECT 
  business_id,
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as total_sales,
  SUM(total) as total_revenue,
  AVG(total) as avg_ticket
FROM sales
GROUP BY business_id, EXTRACT(HOUR FROM created_at)
ORDER BY hour;

-- View: Vendas por dia da semana
CREATE VIEW sales_by_weekday AS
SELECT 
  business_id,
  EXTRACT(DOW FROM created_at) as day_of_week,
  TO_CHAR(created_at, 'Day') as day_name,
  COUNT(*) as total_sales,
  SUM(total) as total_revenue
FROM sales
GROUP BY business_id, EXTRACT(DOW FROM created_at), TO_CHAR(created_at, 'Day')
ORDER BY day_of_week;

-- View: Top produtos mais vendidos
CREATE VIEW top_selling_products AS
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

-- View: Métodos de pagamento mais usados
CREATE VIEW payment_methods_summary AS
SELECT 
  business_id,
  SUM((payment_details->>'cash')::NUMERIC) as cash_total,
  SUM((payment_details->>'mpesa')::NUMERIC) as mpesa_total,
  SUM((payment_details->>'emola')::NUMERIC) as emola_total,
  SUM((payment_details->>'card')::NUMERIC) as card_total,
  COUNT(CASE WHEN (payment_details->>'cash')::NUMERIC > 0 THEN 1 END) as cash_count,
  COUNT(CASE WHEN (payment_details->>'mpesa')::NUMERIC > 0 THEN 1 END) as mpesa_count,
  COUNT(CASE WHEN (payment_details->>'emola')::NUMERIC > 0 THEN 1 END) as emola_count,
  COUNT(CASE WHEN (payment_details->>'card')::NUMERIC > 0 THEN 1 END) as card_count
FROM sales
GROUP BY business_id;

-- View: Performance diária
CREATE VIEW daily_performance AS
SELECT 
  business_id,
  DATE(created_at) as date,
  COUNT(*) as total_sales,
  SUM(total) as revenue,
  AVG(total) as avg_ticket,
  MIN(total) as min_sale,
  MAX(total) as max_sale,
  SUM((payment_details->>'cash')::NUMERIC) as cash,
  SUM((payment_details->>'mpesa')::NUMERIC) as mpesa,
  SUM((payment_details->>'emola')::NUMERIC) as emola,
  SUM((payment_details->>'card')::NUMERIC) as card
FROM sales
GROUP BY business_id, DATE(created_at)
ORDER BY date DESC;

-- View: Comparação mensal
CREATE VIEW monthly_comparison AS
SELECT 
  business_id,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_sales,
  SUM(total) as revenue,
  AVG(total) as avg_ticket
FROM sales
GROUP BY business_id, DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- View: Ingredientes com maior rotatividade
CREATE VIEW ingredient_turnover AS
SELECT 
  i.business_id,
  i.id as ingredient_id,
  i.name as ingredient_name,
  i.stock as current_stock,
  i.min_stock,
  COUNT(sm.id) as movement_count,
  SUM(CASE WHEN sm.type = 'exit' THEN sm.quantity ELSE 0 END) as total_used,
  SUM(CASE WHEN sm.type = 'entry' THEN sm.quantity ELSE 0 END) as total_added
FROM ingredients i
LEFT JOIN stock_movements sm ON sm.ingredient_id = i.id
GROUP BY i.business_id, i.id, i.name, i.stock, i.min_stock
ORDER BY total_used DESC;

-- Função: Calcular lucro de uma venda
CREATE OR REPLACE FUNCTION calculate_sale_profit(sale_id TEXT)
RETURNS NUMERIC AS $$
DECLARE
  total_cost NUMERIC := 0;
  total_sale NUMERIC;
BEGIN
  SELECT total INTO total_sale FROM sales WHERE id = sale_id;
  
  SELECT SUM((item->>'quantity')::NUMERIC * (item->'product'->>'costPrice')::NUMERIC)
  INTO total_cost
  FROM sales,
    jsonb_array_elements(items) as item
  WHERE sales.id = sale_id;
  
  RETURN total_sale - COALESCE(total_cost, 0);
END;
$$ LANGUAGE plpgsql;

-- Função: Relatório de lucro por período
CREATE OR REPLACE FUNCTION profit_report(
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  business_uuid UUID
)
RETURNS TABLE(
  date DATE,
  revenue NUMERIC,
  cost NUMERIC,
  profit NUMERIC,
  margin NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(s.created_at) as date,
    SUM(s.total) as revenue,
    SUM((item->>'quantity')::NUMERIC * (item->'product'->>'costPrice')::NUMERIC) as cost,
    SUM(s.total) - SUM((item->>'quantity')::NUMERIC * (item->'product'->>'costPrice')::NUMERIC) as profit,
    CASE 
      WHEN SUM(s.total) > 0 THEN 
        ((SUM(s.total) - SUM((item->>'quantity')::NUMERIC * (item->'product'->>'costPrice')::NUMERIC)) / SUM(s.total)) * 100
      ELSE 0
    END as margin
  FROM sales s,
    jsonb_array_elements(s.items) as item
  WHERE s.created_at BETWEEN start_date AND end_date
    AND s.business_id = business_uuid
  GROUP BY DATE(s.created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Função: Dashboard em tempo real
CREATE OR REPLACE FUNCTION realtime_dashboard(business_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'today_sales', (
      SELECT COUNT(*) FROM sales 
      WHERE DATE(created_at) = CURRENT_DATE 
      AND business_id = business_uuid
    ),
    'today_revenue', (
      SELECT COALESCE(SUM(total), 0) FROM sales 
      WHERE DATE(created_at) = CURRENT_DATE 
      AND business_id = business_uuid
    ),
    'avg_ticket', (
      SELECT COALESCE(AVG(total), 0) FROM sales 
      WHERE DATE(created_at) = CURRENT_DATE 
      AND business_id = business_uuid
    ),
    'critical_ingredients', (
      SELECT COUNT(*) FROM ingredients 
      WHERE stock <= min_stock 
      AND business_id = business_uuid
    ),
    'last_sale', (
      SELECT json_build_object(
        'id', id,
        'total', total,
        'created_at', created_at
      )
      FROM sales 
      WHERE business_id = business_uuid
      ORDER BY created_at DESC 
      LIMIT 1
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Tabela: Metas e objetivos
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
  metric TEXT NOT NULL, -- 'revenue', 'sales_count', 'avg_ticket'
  target_value NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_goals_business ON goals(business_id);
CREATE INDEX idx_goals_dates ON goals(start_date, end_date);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access their business goals" ON goals
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Função: Verificar progresso de metas
CREATE OR REPLACE FUNCTION check_goal_progress(goal_uuid UUID)
RETURNS JSON AS $$
DECLARE
  goal_record RECORD;
  current_value NUMERIC;
  progress NUMERIC;
BEGIN
  SELECT * INTO goal_record FROM goals WHERE id = goal_uuid;
  
  IF goal_record.metric = 'revenue' THEN
    SELECT COALESCE(SUM(total), 0) INTO current_value
    FROM sales
    WHERE business_id = goal_record.business_id
      AND created_at BETWEEN goal_record.start_date AND goal_record.end_date;
  ELSIF goal_record.metric = 'sales_count' THEN
    SELECT COUNT(*) INTO current_value
    FROM sales
    WHERE business_id = goal_record.business_id
      AND created_at BETWEEN goal_record.start_date AND goal_record.end_date;
  ELSIF goal_record.metric = 'avg_ticket' THEN
    SELECT COALESCE(AVG(total), 0) INTO current_value
    FROM sales
    WHERE business_id = goal_record.business_id
      AND created_at BETWEEN goal_record.start_date AND goal_record.end_date;
  END IF;
  
  progress := (current_value / goal_record.target_value) * 100;
  
  RETURN json_build_object(
    'goal_id', goal_uuid,
    'target', goal_record.target_value,
    'current', current_value,
    'progress', progress,
    'achieved', current_value >= goal_record.target_value
  );
END;
$$ LANGUAGE plpgsql;
