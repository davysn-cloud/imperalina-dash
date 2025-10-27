import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    const { data: briefing, error } = await supabase
      .from("ai_briefings")
      .select(
        `
        *,
        appointment:appointments(
          date,
          start_time,
          service:services(name, duration)
        ),
        client:users!ai_briefings_client_id_fkey(name, phone),
        professional:professionals(user:users(name))
      `,
      )
      .eq("id", id)
      .single()

    if (error) throw error

    return NextResponse.json(briefing)
  } catch (error: any) {
    console.error("[v0] Error fetching briefing:", error)
    return NextResponse.json({ error: "Failed to fetch briefing" }, { status: 500 })
  }
}
