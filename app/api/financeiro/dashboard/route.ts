import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { startOfMonth, endOfMonth, format, subMonths, startOfDay, endOfDay } from "date-fns"

// Helpers para lidar com relacionamentos potencialmente como arrays
const getName = (rel: any): string | undefined => {
  if (!rel) return undefined
  if (Array.isArray(rel)) return rel[0]?.name
  return rel?.name
}

const getPrice = (rel: any): number | undefined => {
  if (!rel) return undefined
  if (Array.isArray(rel)) return rel[0]?.price
  return rel?.price
}

const getCommissionPercentage = (rel: any): number | undefined => {
  if (!rel) return undefined
  if (Array.isArray(rel)) return rel[0]?.commission_percentage
  return rel?.commission_percentage
}

const getProfessionalName = (rel: any): string | undefined => {
  if (!rel) return undefined
  const node = Array.isArray(rel) ? rel[0] : rel
  const user = node?.user
  if (Array.isArray(user)) return user[0]?.name
  return user?.name
}

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    
    const hoje = new Date()
    const inicioMes = startOfMonth(hoje)
    const fimMes = endOfMonth(hoje)
    const mesPassado = subMonths(hoje, 1)
    const inicioMesPassado = startOfMonth(mesPassado)
    const fimMesPassado = endOfMonth(mesPassado)

    // Buscar dados do mês atual
    const { data: appointmentsAtual, error: errorAtual } = await supabase
      .from("appointments")
      .select(`
        id,
        date,
        payment_amount,
        payment_status,
        service:services(price, commission_percentage),
        professional:professionals(id)
      `)
      .gte("date", format(inicioMes, "yyyy-MM-dd"))
      .lte("date", format(fimMes, "yyyy-MM-dd"))
      .not("payment_status", "is", null)

    // Buscar dados do mês passado para comparação
    const { data: appointmentsPassado, error: errorPassado } = await supabase
      .from("appointments")
      .select(`
        id,
        payment_amount,
        payment_status,
        service:services(price)
      `)
      .gte("date", format(inicioMesPassado, "yyyy-MM-dd"))
      .lte("date", format(fimMesPassado, "yyyy-MM-dd"))
      .not("payment_status", "is", null)

    if (errorAtual || errorPassado) {
      console.error("Erro ao buscar dados do dashboard:", errorAtual || errorPassado)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    // Calcular métricas do mês atual (entradas)
    const receitaAtual = appointmentsAtual
      ?.filter(app => app.payment_status === "PAID")
      .reduce((sum, app) => sum + (app.payment_amount || getPrice(app.service) || 0), 0) || 0

    const pendentesAtual = appointmentsAtual
      ?.filter(app => app.payment_status === "PENDING")
      .reduce((sum, app) => sum + (getPrice(app.service) || 0), 0) || 0

    const atrasadosAtual = appointmentsAtual
      ?.filter(app => app.payment_status === "OVERDUE")
      .reduce((sum, app) => sum + (getPrice(app.service) || 0), 0) || 0

    // Calcular comissões do mês atual
    const comissoesAtual = appointmentsAtual
      ?.filter(app => app.payment_status === "PAID")
      .reduce((sum, app) => {
        const valor = app.payment_amount || getPrice(app.service) || 0
        const percentual = getCommissionPercentage(app.service) || 0
        return sum + (valor * percentual / 100)
      }, 0) || 0

    // Buscar saídas (contas a pagar) no mês
    const { data: contasPagarMes, error: errorCp } = await supabase
      .from("contas_pagar")
      .select("id, valor, status, data_vencimento, data_pagamento, categoria")
      .gte("data_vencimento", format(inicioMes, "yyyy-MM-dd"))
      .lte("data_vencimento", format(fimMes, "yyyy-MM-dd"))

    if (errorCp) {
      console.error("Erro ao buscar contas a pagar mês:", errorCp)
    }

    const aPagarMes = contasPagarMes?.filter(c => c.status === "PENDENTE")
      .reduce((sum, c) => sum + Number(c.valor || 0), 0) || 0

    const pagarAtrasadasMes = (contasPagarMes || [])
      .filter(c => c.status !== "PAGO" && new Date(c.data_vencimento as any) < hoje)
      .reduce((sum, c) => sum + Number(c.valor || 0), 0) || 0

    const saidasPagasMes = (contasPagarMes || [])
      .filter(c => c.status === "PAGO")
      .reduce((sum, c) => sum + Number(c.valor || 0), 0) || 0

    // Calcular métricas do mês passado
    const receitaPassado = appointmentsPassado
      ?.filter(app => app.payment_status === "PAID")
      .reduce((sum, app) => sum + (app.payment_amount || getPrice(app.service) || 0), 0) || 0

    // Calcular variações percentuais
    const variacaoReceita = receitaPassado > 0 ? ((receitaAtual - receitaPassado) / receitaPassado) * 100 : 0

    // Buscar alertas (contas em atraso)
    const { data: contasAtrasadas, error: errorAtraso } = await supabase
      .from("appointments")
      .select(`
        id,
        date,
        service:services(name, price),
        client:users!appointments_client_id_fkey(name),
        professional:professionals(user:users(name))
      `)
      .eq("payment_status", "OVERDUE")
      .order("date", { ascending: true })
      .limit(10)

    // Buscar dados para gráfico de evolução (últimos 6 meses)
    const seiseMesesAtras = subMonths(hoje, 5)
    const { data: evolucaoData, error: errorEvolucao } = await supabase
      .from("appointments")
      .select(`
        date,
        payment_amount,
        payment_status,
        service:services(price)
      `)
      .gte("date", format(startOfMonth(seiseMesesAtras), "yyyy-MM-dd"))
      .lte("date", format(fimMes, "yyyy-MM-dd"))
      .eq("payment_status", "PAID")

    // Agrupar evolução por mês
    const evolucaoPorMes = new Map()
    
    for (let i = 0; i < 6; i++) {
      const mes = subMonths(hoje, 5 - i)
      const mesAno = format(mes, "yyyy-MM")
      evolucaoPorMes.set(mesAno, {
        mes: format(mes, "MMM/yy"),
        entradas: 0,
        saidas: 0,
        saldo: 0,
      })
    }

    evolucaoData?.forEach((appointment: any) => {
      const mesAno = format(new Date(appointment.date), "yyyy-MM")
      if (evolucaoPorMes.has(mesAno)) {
        const valor = appointment.payment_amount || getPrice(appointment.service) || 0
        const node = evolucaoPorMes.get(mesAno)!
        node.entradas += valor
      }
    })

    // Evolução de saídas por mês (contas pagas)
    const { data: contasPagasPeriodo } = await supabase
      .from("contas_pagar")
      .select("data_pagamento, valor, status")
      .gte("data_pagamento", format(startOfMonth(seiseMesesAtras), "yyyy-MM-dd"))
      .lte("data_pagamento", format(fimMes, "yyyy-MM-dd"))
      .eq("status", "PAGO")

    contasPagasPeriodo?.forEach((cp: any) => {
      const mesAno = format(new Date(cp.data_pagamento), "yyyy-MM")
      if (evolucaoPorMes.has(mesAno)) {
        const node = evolucaoPorMes.get(mesAno)!
        node.saidas += Number(cp.valor || 0)
      }
    })

    // Calcular saldo acumulado
    const ordered = Array.from(evolucaoPorMes.entries()).sort(([a], [b]) => a.localeCompare(b))
    let acumulado = 0
    for (const [, v] of ordered) {
      acumulado += (v.entradas - v.saidas)
      v.saldo = acumulado
    }
    const evolucaoArray = ordered.map(([, v]) => v)

    // Preparar alertas
    const alertas = contasAtrasadas?.map((conta: any) => ({
      id: conta.id,
      tipo: "ATRASO",
      titulo: "Pagamento em Atraso",
      descricao: `${getName(conta.client)} - ${getName(conta.service)}`,
      valor: getPrice(conta.service) || 0,
      data: conta.date,
      profissional: getProfessionalName(conta.professional)
    })) || []

    const response = {
      resumo: {
        receita_mes: receitaAtual,
        variacao_receita: variacaoReceita,
        contas_pendentes: pendentesAtual,
        contas_atrasadas: atrasadosAtual,
        comissoes_mes: comissoesAtual,
        total_atendimentos: appointmentsAtual?.length || 0,
        a_pagar_mes: aPagarMes,
        pagar_atrasadas_mes: pagarAtrasadasMes,
        saidas_pagas_mes: saidasPagasMes,
        saldo_mes: receitaAtual - saidasPagasMes,
      },
      fluxo_caixa: evolucaoArray,
      alertas: alertas
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Erro na API do dashboard financeiro:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}