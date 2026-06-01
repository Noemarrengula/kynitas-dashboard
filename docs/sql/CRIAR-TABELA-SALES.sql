-- ============================================================================
-- CRIAR TABELA SALES - URGENTE
-- ============================================================================

-- 1. DELETAR TABELA SE EXISTIR (cuidado com dados!)
DROP TABLE IF EXISTS sales CASCADE;

-- 2. CRIAR TABELA SALES
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_number SERIAL,
  items JSONB NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  payment_details JSONB NOT NULL,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CRIAR ÍNDICES
CREATE INDEX idx_sales_business_id ON sales(business_id);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX idx_sales_business_date ON sales(business_id, created_at DESC);

-- 4. HABILITAR RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- 5. CRIAR POLÍTICAS RLS
CREATE POLICY "Users can view their business sales" 
ON sales FOR SELECT 
USING (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their business sales" 
ON sales FOR INSERT 
WITH CHECK (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their business sales" 
ON sales FOR UPDATE 
USING (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their business sales" 
ON sales FOR DELETE 
USING (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  )
);

-- 6. CRIAR FUNÇÃO DE ATUALIZAÇÃO DE STOCK
CREATE OR REPLACE FUNCTION update_product_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  product_id TEXT;
  quantity_to_reduce INTEGER;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    -- Extrair productId como TEXT
    product_id := item->>'productId';
    quantity_to_reduce := (item->>'quantity')::INTEGER;
    
    -- Comparar id::text = product_id (ambos TEXT)
    UPDATE products
    SET stock = GREATEST(0, stock - quantity_to_reduce)
    WHERE id::text = product_id
      AND business_id = NEW.business_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. CRIAR TRIGGER
CREATE TRIGGER update_stock_on_sale
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_on_sale();

-- 8. VERIFICAR
SELECT 'Tabela sales criada com sucesso!' as status;

SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'sales'
ORDER BY ordinal_position;
