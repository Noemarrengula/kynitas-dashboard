-- ============================================================================
-- SISTEMA DE VALES (CRÉDITO/FIADO)
-- ============================================================================

-- Tabela: Clientes
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  credit_limit DECIMAL(10,2) DEFAULT 0,
  current_balance DECIMAL(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'inactive')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business customers" ON customers;
CREATE POLICY "Users can view their business customers" ON customers
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage customers" ON customers;
CREATE POLICY "Users can manage customers" ON customers
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'staff')
    )
  );

-- Tabela: Transações de Crédito (Vales)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('charge', 'payment', 'adjustment')),
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  sale_id TEXT,
  payment_method TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_business ON credit_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_customer ON credit_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at DESC);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view credit transactions" ON credit_transactions;
CREATE POLICY "Users can view credit transactions" ON credit_transactions
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create credit transactions" ON credit_transactions;
CREATE POLICY "Users can create credit transactions" ON credit_transactions
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- Adicionar customer_id à tabela sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);

-- Trigger: Atualizar updated_at em customers
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Função: Registrar venda a crédito
CREATE OR REPLACE FUNCTION create_credit_sale(
  p_business_id UUID,
  p_customer_id UUID,
  p_items JSONB,
  p_total DECIMAL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_customer RECORD;
  v_sale_id TEXT;
  v_transaction_id UUID;
  v_new_balance DECIMAL;
BEGIN
  SELECT * INTO v_customer FROM customers 
  WHERE id = p_customer_id AND business_id = p_business_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;
  
  IF v_customer.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Cliente bloqueado ou inativo');
  END IF;
  
  v_new_balance := v_customer.current_balance + p_total;
  IF v_new_balance > v_customer.credit_limit THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Limite de crédito excedido',
      'current_balance', v_customer.current_balance,
      'credit_limit', v_customer.credit_limit,
      'available', v_customer.credit_limit - v_customer.current_balance
    );
  END IF;
  
  INSERT INTO sales (business_id, customer_id, items, total, payment_details)
  VALUES (
    p_business_id,
    p_customer_id,
    p_items,
    p_total,
    jsonb_build_object('method', 'credit', 'status', 'pending')
  )
  RETURNING id INTO v_sale_id;
  
  INSERT INTO credit_transactions (
    business_id,
    customer_id,
    type,
    amount,
    balance_before,
    balance_after,
    sale_id,
    description,
    created_by
  )
  VALUES (
    p_business_id,
    p_customer_id,
    'charge',
    p_total,
    v_customer.current_balance,
    v_new_balance,
    v_sale_id,
    COALESCE(p_description, 'Venda a crédito'),
    auth.uid()
  )
  RETURNING id INTO v_transaction_id;
  
  UPDATE customers 
  SET current_balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_customer_id;
  
  RETURN json_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Registrar pagamento de vale
CREATE OR REPLACE FUNCTION register_credit_payment(
  p_business_id UUID,
  p_customer_id UUID,
  p_amount DECIMAL,
  p_payment_method TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_customer RECORD;
  v_transaction_id UUID;
  v_new_balance DECIMAL;
BEGIN
  SELECT * INTO v_customer FROM customers 
  WHERE id = p_customer_id AND business_id = p_business_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Cliente não encontrado');
  END IF;
  
  IF p_amount > v_customer.current_balance THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Valor excede dívida atual',
      'current_balance', v_customer.current_balance
    );
  END IF;
  
  v_new_balance := v_customer.current_balance - p_amount;
  
  INSERT INTO credit_transactions (
    business_id,
    customer_id,
    type,
    amount,
    balance_before,
    balance_after,
    payment_method,
    description,
    created_by
  )
  VALUES (
    p_business_id,
    p_customer_id,
    'payment',
    p_amount,
    v_customer.current_balance,
    v_new_balance,
    p_payment_method,
    COALESCE(p_description, 'Pagamento de vale'),
    auth.uid()
  )
  RETURNING id INTO v_transaction_id;
  
  UPDATE customers 
  SET current_balance = v_new_balance,
      updated_at = NOW()
  WHERE id = p_customer_id;
  
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance,
    'paid_amount', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View: Clientes com dívida
CREATE OR REPLACE VIEW customers_with_debt AS
SELECT 
  c.id,
  c.business_id,
  c.name,
  c.phone,
  c.current_balance,
  c.credit_limit,
  (c.credit_limit - c.current_balance) as available_credit,
  c.status,
  COUNT(ct.id) as total_transactions,
  MAX(ct.created_at) as last_transaction_date
FROM customers c
LEFT JOIN credit_transactions ct ON c.id = ct.customer_id
WHERE c.current_balance > 0
GROUP BY c.id, c.business_id, c.name, c.phone, c.current_balance, c.credit_limit, c.status;

-- View: Resumo de crédito por cliente
CREATE OR REPLACE VIEW customer_credit_summary AS
SELECT 
  c.id as customer_id,
  c.business_id,
  c.name,
  c.phone,
  c.current_balance,
  c.credit_limit,
  COUNT(CASE WHEN ct.type = 'charge' THEN 1 END) as total_charges,
  COUNT(CASE WHEN ct.type = 'payment' THEN 1 END) as total_payments,
  SUM(CASE WHEN ct.type = 'charge' THEN ct.amount ELSE 0 END) as total_charged,
  SUM(CASE WHEN ct.type = 'payment' THEN ct.amount ELSE 0 END) as total_paid,
  MAX(ct.created_at) as last_activity
FROM customers c
LEFT JOIN credit_transactions ct ON c.id = ct.customer_id
GROUP BY c.id, c.business_id, c.name, c.phone, c.current_balance, c.credit_limit;
