-- ============================================================================
-- VALIDAÇÃO DE STOCK NO BACKEND (CRÍTICO)
-- ============================================================================
-- Previne vendas de produtos sem stock disponível

-- Função para validar stock antes de inserir venda
CREATE OR REPLACE FUNCTION validate_sale_stock()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  product_record RECORD;
  required_qty INTEGER;
BEGIN
  -- Validar cada item da venda
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    -- Buscar produto e seu stock atual
    SELECT id, name, stock INTO product_record
    FROM products
    WHERE id = (item->>'productId')::UUID
    AND business_id = NEW.business_id;
    
    -- Verificar se produto existe
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto % não encontrado', item->>'productId';
    END IF;
    
    -- Extrair quantidade necessária
    required_qty := (item->>'quantity')::INTEGER;
    
    -- Validar stock disponível
    IF product_record.stock < required_qty THEN
      RAISE EXCEPTION 'Stock insuficiente para "%". Disponível: %, Necessário: %', 
        product_record.name, product_record.stock, required_qty;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validar antes de inserir
DROP TRIGGER IF EXISTS check_stock_before_sale ON sales;
CREATE TRIGGER check_stock_before_sale
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION validate_sale_stock();

-- Função para atualizar stock após venda
CREATE OR REPLACE FUNCTION update_stock_after_sale()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
BEGIN
  -- Atualizar stock de cada produto vendido
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    UPDATE products
    SET stock = stock - (item->>'quantity')::INTEGER,
        updated_at = NOW()
    WHERE id = (item->>'productId')::UUID
    AND business_id = NEW.business_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar stock após inserir venda
DROP TRIGGER IF EXISTS update_stock_after_sale ON sales;
CREATE TRIGGER update_stock_after_sale
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_after_sale();

COMMENT ON FUNCTION validate_sale_stock() IS 'Valida se há stock suficiente antes de registrar venda';
COMMENT ON FUNCTION update_stock_after_sale() IS 'Atualiza automaticamente o stock dos produtos após venda';
