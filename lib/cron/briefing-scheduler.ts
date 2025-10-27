import { getSupabaseServerClient } from "@/lib/supabase/server"
import { addMinutes } from "date-fns"
import { generateAIBriefing } from "@/lib/ai/briefing-generator"
import { getClientHistory, getClientProfile } from "@/lib/ai/client-history"
import { sendWhatsAppMessage } from "@/lib/whatsapp/whatsapp-service"
import { formatBriefingMessage } from "@/lib/whatsapp/message-formatter"

export async function processUpcomingAppointments() {
  const now = new Date()
  const thirtyMinutesFromNow = addMinutes(now, 30)
  const twentyNineMinutesFromNow = addMinutes(now, 29)

  console.log(`[v0] Checking appointments between ${twentyNineMinutesFromNow} and ${thirtyMinutesFromNow}`)

  const supabase = await getSupabaseServerClient()

  // Find appointments starting in approximately 30 minutes
  const { data: upcomingAppointments, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      date,
      start_time,
      client_id,
      professional_id,
      service_id,
      client:users!appointments_client_id_fkey(id, name, email, phone),
      professional:professionals(
        id,
        user:users(name, phone)
      ),
      service:services(name, duration, price)
    `,
    )
    .eq("status", "CONFIRMED")
    .gte("date", now.toISOString().split("T")[0])
    .lte("date", thirtyMinutesFromNow.toISOString().split("T")[0])

  if (error) {
    console.error("[v0] Error fetching appointments:", error)
    throw error
  }

  if (!upcomingAppointments || upcomingAppointments.length === 0) {
    console.log("[v0] No upcoming appointments found")
    return {
      processed: 0,
      timestamp: now.toISOString(),
    }
  }

  // Filter appointments that are actually 30 minutes away
  const appointmentsToProcess = upcomingAppointments.filter((apt) => {
    const appointmentDateTime = new Date(`${apt.date}T${apt.start_time}`)
    const diffMinutes = Math.floor((appointmentDateTime.getTime() - now.getTime()) / (1000 * 60))
    return diffMinutes >= 29 && diffMinutes <= 31
  })

  console.log(`[v0] Found ${appointmentsToProcess.length} appointments to process`)

  let processed = 0

  for (const appointment of appointmentsToProcess) {
    try {
      // Check if briefing already exists
      const { data: existingBriefing } = await supabase
        .from("ai_briefings")
        .select("id")
        .eq("appointment_id", appointment.id)
        .single()

      if (existingBriefing) {
        console.log(`[v0] Briefing already exists for appointment ${appointment.id}`)
        continue
      }

      await generateAndSendBriefing(appointment)
      processed++
    } catch (error) {
      console.error(`[v0] Error processing appointment ${appointment.id}:`, error)
      // Continue processing other appointments
    }
  }

  return {
    processed,
    timestamp: now.toISOString(),
  }
}

async function generateAndSendBriefing(appointment: any) {
  console.log(`[v0] Generating briefing for appointment ${appointment.id}`)

  const supabase = await getSupabaseServerClient()

  // Get client history and profile
  const [clientHistory, clientProfile] = await Promise.all([
    getClientHistory(appointment.client_id),
    getClientProfile(appointment.client_id),
  ])

  // Generate briefing with AI
  const briefingData = await generateAIBriefing({
    client: {
      name: appointment.client.name,
      email: appointment.client.email,
      phone: appointment.client.phone,
    },
    clientProfile,
    previousVisits: clientHistory,
    upcomingService: {
      name: appointment.service.name,
      duration: appointment.service.duration,
      price: appointment.service.price,
    },
    professional: {
      name: appointment.professional.user.name,
    },
  })

  // Save briefing to database
  const { data: savedBriefing, error: saveError } = await supabase
    .from("ai_briefings")
    .insert({
      appointment_id: appointment.id,
      professional_id: appointment.professional_id,
      client_id: appointment.client_id,
      briefing_content: briefingData.content,
      briefing_summary: briefingData.summary,
      key_topics: briefingData.keyTopics,
      preferences: briefingData.preferences,
      last_visit_summary: briefingData.lastVisitSummary,
      suggested_topics: briefingData.suggestedTopics,
      alerts: briefingData.alerts,
      reminders: briefingData.reminders,
      tokens_used: briefingData.tokensUsed,
      generation_time: briefingData.generationTime,
      whatsapp_status: "QUEUED",
    })
    .select()
    .single()

  if (saveError) throw saveError

  console.log(`[v0] Briefing saved: ${savedBriefing.id}`)

  // Send via WhatsApp
  const professionalPhone = appointment.professional.user.phone

  if (!professionalPhone) {
    console.warn(`[v0] Professional ${appointment.professional.user.name} has no phone number`)
    await supabase.from("ai_briefings").update({ whatsapp_status: "FAILED" }).eq("id", savedBriefing.id)
    return
  }

  const message = formatBriefingMessage({
    briefingContent: briefingData.content,
    client: appointment.client,
    appointment,
    professional: appointment.professional.user,
    keyTopics: briefingData.keyTopics,
    alerts: briefingData.alerts,
  })

  const whatsappResult = await sendWhatsAppMessage({
    to: professionalPhone,
    message,
  })

  // Update briefing status
  await supabase
    .from("ai_briefings")
    .update({
      sent_at: new Date().toISOString(),
      sent_via_whatsapp: whatsappResult.success,
      whatsapp_message_id: whatsappResult.messageId,
      whatsapp_status: whatsappResult.success ? "SENT" : "FAILED",
    })
    .eq("id", savedBriefing.id)

  console.log(
    `[v0] WhatsApp ${whatsappResult.success ? "sent" : "failed"}: ${whatsappResult.messageId || whatsappResult.error}`,
  )
}

export async function retryFailedBriefings() {
  const supabase = await getSupabaseServerClient()
  const oneHourAgo = addMinutes(new Date(), -60)

  const { data: failedBriefings, error } = await supabase
    .from("ai_briefings")
    .select(
      `
      *,
      appointment:appointments(
        date,
        start_time,
        service:services(name, duration),
        client:users!appointments_client_id_fkey(name),
        professional:professionals(user:users(name, phone))
      )
    `,
    )
    .eq("whatsapp_status", "FAILED")
    .gte("sent_at", oneHourAgo.toISOString())
    .limit(10)

  if (error || !failedBriefings || failedBriefings.length === 0) {
    return
  }

  console.log(`[v0] Retrying ${failedBriefings.length} failed briefings`)

  for (const briefing of failedBriefings) {
    const professionalPhone = briefing.appointment.professional.user.phone

    if (!professionalPhone) continue

    const message = formatBriefingMessage({
      briefingContent: briefing.briefing_content,
      client: briefing.appointment.client,
      appointment: briefing.appointment,
      professional: briefing.appointment.professional.user,
      keyTopics: briefing.key_topics || [],
      alerts: briefing.alerts || [],
    })

    const result = await sendWhatsAppMessage({
      to: professionalPhone,
      message,
    })

    if (result.success) {
      await supabase
        .from("ai_briefings")
        .update({
          sent_via_whatsapp: true,
          whatsapp_message_id: result.messageId,
          whatsapp_status: "SENT",
        })
        .eq("id", briefing.id)

      console.log(`[v0] Successfully retried briefing ${briefing.id}`)
    }
  }
}
