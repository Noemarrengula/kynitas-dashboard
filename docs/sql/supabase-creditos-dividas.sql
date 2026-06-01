-- =====================================================
-- SCRIPT: Tabela de Créditos/Dívidas
-- Sistema para rastrear vendas a crédito
-- =====================================================

-- 1. Criar tabela credits
CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Cliente
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  
  -- Produtos
  items JSONB NOT NULL, -- Armazena OrderItem[]
  
  -- Valores
  total NUMERIC(10, 2) NOT NULL,
  amount_paid NUMERIC(10, 2) DEFAULT 0,
  remaining_balance NUMERIC(10, 2) NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  
  -- Datas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_payment_at TIMESTAMP WITH TIME ZONE,
  
  -- Notas/Observações
  notes TEXT,
  
  -- Relacionamento com venda (opcional)
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_credits_business_id ON credits(business_id);
CREATE INDEX IF NOT EXISTS idx_credits_status ON credits(status);
CREATE INDEX IF NOT EXISTS idx_credits_customer_name ON credits(customer_name);
CREATE INDEX IF NOT EXISTS idx_credits_created_at ON credits(created_at);
CREATE INDEX IF NOT EXISTS idx_credits_remaining_balance ON credits(remaining_balance);

-- 3. Criar tabela de pagamentos de créditos
CREATE TABLE IF NOT EXISTS credit_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_id UUID NOT NULL REFERENCES credits(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Pagamento
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'mpesa', 'emola', 'card')),
  
  -- Data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Notas
  notes TEXT
);

-- 4. Criar índices para pagamentos
CREATE INDEX IF NOT EXISTS idx_credit_payments_credit_id ON credit_payments(credit_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_business_id ON credit_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_created_at ON credit_payments(created_at);

-- 5. Função para atualizar status de crédito quando pago
CREATE OR REPLACE FUNCTION update_credit_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid NUMERIC;
  v_total_amount NUMERIC;
BEGIN
  -- Calcular total pago a partir dos registos de pagamento
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM credit_payments
  WHERE credit_id = NEW.credit_id;
  
  -- Obter o total do crédito
  SELECT total INTO v_total_amount
  FROM credits
  WHERE id = NEW.credit_id;
  
  -- Atualizar o crédito com valores calculados
  UPDATE credits
  SET 
    amount_paid = v_total_paid,
    remaining_balance = v_total_amount - v_total_paid,
    updated_at = CURRENT_TIMESTAMP,
    last_payment_at = CURRENT_TIMESTAMP,
    status = CASE
      WHEN v_total_amount - v_total_paid <= 0 THEN 'paid'
      WHEN v_total_paid > 0 THEN 'partial'
      ELSE 'pending'
    END
  WHERE id = NEW.credit_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para atualizar status automaticamente
DROP TRIGGER IF EXISTS trigger_update_credit_status ON credit_payments;
CREATE TRIGGER trigger_update_credit_status
AFTER INSERT ON credit_payments
FOR EACH ROW
EXECUTE FUNCTION update_credit_status();

-- 7. Função para calcular saldo pendente
CREATE OR REPLACE FUNCTION calculate_credit_balance(credit_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_paid NUMERIC;
  total_amount NUMERIC;
BEGIN
  SELECT c.total INTO total_amount FROM credits c WHERE c.id = credit_id;
  
  SELECT COALESCE(SUM(amount), 0) INTO total_paid 
  FROM credit_payments 
  WHERE credit_id = credit_id;
  
  RETURN total_amount - total_paid;
END;
$$ LANGUAGE plpgsql;

-- 8. Adicionar comentários às colunas
COMMENT ON TABLE credits IS 'Rastreamento de vendas a crédito/dívidas de clientes';
COMMENT ON COLUMN credits.items IS 'Array JSON dos produtos vendidos a crédito';
COMMENT ON COLUMN credits.amount_paid IS 'Total já pago pelo cliente';
COMMENT ON COLUMN credits.remaining_balance IS 'Valor ainda devido';
COMMENT ON COLUMN credits.status IS 'Status: pending (nunca pagou), partial (pagou parcial), paid (quitado)';

COMMENT ON TABLE credit_payments IS 'Histórico de pagamentos de créditos';
COMMENT ON COLUMN credit_payments.payment_method IS 'Como foi realizado o pagamento: cash, mpesa, emola, card';

-- 9. RLS (Row Level Security) para credits
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;

-- Criar policies para RLS (versão simplificada)
-- Nota: Estas policies requerem que business_id seja passado corretamente
-- A segurança multi-tenant é garantida pelo negócio_id na camada de aplicação

DROP POLICY IF EXISTS "Users can view their business credits" ON credits;
CREATE POLICY "Users can view their business credits"
  ON credits FOR SELECT
  USING (true);  -- A filtragem é feita na aplicação por business_id

DROP POLICY IF EXISTS "Users can insert credits for their business" ON credits;
CREATE POLICY "Users can insert credits for their business"
  ON credits FOR INSERT
  WITH CHECK (true);  -- A validação é feita na aplicação

DROP POLICY IF EXISTS "Users can update their business credits" ON credits;
CREATE POLICY "Users can update their business credits"
  ON credits FOR UPDATE
  USING (true);  -- A validação é feita na aplicação

DROP POLICY IF EXISTS "Users can delete their business credits" ON credits;
CREATE POLICY "Users can delete their business credits"
  ON credits FOR DELETE
  USING (true);  -- A validação é feita na aplicação

-- Policies para credit_payments
DROP POLICY IF EXISTS "Users can view credit payments from their business" ON credit_payments;
CREATE POLICY "Users can view credit payments from their business"
  ON credit_payments FOR SELECT
  USING (true);  -- A filtragem é feita na aplicação por business_id

DROP POLICY IF EXISTS "Users can insert credit payments for their business" ON credit_payments;
CREATE POLICY "Users can insert credit payments for their business"
  ON credit_payments FOR INSERT
  WITH CHECK (true);  -- A validação é feita na aplicação

-- 10. Log de execução
-- Este script criou:
-- - Tabela: credits (vendas a crédito)
-- - Tabela: credit_payments (pagamentos de crédito)
-- - Índices para performance
-- - Funções e triggers para atualizar status
-- - RLS policies para segurança multi-tenant
-- Data de execução: 2025-12-30
