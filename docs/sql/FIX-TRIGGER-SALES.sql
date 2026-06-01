-- ============================================================================
-- FIX: ATUALIZAR TRIGGER DE SALES - CORRIGIR ERRO DE TIPO UUID
-- ============================================================================
-- Execute este script direto no Supabase SQL Editor

-- 1. REMOVER TRIGGER ANTIGO
DROP TRIGGER IF EXISTS update_stock_on_sale ON sales;

-- 2. REMOVER FUNÇÃO ANTIGA
DROP FUNCTION IF EXISTS update_product_stock_on_sale();

-- 3. CRIAR FUNÇÃO CORRIGIDA
CREATE OR REPLACE FUNCTION update_product_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  product_id UUID;
  quantity_to_reduce INTEGER;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    -- Extrair e converter values
    product_id := (item->>'productId')::UUID;
    quantity_to_reduce := (item->>'quantity')::INTEGER;
    
    -- Atualizar stock
    UPDATE products
    SET stock = GREATEST(0, stock - quantity_to_reduce)
    WHERE id = product_id
      AND business_id = NEW.business_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. RECRIAR TRIGGER
CREATE TRIGGER update_stock_on_sale
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_on_sale();

-- 5. VERIFICAR
SELECT 'Trigger recriada com sucesso!' as status;
