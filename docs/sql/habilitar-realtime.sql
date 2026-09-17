-- =============================================================================
-- HABILITAR REALTIME (KDS + sync transversal entre dispositivos)
-- =============================================================================
-- Adiciona as tabelas à publicação realtime do Supabase.
-- Sem isto, os canais 'postgres_changes' do frontend nunca disparam.
-- Executar uma vez no Supabase SQL Editor. Idempotente.

BEGIN;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ingredients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;

-- REPLICA IDENTITY FULL: garante payload completo nos eventos INSERT/UPDATE/DELETE
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.sales REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.ingredients REPLICA IDENTITY FULL;
ALTER TABLE public.tables REPLICA IDENTITY FULL;

COMMIT;

-- Verificação
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;