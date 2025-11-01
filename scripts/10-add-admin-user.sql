-- Add or sync admin user ensuring the ID matches auth.users (avoids RLS issues)
DO $$
DECLARE
  v_email text := 'sildavysn@gmail.com';
  v_auth_id uuid;
BEGIN
  -- Ensure the user exists in auth.users (the person must have logged in at least once)
  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Usuário % não encontrado em auth.users. Faça login ao menos uma vez antes de rodar este script.', v_email;
  END IF;

  -- Upsert into public.users using the auth.users ID
  INSERT INTO public.users (id, email, name, role, phone)
  VALUES (v_auth_id, v_email, 'Sildavysn Admin', 'ADMIN', NULL)
  ON CONFLICT (email)
  DO UPDATE SET
    id = EXCLUDED.id,
    role = 'ADMIN',
    name = COALESCE(public.users.name, EXCLUDED.name),
    updated_at = NOW();

  RAISE NOTICE 'Usuário % sincronizado com id % e role ADMIN', v_email, v_auth_id;
END $$;

-- Verify the result and ID synchronization
SELECT 
  u.id as user_table_id,
  au.id as auth_table_id,
  u.email,
  u.name,
  u.role,
  u.created_at,
  u.updated_at,
  CASE WHEN u.id = au.id THEN 'IDs sincronizados ✓' ELSE 'IDs NÃO sincronizados ✗' END as sync_status
FROM public.users u
LEFT JOIN auth.users au ON u.email = au.email
WHERE u.email = 'sildavysn@gmail.com';
