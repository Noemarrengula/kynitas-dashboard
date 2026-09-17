-- =============================================
-- MIGRAÇÃO: SISTEMA DE PRIVILÉGIOS (admin/supervisor/caixa)
-- Roles por negócio, com permissões por feature
--
-- NOTA TÉCNICA: a coluna role mantém-se como TEXT com CHECK constraint.
-- Não se usa ENUM porque existem policies RLS que referenciam a coluna
-- "role" em subqueries e o ALTER TYPE seria bloqueado (erro 0A000).
--
-- COMO USAR:
--   1. Faça backup do banco antes
--   2. Cole e execute no SQL Editor do Supabase
--   3. Teste: SELECT get_user_role('uuid-do-negocio');
--
-- Este script é IDEMPOTENTE (pode ser executado mais de uma vez)
-- =============================================

-- ============================================================
-- PARTE 1: NORMALIZAR COLUNA ROLE (valores antigos → novos)
-- ============================================================

-- 1.1 Remover CHECK constraint antiga (se existir)  [idempotente]
DO $$
DECLARE
  cons text;
BEGIN
  SELECT conname INTO cons
  FROM pg_constraint
  WHERE conrelid = 'public.business_users'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%role%';

  IF cons IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.business_users DROP CONSTRAINT %I', cons);
    RAISE NOTICE 'Constraint "%" removida', cons;
  END IF;
END $$;

-- 1.2 Mapear valores antigos para os novos
UPDATE public.business_users SET role = 'admin'     WHERE role IN ('super_admin', 'owner');
UPDATE public.business_users SET role = 'supervisor' WHERE role = 'manager';
UPDATE public.business_users SET role = 'caixa'     WHERE role IN ('staff', 'waiter', 'cashier', 'cook', 'cleaner');
-- Qualquer valor residual cai para 'caixa'
UPDATE public.business_users SET role = 'caixa' WHERE role NOT IN ('admin', 'supervisor', 'caixa');

-- 1.3 Garantir default e nova CHECK constraint [idempotente]
ALTER TABLE public.business_users
  ALTER COLUMN role SET DEFAULT 'caixa';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'business_users_role_check'
      AND conrelid = 'public.business_users'::regclass
  ) THEN
    ALTER TABLE public.business_users
      ADD CONSTRAINT business_users_role_check
      CHECK (role IN ('admin', 'supervisor', 'caixa'));
    RAISE NOTICE 'CHECK business_users_role_check criada';
  END IF;
END $$;

-- ============================================================
-- PARTE 2: FUNÇÃO get_user_role()
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_role(p_business_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT bu.role::text
  FROM public.business_users bu
  WHERE bu.business_id = p_business_id
    AND bu.user_id = auth.uid()
    AND bu.active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;

-- ============================================================
-- PARTE 3: RPC — Gerir utilizadores
-- ============================================================

-- 3.0 LIMPEZA: remover versões antigas (overload) para não quebrar o PostgREST
DROP FUNCTION IF EXISTS public.create_business_user(text,text,text,uuid,text);
DROP FUNCTION IF EXISTS public.create_business_user(text,text,text,uuid,public.user_role);
DROP FUNCTION IF EXISTS public.update_business_user_role(uuid,uuid,text);
DROP FUNCTION IF EXISTS public.update_business_user_role(uuid,uuid,public.user_role);
DROP FUNCTION IF EXISTS public.list_business_users(uuid);
DROP FUNCTION IF EXISTS public.deactivate_business_user(uuid,uuid);
DROP FUNCTION IF EXISTS public.create_initial_business(uuid,text,text);

-- 3.1 CREATE (cria auth.users + vincula ao negócio)
CREATE OR REPLACE FUNCTION public.create_business_user(
  p_email     text,
  p_password  text,
  p_name      text,
  p_business_id uuid,
  p_role      text DEFAULT 'caixa'
)
RETURNS TABLE(user_id uuid, created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id  uuid;
  v_is_admin boolean;
  v_exists   boolean;
BEGIN
  -- Verificar que o chamador é admin deste negócio
  SELECT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = p_business_id
      AND user_id     = auth.uid()
      AND role        = 'admin'
      AND active      = true
  ) INTO v_is_admin;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Sem permissão: apenas administradores podem gerir utilizadores';
  END IF;

  -- Validar papel
  IF p_role NOT IN ('admin', 'supervisor', 'caixa') THEN
    RAISE EXCEPTION 'Papel inválido: %', p_role;
  END IF;

  -- Verificar se o email já existe em auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email)
  ) INTO v_exists;

  IF v_exists THEN
    -- Utilizador já existe: apenas vincular ao negócio
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;

    INSERT INTO public.business_users (business_id, user_id, role, active)
    VALUES (p_business_id, v_user_id, p_role, true)
    ON CONFLICT (business_id, user_id)
    DO UPDATE SET role = EXCLUDED.role, active = true;

    RETURN QUERY SELECT v_user_id, false;
  ELSE
    -- Criar novo utilizador no auth
    INSERT INTO auth.users (
      instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, aud, role, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      lower(p_email),
      crypt(p_password, gen_salt('bf')),
      now(),
      jsonb_build_object('name', p_name),
      'authenticated',
      'authenticated',
      now(), now()
    )
    RETURNING id INTO v_user_id;

    -- Identity necessária para o Supabase auth
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data,
      provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_user_id, v_user_id, v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email)),
      'email', now(), now(), now()
    );

    -- Vincular ao negócio
    INSERT INTO public.business_users (business_id, user_id, role, active)
    VALUES (p_business_id, v_user_id, p_role, true);

    RETURN QUERY SELECT v_user_id, true;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_business_user(text,text,text,uuid,text) TO authenticated;

