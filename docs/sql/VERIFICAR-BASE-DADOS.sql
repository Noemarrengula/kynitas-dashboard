-- ============================================================================
-- VERIFICAR ESTADO DA BASE DE DADOS
-- ============================================================================

-- 1. LISTAR TODAS AS TABELAS
SELECT 
  '=== TABELAS EXISTENTES ===' as info;

SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. ESTATÍSTICAS GERAIS
SELECT 
  '=== ESTATÍSTICAS GERAIS ===' as info;

-- Businesses
SELECT 
  'Businesses' as tabela,
  COUNT(*) as total_registros
FROM businesses;

-- Users
SELECT 
  'Users' as tabela,
  COUNT(*) as total_registros
FROM auth.users;

-- Business Users
SELECT 
  'Business Users' as tabela,
  COUNT(*) as total_registros
FROM business_users;

-- Products
SELECT 
  'Products' as tabela,
  COUNT(*) as total_registros
FROM products;

-- Sales
SELECT 
  'Sales' as tabela,
  COUNT(*) as total_registros,
  SUM(total) as valor_total,
  MIN(created_at) as primeira_venda,
  MAX(created_at) as ultima_venda
FROM sales;

-- Customers
SELECT 
  'Customers' as tabela,
  COUNT(*) as total_registros
FROM customers;

-- Suppliers
SELECT 
  'Suppliers' as tabela,
  COUNT(*) as total_registros
FROM suppliers;

-- 3. ÚLTIMAS VENDAS
SELECT 
  '=== ÚLTIMAS 5 VENDAS ===' as info;

SELECT 
  id,
  sale_number,
  total,
  created_at,
  jsonb_array_length(items) as num_items
FROM sales
ORDER BY created_at DESC
LIMIT 5;

-- 4. PRODUTOS COM STOCK BAIXO
SELECT 
  '=== PRODUTOS COM STOCK CRÍTICO ===' as info;

SELECT 
  name,
  stock,
  price,
  type
FROM products
WHERE stock <= 5
ORDER BY stock ASC
LIMIT 10;

-- 5. VENDAS POR DIA (ÚLTIMOS 7 DIAS)
SELECT 
  '=== VENDAS DOS ÚLTIMOS 7 DIAS ===' as info;

SELECT 
  DATE(created_at) as data,
  COUNT(*) as num_vendas,
  SUM(total) as valor_total
FROM sales
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY data DESC;

-- 6. PRODUTOS MAIS VENDIDOS
SELECT 
  '=== TOP 10 PRODUTOS MAIS VENDIDOS ===' as info;

SELECT 
  p.name,
  COUNT(*) as vezes_vendido,
  SUM((item->>'quantity')::INTEGER) as quantidade_total
FROM sales s,
     jsonb_array_elements(s.items) as item
JOIN products p ON p.id = (item->>'productId')
GROUP BY p.name
ORDER BY quantidade_total DESC
LIMIT 10;

-- 7. VERIFICAR POLÍTICAS RLS
SELECT 
  '=== POLÍTICAS RLS ATIVAS ===' as info;

SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 8. VERIFICAR TRIGGERS
SELECT 
  '=== TRIGGERS ATIVOS ===' as info;

SELECT 
  trigger_name,
  event_object_table,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 9. VERIFICAR ÍNDICES
SELECT 
  '=== ÍNDICES CRIADOS ===' as info;

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 10. ESPAÇO USADO POR TABELA
SELECT 
  '=== ESPAÇO USADO ===' as info;

SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 11. RESUMO FINAL
SELECT 
  '=== RESUMO FINAL ===' as info;

SELECT 
  (SELECT COUNT(*) FROM businesses) as total_businesses,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  (SELECT COUNT(*) FROM products) as total_products,
  (SELECT COUNT(*) FROM sales) as total_sales,
  (SELECT SUM(total) FROM sales) as valor_total_vendas,
  (SELECT COUNT(*) FROM customers) as total_customers,
  (SELECT COUNT(*) FROM suppliers) as total_suppliers;

SELECT '✅ Verificação completa da base de dados!' as status;
