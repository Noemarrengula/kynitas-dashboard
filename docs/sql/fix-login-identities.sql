-- ============================================================================
-- FIX: Criar identities em falta para login com email/senha
-- ============================================================================

DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN SELECT id, email, raw_user_meta_data FROM auth.users WHERE email IN ('marrengula1@gmail.com', 'admin@bahules.com')
  LOOP
    -- Verificar se já tem identity
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user.id AND provider = 'email') THEN
      INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
      VALUES (
        v_user.id,
        v_user.id,
        jsonb_build_object('sub', v_user.id::text, 'email', v_user.email),
        'email',
        v_user.email,
        NOW(),
        NOW(),
        NOW()
      );
      RAISE NOTICE 'Identity criada para %', v_user.email;
    ELSE
      RAISE NOTICE 'Identity já existe para %', v_user.email;
    END IF;
  END LOOP;
END;
$$;

-- Verificar resultado
SELECT u.email, i.provider, i.provider_id
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id
WHERE u.email IN ('marrengula1@gmail.com', 'admin@bahules.com', 'admin@kynitas.com')
ORDER BY u.email;
