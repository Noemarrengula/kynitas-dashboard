-- ============================================================================
-- FIX LINTER SUPABASE (SECURITY) — roda no SQL Editor
--  0011 function_search_path_mutable        -> SET search_path em todas as funções public
--  0014 extension_in_public (pg_trgm)       -> move para schema extensions
--  0024 rls_policy_always_true              -> remove 6 policies legadas true em credits/credit_payments
--  0026/0027 pg_graphql anon/authenticated  -> app é REST-only; drop do pg_graphql
--  0028 anon security definer               -> REVOKE EXECUTE de PUBLIC; mantém authenticated/service_role
-- NOTA 0029 (authenticated definer) fica por design na app (RPCs chamadas pelo cliente,
--   cada uma com guards internas app_has_role/app_has_business_access/is_super_admin).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) SEARCH_PATH EM TODAS AS FUNÇÕES public (0011)
--    Ignora funções de extensões (pg_proc pertence a pg_depend tipo 'e').
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND NOT EXISTS (
            SELECT 1 FROM pg_depend d
            WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e'
          )
      AND NOT EXISTS (
            SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) AS conf
            WHERE conf LIKE 'search_path=%'
          )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path TO public, extensions, pg_temp',
      fn.nspname, fn.proname, fn.args
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) pg_trgm PARA O SCHEMA extensions (0014)
--    Os índices GIN existentes resolvem o opclass por OID -> nada quebra.
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 3) REMOVER POLÍTICAS LEGADAS "USING (true)" EM credits / credit_payments (0024)
--    A fase 8.5 já criou rls_member_select_*, rls_member_manage_*, rls_super_all_*
--    para estas tabelas; estas 6 antigas sobreviveram ao drop (nomes fora do padrão)
--    e reabriam escrita/leitura total a qualquer utilizador.
-- ---------------------------------------------------------------------------
ALTER TABLE public.credits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_payments  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their business credits"                ON public.credits;
DROP POLICY IF EXISTS "Users can insert credits for their business"          ON public.credits;
DROP POLICY IF EXISTS "Users can update their business credits"              ON public.credits;
DROP POLICY IF EXISTS "Users can delete their business credits"              ON public.credits;
DROP POLICY IF EXISTS "Users can view credit payments from their business"   ON public.credit_payments;
DROP POLICY IF EXISTS "Users can insert credit payments for their business"  ON public.credit_payments;

-- ---------------------------------------------------------------------------
-- 4) DROP DO pg_graphql (0026 + 0027)
--    A aplicação usa apenas REST (supabase-js). Revogar SELECT anon/authenticated
--    quebraria o REST (grants comuns), por isso remove-se o GraphQL por completo.
-- ---------------------------------------------------------------------------
DROP EXTENSION IF EXISTS pg_graphql CASCADE;

-- ---------------------------------------------------------------------------
-- 5) A N O N  NÃO PODE EXECUTAR FUNÇÕES SECURITY DEFINER (0028)
--    REVOKE de PUBLIC + GRANT para authenticated/service_role.
--    EXCEPTO: create_initial_business (x2) e signup_user_direct — chamadas no
--    signup como anon (antes da confirmação do email) — mantêm EXECUTE público.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.add_bonus_points(uuid, integer, text)                       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.app_has_business_access(uuid)                              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.app_has_role(uuid, text[])                                 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.app_log_audit(uuid, text, text, uuid, jsonb)               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_business_user(text, text, text, uuid, text)         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_credit_sale(uuid, uuid, jsonb, numeric, text)       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_default_invoice_series()                            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.export_business_data(uuid, text, timestamp without time zone, timestamp without time zone) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_api_key(uuid, text, jsonb, integer)               FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_business_comparison(timestamp without time zone, timestamp without time zone)         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_business_stats(uuid, integer)                          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_global_overview(timestamp without time zone, timestamp without time zone)             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_global_revenue_series(timestamp without time zone, timestamp without time zone)       FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_global_top_products(timestamp without time zone, timestamp without time zone, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_business_id()                                     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_businesses()                                      FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid)                                        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.import_external_data(uuid, text, jsonb)                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_series_number()                                  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin()                                           FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.issue_credit_note(uuid, uuid, text)                        FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.issue_invoice(uuid, uuid, text, text, text, text)          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_business_users(uuid)                                  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_audit()                                                FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.migrate_existing_data_to_business(uuid)                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(uuid, text)                            FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.receive_purchase_order(uuid, jsonb, text)                  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_points(uuid, integer, text)                 FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_credit_payment(uuid, uuid, numeric, text, text)   FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.register_credit_payment(uuid, uuid, numeric, text, text, text, timestamp with time zone) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_stock_from_sale()                                     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trigger_webhook(uuid, text, jsonb)                         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_business_user_role(uuid, uuid, text)                FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_customer_stats()                                    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_business_access(uuid)                             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_api_key(text)                                     FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.add_bonus_points(uuid, integer, text)                       TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_has_business_access(uuid)                              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_has_role(uuid, text[])                                 TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_log_audit(uuid, text, text, uuid, jsonb)               TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_business_user(text, text, text, uuid, text)         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_credit_sale(uuid, uuid, jsonb, numeric, text)       TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_default_invoice_series()                            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.export_business_data(uuid, text, timestamp without time zone, timestamp without time zone) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_api_key(uuid, text, jsonb, integer)               TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_business_comparison(timestamp without time zone, timestamp without time zone)         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_business_stats(uuid, integer)                          TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_global_overview(timestamp without time zone, timestamp without time zone)             TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_global_revenue_series(timestamp without time zone, timestamp without time zone)       TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_global_top_products(timestamp without time zone, timestamp without time zone, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_business_id()                                     TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_businesses()                                      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid)                                        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.import_external_data(uuid, text, jsonb)                    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_series_number()                                  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin()                                           TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.issue_credit_note(uuid, uuid, text)                        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.issue_invoice(uuid, uuid, text, text, text, text)          TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_business_users(uuid)                                  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_audit()                                                TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.migrate_existing_data_to_business(uuid)                    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(uuid, text)                            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order(uuid, jsonb, text)                  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points(uuid, integer, text)                 TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_credit_payment(uuid, uuid, numeric, text, text)   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_credit_payment(uuid, uuid, numeric, text, text, text, timestamp with time zone) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_stock_from_sale()                                     TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trigger_webhook(uuid, text, jsonb)                         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_business_user_role(uuid, uuid, text)                TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_customer_stats()                                    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_business_access(uuid)                             TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_api_key(text)                                     TO authenticated, service_role;