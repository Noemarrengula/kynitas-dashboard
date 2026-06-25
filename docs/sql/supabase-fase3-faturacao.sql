-- ============================================================================
-- FASE 3: Módulo de Facturação Fiscal (Moçambique)
-- ============================================================================
-- Conformidade: Lei do IVA, SNCF, ATCUD
-- Tipos de documento: FT (Factura), FS (Factura Simplificada),
--   FC (Factura a Consumidor Final), NC (Nota de Crédito)
-- IVA: 16% (standard), 10% (reduzido), 0% (isento)
-- ============================================================================

-- 1. Adicionar taxa de IVA aos produtos
ALTER TABLE products ADD COLUMN IF NOT EXISTS iva_rate DECIMAL(5,2) DEFAULT 16.00;
COMMENT ON COLUMN products.iva_rate IS 'Taxa de IVA aplicável ao produto (16, 10, 5, 0)';

-- 2. Tabela de séries de facturação
CREATE TABLE IF NOT EXISTS invoice_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  prefix TEXT NOT NULL,
  current_number INTEGER NOT NULL DEFAULT 0,
  start_number INTEGER NOT NULL DEFAULT 1,
  document_type TEXT NOT NULL CHECK (document_type IN ('FT', 'FS', 'FC', 'NC')),
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, prefix)
);

-- 3. Tabela de facturas
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,

  -- Identificação do documento
  document_type TEXT NOT NULL CHECK (document_type IN ('FT', 'FS', 'FC', 'NC')),
  series TEXT NOT NULL,
  number INTEGER NOT NULL,

  -- Cliente (para FT)
  client_name TEXT,
  client_nuit TEXT,
  client_address TEXT,

  -- Valores financeiros
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  iva_rate DECIMAL(5,2) DEFAULT 16.00,
  iva_amount DECIMAL(10,2) DEFAULT 0,
  withholding_tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,

  -- Controlo fiscal (ATCUD / hash chain)
  atcud TEXT,
  hash TEXT,
  hash_prev TEXT,
  qr_code_data TEXT,

  -- Estado
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled')),
  cancellation_reason TEXT,
  reason TEXT,

  -- Metadados
  printed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  issued_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(business_id, series, number)
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_invoices_business ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_series ON invoices(business_id, series, number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_sale ON invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoice_series_business ON invoice_series(business_id);

-- 5. Função para gerar próximo número de série
CREATE OR REPLACE FUNCTION next_invoice_number(p_business_id UUID, p_series TEXT)
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(number), 0) + 1 INTO next_num
  FROM invoices
  WHERE business_id = p_business_id AND series = p_series;
  RETURN next_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger para auto-incrementar invoice_series.current_number
CREATE OR REPLACE FUNCTION increment_series_number()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoice_series
  SET current_number = NEW.number, updated_at = NOW()
  WHERE business_id = NEW.business_id AND prefix = NEW.series;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_increment_series_number ON invoices;
CREATE TRIGGER trigger_increment_series_number
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION increment_series_number();

-- 7. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON invoices;
CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- 8. RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business invoices"
  ON invoices FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invoices for their business"
  ON invoices FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their business invoices"
  ON invoices FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their business invoice series"
  ON invoice_series FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their business invoice series"
  ON invoice_series FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid()
    )
  );

-- 9. Trigger para criar séries padrão ao criar um negócio
CREATE OR REPLACE FUNCTION create_default_invoice_series()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO invoice_series (business_id, code, prefix, document_type, is_default, current_number, start_number)
  VALUES
    (NEW.id, 'FT', 'FT', 'FT', false, 0, 1),
    (NEW.id, 'FS', 'FS', 'FS', true, 0, 1),
    (NEW.id, 'FC', 'FC', 'FC', false, 0, 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_invoice_series ON businesses;
CREATE TRIGGER trigger_create_invoice_series
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION create_default_invoice_series();

-- ============================================================================
-- NOTA: Executar no Supabase SQL Editor
-- ============================================================================
