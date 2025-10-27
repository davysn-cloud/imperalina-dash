import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// Helper functions para lidar com relacionamentos que podem vir como arrays do Supabase
function getName(relationship: any): string {
  if (Array.isArray(relationship)) {
    return relationship[0]?.name || ""
  }
  return relationship?.name || ""
}

function getPrice(relationship: any): number {
  if (Array.isArray(relationship)) {
    return relationship[0]?.price || 0
  }
  return relationship?.price || 0
}

function getCommissionPercentage(relationship: any): number {
  if (Array.isArray(relationship)) {
    return relationship[0]?.commission_percentage || 0
  }
  return relationship?.commission_percentage || 0
}

function getProfessionalName(relationship: any): string {
  if (Array.isArray(relationship)) {
    const user = relationship[0]?.user
    if (Array.isArray(user)) {
      return user[0]?.name || ""
    }
    return user?.name || ""
  }
  return relationship?.user?.name || ""
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get("mes") || new Date().toISOString().slice(0, 7) // YYYY-MM
    const profissionalId = searchParams.get("profissional_id")

    // Período do mês (fechado-aberto) para evitar datas inválidas
    const [yStr, mStr] = mes.split("-")
    const y = parseInt(yStr, 10)
    const m = parseInt(mStr, 10)
    const pad = (n: number) => n.toString().padStart(2, "0")
    const periodStart = `${y}-${pad(m)}-01`
    const nextMonth = m === 12 ? 1 : m + 1
    const nextYear = m === 12 ? y + 1 : y
    const periodEndExclusive = `${nextYear}-${pad(nextMonth)}-01`

    // Buscar agendamentos finalizados e pagos do mês
    let query = supabase
      .from("appointments")
      .select(`
        id,
        date,
        payment_amount,
        payment_date,
        professional:professionals(
          id,
          user:users(name)
        ),
        service:services(
          id,
          name,
          price,
          commission_percentage
        ),
        client:users!appointments_client_id_fkey(
          name
        )
      `)
      .eq("status", "COMPLETED")
      .eq("payment_status", "PAID")
      .gte("date", periodStart)
      .lt("date", periodEndExclusive)

    if (profissionalId) {
      query = query.eq("professional_id", profissionalId)
    }

    const { data: appointments, error } = await query

    if (error) {
      console.error("Erro ao buscar comissões:", error)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    // Calcular comissões por profissional
    const comissoesPorProfissional = new Map()

    appointments?.forEach((appointment: any) => {
      const profissionalId = appointment.professional?.id
      const profissionalNome = getProfessionalName(appointment.professional) || "Profissional não encontrado"
      const servicoNome = getName(appointment.service) || "Serviço não encontrado"
      const valorServico = appointment.payment_amount || getPrice(appointment.service) || 0
      const percentualComissao = getCommissionPercentage(appointment.service) || 0
      const valorComissao = (valorServico * percentualComissao) / 100

      if (!comissoesPorProfissional.has(profissionalId)) {
        comissoesPorProfissional.set(profissionalId, {
          profissional_id: profissionalId,
          profissional_nome: profissionalNome,
          total_vendas: 0,
          total_comissao: 0,
          atendimentos: [],
        })
      }

      const profissionalData = comissoesPorProfissional.get(profissionalId)
      profissionalData.total_vendas += valorServico
      profissionalData.total_comissao += valorComissao
      profissionalData.atendimentos.push({
        id: appointment.id,
        data: appointment.date,
        cliente_nome: getName(appointment.client) || "Cliente não encontrado",
        servico_nome: servicoNome,
        valor_servico: valorServico,
        percentual_comissao: percentualComissao,
        valor_comissao: valorComissao,
        data_pagamento: appointment.payment_date,
      })
    })

    const comissoes = Array.from(comissoesPorProfissional.values())

    return NextResponse.json(comissoes)
  } catch (error) {
    console.error("Erro na API de comissões:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// API para buscar configurações de comissão por profissional
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()
    const { action } = body

    if (action === "get_professionals") {
      // Buscar todos os profissionais com seus serviços
      const { data: professionals, error } = await supabase
        .from("professionals")
        .select(`
          id,
          user:users(name),
          services(
            id,
            name,
            commission_percentage
          )
        `)

      if (error) {
        console.error("Erro ao buscar profissionais:", error)
        return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
      }

      return NextResponse.json(professionals)
    }

    if (action === "update_commission") {
      const { service_id, commission_percentage } = body

      const { error } = await supabase
        .from("services")
        .update({ commission_percentage })
        .eq("id", service_id)

      if (error) {
        console.error("Erro ao atualizar comissão:", error)
        return NextResponse.json({ error: "Erro ao atualizar comissão" }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Ação não reconhecida" }, { status: 400 })
  } catch (error) {
    console.error("Erro na API de comissões POST:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}