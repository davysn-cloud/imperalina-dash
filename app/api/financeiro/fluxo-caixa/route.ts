import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get("periodo") || "6" // últimos 6 meses por padrão

    const mesesAtras = parseInt(periodo)
    const dataInicio = startOfMonth(subMonths(new Date(), mesesAtras - 1))
    const dataFim = endOfMonth(new Date())

    // Buscar todos os pagamentos no período
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        id,
        date,
        payment_date,
        payment_amount,
        payment_method,
        payment_status,
        service:services(
          name,
          price
        ),
        client:users!appointments_client_id_fkey(
          name
        ),
        professional:professionals(
          user:users(name)
        )
      `)
      .gte("date", format(dataInicio, "yyyy-MM-dd"))
      .lte("date", format(dataFim, "yyyy-MM-dd"))
      .not("payment_status", "is", null)
      .order("date", { ascending: true })

    if (error) {
      console.error("Erro ao buscar fluxo de caixa:", error)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

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
    const getProfessionalName = (rel: any): string | undefined => {
      if (!rel) return undefined
      const node = Array.isArray(rel) ? rel[0] : rel
      const user = node?.user
      if (Array.isArray(user)) return user[0]?.name
      return user?.name
    }

    // Agrupar por mês
    const fluxoPorMes = new Map<string, { mes: string; entradas: number; saidas: number; saldo: number }>()
    interface Movimentacao {
      id: string
      data: string | Date
      tipo: "ENTRADA" | "PENDENTE"
      descricao: string
      valor: number
      metodo: string
      status: string
      profissional: string
    }
    const movimentacoes: Movimentacao[] = []

    appointments?.forEach((appointment: any) => {
      const dataMovimentacao = appointment.payment_date || appointment.date
      const mesAno = format(new Date(dataMovimentacao), "yyyy-MM")
      const valor = appointment.payment_amount || getPrice(appointment.service) || 0

      // Agrupar por mês
      if (!fluxoPorMes.has(mesAno)) {
        fluxoPorMes.set(mesAno, {
          mes: mesAno,
          entradas: 0,
          saidas: 0,
          saldo: 0,
        })
      }

      const mesData = fluxoPorMes.get(mesAno)!
      
      if (appointment.payment_status === "PAID") {
        mesData.entradas += valor
      }
      
      mesData.saldo = mesData.entradas - mesData.saidas

      // Adicionar à lista de movimentações
      movimentacoes.push({
        id: appointment.id,
        data: dataMovimentacao,
        tipo: appointment.payment_status === "PAID" ? "ENTRADA" : "PENDENTE",
        descricao: `${getName(appointment.service) || "Serviço"} - ${getName(appointment.client) || "Cliente"}`,
        valor: valor,
        metodo: appointment.payment_method || "Não informado",
        status: appointment.payment_status,
        profissional: getProfessionalName(appointment.professional) || "Não informado",
      })
    })

    // Converter Map para Array e ordenar
    const evolucaoMensal = Array.from(fluxoPorMes.values()).sort((a, b) => a.mes.localeCompare(b.mes))

    // Calcular totais
    const totalEntradas = evolucaoMensal.reduce((sum, mes) => sum + mes.entradas, 0)
    const totalSaidas = evolucaoMensal.reduce((sum, mes) => sum + mes.saidas, 0)
    const saldoAtual = totalEntradas - totalSaidas

    // Calcular estatísticas por método de pagamento
    const estatisticasPorMetodo = new Map<string, { metodo: string; total: number; quantidade: number }>()
    
    appointments?.forEach((appointment: any) => {
      if (appointment.payment_status === "PAID" && appointment.payment_method) {
        const metodo = appointment.payment_method as string
        const valor = appointment.payment_amount || getPrice(appointment.service) || 0

        if (!estatisticasPorMetodo.has(metodo)) {
          estatisticasPorMetodo.set(metodo, {
            metodo,
            total: 0,
            quantidade: 0,
          })
        }

        const metodoData = estatisticasPorMetodo.get(metodo)!
        metodoData.total += valor
        metodoData.quantidade += 1
      }
    })

    const response = {
      resumo: {
        total_entradas: totalEntradas,
        total_saidas: totalSaidas,
        saldo_atual: saldoAtual,
        periodo: `${format(dataInicio, "MM/yyyy")} - ${format(dataFim, "MM/yyyy")}`,
      },
      evolucao_mensal: evolucaoMensal,
      movimentacoes: movimentacoes.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
      estatisticas_metodos: Array.from(estatisticasPorMetodo.values()),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Erro na API de fluxo de caixa:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}