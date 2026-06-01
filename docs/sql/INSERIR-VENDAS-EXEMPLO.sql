-- ============================================================================
-- INSERIR VENDAS DE EXEMPLO - Para testar o histórico
-- ============================================================================

-- 1. VERIFICAR SE EXISTEM BUSINESSES E PRODUCTS
SELECT 'Verificando negócios...' as info;
SELECT id, name FROM businesses LIMIT 3;

SELECT 'Verificando produtos...' as info;
SELECT id, name, price FROM products LIMIT 5;

-- 2. INSERIR VENDAS DE EXEMPLO (diferentes meses)
DO $$
DECLARE
  business_uuid UUID;
  product_uuid UUID;
  product_price DECIMAL;
BEGIN
  -- Pegar primeiro business
  SELECT id INTO business_uuid FROM businesses LIMIT 1;
  
  -- Pegar primeiro produto
  SELECT id, price INTO product_uuid, product_price FROM products LIMIT 1;
  
  IF business_uuid IS NOT NULL AND product_uuid IS NOT NULL THEN
    
    -- Venda de Janeiro 2024
    INSERT INTO sales (
      business_id,
      items,
      total,
      payment_details,
      created_at
    ) VALUES (
      business_uuid,
      jsonb_build_array(
        jsonb_build_object(
          'productId', product_uuid::text,
          'quantity', 2,
          'subtotal', product_price * 2
        )
      ),
      product_price * 2,
      jsonb_build_object(
        'cash', product_price * 2,
        'mpesa', 0,
        'emola', 0,
        'card', 0,
        'total', product_price * 2,
        'change', 0
      ),
      '2024-01-15 10:30:00'
    );
    
    -- Venda de Fevereiro 2024
    INSERT INTO sales (
      business_id,
      items,
      total,
      payment_details,
      created_at
    ) VALUES (
      business_uuid,
      jsonb_build_array(
        jsonb_build_object(
          'productId', product_uuid::text,
          'quantity', 1,
          'subtotal', product_price
        )
      ),
      product_price,
      jsonb_build_object(
        'cash', 0,
        'mpesa', product_price,
        'emola', 0,
        'card', 0,
        'total', product_price,
        'change', 0
      ),
      '2024-02-20 14:15:00'
    );
    
    -- Venda de Março 2024
    INSERT INTO sales (
      business_id,
      items,
      total,
      payment_details,
      created_at
    ) VALUES (
      business_uuid,
      jsonb_build_array(
        jsonb_build_object(
          'productId', product_uuid::text,
          'quantity', 3,
          'subtotal', product_price * 3
        )
      ),
      product_price * 3,
      jsonb_build_object(
        'cash', product_price,
        'mpesa', 0,
        'emola', product_price * 2,
        'card', 0,
        'total', product_price * 3,
        'change', 0
      ),
      '2024-03-10 16:45:00'
    );
    
    -- Venda de Dezembro 2024 (recente)
    INSERT INTO sales (
      business_id,
      items,
      total,
      payment_details,
      created_at
    ) VALUES (
      business_uuid,
      jsonb_build_array(
        jsonb_build_object(
          'productId', product_uuid::text,
          'quantity', 1,
          'subtotal', product_price
        )
      ),
      product_price,
      jsonb_build_object(
        'cash', 0,
        'mpesa', 0,
        'emola', 0,
        'card', product_price,
        'total', product_price,
        'change', 0
      ),
      NOW()
    );
    
    RAISE NOTICE 'Vendas de exemplo inseridas com sucesso!';
  ELSE
    RAISE NOTICE 'Erro: Não foi possível encontrar business ou produtos';
  END IF;
END $$;

-- 3. VERIFICAR VENDAS INSERIDAS
SELECT 
  'Vendas inseridas:' as info,
  COUNT(*) as total
FROM sales;

SELECT 
  id,
  total,
  DATE(created_at) as data_venda,
  TO_CHAR(created_at, 'YYYY-MM') as mes_ano
FROM sales 
ORDER BY created_at DESC;

-- 4. VERIFICAR VENDAS POR MÊS
SELECT 
  TO_CHAR(created_at, 'YYYY-MM') as mes,
  COUNT(*) as vendas,
  SUM(total) as total_vendas
FROM sales 
GROUP BY TO_CHAR(created_at, 'YYYY-MM')
ORDER BY mes DESC;