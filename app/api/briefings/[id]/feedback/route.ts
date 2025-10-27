import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { z } from "zod"

const feedbackSchema = z.object({
  wasHelpful: z.boolean(),
  professionalFeedback: z.string().optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const validatedData = feedbackSchema.parse(body)

    const { data: briefing, error } = await supabase
      .from("ai_briefings")
      .update({
        was_helpful: validatedData.wasHelpful,
        professional_feedback: validatedData.professionalFeedback,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(briefing)
  } catch (error: any) {
    console.error("[v0] Error saving feedback:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 })
  }
}
