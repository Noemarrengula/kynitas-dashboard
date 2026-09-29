-- ============================================================================
-- FIX LINTER SUPABASE (SECURITY) — PARTE 2 — roda no SQL Editor
--  Causa: o Supabase inicializa com grants BLANKET directos:
--    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
--  por isso o "REVOKE ... FROM PUBLIC" da parte 1 não removeu o privilégio
--  directo de anon/authenticated. Aqui revogamos por ROLE.
--
--  0028 anon_security_definer_function_executable  -> REVOKE FROM anon (37 funcs)
--        Ficam anon (signup, necessário): create_initial_business (x2) e signup_user_direct
--  0029 authenticated_security_definer_function_executable -> REVOKE FROM authenticated
--        só nas funções que NÃO são usadas pela app nem por policies (legadas/triggers)
--        (as app-use / policies continuam authenticated POR DESIGN)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) ANON JÁ NÃO EXECUTA FUNÇÕES SECURITY DEFINER (0028)
--    Excepto o trio do signup (create_initial_business x2 + signup_user_direct),
--    necessário no fluxo "Verifique seu email" (sessão ainda não confirmada).
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.add_bonus_points(uuid, integer, text)                       FROM anon;
REVOKE EXECUTE ON FUNCTION public.app_has_business_access(uuid)                              FROM anon;
REVOKE EXECUTE ON FUNCTION public.app_has_role(uuid, text[])                                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.app_log_audit(uuid, text, text, uuid, jsonb)               FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_business_user(text, text, text, uuid, text)         FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_credit_sale(uuid, uuid, jsonb, numeric, text)       FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_default_invoice_series()                            FROM anon;
REVOKE EXECUTE ON FUNCTION public.deactivate_business_user(uuid, uuid)                       FROM anon;
REVOKE EXECUTE ON FUNCTION public.export_business_data(uuid, text, timestamp without time zone, timestamp without time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_api_key(uuid, text, jsonb, integer)               FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_business_comparison(timestamp without time zone, timestamp without time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_business_stats(uuid, integer)                          FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_global_overview(timestamp without time zone, timestamp without time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_global_revenue_series(timestamp without time zone, timestamp without time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_global_top_products(timestamp without time zone, timestamp without time zone, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_business_id()                                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_businesses()                                      FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid)                                        FROM anon;
REVOKE EXECUTE ON FUNCTION public.import_external_data(uuid, text, jsonb)                    FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_series_number()                                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin()                                           FROM anon;
REVOKE EXECUTE ON FUNCTION public.issue_credit_note(uuid, uuid, text)                        FROM anon;
REVOKE EXECUTE ON FUNCTION public.issue_invoice(uuid, uuid, text, text, text, text)          FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_business_users(uuid)                                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_audit()                                                FROM anon;
REVOKE EXECUTE ON FUNCTION public.migrate_existing_data_to_business(uuid)                    FROM anon;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(uuid, text)                            FROM anon;
REVOKE EXECUTE ON FUNCTION public.receive_purchase_order(uuid, jsonb, text)                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_points(uuid, integer, text)                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.register_credit_payment(uuid, uuid, numeric, text, text)   FROM anon;
REVOKE EXECUTE ON FUNCTION public.register_credit_payment(uuid, uuid, numeric, text, text, text, timestamp with time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_stock_from_sale()                                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_webhook(uuid, text, jsonb)                         FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_business_user_role(uuid, uuid, text)                FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_customer_stats()                                    FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_business_access(uuid)                             FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_api_key(text)                                     FROM anon;

-- ---------------------------------------------------------------------------
-- 2) AUTHENTICATED NÃO EXECUTA AS FUNÇÕES LEGADAS / DE TRIGGER (0029)
--    Estas correm internamente como o OWNER (SECURITY DEFINER):
--    triggers (sales/businesses/invoices) e chamadas dentro de outras RPCs.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.create_default_invoice_series()                            FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.export_business_data(uuid, text, timestamp without time zone, timestamp without time zone) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_api_key(uuid, text, jsonb, integer)               FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_business_stats(uuid, integer)                          FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_business_id()                                     FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid)                                        FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.import_external_data(uuid, text, jsonb)                    FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_series_number()                                  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_audit()                                                FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.migrate_existing_data_to_business(uuid)                    FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(uuid, text)                            FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_stock_from_sale()                                     FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_webhook(uuid, text, jsonb)                         FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_customer_stats()                                    FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_business_access(uuid)                             FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_api_key(text)                                     FROM authenticated;

-- ---------------------------------------------------------------------------
-- 4) CORRECÇÃO DE OMISSÃO DO FIX-1: deactivate_business_user
--    Ficou de fora do REVOKE ... FROM PUBLIC do fix-seguranca-linter.sql;
--    como o PUBLIC tinha EXECUTE por omissão, o anon ainda a executava.
--    A app chama-a via supabase-admin.ts como authenticated.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.deactivate_business_user(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deactivate_business_user(uuid, uuid) TO authenticated, service_role;

-- ===========================================================================
-- 3) VERIFICAÇÃO (opcional) — grants actuais de anon/authenticated nas funções
-- ---------------------------------------------------------------------------
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args,
       bool_or(g.grantee = 'anon'::regrole AND g.privilege_type = 'EXECUTE')            AS anon_can_execute,
       bool_or(g.grantee = 'authenticated'::regrole AND g.privilege_type = 'EXECUTE')   AS auth_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN LATERAL aclexplode(p.proacl) AS g ON TRUE
WHERE n.nspname = 'public' AND p.prosecdef
  AND p.proname IN (
    'add_bonus_points','app_has_business_access','app_has_role','app_log_audit',
    'create_business_user','create_credit_sale','create_default_invoice_series',
    'create_initial_business','deactivate_business_user','export_business_data',
    'generate_api_key','get_business_comparison','get_business_stats',
    'get_global_overview','get_global_revenue_series','get_global_top_products',
    'get_user_business_id','get_user_businesses','get_user_role','import_external_data',
    'increment_series_number','is_super_admin','issue_credit_note','issue_invoice',
    'list_business_users','log_audit','migrate_existing_data_to_business',
    'next_invoice_number','receive_purchase_order','redeem_loyalty_points',
    'register_credit_payment','signup_user_direct','sync_stock_from_sale',
    'trigger_webhook','update_business_user_role','update_customer_stats',
    'user_has_business_access','validate_api_key'
  )
GROUP BY p.proname, pg_get_function_identity_arguments(p.oid)
ORDER BY p.proname;