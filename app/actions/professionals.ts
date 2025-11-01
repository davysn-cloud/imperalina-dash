"use server"

import { getSupabaseServiceClient } from "@/lib/supabase/service"

export async function createProfessionalProfile(params: {
  userId: string
  color: string
  specialties: string[]
  bio: string
  is_active: boolean
  can_manage_schedule: boolean
  can_view_all_appointments: boolean
  allowed_tabs: string[]
  schedules: Array<{
    day_of_week: number
    start_time: string
    end_time: string
    is_active: boolean
  }>
  avatarPublicUrl?: string
}) {
  try {
    const supabase = getSupabaseServiceClient()

    if (params.avatarPublicUrl) {
      // Atualizar avatar via função que ignora RLS
      const { error: avatarErr } = await supabase.rpc("update_user_avatar_bypass_rls", {
        p_user_id: params.userId,
        p_avatar: params.avatarPublicUrl,
      })
      if (avatarErr) {
        return { error: "Erro ao atualizar avatar: " + avatarErr.message }
      }
    }

    // Inserir profissional e horários via função RPC que bypassa RLS
    const schedulesJson = (params.schedules || []).map((s) => ({
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      is_active: s.is_active,
    }))

    const { data: newProfId, error: rpcErr } = await supabase.rpc("insert_professional_bypass_rls", {
      p_user_id: params.userId,
      p_color: params.color,
      p_specialties: params.specialties,
      p_bio: params.bio,
      p_is_active: !!params.is_active,
      p_can_manage_schedule: !!params.can_manage_schedule,
      p_can_view_all_appointments: !!params.can_view_all_appointments,
      p_allowed_tabs: params.allowed_tabs,
      p_schedules: schedulesJson as any,
    })

    if (rpcErr) {
      return { error: "Erro ao criar profissional: " + rpcErr.message }
    }

    return { success: true, professionalId: newProfId as string }
  } catch (e: any) {
    return { error: e?.message || "Erro inesperado ao criar profissional" }
  }
}