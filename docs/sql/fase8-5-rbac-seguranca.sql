-- ============================================================================
-- FASE 08.5 — RBAC: AUTORIDADE, ROLES E PERMISSÕES (NÚCLEO DE SEGURANÇA)
-- ----------------------------------------------------------------------------
-- Regras:
--   * Roles canónicos: super_admin | admin | supervisor | caixa
--     (migra legado: owner→admin, manager→supervisor, staff→caixa)
--   * SUPER_ADMIN = autoridade global (vê/administra todos os businesses).
--   * ADMIN      = gestor operacional do business actual (NUNCA super_admin global).
--   * CAIXA      = operacional (não escreve configuração/preços/stock/compras).
--   * RLS: SELECT por membership (business) + SUPER_ADMIN global; WRITE restringido
--     por role (config = admin/supervisor; business/business_users = admin).
--   * Anti-escalação nas RPCs (create/update/deactivate/list_business_users).
--   * Auditoria das alterações críticas em audit_logs.
--
-- Como usar: abrir o SQL Editor do Supabase e executar tudo (idempotente).
-- ============================================================================

-- ============================================================================
-- 1. NORMALIZAÇÃO DE ROLES
-- ============================================================================
ALTER TABLE public.business_users DROP CONSTRAINT IF EXISTS business_users_role_check;

UPDATE public.business_users SET role = 'admin'      WHERE role IN ('owner');
UPDATE public.business_users SET role = 'supervisor' WHERE role IN ('manager');
UPDATE public.business_users SET role = 'caixa'      WHERE role IN ('staff');
UPDATE public.business_users SET role = 'caixa'      WHERE role IS NULL OR role = '';

ALTER TABLE public.business_users
  ADD CONSTRAINT business_users_role_check
  CHECK (role IN ('super_admin', 'admin', 'supervisor', 'caixa'));

CREATE INDEX IF NOT EXISTS idx_business_users_role   ON public.business_users(role);
CREATE INDEX IF NOT EXISTS idx_business_users_active ON public.business_users(active);

-- ============================================================================
-- 2. FUNÇÕES AUXILIARES DE AUTORIZAÇÃO (SECURITY DEFINER, sem recursão RLS)
-- ============================================================================

-- membership ativa no business
CREATE OR REPLACE FUNCTION public.app_has_business_access(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = p_business_id AND user_id = auth.uid() AND active = true
  );
$$;

-- o chamador tem uma das roles indicadas NO business indicado
CREATE OR REPLACE FUNCTION public.app_has_role(p_business_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_roles && ARRAY(
    SELECT role FROM public.business_users
    WHERE business_id = p_business_id AND user_id = auth.uid() AND active = true
  );
$$;

-- o chamador é super_admin (global, em qualquer business)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE user_id = auth.uid() AND role = 'super_admin' AND active = true
  );
$$;

-- businesses do chamador (para SELECT policies)
CREATE OR REPLACE FUNCTION public.get_user_businesses()
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT business_id FROM public.business_users
               WHERE user_id = auth.uid() AND active = true;
END;
$$;

