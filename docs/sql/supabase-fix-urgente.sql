-- ============================================================================
-- FIX URGENTE: Corrigir Problemas de Vendas Pós-Deploy
-- ============================================================================

-- 1. VERIFICAR CONEXÃO E ESTRUTURA
SELECT 'Verificando tabela sales...' as status;

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'sales'
ORDER BY ordinal_position;

-- 2. VERIFICAR POLÍTICAS RLS
SELECT 'Verificando políticas RLS...' as status;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'sales';

-- 3. VERIFICAR SE RLS ESTÁ ATIVO
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'sales';

-- 4. RECRIAR POLÍTICAS SE NECESSÁRIO
DROP POLICY IF EXISTS "Users can view their business sales" ON sales;
DROP POLICY IF EXISTS "Users can insert their business sales" ON sales;
DROP POLICY IF EXISTS "Users can update their business sales" ON sales;
DROP POLICY IF EXISTS "Users can delete their business sales" ON sales;

-- Política de SELECT
CREATE POLICY "Users can view their business sales" 
ON sales FOR SELECT 
USING (
  business_id IN (
    SELECT business_id 
    FROM business_users 
    WHERE user_id = auth.uid()
  )
);

-- Política de INSERT
CREATE POLICY "Users can insert their business sales" 
ON sales FOR INSERT 
WITH CHECK (
  business_id IN (
    SELECT business_id 
    FROM business_users 
    WHERE user_id = auth.uid()
  )
);

-- Política de UPDATE
CREATE POLICY "Users can update their business sales" 
ON sales FOR UPDATE 
USING (
  business_id IN (
    SELECT business_id 
    FROM business_users 
    WHERE user_id = auth.uid()
  )
);

-- Política de DELETE
CREATE POLICY "Users can delete their business sales" 
ON sales FOR DELETE 
USING (
  business_id IN (
    SELECT business_id 
    FROM business_users 
    WHERE user_id = auth.uid()
  )
);

-- 5. VERIFICAR TABELA business_users
SELECT 'Verificando business_users...' as status;

SELECT 
  bu.user_id,
  bu.business_id,
  b.name as business_name,
  bu.role
FROM business_users bu
LEFT JOIN businesses b ON b.id = bu.business_id
LIMIT 5;

-- 6. TESTE DE INSERÇÃO (com usuário autenticado)
-- IMPORTANTE: Execute isso DEPOIS de fazer login no sistema
/*
DO $$
DECLARE
  v_business_id UUID;
  v_user_id UUID;
BEGIN
  -- Pegar usuário atual
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'ERRO: Nenhum usuário autenticado. Faça login primeiro!';
    RETURN;
  END IF;
  
  -- Pegar business do usuário
  SELECT business_id INTO v_business_id
  FROM business_users
  WHERE user_id = v_user_id
  LIMIT 1;
  
  IF v_business_id IS NULL THEN
    RAISE NOTICE 'ERRO: Usuário não tem business associado!';
    RETURN;
  END IF;
  
  -- Tentar inserir venda de teste
  INSERT INTO sales (
    business_id,
    items,
    total,
    payment_details
  ) VALUES (
    v_business_id,
    '[{"productId": "test-123", "quantity": 1, "subtotal": 100, "product": {"name": "Teste", "price": 100}}]'::jsonb,
    100,
    '{"cash": 100, "mpesa": 0, "emola": 0, "card": 0, "total": 100, "change": 0}'::jsonb
  );
  
  RAISE NOTICE 'SUCESSO: Venda de teste inserida!';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERRO ao inserir venda: %', SQLERRM;
END $$;
*/

-- 7. VERIFICAR ÚLTIMAS VENDAS
SELECT 'Últimas vendas registradas:' as status;

SELECT 
  id,
  business_id,
  sale_number,
  total,
  created_at,
  jsonb_array_length(items) as num_items
FROM sales
ORDER BY created_at DESC
LIMIT 5;

-- 8. ESTATÍSTICAS
SELECT 'Estatísticas gerais:' as status;

SELECT 
  COUNT(*) as total_vendas,
  COUNT(DISTINCT business_id) as total_businesses,
  SUM(total) as valor_total,
  MIN(created_at) as primeira_venda,
  MAX(created_at) as ultima_venda
FROM sales;

-- 9. VERIFICAR ÍNDICES
SELECT 'Verificando índices...' as status;

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'sales';

-- 10. CRIAR ÍNDICES SE NÃO EXISTIREM
CREATE INDEX IF NOT EXISTS idx_sales_business_id ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_business_date ON sales(business_id, created_at DESC);

-- 11. VERIFICAR TRIGGERS
SELECT 'Verificando triggers...' as status;

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'sales';

-- 12. VERIFICAR FUNÇÃO DE ATUALIZAÇÃO DE STOCK
SELECT 'Verificando função update_product_stock...' as status;

SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name LIKE '%stock%'
  AND routine_schema = 'public';

-- 13. RECRIAR TRIGGER DE STOCK SE NECESSÁRIO
DROP TRIGGER IF EXISTS update_stock_on_sale ON sales;

CREATE OR REPLACE FUNCTION update_product_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
BEGIN
  -- Iterar sobre os itens da venda
  FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    -- Atualizar stock do produto
    UPDATE products
    SET stock = GREATEST(0, stock - (item->>'quantity')::INTEGER)
    WHERE id = (item->>'productId')::UUID
      AND business_id = NEW.business_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_on_sale
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_on_sale();

-- 14. VERIFICAR PERMISSÕES
SELECT 'Verificando permissões...' as status;

SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'sales'
  AND grantee != 'postgres';

-- 15. RESULTADO FINAL
SELECT '✅ Verificação completa!' as status;
SELECT 'Execute os testes no sistema agora.' as proxima_acao;
