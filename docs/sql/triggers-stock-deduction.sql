-- ============================================================================
-- TRIGGER: Dedução automática de stock ao registrar venda
-- ============================================================================
-- Este trigger deve ser executado no SQL Editor do Supabase
-- AFTER INSERT ON sales: deduz stock de produtos e ingredientes

-- Trigger function: deduz stock de produtos
CREATE OR REPLACE FUNCTION deduct_product_stock()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  product_record RECORD;
  recipe_item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    -- Deduz stock do produto
    UPDATE products
    SET stock = GREATEST(0, stock - (item->>'quantity')::DECIMAL)
    WHERE id = (item->>'productId')::TEXT
       OR id = (item->>'product_id')::TEXT;

    -- Se o produto tem receita, deduz ingredientes
    SELECT * INTO product_record FROM products
    WHERE id = (item->>'productId')::TEXT
       OR id = (item->>'product_id')::TEXT;

    IF FOUND AND product_record.recipe IS NOT NULL THEN
      FOR recipe_item IN SELECT * FROM jsonb_array_elements(product_record.recipe)
      LOOP
        UPDATE ingredients
        SET stock = GREATEST(0, stock - (recipe_item->>'quantity')::DECIMAL * (item->>'quantity')::DECIMAL)
        WHERE id = (recipe_item->>'ingredientId')::TEXT
           OR id = (recipe_item->>'ingredient_id')::TEXT;
      END LOOP;
    END IF;

    -- Se o item tem productId começando com 'ing-', também deduz ingrediente direto
    IF (item->>'productId')::TEXT LIKE 'ing-%' OR (item->>'product_id')::TEXT LIKE 'ing-%' THEN
      UPDATE ingredients
      SET stock = GREATEST(0, stock - (item->>'quantity')::DECIMAL)
      WHERE id = (item->>'productId')::TEXT
         OR id = (item->>'product_id')::TEXT;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger na tabela sales
DROP TRIGGER IF EXISTS trigger_deduct_product_stock ON sales;
CREATE TRIGGER trigger_deduct_product_stock
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION deduct_product_stock();

-- ============================================================================
-- TRIGGER: Registar movimentação de stock automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION log_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      INSERT INTO stock_movements (product_id, type, quantity, reason, created_at)
      VALUES (
        COALESCE(item->>'productId', item->>'product_id'),
        'sale',
        -(item->>'quantity')::DECIMAL,
        'Venda #' || NEW.id,
        NEW.created_at
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_stock_movement ON sales;
CREATE TRIGGER trigger_log_stock_movement
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION log_stock_movement();

-- ============================================================================
-- NOTA: Executar no Supabase SQL Editor
-- ============================================================================
