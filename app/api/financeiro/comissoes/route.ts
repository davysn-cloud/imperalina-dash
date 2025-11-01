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

    if (action === "approve_commission") {
      const {
        mes, // YYYY-MM
        profissional_id,
        total_faturamento,
        total_comissao,
        bonificacoes = 0,
        valor_final,
        atendimentos = [], // [{ appointment_id, valor_servico, percentual_comissao, valor_comissao }]
      } = body

      const [yStr, mStr] = (mes || new Date().toISOString().slice(0, 7)).split("-")
      const y = parseInt(yStr, 10)
      const m = parseInt(mStr, 10)
      const pad = (n: number) => n.toString().padStart(2, "0")
      const periodo_inicio = `${y}-${pad(m)}-01`
      const nextMonth = m === 12 ? 1 : m + 1
      const nextYear = m === 12 ? y + 1 : y
      const periodo_fim = `${nextYear}-${pad(nextMonth)}-01`

      // Upsert comissão do período para o profissional
      const insertPayload = {
        professional_id: profissional_id,
        periodo_inicio,
        periodo_fim,
        total_atendimentos: Array.isArray(atendimentos) ? atendimentos.length : 0,
        total_faturamento: Number(total_faturamento || 0),
        total_comissao: Number(total_comissao || 0),
        bonificacoes: Number(bonificacoes || 0),
        valor_final: Number(valor_final || 0),
        status: "APROVADO",
      }

      const { data: comissaoRow, error: errUpsert } = await supabase
        .from("comissoes")
        .upsert(insertPayload, { onConflict: "professional_id,periodo_inicio,periodo_fim" })
        .select("*")
        .single()

      if (errUpsert) {
        console.error("Erro ao aprovar comissão:", errUpsert)
        return NextResponse.json({ error: "Erro ao aprovar comissão" }, { status: 500 })
      }

      // Sincronizar detalhes dos atendimentos
      if (Array.isArray(atendimentos) && atendimentos.length > 0) {
        // Apagar detalhes antigos para evitar duplicação
        await supabase
          .from("comissao_atendimentos")
          .delete()
          .eq("comissao_id", comissaoRow.id)

        const detalhes = atendimentos.map((a: any) => ({
          comissao_id: comissaoRow.id,
          appointment_id: a.appointment_id,
          valor_servico: Number(a.valor_servico || 0),
          percentual_comissao: Number(a.percentual_comissao || 0),
          valor_comissao: Number(a.valor_comissao || 0),
        }))

        const { error: errDetalhes } = await supabase
          .from("comissao_atendimentos")
          .insert(detalhes)
        if (errDetalhes) {
          console.warn("Falha ao inserir detalhes da comissão:", errDetalhes)
        }
      }

      return NextResponse.json({ id: comissaoRow.id })
    }

    if (action === "generate_payable") {
      const { comissao_id } = body
      if (!comissao_id) return NextResponse.json({ error: "comissao_id é obrigatório" }, { status: 400 })

      // Buscar comissão e configuração do profissional
      const { data: comissao, error: errCom } = await supabase
        .from("comissoes")
        .select("id, professional_id, periodo_inicio, periodo_fim, valor_final")
        .eq("id", comissao_id)
        .single()
      if (errCom || !comissao) {
        console.error("Erro ao buscar comissão:", errCom)
        return NextResponse.json({ error: "Comissão não encontrada" }, { status: 404 })
      }

      const { data: config, error: errCfg } = await supabase
        .from("comissao_config")
        .select("dia_pagamento")
        .eq("professional_id", comissao.professional_id)
        .single()
      if (errCfg) console.warn("Não foi possível buscar dia_pagamento:", errCfg)

      const diaPagamento = (config as any)?.dia_pagamento || 5
      const hoje = new Date()
      const ano = hoje.getFullYear()
      const mes = hoje.getMonth() // 0-11
      const dataVencimento = new Date(ano, mes, diaPagamento)
      const vencIso = dataVencimento.toISOString().slice(0, 10)

      const descMes = `${String(mes + 1).padStart(2, "0")}/${ano}`
      const descricao = `Comissão Profissional ${comissao.professional_id} - ${descMes}`

      const { data: created, error: errPay } = await supabase
        .from("contas_pagar")
        .insert({
          descricao,
          categoria: "COMISSAO",
          valor: Number((comissao as any).valor_final || 0),
          data_vencimento: vencIso,
          observacoes: `Período: ${(comissao as any).periodo_inicio} a ${(comissao as any).periodo_fim}`,
          status: "PENDENTE",
        })
        .select("*")
        .single()
      if (errPay) {
        console.error("Erro ao criar conta a pagar:", errPay)
        return NextResponse.json({ error: "Erro ao criar conta a pagar" }, { status: 500 })
      }

      // Vincular conta paga à comissão
      const { error: errLink } = await supabase
        .from("comissoes")
        .update({ conta_pagar_id: created.id })
        .eq("id", comissao_id)
      if (errLink) console.warn("Falha ao vincular conta a comissão:", errLink)

      return NextResponse.json({ conta_pagar_id: created.id })
    }

    return NextResponse.json({ error: "Ação não reconhecida" }, { status: 400 })
  } catch (error) {
    console.error("Erro na API de comissões POST:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}