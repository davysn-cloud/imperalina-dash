"use client"

import * as React from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts"
import { CalendarDays, TrendingUp, TrendingDown, Award, PieChart as PieIcon } from "lucide-react"

// Types for local calculations
type SummaryMetrics = {
  totalRevenue: number
  ticketMedio: number
  ocupacaoPct: number // aproximação: agendamentos confirmados/completos vs totais
  npsMedio?: number
  sparkline: { date: string; value: number }[]
  revenueSource: "received" | "expected"
}

type ProfPerformance = {
  profissionalId: string
  nome: string
  atendimentos: number
  faturamento: number
  ticketMedio: number
  taxaConclusao: number
  nps?: number
  metaPct?: number
}

type ServiceRanking = {
  serviceId: string
  nome: string
  categoria?: string
  faturamento: number
  lucroLiquidoAprox: number
  realizacoes: number
  ticketMedio: number
  margemPctAprox: number
  participacaoPct: number
  tendencia?: "up" | "flat" | "down"
  varPct?: number
}

type SegmentSlice = {
  nome: string
  cor: string
  quantidade: number
  percentual: number
  valorMedio: number
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default function ReportsDashboard() {
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), [])
  const { toast } = useToast()
  const [periodo, setPeriodo] = React.useState<string>("ultimo_mes")
  const [comparar, setComparar] = React.useState<boolean>(false)
  const [dataInicio, setDataInicio] = React.useState<string>("")
  const [dataFim, setDataFim] = React.useState<string>("")

  const [summary, setSummary] = React.useState<SummaryMetrics | null>(null)
  const [summaryComparativo, setSummaryComparativo] = React.useState<SummaryMetrics | null>(null)
  const [profPerf, setProfPerf] = React.useState<ProfPerformance[]>([])
  const [services, setServices] = React.useState<ServiceRanking[]>([])
  const [segments, setSegments] = React.useState<SegmentSlice[]>([])
  const [loading, setLoading] = React.useState(false)
  const [trendingUp, setTrendingUp] = React.useState<ServiceRanking[]>([])
  const [trendingDown, setTrendingDown] = React.useState<ServiceRanking[]>([])
  const [recommendations, setRecommendations] = React.useState<string[]>([])
  const [seasonal, setSeasonal] = React.useState<{ month: string; revenue: number }[]>([])
  const [heatmap, setHeatmap] = React.useState<Array<{ day: number; hour: number; occupancy: number; avgAppointments: number; avgRevenue: number }>>([])
  const [peakCards, setPeakCards] = React.useState<Array<{ icon: string; title: string; value: string; subtitle: string; recommendation: string }>>([])

  const computeRange = React.useCallback(() => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let start: Date
    if (periodo === "ultimo_mes") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    } else if (periodo === "ultimo_trimestre") {
      start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    } else if (periodo === "ultimo_ano") {
      start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    } else {
      // personalizado
      const s = dataInicio ? new Date(dataInicio + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1)
      const e = dataFim ? new Date(dataFim + "T23:59:59") : end
      return { start: s, end: e }
    }
    return {
      start,
      end,
    }
  }, [periodo, dataInicio, dataFim])

  const computePreviousRange = React.useCallback((range: { start: Date; end: Date }) => {
    const diffMs = range.end.getTime() - range.start.getTime()
    const prevEnd = new Date(range.start.getTime())
    const prevStart = new Date(prevEnd.getTime() - diffMs)
    return { start: prevStart, end: prevEnd }
  }, [])

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const range = computeRange()
      const prevRange = comparar ? computePreviousRange(range) : null

      // Appointments in period
      const { data: appts, error } = await supabase
        .from("appointments")
        .select(
          `id, date, start_time, end_time, status, payment_status, payment_amount,
           client:users!appointments_client_id_fkey(name),
           professional:professionals(id, user:users(name)),
           service:services(id, name, price, commission_percentage)`
        )
        .gte("date", range.start.toISOString().slice(0, 10))
        .lte("date", range.end.toISOString().slice(0, 10))

      if (error) throw error
      const appointments = appts || []

      // Load global max capacity setting (admin-configurable)
      const { data: capRow } = await supabase
        .from("app_settings")
        .select("value_int")
        .eq("key", "max_capacity")
        .maybeSingle()
      const maxCapacity = (capRow?.value_int as number | null) ?? 100

      // Summary (recebido vs previsto)
      const paidAppointments = appointments.filter((a: any) => a.payment_status === "PAID")
      const consideredAppointments = paidAppointments.length > 0 
        ? paidAppointments 
        : appointments.filter((a: any) => ["CONFIRMED", "COMPLETED"].includes(a.status))
      const revenueSource: "received" | "expected" = paidAppointments.length > 0 ? "received" : "expected"
      const totalRevenue = consideredAppointments
        .reduce((sum: number, a: any) => sum + (a.payment_amount || a.service?.price || 0), 0)
      const totalAtendimentos = consideredAppointments.length
      const concluidos = appointments.filter((a: any) => a.status === "COMPLETED").length
      const ocupacaoPct = maxCapacity > 0 ? Math.min(100, Math.round((concluidos / maxCapacity) * 100)) : 0
      const ticketMedio = totalAtendimentos > 0 ? totalRevenue / totalAtendimentos : 0

      // Sparkline by day (segue a mesma regra dos appointments considerados)
      const byDay = new Map<string, number>()
      consideredAppointments.forEach((a: any) => {
        const key = a.date
        const val = a.payment_amount || a.service?.price || 0
        byDay.set(key, (byDay.get(key) || 0) + val)
      })
      const sparkline = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({
        date,
        value,
      }))

      const currentSummary: SummaryMetrics = {
        totalRevenue,
        ticketMedio,
        ocupacaoPct,
        npsMedio: undefined,
        sparkline,
        revenueSource,
      }

      setSummary(currentSummary)

      if (prevRange) {
        const { data: apptsPrev } = await supabase
          .from("appointments")
          .select(
            `id, date, status, payment_status, payment_amount,
             service:services(id, name, price)`
          )
          .gte("date", prevRange.start.toISOString().slice(0, 10))
          .lte("date", prevRange.end.toISOString().slice(0, 10))
        const appointmentsPrev = apptsPrev || []
        const concluidosPrev = appointmentsPrev.filter((a: any) => a.status === "COMPLETED").length
        const totalRevenuePrev = appointmentsPrev
          .filter((a: any) => a.payment_status === "PAID")
          .reduce((sum: number, a: any) => sum + (a.payment_amount || a.service?.price || 0), 0)
        const totalPrev = appointmentsPrev.length
        const ticketPrev = totalPrev > 0 ? totalRevenuePrev / totalPrev : 0
        const ocupPrevPct = maxCapacity > 0 ? Math.min(100, Math.round((concluidosPrev / maxCapacity) * 100)) : 0
        setSummaryComparativo({ totalRevenue: totalRevenuePrev, ticketMedio: ticketPrev, ocupacaoPct: ocupPrevPct, npsMedio: undefined, sparkline: [] })
      } else {
        setSummaryComparativo(null)
      }

      // Professionals performance
      const perfMap = new Map<string, ProfPerformance>()
      appointments.forEach((a: any) => {
        const id = a.professional?.id
        const nome = Array.isArray(a.professional?.user) ? a.professional?.user[0]?.name || "" : a.professional?.user?.name || ""
        const val = a.payment_amount || a.service?.price || 0
        if (!id) return
        if (!perfMap.has(id)) {
          perfMap.set(id, { profissionalId: id, nome, atendimentos: 0, faturamento: 0, ticketMedio: 0, taxaConclusao: 0 })
        }
        const p = perfMap.get(id)!
        p.atendimentos += 1
        p.faturamento += val
      })
      const perfs = Array.from(perfMap.values()).map((p) => ({
        ...p,
        ticketMedio: p.atendimentos > 0 ? p.faturamento / p.atendimentos : 0,
        taxaConclusao: p.atendimentos > 0 ? Math.round((appointments.filter((a: any) => a.professional?.id === p.profissionalId && a.status === "COMPLETED").length / p.atendimentos) * 100) : 0,
      }))
      setProfPerf(perfs)

      // Consumo de produtos por atendimento (custos reais)
      const appointmentIds = appointments.map((a: any) => a.id).filter(Boolean)
      const custosPorAtendimento = new Map<string, number>()
      if (appointmentIds.length > 0) {
        const { data: consumos, error: errCons } = await supabase
          .from("consumos_servicos_produtos")
          .select("appointment_id, quantidade, produto_id, produtos(preco_custo)")
          .in("appointment_id", appointmentIds)
        if (errCons) throw errCons
        (consumos || []).forEach((c: any) => {
          const precoCusto = Array.isArray(c.produtos) ? (c.produtos[0]?.preco_custo || 0) : (c.produtos?.preco_custo || 0)
          const custo = (precoCusto || 0) * (c.quantidade || 0)
          const key = c.appointment_id
          custosPorAtendimento.set(key, (custosPorAtendimento.get(key) || 0) + custo)
        })
      }

      // Services ranking com margem real (comissão + custo produtos)
      const svcMap = new Map<string, ServiceRanking>()
      let totalRevenueAll = 0
      appointments.forEach((a: any) => {
        const sid = a.service?.id
        const nome = a.service?.name || "Serviço"
        const val = a.payment_amount || a.service?.price || 0
        const pct = a.service?.commission_percentage || 0
        const comissao = val * (pct / 100)
        const custoProdutos = custosPorAtendimento.get(a.id) || 0
        totalRevenueAll += val
        if (!sid) return
        if (!svcMap.has(sid)) {
          svcMap.set(sid, { serviceId: sid, nome, faturamento: 0, lucroLiquidoAprox: 0, realizacoes: 0, ticketMedio: 0, margemPctAprox: 0, participacaoPct: 0, categoria: undefined })
        }
        const s = svcMap.get(sid)!
        s.faturamento += val
        s.lucroLiquidoAprox += Math.max(0, val - comissao - custoProdutos)
        s.realizacoes += 1
      })

      // Tendência por serviço (comparação com período anterior)
      let prevServiceRevenue = new Map<string, number>()
      if (summaryComparativo) {
        const { data: apptsPrevSvc } = await supabase
          .from("appointments")
          .select("id, payment_status, payment_amount, service:services(id, name, price)")
          .gte("date", computePreviousRange(computeRange()).start.toISOString().slice(0, 10))
          .lte("date", computePreviousRange(computeRange()).end.toISOString().slice(0, 10))
        const prevApps = apptsPrevSvc || []
        prevApps.forEach((a: any) => {
          const sid = a.service?.id
          const val = a.payment_status === "PAID" ? (a.payment_amount || a.service?.price || 0) : 0
          if (!sid) return
          prevServiceRevenue.set(sid, (prevServiceRevenue.get(sid) || 0) + val)
        })
      }

      const svcList = Array.from(svcMap.values()).map((s) => {
        const ticketMedio = s.realizacoes > 0 ? s.faturamento / s.realizacoes : 0
        const margemPctAprox = s.faturamento > 0 ? Math.round((s.lucroLiquidoAprox / s.faturamento) * 100) : 0
        const participacaoPct = totalRevenueAll > 0 ? Math.round((s.faturamento / totalRevenueAll) * 100) : 0
        const prevRev = prevServiceRevenue.get(s.serviceId) || 0
        const varPct = prevRev > 0 ? ((s.faturamento - prevRev) / prevRev) * 100 : 0
        let tendencia: "up" | "flat" | "down" = "flat"
        if (varPct > 5) tendencia = "up"
        else if (varPct < -5) tendencia = "down"
        return { ...s, ticketMedio, margemPctAprox, participacaoPct, tendencia, varPct }
      })
      setServices(svcList.sort((a, b) => b.faturamento - a.faturamento).slice(0, 10))

      // Trending up/down lists and automated recommendations
      const up = svcList
        .filter((s) => (s.varPct || 0) > 5)
        .sort((a, b) => (b.varPct || 0) - (a.varPct || 0))
        .slice(0, 5)
      const down = svcList
        .filter((s) => (s.varPct || 0) < -5)
        .sort((a, b) => (a.varPct || 0) - (b.varPct || 0))
        .slice(0, 5)
      setTrendingUp(up)
      setTrendingDown(down)
      const recs: string[] = []
      if (up.length > 0) {
        recs.push(`Impulsione ${up[0].nome} com combos e divulgação (cresceu ${Math.round(up[0].varPct || 0)}%).`)
      }
      if (down.length > 0) {
        recs.push(`Reveja preço/comunicação de ${down[0].nome}; queda de ${Math.round(Math.abs(down[0].varPct || 0))}%.`)
      }
      if ((summary?.ocupacaoPct || 0) < 60) {
        recs.push("Teste campanha de horário ocioso com descontos em horários vazios.")
      }
      setRecommendations(recs)

      // Seasonal Analysis - Last 12 months
      const now = new Date()
      const seasonalData: { month: string; revenue: number }[] = []
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        
        const { data: monthAppts } = await supabase
          .from("appointments")
          .select("status, payment_status, payment_amount, service:services(price)")
          .gte("date", monthStart.toISOString().slice(0, 10))
          .lte("date", monthEnd.toISOString().slice(0, 10))
        
        const received = (monthAppts || []).filter((a: any) => a.payment_status === "PAID")
        const consideredMonth = received.length > 0 
          ? received 
          : (monthAppts || []).filter((a: any) => ["CONFIRMED", "COMPLETED"].includes(a.status))
        const monthRevenue = (consideredMonth || [])
          .reduce((sum: number, a: any) => sum + (a.payment_amount || a.service?.price || 0), 0)
        
        seasonalData.push({
          month: monthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          revenue: monthRevenue
        })
      }
      setSeasonal(seasonalData)

      // Heatmap calculation - occupancy by day/hour
      // First get schedules to calculate capacity
      const { data: schedules } = await supabase
        .from("schedules")
        .select("day_of_week, start_time, end_time, professional_id")
      
      const capacityMap = new Map<string, number>() // key: "day-hour", value: capacity
      ;(schedules || []).forEach((sched: any) => {
        const startHour = parseInt(sched.start_time?.split(':')[0] || '8')
        const endHour = parseInt(sched.end_time?.split(':')[0] || '18')
        for (let hour = startHour; hour < endHour; hour++) {
          const key = `${sched.day_of_week}-${hour}`
          capacityMap.set(key, (capacityMap.get(key) || 0) + 1)
        }
      })

      // Calculate occupancy from appointments
      const heatmapData: Array<{
        day: number
        hour: number
        occupancy: number
        avgAppointments: number
        avgRevenue: number
      }> = []

      for (let day = 0; day < 7; day++) {
        for (let hour = 8; hour <= 20; hour++) {
          const dayAppts = appointments.filter((a: any) => {
            const apptDate = new Date(a.date + 'T' + a.start_time)
            const apptDay = apptDate.getDay() === 0 ? 6 : apptDate.getDay() - 1 // Convert Sunday=0 to Sunday=6
            const apptHour = apptDate.getHours()
            return apptDay === day && apptHour === hour
          })

          const capacity = capacityMap.get(`${day}-${hour}`) || 1
          const occupancy = (dayAppts.length / capacity) * 100
          const avgRevenue = dayAppts.reduce((sum: number, a: any) => 
            sum + (a.payment_amount || a.service?.price || 0), 0) / (dayAppts.length || 1)

          heatmapData.push({
            day,
            hour,
            occupancy: Math.min(occupancy, 100),
            avgAppointments: dayAppts.length,
            avgRevenue
          })
        }
      }
      setHeatmap(heatmapData)

      // Peak hour insight cards
      const busiestSlot = heatmapData.reduce((max, curr) => 
        curr.occupancy > max.occupancy ? curr : max, heatmapData[0] || { day: 0, hour: 8, occupancy: 0, avgAppointments: 0, avgRevenue: 0 })
      const idlestSlot = heatmapData.reduce((min, curr) => 
        curr.occupancy < min.occupancy ? curr : min, heatmapData[0] || { day: 0, hour: 8, occupancy: 100, avgAppointments: 0, avgRevenue: 0 })
      const mostProfitableSlot = heatmapData.reduce((max, curr) => 
        curr.avgRevenue > max.avgRevenue ? curr : max, heatmapData[0] || { day: 0, hour: 8, occupancy: 0, avgAppointments: 0, avgRevenue: 0 })
      
      const weeklyAvgOccupancy = heatmapData.reduce((sum, slot) => sum + slot.occupancy, 0) / (heatmapData.length || 1)
      
      const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
      
      const insightCards = [
        {
          icon: '🔥',
          title: 'Horário Mais Movimentado',
          value: `${dayNames[busiestSlot.day]} ${busiestSlot.hour}h`,
          subtitle: `${busiestSlot.occupancy.toFixed(1)}% de ocupação`,
          recommendation: 'Alocar mais profissionais'
        },
        {
          icon: '😴',
          title: 'Horário Mais Ocioso',
          value: `${dayNames[idlestSlot.day]} ${idlestSlot.hour}h`,
          subtitle: `${idlestSlot.occupancy.toFixed(1)}% de ocupação`,
          recommendation: 'Criar promoções especiais'
        },
        {
          icon: '💰',
          title: 'Horário Mais Rentável',
          value: `${dayNames[mostProfitableSlot.day]} ${mostProfitableSlot.hour}h`,
          subtitle: `${formatCurrency(mostProfitableSlot.avgRevenue)}/hora média`,
          recommendation: 'Clientes dispostos a pagar mais'
        },
        {
          icon: '📊',
          title: 'Taxa Média Semanal',
          value: `${weeklyAvgOccupancy.toFixed(1)}%`,
          subtitle: 'Capacidade utilizada',
          recommendation: weeklyAvgOccupancy < 60 ? 'Abaixo da meta' : weeklyAvgOccupancy > 80 ? 'Acima da meta' : 'Na meta'
        }
      ]
      setPeakCards(insightCards)

      // Client segments (VIP/Regular/Ocasional/Inativo)
      const clientSpend = new Map<string, number>()
      const clientVisits = new Map<string, number>()
      appointments.forEach((a: any) => {
        const cid = a.client?.id || ""
        const val = a.payment_status === "PAID" ? (a.payment_amount || a.service?.price || 0) : 0
        if (!cid) return
        clientSpend.set(cid, (clientSpend.get(cid) || 0) + val)
        clientVisits.set(cid, (clientVisits.get(cid) || 0) + 1)
      })
      let vip = 0, regular = 0, ocasional = 0, inativo = 0
      clientSpend.forEach((val, cid) => {
        const visits = clientVisits.get(cid) || 0
        if (val >= 300) vip++
        else if (visits >= 2 && visits <= 4) regular++
        else if (visits > 0 && visits < 2) ocasional++
        else inativo++
      })
      const totalClientsSeg = vip + regular + ocasional + inativo || 1
      const segs: SegmentSlice[] = [
        { nome: "VIP", cor: "#7c3aed", quantidade: vip, percentual: Math.round((vip / totalClientsSeg) * 100), valorMedio: 0 },
        { nome: "Regular", cor: "#2563eb", quantidade: regular, percentual: Math.round((regular / totalClientsSeg) * 100), valorMedio: 0 },
        { nome: "Ocasional", cor: "#f59e0b", quantidade: ocasional, percentual: Math.round((ocasional / totalClientsSeg) * 100), valorMedio: 0 },
        { nome: "Inativo", cor: "#6b7280", quantidade: inativo, percentual: Math.round((inativo / totalClientsSeg) * 100), valorMedio: 0 },
      ]
      setSegments(segs)
    } catch (e: any) {
      toast({ title: "Erro ao carregar relatórios", description: e.message || String(e), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [supabase, comparar, computeRange, computePreviousRange, toast])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ultimo_mes">Último mês</SelectItem>
              <SelectItem value="ultimo_trimestre">Último trimestre</SelectItem>
              <SelectItem value="ultimo_ano">Último ano</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {periodo === "personalizado" && (
            <div className="flex items-center gap-2">
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              <span>até</span>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              <Button variant="outline" onClick={loadData}>Aplicar</Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={comparar} onCheckedChange={setComparar} />
          <span className="text-sm">Comparar com período anterior</span>
        </div>
      </div>

      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList>
          <TabsTrigger value="insights">Análise de Performance</TabsTrigger>
          <TabsTrigger value="profissionais">Performance por Profissional</TabsTrigger>
          <TabsTrigger value="tendencias">Análise de Tendências</TabsTrigger>
        </TabsList>

        {/* 2.1 Dashboard de Insights */}
        <TabsContent value="insights" className="space-y-4">
          {/* Métricas Principais */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
                <div className="flex items-center gap-2">
                  {summary && summaryComparativo && (
                    summary.totalRevenue >= (summaryComparativo?.totalRevenue || 0) ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )
                  )}
                  {summary?.revenueSource === "expected" && (
                    <Badge variant="outline">Previsto</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary?.totalRevenue || 0)}</div>
                {comparar && summary && summaryComparativo && (
                  <div className="text-xs">
                    {(() => {
                      const prev = summaryComparativo.totalRevenue || 0
                      const curr = summary.totalRevenue || 0
                      const varPct = prev > 0 ? (((curr - prev) / prev) * 100).toFixed(1) : "0.0"
                      const positive = Number(varPct) >= 0
                      return (
                        <span className={positive ? "text-green-600" : "text-red-600"}>
                          {positive ? "+" : ""}{varPct}% vs período anterior
                        </span>
                      )
                    })()}
                  </div>
                )}
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary?.sparkline || []}>
                      <XAxis dataKey="date" hide />
                      <Tooltip />
                      <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b98122" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <Award className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary?.ticketMedio || 0)}</div>
                {comparar && summary && summaryComparativo && (
                  <div className="text-xs text-muted-foreground">vs período anterior</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Ocupação</CardTitle>
                <CalendarDays className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Progress value={summary?.ocupacaoPct || 0} className="w-32" />
                  <span className={
                    (summary?.ocupacaoPct || 0) >= 80 ? "text-green-600" : (summary?.ocupacaoPct || 0) >= 60 ? "text-yellow-600" : "text-red-600"
                  }>
                    {(summary?.ocupacaoPct || 0)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">capacidade utilizada (aprox.)</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">NPS Médio</CardTitle>
                <Badge variant="outline">Em breve</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(summary?.npsMedio ?? 0).toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">satisfação geral</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance por Profissional */}
        <TabsContent value="profissionais" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ranking de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-right">Atendimentos</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                      <TableHead className="text-right">Satisfação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profPerf.sort((a, b) => b.faturamento - a.faturamento).map((p, idx) => (
                      <TableRow key={p.profissionalId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={idx === 0 ? "default" : "outline"}>{`#${idx + 1}`}</Badge>
                            {idx < 3 && <span>{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</span>}
                          </div>
                        </TableCell>
                        <TableCell className={idx === 0 ? "font-semibold" : ""}>{p.nome || "Profissional"}</TableCell>
                        <TableCell className="text-right">{p.atendimentos}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.faturamento)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.ticketMedio)}</TableCell>
                        <TableCell className="text-right">{p.taxaConclusao}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Insights automáticos (exemplo): destaque para crescimento, liderança e atenção a NPS.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Análise de Tendências */}
        <TabsContent value="tendencias" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Coluna 1 - Em Alta */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  🔥 Em Alta
                </CardTitle>
                <Badge variant="default">Top 5</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendingUp.slice(0, 5).map((service, idx) => (
                  <div key={service.serviceId} className="flex items-center justify-between p-3 border rounded-md bg-green-50">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="font-medium text-sm">{service.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          Cresceu +{service.varPct?.toFixed(1)}% vs período anterior
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      +{service.varPct?.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
                {trendingUp.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhum serviço em alta no período
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coluna 2 - Em Baixa */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  📉 Em Baixa
                </CardTitle>
                <Badge variant="destructive">Top 5</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendingDown.slice(0, 5).map((service, idx) => (
                  <div key={service.serviceId} className="flex items-center justify-between p-3 border rounded-md bg-red-50">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <div>
                        <div className="font-medium text-sm">{service.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          Caiu {service.varPct?.toFixed(1)}% vs período anterior
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      {service.varPct?.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
                {trendingDown.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhum serviço em baixa no período
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coluna 3 - Recomendações */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  💡 Recomendações
                </CardTitle>
                <Badge variant="outline">Automáticas</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="p-3 border rounded-md bg-blue-50">
                    <div className="text-sm font-medium text-blue-900">{rec}</div>
                  </div>
                ))}
                {recommendations.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhuma recomendação disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Análise Sazonal */}
          <Card>
            <CardHeader>
              <CardTitle>Análise Sazonal - Últimos 12 Meses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={seasonal}>
                    <XAxis dataKey="month" />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), "Faturamento"]}
                      labelFormatter={(label) => `Mês: ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                <div className="text-center p-3 border rounded-md">
                  <div className="text-sm text-muted-foreground">Mês Mais Forte</div>
                  <div className="font-semibold">
                    {seasonal.length > 0 ? seasonal.reduce((max, curr) => curr.revenue > max.revenue ? curr : max).month : "N/A"}
                  </div>
                </div>
                <div className="text-center p-3 border rounded-md">
                  <div className="text-sm text-muted-foreground">Mês Mais Fraco</div>
                  <div className="font-semibold">
                    {seasonal.length > 0 ? seasonal.reduce((min, curr) => curr.revenue < min.revenue ? curr : min).month : "N/A"}
                  </div>
                </div>
                <div className="text-center p-3 border rounded-md">
                  <div className="text-sm text-muted-foreground">Variação Anual</div>
                  <div className="font-semibold">
                    {seasonal.length >= 2 ? 
                      `${(((seasonal[seasonal.length-1]?.revenue || 0) - (seasonal[0]?.revenue || 0)) / (seasonal[0]?.revenue || 1) * 100).toFixed(1)}%` 
                      : "N/A"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>

      {/* Horários de Pico (fora do menu de abas) */}
      <div className="space-y-4">
        {/* Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Calor - Taxa de Ocupação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Cabeçalho dos dias */}
              <div className="grid grid-cols-8 gap-1 text-xs font-medium text-center">
                <div></div>
                <div>Seg</div>
                <div>Ter</div>
                <div>Qua</div>
                <div>Qui</div>
                <div>Sex</div>
                <div>Sáb</div>
                <div>Dom</div>
              </div>
              
              {/* Grid do heatmap */}
              {Array.from({ length: 13 }, (_, hourIdx) => {
                const hour = hourIdx + 8; // 8h às 20h
                return (
                  <div key={hour} className="grid grid-cols-8 gap-1">
                    <div className="text-xs font-medium text-right pr-2 py-1">
                      {hour}:00
                    </div>
                    {Array.from({ length: 7 }, (_, dayIdx) => {
                      const heatData = heatmap.find(h => h.day === dayIdx && h.hour === hour);
                      const occupancy = heatData?.occupancy || 0;
                      
                      let bgColor = "bg-blue-100"; // <30%
                      if (occupancy >= 90) bgColor = "bg-red-500";
                      else if (occupancy >= 70) bgColor = "bg-orange-400";
                      else if (occupancy >= 50) bgColor = "bg-yellow-300";
                      else if (occupancy >= 30) bgColor = "bg-green-300";
                      
                      return (
                        <div
                          key={`${dayIdx}-${hour}`}
                          className={`h-8 rounded cursor-pointer ${bgColor} flex items-center justify-center text-xs font-medium transition-all hover:scale-105`}
                          title={`${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][dayIdx]} ${hour}:00\nOcupação: ${occupancy.toFixed(1)}%\nAtendimentos: ${heatData?.avgAppointments || 0}\nFaturamento: ${formatCurrency(heatData?.avgRevenue || 0)}`}
                        >
                          {occupancy > 0 ? `${occupancy.toFixed(0)}%` : ""}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            
            {/* Legenda */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-100 rounded"></div>
                <span>&lt;30%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-300 rounded"></div>
                <span>30-50%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-300 rounded"></div>
                <span>50-70%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-orange-400 rounded"></div>
                <span>70-90%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>&gt;90%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Insights */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {peakCards.map((card, idx) => (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span>{card.icon}</span>
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <div className="text-xs text-muted-foreground">{card.subtitle}</div>
                <div className="text-xs text-blue-600 mt-2">{card.recommendation}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Oportunidades Identificadas */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 Oportunidades Identificadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-4 border rounded-md bg-yellow-50">
                <div className="font-medium text-sm mb-2">💡 Criar Promoções</div>
                <div className="text-xs text-muted-foreground">
                  Oferecer descontos em horários de baixa ocupação (&lt;30%) para aumentar demanda
                </div>
              </div>
              <div className="p-4 border rounded-md bg-green-50">
                <div className="font-medium text-sm mb-2">⚡ Otimizar Recursos</div>
                <div className="text-xs text-muted-foreground">
                  Realocar profissionais para horários de pico (&gt;90%) para maximizar receita
                </div>
              </div>
              <div className="p-4 border rounded-md bg-blue-50">
                <div className="font-medium text-sm mb-2">📈 Estender Horários</div>
                <div className="text-xs text-muted-foreground">
                  Considerar ampliar funcionamento em dias de alta demanda
                </div>
              </div>
              <div className="p-4 border rounded-md bg-purple-50">
                <div className="font-medium text-sm mb-2">💰 Preços Dinâmicos</div>
                <div className="text-xs text-muted-foreground">
                  Implementar preços premium em horários de alta concorrência
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}