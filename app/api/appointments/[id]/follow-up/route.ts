import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { z } from "zod"
import { sendEmail } from "@/lib/email/resend-service"

const followUpSchema = z.object({
  serviceReason: z.string().optional(),
  eventDate: z.string().optional(),
  eventImportance: z.enum(["ROUTINE", "IMPORTANT", "VERY_IMPORTANT", "CRITICAL"]).optional(),
  conversationTopics: z.array(z.string()).optional(),
  personalMilestones: z.array(z.string()).optional(),
  followUpTopics: z.array(z.string()).optional(),
  reminders: z.array(z.string()).optional(),
  clientSatisfaction: z.number().min(1).max(5).optional(),
  serviceQuality: z.enum(["POOR", "FAIR", "GOOD", "VERY_GOOD", "EXCELLENT"]).optional(),
  clientFeedback: z.string().optional(),
  productsUsed: z.array(z.string()).optional(),
  productsRecommended: z.array(z.string()).optional(),
  technicalNotes: z.string().optional(),
  nextServiceSuggestion: z.string().optional(),
  profileUpdates: z.record(z.any()).optional(),
  completedBy: z.string(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase.from("appointment_follow_ups").select("*").eq("appointment_id", id).single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    return NextResponse.json(data || null)
  } catch (error: any) {
    console.error("[v0] Error fetching follow-up:", error)
    return NextResponse.json({ error: "Failed to fetch follow-up" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const validatedData = followUpSchema.parse(body)

    // Check if appointment exists
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id, status, service_id")
      .eq("id", id)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Convert camelCase to snake_case for database
    const dbData = {
      appointment_id: id,
      service_reason: validatedData.serviceReason,
      event_date: validatedData.eventDate && validatedData.eventDate.trim() ? validatedData.eventDate : null,
      event_importance: validatedData.eventImportance,
      conversation_topics: validatedData.conversationTopics || [],
      personal_milestones: validatedData.personalMilestones || [],
      follow_up_topics: validatedData.followUpTopics || [],
      reminders: validatedData.reminders || [],
      client_satisfaction: validatedData.clientSatisfaction,
      service_quality: validatedData.serviceQuality,
      client_feedback: validatedData.clientFeedback,
      products_used: validatedData.productsUsed || [],
      products_recommended: validatedData.productsRecommended || [],
      technical_notes: validatedData.technicalNotes,
      next_service_suggestion: validatedData.nextServiceSuggestion,
      profile_updates: validatedData.profileUpdates,
      completed_at: new Date().toISOString(),
      completed_by: validatedData.completedBy,
    }

    // Upsert follow-up
    const { data: followUp, error } = await supabase
      .from("appointment_follow_ups")
      .upsert(dbData, {
        onConflict: "appointment_id",
      })
      .select()
      .single()

    if (error) throw error

    // Update appointment status to COMPLETED
    await supabase.from("appointments").update({ status: "COMPLETED" }).eq("id", id)

    // Automatic stock deduction based on service-product links
    const alerts: Array<{ produto_id: string; motivo: string }> = []

    if (appointment?.service_id) {
      const { data: links, error: linksErr } = await supabase
        .from("servico_produto_vinculos")
        .select("produto_id, quantidade, baixa_automatica, obrigatorio")
        .eq("service_id", appointment.service_id)

      if (!linksErr && Array.isArray(links)) {
        for (const link of links) {
          if (!link.baixa_automatica) continue
          const { data: prod, error: prodErr } = await supabase
            .from("produtos")
            .select("id, quantidade_atual")
            .eq("id", link.produto_id)
            .single()
          if (prodErr || !prod) {
            alerts.push({ produto_id: link.produto_id, motivo: "Produto não encontrado" })
            continue
          }
          const atual = prod.quantidade_atual ?? 0
          const toDeduct = Math.min(atual, link.quantidade ?? 0)
          if (toDeduct <= 0) {
            alerts.push({ produto_id: link.produto_id, motivo: "Sem estoque para baixa" })
            continue
          }
          // Update product quantity
          const { error: updErr } = await supabase
            .from("produtos")
            .update({ quantidade_atual: atual - toDeduct })
            .eq("id", link.produto_id)
          if (updErr) {
            alerts.push({ produto_id: link.produto_id, motivo: "Falha ao atualizar estoque" })
            continue
          }
          // Register stock movement
          await supabase
            .from("movimentacoes_estoque")
            .insert({
              produto_id: link.produto_id,
              tipo: "saida",
              quantidade: toDeduct,
              origem: "Serviço",
              data_hora: new Date().toISOString(),
            })
          // Register service consumption
          await supabase
            .from("consumos_servicos_produtos")
            .insert({
              appointment_id: id,
              service_id: appointment.service_id,
              produto_id: link.produto_id,
              quantidade: toDeduct,
            })
          // If insufficient stock compared to required quantity
          if ((link.quantidade ?? 0) > toDeduct && link.obrigatorio) {
            alerts.push({ produto_id: link.produto_id, motivo: "Baixa parcial; estoque insuficiente" })
          }
        }
      }
    }

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

      const subject = `Follow Up - ${serv.name || "Serviço"} - ${client.name || "Cliente"} (${apptForEmail.date})`
      const html = `
        <h2>Follow Up registrado</h2>
        <p><strong>Cliente:</strong> ${client.name || "-"}</p>
        <p><strong>Serviço:</strong> ${serv.name || "-"}</p>
        <p><strong>Data:</strong> ${apptForEmail.date}</p>
        <hr />
        ${dbData.service_reason ? `<p><strong>Motivo do serviço:</strong> ${dbData.service_reason}</p>` : ""}
        ${dbData.event_date ? `<p><strong>Data do evento:</strong> ${dbData.event_date}</p>` : ""}
        ${dbData.event_importance ? `<p><strong>Importância:</strong> ${dbData.event_importance}</p>` : ""}
        ${Array.isArray(dbData.conversation_topics) && dbData.conversation_topics.length ? `<p><strong>Tópicos de conversação:</strong> ${dbData.conversation_topics.join(", ")}</p>` : ""}
        ${Array.isArray(dbData.personal_milestones) && dbData.personal_milestones.length ? `<p><strong>Marcos pessoais:</strong> ${dbData.personal_milestones.join(", ")}</p>` : ""}
        ${Array.isArray(dbData.follow_up_topics) && dbData.follow_up_topics.length ? `<p><strong>Tópicos de follow-up:</strong> ${dbData.follow_up_topics.join(", ")}</p>` : ""}
        ${Array.isArray(dbData.reminders) && dbData.reminders.length ? `<p><strong>Lembretes:</strong> ${dbData.reminders.join(", ")}</p>` : ""}
        ${typeof dbData.client_satisfaction !== "undefined" ? `<p><strong>Satisfação do cliente:</strong> ${dbData.client_satisfaction}</p>` : ""}
        ${dbData.service_quality ? `<p><strong>Qualidade do serviço:</strong> ${dbData.service_quality}</p>` : ""}
        ${dbData.client_feedback ? `<p><strong>Feedback do cliente:</strong> ${dbData.client_feedback}</p>` : ""}
        ${Array.isArray(dbData.products_used) && dbData.products_used.length ? `<p><strong>Produtos usados:</strong> ${dbData.products_used.join(", ")}</p>` : ""}
        ${Array.isArray(dbData.products_recommended) && dbData.products_recommended.length ? `<p><strong>Produtos recomendados:</strong> ${dbData.products_recommended.join(", ")}</p>` : ""}
        ${dbData.technical_notes ? `<p><strong>Notas técnicas:</strong> ${dbData.technical_notes}</p>` : ""}
        ${dbData.next_service_suggestion ? `<p><strong>Sugestão de próximo serviço:</strong> ${dbData.next_service_suggestion}</p>` : ""}
      `

      if (profUser?.email) {
        await sendEmail({
          to: profUser.email,
          subject,
          html,
        })
      }
    }

    return NextResponse.json({ ...followUp, stockAlerts: alerts })
  } catch (error: any) {
    console.error("[v0] Error saving follow-up:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to save follow-up" }, { status: 500 })
  }
}
