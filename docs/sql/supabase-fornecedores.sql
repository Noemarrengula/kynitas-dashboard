-- ============================================================================
-- MÓDULO DE GESTÃO DE FORNECEDORES
-- ============================================================================

-- Tabela: Fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  nuit TEXT,
  payment_terms INTEGER DEFAULT 30,
  credit_limit DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_business ON suppliers(business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view suppliers" ON suppliers;
CREATE POLICY "Users can view suppliers" ON suppliers
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage suppliers" ON suppliers;
CREATE POLICY "Users can manage suppliers" ON suppliers
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Tabela: Ordens de Compra
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  order_number TEXT NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'received', 'cancelled')),
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_business ON purchase_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date DESC);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view purchase orders" ON purchase_orders;
CREATE POLICY "Users can view purchase orders" ON purchase_orders
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage purchase orders" ON purchase_orders;
CREATE POLICY "Users can manage purchase orders" ON purchase_orders
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Tabela: Recepção de Compras
CREATE TABLE IF NOT EXISTS purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES purchase_orders(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  invoice_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_receipts_business ON purchase_receipts(business_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_supplier ON purchase_receipts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_po ON purchase_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_date ON purchase_receipts(receipt_date DESC);

ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view purchase receipts" ON purchase_receipts;
CREATE POLICY "Users can view purchase receipts" ON purchase_receipts
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage purchase receipts" ON purchase_receipts;
CREATE POLICY "Users can manage purchase receipts" ON purchase_receipts
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM business_users 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'staff')
    )
  );

-- Triggers
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Função: Gerar número de ordem de compra
CREATE OR REPLACE FUNCTION generate_po_number(business_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  po_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM purchase_orders
  WHERE business_id = business_uuid;
  
  po_number := 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN po_number;
END;
$$ LANGUAGE plpgsql;

-- Função: Receber ordem de compra e atualizar stock
CREATE OR REPLACE FUNCTION receive_purchase_order(
  po_id UUID,
  received_items JSONB,
  invoice_num TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  po RECORD;
  receipt_id UUID;
  item JSONB;
BEGIN
  SELECT * INTO po FROM purchase_orders WHERE id = po_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de compra não encontrada';
  END IF;
  
  INSERT INTO purchase_receipts (
    business_id,
    purchase_order_id,
    supplier_id,
    items,
    total,
    invoice_number,
    created_by
  ) VALUES (
    po.business_id,
    po_id,
    po.supplier_id,
    received_items,
    po.total,
    invoice_num,
    auth.uid()
  ) RETURNING id INTO receipt_id;
  
  FOR item IN SELECT * FROM jsonb_array_elements(received_items)
  LOOP
    UPDATE ingredients
    SET stock = stock + (item->>'quantity')::DECIMAL
    WHERE id = (item->>'ingredient_id')::UUID
      AND business_id = po.business_id;
  END LOOP;
  
  UPDATE purchase_orders
  SET status = 'received'
  WHERE id = po_id;
  
  RETURN receipt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View: Estatísticas de Fornecedores
CREATE OR REPLACE VIEW supplier_stats AS
SELECT 
  s.id,
  s.business_id,
  s.name,
  COUNT(DISTINCT po.id) as total_orders,
  COALESCE(SUM(po.total), 0) as total_purchased,
  COALESCE(AVG(po.total), 0) as avg_order_value,
  MAX(po.order_date) as last_order_date,
  COUNT(DISTINCT pr.id) as total_receipts
FROM suppliers s
LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.status != 'cancelled'
LEFT JOIN purchase_receipts pr ON s.id = pr.supplier_id
GROUP BY s.id, s.business_id, s.name;

-- View: Ordens de Compra Pendentes
CREATE OR REPLACE VIEW pending_purchase_orders AS
SELECT 
  po.*,
  s.name as supplier_name,
  s.phone as supplier_phone,
  CURRENT_DATE - po.order_date as days_pending
FROM purchase_orders po
JOIN suppliers s ON po.supplier_id = s.id
WHERE po.status IN ('sent', 'confirmed')
ORDER BY po.order_date ASC;

COMMENT ON TABLE suppliers IS 'Cadastro de fornecedores';
COMMENT ON TABLE purchase_orders IS 'Ordens de compra para fornecedores';
COMMENT ON TABLE purchase_receipts IS 'Recepção de mercadorias';
COMMENT ON VIEW supplier_stats IS 'Estatísticas de compras por fornecedor';
