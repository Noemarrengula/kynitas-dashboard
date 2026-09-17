-- =============================================================================
-- HABILITAR RLS NAS TABELAS QUE TÊM POLÍTICAS MAS ESTÃO COM RLS DESLIGADA
-- =============================================================================
-- Situação: o script emergencia-sem-rls.sql desligou a RLS de várias tabelas.
-- Scripts posteriores recriaram políticas sem voltar a ligar a RLS, gerando o
-- lint "Policy Exists RLS Disabled" (ex.: public.business_users).
-- Este script liga RLS em TODAS as tabelas public que têm políticas e RLS off.
-- Idempotente e seguro (só ativa; nunca desativa).

DO $$
DECLARE
  tbl REGCLASS;
BEGIN
  FOR tbl IN
    SELECT DISTINCT p.polrelid
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relrowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END;
$$;

-- Verificação final: nenhuma tabela com políticas deve ficar com RLS off
SELECT
  n.nspname AS schema,
  c.relname AS tabela,
  c.relrowsecurity AS rls_ativa,
  COUNT(p.oid) AS politicas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
GROUP BY 1, 2, 3
ORDER BY 2;