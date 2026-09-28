-- ============================================================================
-- ALINHA create/update/deactivate_business_user aos papéis da aplicação
-- ----------------------------------------------------------------------------
-- As versões antigas só deixavam o papel 'super_admin' gerir utilizadores,
-- o que faz a UI (papéis: admin | supervisor | caixa) falhar com
-- "Sem permissão". Este script re-cria as três RPCs para que qualquer admin
-- ativo do negócio possa gerir os utilizadores desse negócio.
--
-- Como usar: abrir o SQL Editor do Supabase e executar tudo.
-- ============================================================================

-- 1. Remover overloads antigas (evita ambiguidade de assinatura no PostgREST)
DROP FUNCTION IF EXISTS public.create_business_user(text,text,text,uuid,text);
DROP FUNCTION IF EXISTS public.create_business_user(text,text,text,uuid,public.user_role);
DROP FUNCTION IF EXISTS public.update_business_user_role(uuid,uuid,text);
DROP FUNCTION IF EXISTS public.update_business_user_role(uuid,uuid,public.user_role);
DROP FUNCTION IF EXISTS public.deactivate_business_user(uuid,uuid);

-- 2. CREATE — cria auth.users + identidade + vincula ao negócio
CREATE OR REPLACE FUNCTION public.create_business_user(
  p_email       text,
  p_password    text,
  p_name        text,
  p_business_id uuid,
  p_role        text DEFAULT 'caixa'
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
  -- Verificar que o chamador é admin ativo deste negócio
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

-- 3. UPDATE ROLE — impede alterar o próprio papel e rebaixar o único admin
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
  v_admin_count int;
BEGIN
  -- Verificar que o chamador é admin ativo deste negócio
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
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível alterar o próprio papel';
  END IF;

  -- Contar quantos admin ativos existem neste negócio
  SELECT count(*) INTO v_admin_count
  FROM public.business_users
  WHERE business_id = p_business_id
    AND role        = 'admin'
    AND active      = true;

  -- Se o utilizador-alvo é o único admin e vai ser rebaixado, impedir
  IF EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = p_business_id
      AND user_id = p_user_id
      AND role    = 'admin'
      AND active  = true
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

-- 4. DEACTIVATE — remove acesso (active = false), protege o próprio e o único admin
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
  v_is_admin     boolean;
  v_admin_count  int;
  v_target_admin boolean;
BEGIN
  -- Verificar que o chamador é admin ativo deste negócio
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

  -- Não permitir remover o próprio acesso
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível remover o próprio acesso';
  END IF;

  -- Verificar se o alvo é admin
  SELECT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = p_business_id
      AND user_id = p_user_id
      AND role    = 'admin'
      AND active  = true
  ) INTO v_target_admin;

  -- Não permitir remover o único admin do negócio
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

-- 5. Confirmação
SELECT 'create/update/deactivate_business_user alinhadas aos papéis admin|supervisor|caixa.' AS status;