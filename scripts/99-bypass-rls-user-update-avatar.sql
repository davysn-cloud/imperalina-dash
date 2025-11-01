-- Função para atualizar avatar do usuário ignorando RLS
-- Usa SECURITY DEFINER para executar com privilégios do owner

DO $$
BEGIN
  DROP FUNCTION IF EXISTS public.update_user_avatar_bypass_rls(uuid, text);
END $$;

CREATE OR REPLACE FUNCTION public.update_user_avatar_bypass_rls(
  p_user_id UUID,
  p_avatar TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET avatar = p_avatar,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_avatar_bypass_rls(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_avatar_bypass_rls(uuid, text) TO service_role;