-- 3.2 UPDATE ROLE
CREATE OR REPLACE FUNCTION public.update_business_user_role(
  p_user_id     uuid,
  p_business_id uuid,
  p_role        text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_admin    boolean;
  v_is_self     boolean;
  v_admin_count int;
BEGIN
  -- Verificar que o chamador é admin
  SELECT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = p_business_id
      AND user_id     = auth.uid()
      AND role        = 'admin'
      AND active      = true
  ) INTO v_is_admin;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Sem permissão: apenas administradores podem alterar papéis';
  END IF;

  -- Validar papel
  IF p_role NOT IN ('admin', 'supervisor', 'caixa') THEN
    RAISE EXCEPTION 'Papel inválido: %', p_role;
  END IF;

  -- Não permitir alterar o próprio papel (segurança)
  v_is_self := (p_user_id = auth.uid());
  IF v_is_self THEN
    RAISE EXCEPTION 'Não é possível alterar o próprio papel';
  END IF;

  -- Contar quantos admin ativos existem neste negócio
  SELECT count(*) INTO v_admin_count
  FROM public.business_users
  WHERE business_id = p_business_id
    AND role = 'admin'
    AND active = true;

  -- Se o utilizador-alvo é o único admin e vai ser rebaixado, impedir
  IF EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = p_business_id
      AND user_id = p_user_id
      AND role = 'admin'
      AND active = true
  ) AND v_admin_count <= 1 AND p_role <> 'admin' THEN
    RAISE EXCEPTION 'Não é possível rebaixar o único administrador do negócio';
  END IF;

  UPDATE public.business_users
  SET role = p_role
  WHERE business_id = p_business_id
    AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_business_user_role(uuid,uuid,text) TO authenticated;

-- 3.3 DEACTIVATE (remover acesso)
CREATE OR REPLACE FUNCTION public.deactivate_business_user(
  p_user_id     uuid,
  p_business_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_admin    boolean;
  v_is_self     boolean;
  v_admin_count int;
  v_target_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = p_business_id
      AND user_id     = auth.uid()
      AND role        = 'admin'
      AND active      = true
  ) INTO v_is_admin;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Sem permissão: apenas administradores podem remover acessos';
  END IF;

  v_is_self := (p_user_id = auth.uid());
  IF v_is_self THEN
    RAISE EXCEPTION 'Não é possível remover o próprio acesso';
  END IF;

  -- Verificar se o alvo é admin
  SELECT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = p_business_id
      AND user_id = p_user_id
      AND role = 'admin'
      AND active = true
  ) INTO v_target_admin;

  IF v_target_admin THEN
    SELECT count(*) INTO v_admin_count
    FROM public.business_users
    WHERE business_id = p_business_id
      AND role = 'admin'
      AND active = true;

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Não é possível remover o único administrador do negócio';
    END IF;
  END IF;

  UPDATE public.business_users
  SET active = false
  WHERE business_id = p_business_id
    AND user_id = p_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deactivate_business_user(uuid,uuid) TO authenticated;

-- 3.4 LIST (retorna utilizadores do negócio)
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
  -- Se business_id informado, verificar que é admin nesse negócio
  IF p_business_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.business_users
      WHERE business_id = p_business_id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND active = true
    ) INTO v_is_admin;

    IF NOT COALESCE(v_is_admin, false) THEN
      RAISE EXCEPTION 'Sem permissão: apenas administradores podem listar utilizadores';
    END IF;
  ELSE
    -- Sem business_id: listar apenas nos negócios onde o user é admin
    SELECT EXISTS (
      SELECT 1 FROM public.business_users
      WHERE user_id = auth.uid()
        AND role = 'admin'
        AND active = true
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
      -- Listar em todos os negócios onde o chamador é admin
      bu.business_id IN (
        SELECT business_id FROM public.business_users
        WHERE user_id = auth.uid()
          AND role = 'admin'
          AND active = true
      )
    ELSE
      -- Listar apenas no negócio informado (já validado admin acima)
      bu.business_id = p_business_id
    END
  ORDER BY bu.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_business_users(uuid) TO authenticated;

-- 3.5 CREATE INITIAL BUSINESS (manter retorno UUID para o registo)
CREATE OR REPLACE FUNCTION public.create_initial_business(
  user_uuid      uuid,
  business_name  text,
  business_slug  text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_business_id uuid;
BEGIN
  INSERT INTO public.businesses (name, slug, active, created_at)
  VALUES (business_name, business_slug, true, now())
  RETURNING id INTO new_business_id;

  INSERT INTO public.business_users (business_id, user_id, role, active)
  VALUES (new_business_id, user_uuid, 'admin', true);

  RETURN new_business_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_initial_business(uuid,text,text) TO authenticated;

-- ============================================================
-- PARTE 4: NOTA SOBRE POLICIES RLS
-- ============================================================
-- NÃO é necessário alterar políticas nesta migração:
--   * A coluna role mantém-se TEXT → não existe bloqueio de ALTER TYPE.
--   * As policies que usavam 'owner'/'manager'/'super_admin'/'staff' passam a
--     não corresponder a nenhuma linha real (comparações por texto).
--   * A app aplica contrôle de acesso via RPCs (SECURITY DEFINER) e
--     usePermissions no frontend.
-- Se quiser enforcement RLS por papel no futuro, gere um script à parte.

-- ============================================================
-- PARTE 5: VERIFICAÇÃO
-- ============================================================

-- Verificar migração (descomente para testar)
-- SELECT bu.user_id, au.email, bu.role, b.name as business
-- FROM business_users bu
-- JOIN auth.users au ON au.id = bu.user_id
-- JOIN businesses b ON b.id = bu.business_id
-- ORDER BY bu.created_at;