-- SISTEMA DE CLIENTES E FIDELIDADE

-- Tabela de clientes
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  address TEXT,
  notes TEXT,
  loyalty_points INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  last_visit_at TIMESTAMP,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access their business customers" ON customers
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Adicionar customer_id às vendas
ALTER TABLE sales ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX idx_sales_customer ON sales(customer_id);

-- Tabela de programa de fidelidade
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'earn', 'redeem', 'expire', 'bonus'
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_loyalty_customer ON loyalty_transactions(customer_id);
CREATE INDEX idx_loyalty_created ON loyalty_transactions(created_at DESC);

ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
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

-- Trigger: Atualizar pontos e estatísticas do cliente após venda
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
DECLARE
  points_earned INTEGER;
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    -- Calcular pontos (1 ponto a cada 10 MT gastos)
    points_earned := FLOOR(NEW.total / 10);
    
    -- Atualizar estatísticas do cliente
    UPDATE customers
    SET 
      loyalty_points = loyalty_points + points_earned,
      total_spent = total_spent + NEW.total,
      visit_count = visit_count + 1,
      last_visit_at = NEW.created_at,
      updated_at = NOW()
    WHERE id = NEW.customer_id;
    
    -- Registrar transação de pontos
    INSERT INTO loyalty_transactions (customer_id, sale_id, points, type, description)
    VALUES (
      NEW.customer_id,
      NEW.id,
      points_earned,
      'earn',
      'Pontos ganhos na compra de ' || NEW.total || ' MT'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_stats
AFTER INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION update_customer_stats();

-- View: Top clientes
CREATE VIEW top_customers AS
SELECT 
  c.business_id,
  c.id,
  c.name,
  c.phone,
  c.total_spent,
  c.visit_count,
  c.loyalty_points,
  c.last_visit_at,
  ROUND(c.total_spent / NULLIF(c.visit_count, 0), 2) as avg_ticket
FROM customers c
WHERE c.active = true
ORDER BY c.total_spent DESC;

-- View: Aniversariantes do mês
CREATE VIEW birthday_customers AS
SELECT 
  c.business_id,
  c.id,
  c.name,
  c.phone,
  c.email,
  c.birth_date,
  c.loyalty_points
FROM customers c
WHERE c.active = true
  AND EXTRACT(MONTH FROM c.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY EXTRACT(DAY FROM c.birth_date);

-- Função: Resgatar pontos
CREATE OR REPLACE FUNCTION redeem_loyalty_points(
  customer_uuid UUID,
  points_to_redeem INTEGER,
  reason TEXT DEFAULT 'Resgate de pontos'
)
RETURNS JSON AS $$
DECLARE
  customer_record RECORD;
  discount_value NUMERIC;
BEGIN
  SELECT * INTO customer_record FROM customers WHERE id = customer_uuid;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Cliente não encontrado');
  END IF;
  
  IF customer_record.loyalty_points < points_to_redeem THEN
    RETURN json_build_object('success', false, 'message', 'Pontos insuficientes');
  END IF;
  
  -- Calcular desconto (1 ponto = 1 MT de desconto)
  discount_value := points_to_redeem;
  
  -- Atualizar pontos do cliente
  UPDATE customers
  SET loyalty_points = loyalty_points - points_to_redeem,
      updated_at = NOW()
  WHERE id = customer_uuid;
  
  -- Registrar transação
  INSERT INTO loyalty_transactions (customer_id, points, type, description)
  VALUES (customer_uuid, -points_to_redeem, 'redeem', reason);
  
  RETURN json_build_object(
    'success', true,
    'discount_value', discount_value,
    'remaining_points', customer_record.loyalty_points - points_to_redeem
  );
END;
$$ LANGUAGE plpgsql;

-- Função: Adicionar pontos bônus
CREATE OR REPLACE FUNCTION add_bonus_points(
  customer_uuid UUID,
  bonus_points INTEGER,
  reason TEXT DEFAULT 'Bônus especial'
)
RETURNS void AS $$
BEGIN
  UPDATE customers
  SET loyalty_points = loyalty_points + bonus_points,
      updated_at = NOW()
  WHERE id = customer_uuid;
  
  INSERT INTO loyalty_transactions (customer_id, points, type, description)
  VALUES (customer_uuid, bonus_points, 'bonus', reason);
END;
$$ LANGUAGE plpgsql;

-- Função: Buscar cliente por telefone
CREATE OR REPLACE FUNCTION find_customer_by_phone(
  business_uuid UUID,
  customer_phone TEXT
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  phone TEXT,
  email TEXT,
  loyalty_points INTEGER,
  total_spent NUMERIC,
  visit_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    c.loyalty_points,
    c.total_spent,
    c.visit_count
  FROM customers c
  WHERE c.business_id = business_uuid
    AND c.phone = customer_phone
    AND c.active = true;
END;
$$ LANGUAGE plpgsql;
