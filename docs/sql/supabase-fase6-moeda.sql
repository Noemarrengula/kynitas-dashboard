-- ============================================================================
-- FASE 6: Multi-moeda
-- ============================================================================

-- Adicionar coluna currency à tabela businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'MZN';

-- Tabela de taxas de câmbio
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, from_currency, to_currency)
);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exchange rates"
  ON exchange_rates FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage exchange rates"
  ON exchange_rates FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- Garantir que negócios existentes tenham currency definida
UPDATE businesses SET currency = 'MZN' WHERE currency IS NULL;