-- Auditoria (nunca bloqueia a operação se falhar)
CREATE OR REPLACE FUNCTION public.app_log_audit(
  p_business_id uuid,
  p_action text,
  p_entity text,
  p_entity_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name text;
BEGIN
  SELECT COALESCE(raw_user_meta_data->>'name', email) INTO v_user_name
  FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.audit_logs (business_id, user_id, user_name, action, entity, entity_id, details, created_at)
  VALUES (p_business_id, auth.uid(), v_user_name, p_action, p_entity, p_entity_id, p_details, now());
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_has_business_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_has_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_businesses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_log_audit(uuid,text,text,uuid,jsonb) TO authenticated;

-- ============================================================================
-- 3. RPCs DE GESTÃO DE UTILIZADORES (ANTI-ESCALAÇÃO)
-- ============================================================================

-- 3.1 CREATE — cria auth.users + identidade + vincula ao negócio
DROP FUNCTION IF EXISTS public.create_business_user(text,text,text,uuid,text);
DROP FUNCTION IF EXISTS public.create_business_user(text,text,text,uuid,public.user_role);

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
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_super boolean;
  v_roles        text[];
  v_user_id      uuid;
  v_exists       boolean;
BEGIN
  v_caller_super := is_super_admin();

  -- Só super_admin (global) ou admin ATIVO do business indicado
  IF NOT (v_caller_super OR app_has_role(p_business_id, ARRAY['admin'])) THEN
    RAISE EXCEPTION 'Sem permissão: apenas administradores podem gerir utilizadores';
  END IF;

  -- Um admin (não super) nunca pode criar/atribuir super_admin (escalada bloqueada)
  v_roles := CASE WHEN v_caller_super THEN ARRAY['admin','supervisor','caixa','super_admin']
                  ELSE ARRAY['admin','supervisor','caixa'] END;
  IF NOT EXISTS (SELECT 1 FROM unnest(v_roles) r WHERE r = p_role) THEN
    RAISE EXCEPTION 'Papel inválido: %', p_role;
  END IF;

  SELECT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email)) INTO v_exists;

  IF v_exists THEN
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;

    INSERT INTO public.business_users (business_id, user_id, role, active)
    VALUES (p_business_id, v_user_id, p_role, true)
    ON CONFLICT (business_id, user_id)
    DO UPDATE SET role = EXCLUDED.role, active = true;

    PERFORM app_log_audit(p_business_id, 'user.assign', 'business_user', v_user_id,
      jsonb_build_object('email', lower(p_email), 'role', p_role));
    RETURN QUERY SELECT v_user_id, false;
  ELSE
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token,
      reauthentication_token, email_change,
      is_anonymous, is_sso_user, is_super_admin, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      lower(p_email),
      crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', p_name),
      '', '', '',
      '', '', '',
      '', '',
      false,
      false,
      false,
      now(), now()
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data,
      provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_user_id, v_user_id, v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email)),
      'email', now(), now(), now()
    );

    INSERT INTO public.business_users (business_id, user_id, role, active)
    VALUES (p_business_id, v_user_id, p_role, true);

    PERFORM app_log_audit(p_business_id, 'user.create', 'business_user', v_user_id,
      jsonb_build_object('email', lower(p_email), 'name', p_name, 'role', p_role));
    RETURN QUERY SELECT v_user_id, true;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_business_user(text,text,text,uuid,text) TO authenticated;

-- 3.2 UPDATE ROLE — anti-escalação completa
DROP FUNCTION IF EXISTS public.update_business_user_role(uuid,uuid,text);
DROP FUNCTION IF EXISTS public.update_business_user_role(uuid,uuid,public.user_role);

