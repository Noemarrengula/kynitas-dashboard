-- ============================================================================
-- LIMPAR E RECRIAR TRIGGER - Remover TODAS as funções antigas com CASCADE
-- ============================================================================

-- 1. REMOVER TODAS AS TRIGGERS E FUNÇÕES COM CASCADE
DROP FUNCTION IF EXISTS update_stock_after_sale() CASCADE;
DROP FUNCTION IF EXISTS update_product_stock_on_sale() CASCADE;
DROP FUNCTION IF EXISTS update_stock_on_sale() CASCADE;

-- 2. CRIAR FUNÇÃO NOVA CORRIGIDA (converter ambos para TEXT)
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
    
    -- Atualizar stock (comparar id::text = product_id)
    UPDATE products
    SET stock = GREATEST(0, stock - quantity_to_reduce)
    WHERE id::text = product_id
      AND business_id = NEW.business_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. RECRIAR TRIGGER
CREATE TRIGGER update_stock_on_sale
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_on_sale();

-- 4. TESTAR INSERÇÃO (testando com dados reais)
INSERT INTO sales (
  business_id,
  items,
  total,
  payment_details
) VALUES (
  (SELECT id FROM businesses LIMIT 1),
  jsonb_build_array(
    jsonb_build_object(
      'productId', (SELECT id::text FROM products LIMIT 1),
      'quantity', 1,
      'subtotal', 100
    )
  ),
  100,
  jsonb_build_object(
    'cash', 100,
    'mpesa', 0,
    'emola', 0,
    'card', 0,
    'total', 100,
    'change', 0
  )
);

-- 5. VERIFICAR
SELECT 'Trigger totalmente recriado com sucesso!' as status;
SELECT * FROM sales ORDER BY created_at DESC LIMIT 1;
