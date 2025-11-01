-- Limpeza de versões antigas e sobrecargas
DO $$
BEGIN
  -- Remove versão antiga com p_role TEXT, se existir
  DROP FUNCTION IF EXISTS public.insert_user_bypass_rls(uuid, text, text, text, text, text);
  -- Remove versão atual caso exista para recriação limpa
  DROP FUNCTION IF EXISTS public.insert_user_bypass_rls(uuid, text, text, user_role, text, text);
END $$;

-- Função para inserir usuários bypassando RLS
-- Esta função roda com privilégios de SECURITY DEFINER (superusuário)

CREATE OR REPLACE FUNCTION public.insert_user_bypass_rls(
  p_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_role user_role DEFAULT 'CLIENT',
  p_phone TEXT DEFAULT NULL,
  p_avatar TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir diretamente na tabela users, bypassando RLS
  INSERT INTO public.users (id, email, name, role, phone, avatar, created_at, updated_at)     
  VALUES (
    p_id,
    p_email,
    p_name,
    p_role,
    p_phone,
    p_avatar,
    NOW(),
    NOW()
  );
END;
$$;

-- Dar permissão para usuários autenticados e service role executarem a função
GRANT EXECUTE ON FUNCTION public.insert_user_bypass_rls(uuid, text, text, user_role, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_user_bypass_rls(uuid, text, text, user_role, text, text) TO service_role;