CREATE OR REPLACE FUNCTION public.update_business_user_role(
  p_user_id     uuid,
  p_business_id uuid,
  p_role        text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_super  boolean;
  v_roles         text[];
  v_target_role   text;
  v_admin_count   int;
BEGIN
  v_caller_super := is_super_admin();

  IF NOT (v_caller_super OR app_has_role(p_business_id, ARRAY['admin'])) THEN
    RAISE EXCEPTION 'Sem permissão: apenas administradores podem alterar papéis';
  END IF;

  v_roles := CASE WHEN v_caller_super THEN ARRAY['admin','supervisor','caixa','super_admin']
                  ELSE ARRAY['admin','supervisor','caixa'] END;
  IF NOT EXISTS (SELECT 1 FROM unnest(v_roles) r WHERE r = p_role) THEN
    RAISE EXCEPTION 'Papel inválido: %', p_role;
  END IF;

  -- Não alterar o próprio papel
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível alterar o próprio papel';
  END IF;

  SELECT role INTO v_target_role FROM public.business_users
  WHERE business_id = p_business_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilizador não pertence a este negócio';
  END IF;

  -- ADMIN não pode mexer num SUPER_ADMIN (nem rebaixá-lo, nem tocar-lhe)
  IF v_target_role = 'super_admin' AND NOT v_caller_super THEN
    RAISE EXCEPTION 'Não é possível alterar o papel de um Super Admin';
  END IF;

  -- Não rebaixar o único admin ativo do negócio
  IF v_target_role = 'admin' AND p_role <> 'admin' THEN
    SELECT count(*) INTO v_admin_count FROM public.business_users
    WHERE business_id = p_business_id AND role = 'admin' AND active = true;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Não é possível rebaixar o único administrador do negócio';
    END IF;
  END IF;

  UPDATE public.business_users
  SET role = p_role, active = true
  WHERE business_id = p_business_id AND user_id = p_user_id;

  PERFORM app_log_audit(p_business_id, 'user.role_change', 'business_user', p_user_id,
    jsonb_build_object('from', v_target_role, 'to', p_role));
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_business_user_role(uuid,uuid,text) TO authenticated;

-- 3.3 DEACTIVATE — protege super_admin, o próprio, e o último admin
DROP FUNCTION IF EXISTS public.deactivate_business_user(uuid,uuid);

CREATE OR REPLACE FUNCTION public.deactivate_business_user(
  p_user_id     uuid,
  p_business_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_super boolean;
  v_target_role  text;
  v_admin_count  int;
BEGIN
  v_caller_super := is_super_admin();

  IF NOT (v_caller_super OR app_has_role(p_business_id, ARRAY['admin'])) THEN
    RAISE EXCEPTION 'Sem permissão: apenas administradores podem remover acessos';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível remover o próprio acesso';
  END IF;

  SELECT role INTO v_target_role FROM public.business_users
  WHERE business_id = p_business_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- ADMIN não pode desativar um SUPER_ADMIN
  IF v_target_role = 'super_admin' AND NOT v_caller_super THEN
    RAISE EXCEPTION 'Não é possível desativar um Super Admin';
  END IF;

  -- Não remover o único admin ativo
  IF v_target_role = 'admin' THEN
    SELECT count(*) INTO v_admin_count FROM public.business_users
    WHERE business_id = p_business_id AND role = 'admin' AND active = true;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Não é possível remover o único administrador do negócio';
    END IF;
  END IF;

  UPDATE public.business_users SET active = false
  WHERE business_id = p_business_id AND user_id = p_user_id;

  PERFORM app_log_audit(p_business_id, 'user.deactivate', 'business_user', p_user_id,
    jsonb_build_object('role', v_target_role));
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deactivate_business_user(uuid,uuid) TO authenticated;

-- 3.4 LIST — super_admin vê tudo; membro vê só o próprio business
DROP FUNCTION IF EXISTS public.list_business_users(uuid);

CREATE OR REPLACE FUNCTION public.list_business_users(
  p_business_id uuid DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  email text,
  name text,
  role text,
  active boolean,
  business_id uuid,
  business_name text,
  created_at timestamp
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_super_admin() OR app_has_business_access(p_business_id)) THEN
    RAISE EXCEPTION 'Sem permissão para listar utilizadores';
  END IF;

  RETURN QUERY
  SELECT
    bu.user_id,
    u.email::text,
    COALESCE(u.raw_user_meta_data->>'name', ''::text) AS name,
    bu.role,
    bu.active,
    bu.business_id,
    b.name::text AS business_name,
    bu.created_at
  FROM public.business_users bu
  JOIN auth.users u       ON u.id = bu.user_id
  JOIN public.businesses b ON b.id = bu.business_id
  WHERE (is_super_admin() AND (p_business_id IS NULL OR bu.business_id = p_business_id))
     OR (NOT is_super_admin() AND bu.business_id = p_business_id)
  ORDER BY bu.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_business_users(uuid) TO authenticated;

-- ============================================================================
-- 4. RLS — POLÍTICAS POR ROLE (Nível 4: o backend impede sem depender da UI)
-- ============================================================================
-- Tabelas tenant com business_id:
--   [A] operacionais  -> SELECT membership; WRITE qualquer membro (fluxos do caixa/POS)
--   [B] configuração  -> SELECT membership; WRITE admin/supervisor; super_admin tudo
--   [C] gestão        -> businesses / business_users: WRITE admin (+ super_admin)
-- Nota: todas as policies legadas são removidas primeiro para não reabrirem
-- escrita (ex.: "Users can manage products of their businesses" para qualquer role).

DO $$
DECLARE
  pol_name text;
  tbl_name text;
  t text;
BEGIN
  -- 4.0 Remover policies legadas (introspeção: cobre qualquer convenção de nome,
  -- com ou sem aspas à volta da tabela) -> nunca reabrem escrita via API.
  FOR pol_name, tbl_name IN
    SELECT p.polname, c.relname
    FROM pg_policy p
    JOIN pg_class c       ON c.oid       = p.polrelid
    JOIN pg_namespace n   ON n.oid       = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        p.polname LIKE 'Users can view % of their businesses'
        OR p.polname LIKE 'Users can manage % of their businesses'
        OR p.polname LIKE 'super_admin can view all %'
        OR p.polname LIKE 'super_admin can manage all %'
        OR p.polname = 'Enable all for authenticated users'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I;', pol_name, tbl_name);
  END LOOP;

  -- Remover policies legadas com nomes fixos em businesses / business_users
  DROP POLICY IF EXISTS "Users can view their businesses" ON public.businesses;
  DROP POLICY IF EXISTS "Super admins can manage all businesses" ON public.businesses;
  DROP POLICY IF EXISTS "Allow authenticated users" ON public.businesses;
  DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.businesses;
  DROP POLICY IF EXISTS "Users can view business users of their businesses" ON public.business_users;
  DROP POLICY IF EXISTS "Owners and super admins can manage business users" ON public.business_users;
  DROP POLICY IF EXISTS "Allow authenticated users" ON public.business_users;

  -- 4.1 [A] Operacionais — qualquer membro lê/escreve; super_admin tudo
  FOREACH t IN ARRAY ARRAY[
    'sales','orders','cash_movements','shifts','customers',
    'tables','tables_history','credits','credit_payments','credit_transactions',
    'loyalty_transactions','notifications','invoices','audit_logs'
  ] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name=t AND column_name='business_id') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS "rls_member_select_%s" ON public.%I;', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "rls_member_manage_%s" ON public.%I;', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "rls_super_all_%s" ON public.%I;', t, t);
      EXECUTE format('CREATE POLICY "rls_member_select_%s" ON public.%I FOR SELECT USING (business_id IN (SELECT public.get_user_businesses()));', t, t);
      EXECUTE format('CREATE POLICY "rls_member_manage_%s" ON public.%I FOR ALL USING (business_id IN (SELECT public.get_user_businesses()));', t, t);
      EXECUTE format('CREATE POLICY "rls_super_all_%s" ON public.%I FOR ALL USING (public.is_super_admin());', t, t);
    END IF;
  END LOOP;

  -- 4.2 [B] Configuração — caixa só lê; admin/supervisor escrevem; super_admin tudo
  FOREACH t IN ARRAY ARRAY[
    'products','ingredients','stock_movements','suppliers','purchase_orders',
    'purchase_receipts','losses','employees','financial_transactions',
    'accounts_payable','expense_categories','business_settings','invoice_series',
    'business_goals','goals','monthly_targets','sales_targets'
  ] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name=t AND column_name='business_id') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS "rls_member_select_%s" ON public.%I;', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "rls_config_write_%s" ON public.%I;', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "rls_super_all_%s" ON public.%I;', t, t);
      EXECUTE format('CREATE POLICY "rls_member_select_%s" ON public.%I FOR SELECT USING (business_id IN (SELECT public.get_user_businesses()));', t, t);
      EXECUTE format('CREATE POLICY "rls_config_write_%s" ON public.%I FOR ALL USING (public.app_has_role(business_id, ARRAY[''admin'',''supervisor'']));', t, t);
      EXECUTE format('CREATE POLICY "rls_super_all_%s" ON public.%I FOR ALL USING (public.is_super_admin());', t, t);
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- 4.3 GESTÃO (businesses / business_users)
-- ============================================================================

