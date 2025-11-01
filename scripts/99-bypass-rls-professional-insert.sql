-- Cria função para inserir profissionais e horários ignorando RLS
-- Usa SECURITY DEFINER para rodar com privilégios elevados

DO $$
BEGIN
  -- Remover versões anteriores, se existirem
  DROP FUNCTION IF EXISTS public.insert_professional_bypass_rls(uuid, text, text[], text, boolean, boolean, boolean, text[], jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.insert_professional_bypass_rls(
  p_user_id UUID,
  p_color TEXT,
  p_specialties TEXT[],
  p_bio TEXT,
  p_is_active BOOLEAN,
  p_can_manage_schedule BOOLEAN,
  p_can_view_all_appointments BOOLEAN,
  p_allowed_tabs TEXT[],
  p_schedules JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_prof_id UUID;
BEGIN
  INSERT INTO public.professionals (
    user_id,
    color,
    specialties,
    bio,
    is_active,
    can_manage_schedule,
    can_view_all_appointments,
    allowed_tabs
  )
  VALUES (
    p_user_id,
    COALESCE(p_color, '#3B82F6'),
    COALESCE(p_specialties, '{}'::text[]),
    p_bio,
    COALESCE(p_is_active, true),
    COALESCE(p_can_manage_schedule, true),
    COALESCE(p_can_view_all_appointments, false),
    COALESCE(p_allowed_tabs, '{}'::text[])
  )
  RETURNING id INTO new_prof_id;

  -- Inserir horários caso existam
  IF p_schedules IS NOT NULL AND jsonb_array_length(p_schedules) > 0 THEN
    INSERT INTO public.schedules (professional_id, day_of_week, start_time, end_time, is_active)
    SELECT
      new_prof_id,
      (s->>'day_of_week')::int,
      s->>'start_time',
      s->>'end_time',
      COALESCE((s->>'is_active')::boolean, true)
    FROM jsonb_array_elements(p_schedules) AS s;
  END IF;

  RETURN new_prof_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_professional_bypass_rls(uuid, text, text[], text, boolean, boolean, boolean, text[], jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_professional_bypass_rls(uuid, text, text[], text, boolean, boolean, boolean, text[], jsonb) TO service_role;