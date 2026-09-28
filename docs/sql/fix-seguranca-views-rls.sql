-- ============================================================================
-- FIX SEGURANÇA: Views SECURITY DEFINER -> SECURITY INVOKER + RLS em webhook_logs
-- ---------------------------------------------------------------
-- 1) As views abaixo foram criadas/alteradas com SECURITY DEFINER (= security_invoker off).
--    Consequência: as permissões e a RLS APLICADA é a do criador da view (postgres,
--    que contorna RLS), pelo que qualquer utilizador autenticado lê dados de TODOS
--    os negócios ao consultá-las.
--    Correção: security_invoker = true -> a RLS das tabelas base passa a aplicar-se
--    ao utilizador que consulta (apenas os negócios a que pertence).
--
-- 2) public.webhook_logs tinha RLS desativada (leitura/escrita por qualquer
--    utilizador autenticado). Ativa-se RLS e restringe-se o acesso ao negócio
--    do webhook. As escritas passam a ocorrer apenas via trigger_webhook
--    (SECURITY DEFINER), para que as deliveries internas funcionem para qualquer role.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Views analíticas e de relatório -> SECURITY INVOKER
-- ---------------------------------------------------------------------------
ALTER VIEW public.unread_notifications     SET (security_invoker = true);
ALTER VIEW public.low_stock_ingredients    SET (security_invoker = true);
ALTER VIEW public.daily_sales_stats        SET (security_invoker = true);
ALTER VIEW public.ingredient_turnover      SET (security_invoker = true);
ALTER VIEW public.upcoming_payments        SET (security_invoker = true);
ALTER VIEW public.expenses_by_category     SET (security_invoker = true);
ALTER VIEW public.customers_with_debt      SET (security_invoker = true);
ALTER VIEW public.customer_credit_summary  SET (security_invoker = true);
ALTER VIEW public.tables_report            SET (security_invoker = true);
ALTER VIEW public.tables_statistics        SET (security_invoker = true);
ALTER VIEW public.daily_tables_report      SET (security_invoker = true);
ALTER VIEW public.supplier_stats           SET (security_invoker = true);
ALTER VIEW public.pending_purchase_orders  SET (security_invoker = true);
ALTER VIEW public.sales_by_hour            SET (security_invoker = true);
ALTER VIEW public.sales_by_weekday         SET (security_invoker = true);
ALTER VIEW public.top_selling_products     SET (security_invoker = true);
ALTER VIEW public.daily_performance        SET (security_invoker = true);
ALTER VIEW public.customer_debt_summary    SET (security_invoker = true);
ALTER VIEW public.top_customers            SET (security_invoker = true);
ALTER VIEW public.birthday_customers       SET (security_invoker = true);

-- ---------------------------------------------------------------------------
-- 2) webhook_logs: ativar RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- 2.1) Escrita apenas via trigger_webhook (função interna SECURITY DEFINER abaixo)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.webhook_logs;
DROP POLICY IF EXISTS "webhook_logs_insert" ON public.webhook_logs;

-- 2.2) Leitura (e futuro UPDATE/DELETE) restrita aos gestores do negócio do webhook.
--      A subquery em webhooks herda a RLS de webhooks (policy owner/manager), pelo que
--      na prática só super_admin lê via API — é intencional: o payload pode conter dados
--      sensíveis; o worker externo acede com service role (contorna RLS).
DROP POLICY IF EXISTS "webhook_logs_select_for_managers" ON public.webhook_logs;
CREATE POLICY "webhook_logs_select_for_managers"
  ON public.webhook_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.webhooks w
      WHERE w.id = webhook_id
        AND w.business_id IN (
          SELECT business_id FROM public.business_users
          WHERE user_id = auth.uid()
        )
    )
  );

-- 2.3) trigger_webhook passa a SECURITY DEFINER para os inserts/logs internos
--      continuarem a funcionar independentemente do role que origina (caixa/supervisor).
CREATE OR REPLACE FUNCTION public.trigger_webhook(
  webhook_uuid UUID,
  event_name TEXT,
  event_payload JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  webhook_record RECORD;
BEGIN
  SELECT * INTO webhook_record FROM public.webhooks WHERE id = webhook_uuid AND active = true;

  IF FOUND AND event_name = ANY(webhook_record.events) THEN
    INSERT INTO public.webhook_logs (webhook_id, event, payload)
    VALUES (webhook_uuid, event_name, event_payload);

    UPDATE public.webhooks SET last_triggered_at = CURRENT_TIMESTAMP WHERE id = webhook_uuid;
  END IF;
END;
$$;