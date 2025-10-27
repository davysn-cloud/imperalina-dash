import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { z } from "zod"

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

    return NextResponse.json({ ...followUp, stockAlerts: alerts })
  } catch (error: any) {
    console.error("[v0] Error saving follow-up:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to save follow-up" }, { status: 500 })
  }
}
