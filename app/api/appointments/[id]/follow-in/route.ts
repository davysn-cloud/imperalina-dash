import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { z } from "zod"

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

    return NextResponse.json(followIn)
  } catch (error: any) {
    console.error("[v0] Error saving follow-in:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to save follow-in" }, { status: 500 })
  }
}
