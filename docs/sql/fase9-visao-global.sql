-- ============================================================================
-- FASE 09 — VISÃO GLOBAL 2.0 (MULTI-NEGÓCIO, SUPER ADMIN)
-- ----------------------------------------------------------------------------
-- RPCs de agregação consolidada de TODOS os estabelecimentos, usadas pela
-- Administração Central (/administracao). Todas SECURITY DEFINER e guardadas
-- por is_super_admin() — membros normais (admin/supervisor/caixa) NUNCA
-- conseguem obter dados de outros negócios por aqui.
--
-- Como usar: executar no SQL Editor do Supabase (idempotente).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. OVERVIEW GLOBAL — totais do período + período anterior para tendência
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_global_overview(
  p_from timestamp,
  p_to   timestamp
)
RETURNS TABLE (
  total_revenue   numeric,
  total_sales     bigint,
  avg_ticket      numeric,
  prev_revenue    numeric,
  prev_sales      bigint,
  business_count  bigint,
  total_customers bigint,
  open_credit     numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_len      interval;
  v_prev_to  timestamp;
  v_prev_fr  timestamp;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Apenas Super Admin pode consultar a visão global';
  END IF;

  v_len     := p_to - p_from;
  v_prev_to := p_from - interval '1 microsecond';
  v_prev_fr := (p_from - v_len) + interval '1 microsecond';

  RETURN QUERY
  SELECT
    COALESCE((SELECT round(sum(total), 2) FROM public.sales WHERE created_at >= p_from AND created_at <= p_to), 0),
    COALESCE((SELECT count(*) FROM public.sales WHERE created_at >= p_from AND created_at <= p_to), 0),
    COALESCE((SELECT round(AVG(total), 2) FROM public.sales WHERE created_at >= p_from AND created_at <= p_to), 0),
    COALESCE((SELECT round(sum(total), 2) FROM public.sales WHERE created_at >= v_prev_fr AND created_at <= v_prev_to), 0),
    COALESCE((SELECT count(*) FROM public.sales WHERE created_at >= v_prev_fr AND created_at <= v_prev_to), 0),
    COALESCE((SELECT count(*) FROM public.businesses WHERE active = true), 0),
    COALESCE((SELECT count(*) FROM public.customers), 0),
    COALESCE((SELECT round(sum(remaining_balance), 2) FROM public.credits WHERE remaining_balance > 0), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_overview(timestamp, timestamp) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. COMPARAÇÃO ENTRE ESTABELECIMENTOS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_business_comparison(
  p_from timestamp,
  p_to   timestamp
)
RETURNS TABLE (
  business_id  uuid,
  name         text,
  revenue      numeric,
  sales_count  bigint,
  avg_ticket   numeric,
  share_pct    numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Apenas Super Admin pode consultar a visão global';
  END IF;

  SELECT COALESCE(sum(total), 0) INTO v_total
  FROM public.sales WHERE created_at >= p_from AND created_at <= p_to;

  RETURN QUERY
  SELECT
    b.id,
    b.name,
    COALESCE(round(sum(s.total), 2), 0),
    count(s.id),
    COALESCE(round(AVG(s.total), 2), 0),
    CASE WHEN v_total > 0 THEN round(sum(s.total) * 100.0 / v_total, 1) ELSE 0 END
  FROM public.businesses b
  LEFT JOIN public.sales s ON s.business_id = b.id
                          AND s.created_at >= p_from AND s.created_at <= p_to
  WHERE b.active = true
  GROUP BY b.id, b.name
  ORDER BY sum(s.total) DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_business_comparison(timestamp, timestamp) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. SÉRIE TEMPORAL CONSOLIDADA (por dia)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_global_revenue_series(
  p_from timestamp,
  p_to   timestamp
)
RETURNS TABLE (
  day     date,
  revenue numeric,
  sales   bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Apenas Super Admin pode consultar a visão global';
  END IF;

  RETURN QUERY
  SELECT
    s.created_at::date AS day,
    round(sum(s.total), 2) AS revenue,
    count(*) AS sales
  FROM public.sales s
  WHERE s.created_at >= p_from AND s.created_at <= p_to
  GROUP BY s.created_at::date
  ORDER BY day;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_revenue_series(timestamp, timestamp) TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. TOP PRODUTOS GLOBAIS (a partir do items jsonb das vendas)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_global_top_products(
  p_from  timestamp,
  p_to    timestamp,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  name     text,
  quantity numeric,
  revenue  numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Apenas Super Admin pode consultar a visão global';
  END IF;

  RETURN QUERY
  SELECT
    it->>'name' AS name,
    COALESCE(SUM((it->>'quantity')::numeric), 0) AS quantity,
    round(COALESCE(SUM((it->>'subtotal')::numeric), 0), 2) AS revenue
  FROM public.sales s,
       jsonb_array_elements(s.items) AS it
  WHERE s.created_at >= p_from AND s.created_at <= p_to
  GROUP BY it->>'name'
  ORDER BY revenue DESC
  LIMIT GREATEST(1, p_limit);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_global_top_products(timestamp, timestamp, int) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. VERIFICAÇÃO
-- ----------------------------------------------------------------------------
SELECT 'FASE 09 Visão Global 2.0 aplicada.' AS status;