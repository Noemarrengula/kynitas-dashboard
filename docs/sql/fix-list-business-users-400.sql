-- ============================================================================
-- CORRIGE: 400 ao listar utilizadores (rpc/list_business_users)
-- ----------------------------------------------------------------------------
-- Sintoma: ao abrir a página Utilizadores o browser mostra
--   Failed to load resource: HTTP 400  (Supabase/resteasy)
--   .../rest/v1/rpc/list_business_users
--
-- Causa: a base de dados tem mais do que uma assinatura de list_business_users
-- (ex.: uma (uuid) e uma (text)). O PostgREST não sabe qual escolher e
-- responde 400. Além disso, versões antigas referiam `business_id` sem
-- qualificar a tabela nos JOINs.
--
-- Esta versão fica alinhada com os papéis da aplicação: admin | supervisor | caixa
-- (igual a docs/sql/fix-user-management-functions.sql).
--
-- Como usar: abrir o SQL Editor do Supabase e executar tudo.
-- ============================================================================

-- 0. (Opcional) Confirmar a ambiguidade antes de corrigir
-- SELECT proname, oidvectortypes(oid) AS signature
-- FROM pg_proc
-- WHERE proname = 'list_business_users';

-- 1. Remover overloads antigas (causa da ambiguidade -> 400)
DROP FUNCTION IF EXISTS public.list_business_users(uuid);
DROP FUNCTION IF EXISTS public.list_business_users(text);

-- 2. Função canónica — alinhada com gestao_utilizadores (papel admin activo)
CREATE OR REPLACE FUNCTION public.list_business_users(p_business_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id       uuid,
  email         text,
  name          text,
  role          text,
  active        boolean,
  business_id   uuid,
  business_name text,
  created_at    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  IF p_business_id IS NOT NULL THEN
    -- Chamador deve ser admin activo do negócio
    SELECT EXISTS (
      SELECT 1 FROM public.business_users
      WHERE business_id = p_business_id
        AND user_id     = auth.uid()
        AND role        = 'admin'
        AND active      = true
    ) INTO v_is_admin;

    IF NOT COALESCE(v_is_admin, false) THEN
      RAISE EXCEPTION 'Sem permissão: apenas administradores podem listar utilizadores';
    END IF;
  ELSE
    -- Sem business_id: chamador deve ser admin activo em pelo menos um negócio
    SELECT EXISTS (
      SELECT 1 FROM public.business_users
      WHERE user_id = auth.uid()
        AND role    = 'admin'
        AND active  = true
    ) INTO v_is_admin;

    IF NOT COALESCE(v_is_admin, false) THEN
      RAISE EXCEPTION 'Sem permissão';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    bu.user_id,
    au.email::text,
    COALESCE(au.raw_user_meta_data->>'name', '')::text AS name,
    bu.role::text,
    bu.active,
    bu.business_id,
    b.name::text AS business_name,
    bu.created_at
  FROM public.business_users bu
  JOIN auth.users au ON au.id = bu.user_id
  JOIN public.businesses b ON b.id = bu.business_id
  WHERE CASE WHEN p_business_id IS NULL THEN
      bu.business_id IN (
        SELECT business_id FROM public.business_users
        WHERE user_id = auth.uid()
          AND role    = 'admin'
          AND active  = true
      )
    ELSE
      bu.business_id = p_business_id
    END
  ORDER BY bu.created_at DESC;
END;
$$;

-- 3. Dar permissão de execução
GRANT EXECUTE ON FUNCTION public.list_business_users(uuid) TO authenticated;

-- 4. Confirmação
SELECT 'list_business_users corrigida — a página Utilizadores já deve carregar.' AS status;