-- ============================================================================
-- LIMPAR users criados via SQL para poder registar pela app
-- ============================================================================
DO $$
DECLARE
  v_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(id) INTO v_ids FROM auth.users WHERE email IN ('marrengula1@gmail.com', 'admin@bahules.com');
  
  IF v_ids IS NOT NULL AND array_length(v_ids, 1) > 0 THEN
    -- Apagar associações
    DELETE FROM business_users WHERE user_id = ANY(v_ids);
    -- Apagar identities
    DELETE FROM auth.identities WHERE user_id = ANY(v_ids);
    -- Apagar users
    DELETE FROM auth.users WHERE id = ANY(v_ids);
    RAISE NOTICE 'Users limpos: %', array_length(v_ids, 1);
  ELSE
    RAISE NOTICE 'Nenhum user encontrado para limpar';
  END IF;
END;
$$;

SELECT COUNT(*) as restantes FROM auth.users WHERE email IN ('marrengula1@gmail.com', 'admin@bahules.com');
