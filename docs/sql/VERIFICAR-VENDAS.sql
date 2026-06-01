-- ============================================================================
-- VERIFICAR DADOS DE VENDAS - Diagnóstico completo
-- ============================================================================

-- 1. VERIFICAR SE EXISTEM VENDAS NA TABELA
SELECT 
  'Total de vendas na base' as info,
  COUNT(*) as quantidade
FROM sales;

-- 2. VERIFICAR VENDAS POR MÊS
SELECT 
  DATE_TRUNC('month', created_at) as mes,
  COUNT(*) as vendas,
  SUM(total) as total_vendas
FROM sales 
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes DESC;

-- 3. VERIFICAR ÚLTIMAS 10 VENDAS
SELECT 
  id,
  sale_number,
  total,
  created_at,
  business_id
FROM sales 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. VERIFICAR SE HÁ VENDAS ANTIGAS (mais de 30 dias)
SELECT 
  'Vendas antigas (>30 dias)' as info,
  COUNT(*) as quantidade
FROM sales 
WHERE created_at < NOW() - INTERVAL '30 days';

-- 5. VERIFICAR ESTRUTURA DA TABELA SALES
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'sales' 
ORDER BY ordinal_position;

-- 6. VERIFICAR RLS POLICIES NA TABELA SALES
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'sales';

-- 7. VERIFICAR SE HÁ BUSINESS_ID VÁLIDO
SELECT DISTINCT 
  business_id,
  COUNT(*) as vendas
FROM sales 
GROUP BY business_id;

-- 8. TESTAR QUERY SIMILAR À DO FRONTEND (últimos 30 dias)
SELECT 
  id,
  sale_number,
  items,
  total,
  payment_details,
  created_at
FROM sales 
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC 
LIMIT 500;