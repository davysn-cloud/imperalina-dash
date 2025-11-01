import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { z } from "zod"
import { sendEmail } from "@/lib/email/resend-service"

const followInSchema = z.object({
  clientMood: z.enum(["VERY_HAPPY", "HAPPY", "NEUTRAL", "TIRED", "STRESSED", "UPSET"]).optional(),
  arrivedOnTime: z.boolean().optional(),
  arrivalNotes: z.string().optional(),
  coffeeToday: z.boolean().optional(),
  coffeeStrengthToday: z.enum(["WEAK", "MEDIUM", "STRONG", "VERY_STRONG"]).optional(),
  musicToday: z.string().optional(),
  temperatureToday: z.string().optional(),
  specialRequests: z.string().optional(),
  timeConstraints: z.string().optional(),
  professionalNotes: z.string().optional(),
  completedBy: z.string(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase.from("appointment_follow_ins").select("*").eq("appointment_id", id).single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    return NextResponse.json(data || null)
  } catch (error: any) {
    console.error("[v0] Error fetching follow-in:", error)
    return NextResponse.json({ error: "Failed to fetch follow-in" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const validatedData = followInSchema.parse(body)

    // Check if appointment exists
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id, client_id")
      .eq("id", id)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Convert camelCase to snake_case for database
    const dbData = {
      appointment_id: id,
      client_id: appointment.client_id,
      client_mood: validatedData.clientMood,
      arrived_on_time: validatedData.arrivedOnTime,
      arrival_notes: validatedData.arrivalNotes,
      coffee_today: validatedData.coffeeToday,
      coffee_strength_today: validatedData.coffeeStrengthToday,
      music_today: validatedData.musicToday,
      temperature_today: validatedData.temperatureToday,
      special_requests: validatedData.specialRequests,
      time_constraints: validatedData.timeConstraints,
      professional_notes: validatedData.professionalNotes,
      completed_at: new Date().toISOString(),
      completed_by: validatedData.completedBy,
    }

    // Upsert follow-in
    const { data: followIn, error } = await supabase
      .from("appointment_follow_ins")
      .upsert(dbData, {
        onConflict: "appointment_id",
      })
      .select()
      .single()

    if (error) throw error

    // Enviar briefing por email ao funcionário responsável
    const { data: apptForEmail, error: apptEmailErr } = await supabase
      .from("appointments")
      .select(`
        id,
        date,
        client:users!appointments_client_id_fkey(name),
        professional:professionals(id, user:users(name, email)),
        service:services(name)
      `)
      .eq("id", id)
      .single()

    if (!apptEmailErr && apptForEmail) {
      const getRel = (rel: any) => (Array.isArray(rel) ? rel?.[0] : rel) || {}
      const prof = getRel(apptForEmail.professional)
      const profUser = getRel(prof.user)
      const client = getRel(apptForEmail.client)
      const serv = getRel(apptForEmail.service)

      const subject = `Follow In - ${serv.name || "Serviço"} - ${client.name || "Cliente"} (${apptForEmail.date})`
      const html = `
        <h2>Follow In registrado</h2>
        <p><strong>Cliente:</strong> ${client.name || "-"}</p>
        <p><strong>Serviço:</strong> ${serv.name || "-"}</p>
        <p><strong>Data:</strong> ${apptForEmail.date}</p>
        <hr />
        <p><strong>Humor do cliente:</strong> ${dbData.client_mood ?? "-"}</p>
        <p><strong>Chegou no horário:</strong> ${dbData.arrived_on_time ? "Sim" : dbData.arrived_on_time === false ? "Não" : "-"}</p>
        ${dbData.arrival_notes ? `<p><strong>Observações da chegada:</strong> ${dbData.arrival_notes}</p>` : ""}
        <p><strong>Café hoje:</strong> ${dbData.coffee_today ? "Sim" : dbData.coffee_today === false ? "Não" : "-"}</p>
        ${dbData.coffee_strength_today ? `<p><strong>Força do café:</strong> ${dbData.coffee_strength_today}</p>` : ""}
        ${dbData.music_today ? `<p><strong>Música do dia:</strong> ${dbData.music_today}</p>` : ""}
        ${dbData.temperature_today ? `<p><strong>Temperatura do ambiente:</strong> ${dbData.temperature_today}</p>` : ""}
        ${dbData.special_requests ? `<p><strong>Pedidos especiais:</strong> ${dbData.special_requests}</p>` : ""}
        ${dbData.time_constraints ? `<p><strong>Restrições de tempo:</strong> ${dbData.time_constraints}</p>` : ""}
        ${dbData.professional_notes ? `<p><strong>Notas do profissional:</strong> ${dbData.professional_notes}</p>` : ""}
      `

      if (profUser?.email) {
        await sendEmail({
          to: profUser.email,
          subject,
          html,
        })
      }
    }

    return NextResponse.json(followIn)
  } catch (error: any) {
    console.error("[v0] Error saving follow-in:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to save follow-in" }, { status: 500 })
  }
}
