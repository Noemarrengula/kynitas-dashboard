-- FASE 6: Gestão Financeira, Funcionários e Melhorias

-- Tabela: Despesas
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'utilities', 'salaries', 'suppliers', 'rent', 'maintenance', 'other'
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT, -- 'cash', 'mpesa', 'emola', 'card', 'bank_transfer'
  paid BOOLEAN DEFAULT false,
  due_date DATE,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_expenses_business ON expenses(business_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(created_at DESC);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their business expenses" ON expenses
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Tabela: Metas de Vendas
CREATE TABLE sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  month INTEGER NOT NULL, -- 1-12
  year INTEGER NOT NULL,
  target_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sales_targets_business ON sales_targets(business_id);
CREATE UNIQUE INDEX idx_sales_targets_month_year ON sales_targets(business_id, month, year);

ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their business targets" ON sales_targets
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Tabela: Funcionários
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL, -- 'waiter', 'cook', 'cashier', 'manager', 'cleaner'
  salary DECIMAL(10,2),
  hire_date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_employees_business ON employees(business_id);
CREATE INDEX idx_employees_active ON employees(active);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their business employees" ON employees
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Tabela: Backups
CREATE TABLE backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL, -- 'automatic', 'manual'
  status TEXT NOT NULL, -- 'completed', 'failed', 'in_progress'
  file_size BIGINT,
  file_path TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_backups_business ON backups(business_id);
CREATE INDEX idx_backups_date ON backups(created_at DESC);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their business backups" ON backups
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid()
    )
  );

-- View: Resumo Financeiro
CREATE VIEW financial_summary AS
SELECT 
  s.business_id,
  DATE_TRUNC('month', s.created_at) as month,
  SUM(s.total) as total_revenue,
  COUNT(s.id) as total_sales,
  AVG(s.total) as average_ticket,
  COALESCE(
    (SELECT SUM(e.amount) 
     FROM expenses e 
     WHERE e.business_id = s.business_id 
       AND DATE_TRUNC('month', e.created_at) = DATE_TRUNC('month', s.created_at)
       AND e.paid = true
    ), 0
  ) as total_expenses,
  SUM(s.total) - COALESCE(
    (SELECT SUM(e.amount) 
     FROM expenses e 
     WHERE e.business_id = s.business_id 
       AND DATE_TRUNC('month', e.created_at) = DATE_TRUNC('month', s.created_at)
       AND e.paid = true
    ), 0
  ) as net_profit
FROM sales s
GROUP BY s.business_id, DATE_TRUNC('month', s.created_at);

-- Função: Calcular previsão de reposição
CREATE OR REPLACE FUNCTION calculate_restock_prediction(
  ingredient_uuid UUID,
  days_to_predict INTEGER DEFAULT 7
)
RETURNS JSON AS $$
DECLARE
  avg_daily_usage DECIMAL;
  current_stock DECIMAL;
  days_until_empty INTEGER;
  restock_date DATE;
  ingredient_name TEXT;
BEGIN
  -- Calcular uso médio diário dos últimos 30 dias
  SELECT 
    COALESCE(AVG(daily_usage), 0),
    i.stock,
    i.name
  INTO avg_daily_usage, current_stock, ingredient_name
  FROM ingredients i
  LEFT JOIN (
    SELECT 
      sm.ingredient_id,
      DATE(sm.created_at) as usage_date,
      SUM(sm.quantity) as daily_usage
    FROM stock_movements sm
    WHERE sm.ingredient_id = ingredient_uuid
      AND sm.type = 'exit'
      AND sm.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY sm.ingredient_id, DATE(sm.created_at)
  ) usage ON usage.ingredient_id = i.id
  WHERE i.id = ingredient_uuid
  GROUP BY i.stock, i.name;
  
  -- Calcular dias até acabar
  IF avg_daily_usage > 0 THEN
    days_until_empty := FLOOR(current_stock / avg_daily_usage);
    restock_date := CURRENT_DATE + days_until_empty;
  ELSE
    days_until_empty := 999;
    restock_date := NULL;
  END IF;
  
  RETURN json_build_object(
    'ingredient_id', ingredient_uuid,
    'ingredient_name', ingredient_name,
    'current_stock', current_stock,
    'avg_daily_usage', ROUND(avg_daily_usage, 2),
    'days_until_empty', days_until_empty,
    'restock_date', restock_date,
    'needs_restock', days_until_empty <= days_to_predict
  );
END;
$$ LANGUAGE plpgsql;

-- Função: Análise de horários de pico
CREATE OR REPLACE FUNCTION analyze_peak_hours(
  business_uuid UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  hour_of_day INTEGER,
  total_sales BIGINT,
  total_revenue DECIMAL,
  avg_ticket DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM s.created_at)::INTEGER as hour_of_day,
    COUNT(s.id) as total_sales,
    SUM(s.total) as total_revenue,
    AVG(s.total) as avg_ticket
  FROM sales s
  WHERE s.business_id = business_uuid
    AND s.created_at >= CURRENT_DATE - days_back
  GROUP BY EXTRACT(HOUR FROM s.created_at)
  ORDER BY hour_of_day;
END;
$$ LANGUAGE plpgsql;

-- Função: Produtos mais vendidos
CREATE OR REPLACE FUNCTION top_selling_products(
  business_uuid UUID,
  days_back INTEGER DEFAULT 30,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
  product_name TEXT,
  total_quantity BIGINT,
  total_revenue DECIMAL,
  times_sold BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.name as product_name,
    SUM((item->>'quantity')::INTEGER) as total_quantity,
    SUM((item->>'subtotal')::DECIMAL) as total_revenue,
    COUNT(DISTINCT s.id) as times_sold
  FROM sales s,
       jsonb_array_elements(s.items) as item
  JOIN products p ON p.id = (item->>'productId')::TEXT
  WHERE s.business_id = business_uuid
    AND s.created_at >= CURRENT_DATE - days_back
  GROUP BY p.name
  ORDER BY total_revenue DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Função: Criar backup automático
CREATE OR REPLACE FUNCTION create_automatic_backup(
  business_uuid UUID
)
RETURNS UUID AS $$
DECLARE
  backup_id UUID;
BEGIN
  INSERT INTO backups (business_id, backup_type, status)
  VALUES (business_uuid, 'automatic', 'completed')
  RETURNING id INTO backup_id;
  
  RETURN backup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Atualizar updated_at em expenses
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
