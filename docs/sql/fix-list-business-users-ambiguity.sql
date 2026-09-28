-- ============================================================================
-- CORRIGE: "Column reference business_id is ambiguous" em list_business_users
-- ----------------------------------------------------------------------------
-- A função antiga referia `business_id` sem qualificar a tabela origem (nos
-- JOINs com businesses/auth.users existem várias colunas com esse nome).
-- Esta versão usa sempre `bu.business_id` (qualificado) e está alinhada com
-- os papéis da aplicação: admin | supervisor | caixa.
--
-- Como usar: abrir o SQL Editor do Supabase e executar tudo.
-- ============================================================================

-- 1. Remover overloads antigas (evita ambiguidade de assinatura no PostgREST)
DROP FUNCTION IF EXISTS public.list_business_users(uuid);
DROP FUNCTION IF EXISTS public.list_business_users(text);

-- 2. Criar a função corrigida.
--    Permissão: admin ativo do negócio (ou, sem business_id, admin ativo de
--    qualquer negócio). Todas as referências a columns estão qualificadas.
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
    -- Verificar que o chamador é admin ativo nesse negócio
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
    -- Sem business_id: o chamador deve ser admin ativo em pelo menos um negócio
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

-- 4. Verificação rápida (deve devolver a lista de utilizadores do negócio)
SELECT 'list_business_users corrigida — execute select * from list_business_users(<business_id>); para testar.' AS status;