-- =============================================================================
-- AUDITORIA UNIFICADA: estado real dos triggers/funções de stock
-- =============================================================================
-- Devolve UMA tabela (secao | resultado). Copiar o resultado completo e colar.

-- 1) Funções de stock que existem
SELECT '1_funcoes_stock' AS secao,
       COALESCE(jsonb_agg(x ORDER BY x->>'funcao'), '[]'::jsonb) AS resultado
FROM (
  SELECT jsonb_build_object(
    'funcao',   p.proname,
    'security', CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'plain' END,
    'def',      pg_get_functiondef(p.oid)
  ) AS x
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('deduct_product_stock','update_product_stock_on_sale',
                      'update_stock_after_sale','validate_sale_stock','log_stock_movement')
) t

UNION ALL

-- 2) Triggers ATIVOS na tabela sales
SELECT '2_triggers_sales',
       COALESCE(jsonb_agg(x ORDER BY x->>'trigger'), '[]'::jsonb)
FROM (
  SELECT jsonb_build_object(
    'trigger', t.tgname,
    'enabled', t.tgenabled,
    'def',     pg_get_triggerdef(t.oid)
  ) AS x
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'sales' AND n.nspname = 'public' AND NOT t.tgisinternal
) t

UNION ALL

-- 3) Triggers em products, ingredients, stock_movements
SELECT '3_triggers_outras_tabelas',
       COALESCE(jsonb_agg(x ORDER BY x->>'tabela', x->>'trigger'), '[]'::jsonb)
FROM (
  SELECT jsonb_build_object('tabela', c.relname, 'trigger', t.tgname) AS x
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('products','ingredients','stock_movements')
    AND NOT t.tgisinternal
) t

UNION ALL

-- 4) Schema de stock_movements
SELECT '4_schema_stock_movements',
       COALESCE(jsonb_agg(x ORDER BY x->>'coluna'), '[]'::jsonb)
FROM (
  SELECT jsonb_build_object(
    'coluna', column_name, 'tipo', data_type,
    'null',   is_nullable, 'default', COALESCE(column_default,'')
  ) AS x
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'stock_movements'
) t

UNION ALL

-- 5) Colunas relevantes de products e ingredients
SELECT '5_schema_products_ingredients',
       COALESCE(jsonb_agg(x ORDER BY x->>'tabela', x->>'coluna'), '[]'::jsonb)
FROM (
  SELECT jsonb_build_object('tabela', table_name, 'coluna', column_name,
                            'tipo', data_type, 'null', is_nullable) AS x
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('products','ingredients')
    AND column_name IN ('id','business_id','stock','recipe','ingredients',
                        'name','fracionavel','doses_por_garrafa')
) t

UNION ALL

-- 6) Amostra das últimas 3 vendas (items brutos)
SELECT '6_amostra_vendas',
       COALESCE(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]'::jsonb)
FROM (
  SELECT jsonb_build_object('venda_id', id, 'created_at', created_at, 'items', items) AS x
  FROM sales
  ORDER BY created_at DESC
  LIMIT 3
) t

UNION ALL

-- 7) Contagens de estado
SELECT '7_contagens',
       COALESCE(jsonb_agg(x), '[]'::jsonb)
FROM (
  SELECT jsonb_build_object(
    'produtos_com_receita',
      (SELECT COUNT(*) FROM products WHERE recipe IS NOT NULL),
    'produtos_stock_negativo',
      (SELECT COUNT(*) FROM products WHERE stock < 0),
    'total_vendas',
      (SELECT COUNT(*) FROM sales)
  ) AS x
) t

UNION ALL

-- 8) stock_movements
SELECT '8_stock_movements',
       COALESCE(jsonb_agg(x), '[]'::jsonb)
FROM (
  SELECT jsonb_build_object(
    'total', (SELECT COUNT(*) FROM stock_movements),
    'ultima', (SELECT MAX(created_at) FROM stock_movements)
  ) AS x
) t

ORDER BY secao;