-- businesses: leitura por membership; escrita admin do business; criar = só super_admin
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_biz_select" ON public.businesses;
DROP POLICY IF EXISTS "rls_biz_admin_write" ON public.businesses;
DROP POLICY IF EXISTS "rls_biz_super_all" ON public.businesses;
DROP POLICY IF EXISTS "rls_biz_insert_super" ON public.businesses;
CREATE POLICY "rls_biz_select"      ON public.businesses FOR SELECT USING (id IN (SELECT public.get_user_businesses()));
CREATE POLICY "rls_biz_admin_write" ON public.businesses FOR ALL USING (public.app_has_role(id, ARRAY['admin']));
CREATE POLICY "rls_biz_super_all"   ON public.businesses FOR ALL USING (public.is_super_admin());
CREATE POLICY "rls_biz_insert_super" ON public.businesses
  AS RESTRICTIVE FOR INSERT WITH CHECK (public.is_super_admin());

-- business_users: leitura por membership; escrita admin/super_admin (RPCs são a via normal)
ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_bu_select" ON public.business_users;
DROP POLICY IF EXISTS "rls_bu_admin_write" ON public.business_users;
DROP POLICY IF EXISTS "rls_bu_super_all" ON public.business_users;
DROP POLICY IF EXISTS "rls_bu_nosuper_insert" ON public.business_users;
DROP POLICY IF EXISTS "rls_bu_nosuper_update" ON public.business_users;
DROP POLICY IF EXISTS "rls_bu_nosuper_delete" ON public.business_users;
CREATE POLICY "rls_bu_select"      ON public.business_users FOR SELECT USING (business_id IN (SELECT public.get_user_businesses()));
CREATE POLICY "rls_bu_admin_write" ON public.business_users FOR ALL USING (public.app_has_role(business_id, ARRAY['admin']));
CREATE POLICY "rls_bu_super_all"   ON public.business_users FOR ALL USING (public.is_super_admin());
-- Políticas RESTRICTIVE: mesmo um admin do business não pode criar/rebaixar/
-- desativar/remover linhas de super_admin (AND com as permissive).
CREATE POLICY "rls_bu_nosuper_insert" ON public.business_users
  AS RESTRICTIVE FOR INSERT WITH CHECK (role <> 'super_admin' OR public.is_super_admin());
CREATE POLICY "rls_bu_nosuper_update" ON public.business_users
  AS RESTRICTIVE FOR UPDATE USING (role <> 'super_admin' OR public.is_super_admin())
                              WITH CHECK (role <> 'super_admin' OR public.is_super_admin());
CREATE POLICY "rls_bu_nosuper_delete" ON public.business_users
  AS RESTRICTIVE FOR DELETE USING (role <> 'super_admin' OR public.is_super_admin());

-- ============================================================================
-- 5. GARANTIR RLS ATIVA EM TODAS AS TABELAS COM POLÍTICAS (defensivo)
-- ============================================================================
DO $$
DECLARE
  tbl regclass;
BEGIN
  FOR tbl IN
    SELECT DISTINCT p.polrelid
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relrowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END;
$$;

-- ============================================================================
-- 6. VERIFICAÇÃO
-- ============================================================================
SELECT 'FASE 08.5 RBAC aplicada.' AS status;
SELECT role, count(*) AS total FROM public.business_users GROUP BY role ORDER BY role;