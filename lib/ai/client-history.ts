import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function getClientHistory(clientId: string) {
  const supabase = await getSupabaseServerClient()

  // Get all completed appointments for this client with follow-up data
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      date,
      start_time,
      service:services(name),
      follow_up:appointment_follow_ups(
        service_reason,
        conversation_topics,
        follow_up_topics,
        reminders,
        technical_notes
      )
    `,
    )
    .eq("client_id", clientId)
    .eq("status", "COMPLETED")
    .order("date", { ascending: false })
    .limit(5)

  if (error) {
    console.error("[v0] Error fetching client history:", error)
    return []
  }

  return (
    appointments?.map((apt: any) => ({
      date: apt.date,
      service_name: apt.service?.name || "Serviço não especificado",
      follow_up: apt.follow_up
        ? {
            service_reason: apt.follow_up.service_reason,
            conversation_topics: apt.follow_up.conversation_topics || [],
            follow_up_topics: apt.follow_up.follow_up_topics || [],
            reminders: apt.follow_up.reminders || [],
            technical_notes: apt.follow_up.technical_notes,
          }
        : undefined,
    })) || []
  )
}

export async function getClientProfile(clientId: string) {
  const supabase = await getSupabaseServerClient()

  const { data: profile, error } = await supabase.from("client_profiles").select("*").eq("client_id", clientId).single()

  if (error && error.code !== "PGRST116") {
    console.error("[v0] Error fetching client profile:", error)
    return null
  }

  return profile
}
