-- FIDELIZAÇÃO ATIVA (idempotente — seguro para qualquer schema actual)

-- 1. customer_id em sales (pode não existir ainda)
DO $$ BEGIN
  ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- 2. Colunas de lealdade em customers (tabela pode ser só vales)
DO $$ BEGIN
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMPTZ;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS birth_date DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. Tabela loyalty_transactions
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earn','redeem','bonus')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_customer ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_created ON loyalty_transactions(created_at DESC);

-- RLS
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access their business loyalty transactions" ON loyalty_transactions;
CREATE POLICY "Users can access their business loyalty transactions" ON loyalty_transactions
  FOR ALL USING (
    customer_id IN (
      SELECT id FROM customers
      WHERE business_id IN (
        SELECT business_id FROM business_users
        WHERE user_id = auth.uid() AND active = true
      )
    )
  );

-- 4. Trigger: pontos automáticos por compra
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
DECLARE
  points_earned INTEGER;
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    points_earned := FLOOR(NEW.total / 10);
    UPDATE customers
    SET loyalty_points  = loyalty_points + points_earned,
        total_spent    = total_spent + NEW.total,
        visit_count    = visit_count + 1,
        last_visit_at  = NEW.created_at,
        updated_at     = NOW()
    WHERE id = NEW.customer_id;
    INSERT INTO loyalty_transactions (customer_id, sale_id, points, type, description)
    VALUES (NEW.customer_id, NEW.id, points_earned, 'earn',
            'Compra de ' || NEW.total || ' MT');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_stats ON sales;
CREATE TRIGGER trigger_update_customer_stats
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- 5. View: top clientes
CREATE OR REPLACE VIEW top_customers AS
SELECT
  c.business_id, c.id, c.name, c.phone,
  c.total_spent, c.visit_count, c.loyalty_points, c.last_visit_at,
  ROUND(c.total_spent / NULLIF(c.visit_count, 0), 2) AS avg_ticket
FROM customers c
WHERE c.active = true
ORDER BY c.total_spent DESC;

-- 6. View: aniversariantes do mês
CREATE OR REPLACE VIEW birthday_customers AS
SELECT
  c.business_id, c.id, c.name, c.phone, c.email, c.birth_date, c.loyalty_points
FROM customers c
WHERE c.active = true
  AND EXTRACT(MONTH FROM c.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY EXTRACT(DAY FROM c.birth_date);

-- 7. RPC: resgatar pontos (1 ponto = 1 MT de desconto)
CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  p_customer UUID,
  p_points INTEGER,
  p_reason TEXT DEFAULT 'Resgate de pontos'
)
RETURNS JSON AS $$
DECLARE
  current_pts INTEGER;
  new_pts INTEGER;
BEGIN
  SELECT loyalty_points INTO current_pts FROM customers WHERE id = p_customer;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'msg', 'Cliente não encontrado');
  END IF;
  IF current_pts < p_points THEN
    RETURN json_build_object('ok', false, 'msg', 'Pontos insuficientes (tem ' || current_pts || ')');
  END IF;
  new_pts := current_pts - p_points;
  UPDATE customers SET loyalty_points = new_pts, updated_at = NOW() WHERE id = p_customer;
  INSERT INTO loyalty_transactions (customer_id, points, type, description)
  VALUES (p_customer, -p_points, 'redeem', p_reason);
  RETURN json_build_object('ok', true, 'discount', p_points, 'remaining', new_pts);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: bónus de pontos
CREATE OR REPLACE FUNCTION add_bonus_points(
  p_customer UUID,
  p_points INTEGER,
  p_reason TEXT DEFAULT 'Bónus especial'
)
RETURNS void AS $$
BEGIN
  UPDATE customers SET loyalty_points = loyalty_points + p_points, updated_at = NOW() WHERE id = p_customer;
  INSERT INTO loyalty_transactions (customer_id, points, type, description)
  VALUES (p_customer, p_points, 'bonus', p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC: buscar cliente por telefone
CREATE OR REPLACE FUNCTION find_customer_by_phone(
  p_business UUID,
  p_phone TEXT
)
RETURNS TABLE (
  id UUID, name TEXT, phone TEXT, loyalty_points INTEGER,
  total_spent NUMERIC, visit_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.phone, c.loyalty_points, c.total_spent, c.visit_count
  FROM customers c
  WHERE c.business_id = p_business
    AND c.phone = p_phone
    AND c.active = true;
END;
$$ LANGUAGE plpgsql;
