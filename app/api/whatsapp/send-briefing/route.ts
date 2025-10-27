import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { sendWhatsAppMessage } from "@/lib/whatsapp/whatsapp-service"
import { formatBriefingMessage } from "@/lib/whatsapp/message-formatter"

export async function POST(request: NextRequest) {
  try {
    const { briefingId } = await request.json()

    if (!briefingId) {
      return NextResponse.json({ error: "briefingId is required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Get briefing with all related data
    const { data: briefing, error: briefingError } = await supabase
      .from("ai_briefings")
      .select(
        `
        *,
        appointment:appointments(
          date,
          start_time,
          service:services(name, duration),
          client:users!appointments_client_id_fkey(name)
        ),
        professional:professionals(
          user:users(name, phone)
        )
      `,
      )
      .eq("id", briefingId)
      .single()

    if (briefingError || !briefing) {
      return NextResponse.json({ error: "Briefing not found" }, { status: 404 })
    }

    // Check if already sent
    if (briefing.sent_via_whatsapp) {
      return NextResponse.json({ error: "Briefing already sent" }, { status: 409 })
    }

    // Get professional phone
    const professionalPhone = briefing.professional.user.phone

    if (!professionalPhone) {
      await supabase.from("ai_briefings").update({ whatsapp_status: "FAILED" }).eq("id", briefingId)

      return NextResponse.json({ error: "Professional has no phone number" }, { status: 400 })
    }

    // Format message
    const message = formatBriefingMessage({
      briefingContent: briefing.briefing_content,
      client: briefing.appointment.client,
      appointment: briefing.appointment,
      professional: briefing.professional.user,
      keyTopics: briefing.key_topics || [],
      alerts: briefing.alerts || [],
    })

    // Send via WhatsApp
    const result = await sendWhatsAppMessage({
      to: professionalPhone,
      message,
    })

    // Update briefing status
    await supabase
      .from("ai_briefings")
      .update({
        sent_at: new Date().toISOString(),
        sent_via_whatsapp: result.success,
        whatsapp_message_id: result.messageId,
        whatsapp_status: result.success ? "SENT" : "FAILED",
      })
      .eq("id", briefingId)

    if (!result.success) {
      return NextResponse.json({ error: "Failed to send WhatsApp message", details: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    })
  } catch (error: any) {
    console.error("[v0] Error sending briefing via WhatsApp:", error)
    return NextResponse.json({ error: "Failed to send briefing", details: error.message }, { status: 500 })
  }
}
