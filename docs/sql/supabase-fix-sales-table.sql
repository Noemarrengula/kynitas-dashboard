-- ============================================================================
-- FIX: Tabela Sales - Verificar e Corrigir Estrutura
-- ============================================================================

-- 1. Verificar estrutura atual da tabela sales
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sales'
ORDER BY ordinal_position;

-- 2. Criar/Recriar tabela sales com estrutura correta
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sale_number SERIAL,
  items JSONB NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  payment_details JSONB NOT NULL,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_sales_business_id ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_business_date ON sales(business_id, created_at DESC);

-- 4. Habilitar RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- 5. Recriar policies
DROP POLICY IF EXISTS "Users can view their business sales" ON sales;
CREATE POLICY "Users can view their business sales" ON sales
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their business sales" ON sales;
CREATE POLICY "Users can insert their business sales" ON sales
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their business sales" ON sales;
CREATE POLICY "Users can update their business sales" ON sales
  FOR UPDATE USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their business sales" ON sales;
CREATE POLICY "Users can delete their business sales" ON sales
  FOR DELETE USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

-- 6. Verificar se tabela tables existe (para foreign key)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tables') THEN
    -- Criar tabela tables se não existir
    CREATE TABLE tables (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      number INTEGER NOT NULL,
      capacity INTEGER DEFAULT 4,
      status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(business_id, number)
    );
    
    ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their business tables" ON tables
      FOR ALL USING (
        business_id IN (
          SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 7. Teste de inserção (comentado - descomente para testar)
/*
-- Obter um business_id válido
DO $$
DECLARE
  test_business_id UUID;
  test_product_id UUID;
BEGIN
  -- Pegar primeiro business
  SELECT id INTO test_business_id FROM businesses LIMIT 1;
  
  -- Pegar primeiro produto desse business
  SELECT id INTO test_product_id FROM products WHERE business_id = test_business_id LIMIT 1;
  
  IF test_business_id IS NOT NULL AND test_product_id IS NOT NULL THEN
    -- Tentar inserir venda de teste
    INSERT INTO sales (
      business_id,
      items,
      total,
      payment_details
    ) VALUES (
      test_business_id,
      jsonb_build_array(
        jsonb_build_object(
          'productId', test_product_id,
          'quantity', 1,
          'subtotal', 100,
          'product', jsonb_build_object('name', 'Teste', 'price', 100)
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
    
    RAISE NOTICE 'Venda de teste inserida com sucesso!';
  ELSE
    RAISE NOTICE 'Não foi possível criar venda de teste - business ou produto não encontrado';
  END IF;
END $$;
*/

-- 8. Verificar vendas existentes
SELECT 
  COUNT(*) as total_vendas,
  COUNT(DISTINCT business_id) as total_businesses,
  MIN(created_at) as primeira_venda,
  MAX(created_at) as ultima_venda
FROM sales;

SELECT 'Tabela sales verificada e corrigida!' as status;
