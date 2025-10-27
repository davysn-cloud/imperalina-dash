"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, Brush, ReferenceLine } from "recharts"
import { TrendingUp, TrendingDown, Share2, Pencil, Clock, DollarSign, FileDown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function diffDays(a: Date, b: Date) {
  return Math.abs(Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)))
}

function computeRange(periodo: string) {
  const end = new Date()
  const start = new Date()
  switch (periodo) {
    case "ultimo_mes":
      start.setMonth(start.getMonth() - 1)
      break
    case "ultimos_3_meses":
      start.setMonth(start.getMonth() - 3)
      break
    case "ultimos_12_meses":
      start.setMonth(start.getMonth() - 12)
      break
    default:
      start.setMonth(start.getMonth() - 1)
  }
  return { start, end }
}

function computePreviousRange(curr: { start: Date; end: Date }) {
  const lengthDays = diffDays(curr.end, curr.start)
  const prevEnd = new Date(curr.start)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - lengthDays)
  return { start: prevStart, end: prevEnd }
}

export default function ServiceDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), [])
  const { toast } = useToast()

  const [periodo, setPeriodo] = React.useState<string>("ultimos_12_meses")
  const [loading, setLoading] = React.useState(false)

  const [header, setHeader] = React.useState<{ name: string; category?: string; price: number; duration: number; icon?: string } | null>(null)
  const [cards, setCards] = React.useState({
    totalRealizado: { qtd: 0, tendência: "flat" as "up" | "flat" | "down", comparacaoPct: 0 },
    faturamento: { total: 0, sharePct: 0, rankingPos: 0, rankingTotal: 0 },
    margem: { pct: 0, lucroMedio: 0, classif: "regular" as "excelente" | "boa" | "regular" | "baixa" },
    duracao: { mediaMin: 0, padraoMin: 0, faturamentoHora: 0 },
    recompra: { pctClientes: 0, clientesUnicos: 0, intervaloMedioDias: 0 },
  })
  const [evolucao, setEvolucao] = React.useState<Array<{ month: string; qtd: number; revenue: number; margemPct: number; avgPrice: number }>>([])
  const [events, setEvents] = React.useState<Array<{ month: string; label: string; color: string }>>([])
  const [custos, setCustos] = React.useState<{ produtos: number; comissao: number; custoTotal: number; lucro: number; preco: number } | null>(null)
  const [market, setMarket] = React.useState<{ avgPrice: number; pos: "competitivo" | "na_média" | "acima"; suggestion: string; margemSegurancaPct: number } | null>(null)

  const load = React.useCallback(async () => {
    try {
      setLoading(true)
      const range = computeRange(periodo)
      const prevRange = computePreviousRange(range)

      // Header info
      const { data: svc, error: errSvc } = await supabase
        .from("services")
        .select("id,name,description,duration,price,commission_percentage,professional:professionals(id),category")
        .eq("id", id)
        .single()
      if (errSvc) throw errSvc
      setHeader({ name: svc.name, category: svc.category || undefined, price: Number(svc.price || 0), duration: Number(svc.duration || 0) })
      const commissionPct = Number(svc.commission_percentage || 0)

      // Appointments for this service
      const { data: appts, error } = await supabase
        .from("appointments")
        .select("id, client_id, date, start_time, end_time, status, payment_status, payment_amount, service:services(price)")
        .eq("service_id", id)
        .gte("date", range.start.toISOString().slice(0, 10))
        .lte("date", range.end.toISOString().slice(0, 10))
      if (error) throw error
      const appointments = appts || []

      // Previous period for comparisons
      const { data: apptsPrev } = await supabase
        .from("appointments")
        .select("id, status, payment_status, payment_amount, service:services(price)")
        .eq("service_id", id)
        .gte("date", prevRange.start.toISOString().slice(0, 10))
        .lte("date", prevRange.end.toISOString().slice(0, 10))
      const prevAppointments = apptsPrev || []

      // Costs per appointment (products)
      const appointmentIds = (appointments || []).map((a: any) => a.id).filter(Boolean)
      const { data: consumos } = appointmentIds.length
        ? await supabase
            .from("consumos_servicos_produtos")
            .select("appointment_id, quantidade, produto_id, produtos(preco_custo)")
            .in("appointment_id", appointmentIds)
        : ({ data: [] } as any)
      const custoMap = new Map<string, number>()
      ;(consumos || []).forEach((c: any) => {
        const precoCusto = Array.isArray(c.produtos) ? (c.produtos[0]?.preco_custo || 0) : (c.produtos?.preco_custo || 0)
        const custo = (precoCusto || 0) * (c.quantidade || 0)
        custoMap.set(c.appointment_id, (custoMap.get(c.appointment_id) || 0) + custo)
      })

      // Revenue and metrics for service
      const paid = appointments.filter((a: any) => a.payment_status === "PAID")
      const considered = paid.length > 0 ? paid : appointments.filter((a: any) => ["CONFIRMED", "COMPLETED"].includes(a.status))
      const totalRealizadoQtd = considered.length
      const totalRevenue = considered.reduce((sum: number, a: any) => sum + (a.payment_amount || a.service?.price || 0), 0)
      const duracoes = considered.map((a: any) => {
        const start = new Date(`${a.date}T${a.start_time}`)
        const end = new Date(`${a.date}T${a.end_time}`)
        return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60)))
      })
      const mediaMin = duracoes.length > 0 ? Math.round(duracoes.reduce((s, v) => s + v, 0) / duracoes.length) : 0
      const faturamentoHora = mediaMin > 0 && totalRealizadoQtd > 0 ? Math.round((totalRevenue / ((mediaMin / 60) * totalRealizadoQtd)) * 100) / 100 : 0

      // Margin per appointment: price - commission - product costs
      const lucroTotal = considered.reduce((sum: number, a: any) => {
        const val = a.payment_amount || a.service?.price || 0
        const comissao = val * (commissionPct / 100)
        const custos = custoMap.get(a.id) || 0
        return sum + Math.max(0, val - comissao - custos)
      }, 0)
      const margemPct = totalRevenue > 0 ? Math.round((lucroTotal / totalRevenue) * 100) : 0
      const lucroMedio = totalRealizadoQtd > 0 ? Math.round((lucroTotal / totalRealizadoQtd) * 100) / 100 : 0
      const classif = margemPct > 50 ? "excelente" : margemPct >= 30 ? "boa" : margemPct >= 15 ? "regular" : "baixa"

      // Comparação e tendência
      const prevRevenue = prevAppointments
        .filter((a: any) => a.payment_status === "PAID" || ["CONFIRMED", "COMPLETED"].includes(a.status))
        .reduce((sum: number, a: any) => sum + (a.payment_amount || a.service?.price || 0), 0)
      const prevQtd = prevAppointments.filter((a: any) => a.payment_status === "PAID" || ["CONFIRMED", "COMPLETED"].includes(a.status)).length
      const varQtdPct = prevQtd > 0 ? Math.round(((totalRealizadoQtd - prevQtd) / prevQtd) * 100) : 0
      const tendencia = varQtdPct > 5 ? "up" : varQtdPct < -5 ? "down" : "flat"

      // Share e ranking
      const { data: allAppts } = await supabase
        .from("appointments")
        .select("id, service_id, status, payment_status, payment_amount, service:services(price)")
        .gte("date", range.start.toISOString().slice(0, 10))
        .lte("date", range.end.toISOString().slice(0, 10))
      const allConsidered = (allAppts || []).filter((a: any) => a.payment_status === "PAID" || ["CONFIRMED", "COMPLETED"].includes(a.status))
      const totalEmpresa = allConsidered.reduce((sum: number, a: any) => sum + (a.payment_amount || a.service?.price || 0), 0)
      const sharePct = totalEmpresa > 0 ? Math.round((totalRevenue / totalEmpresa) * 100) : 0
      const revenueByService = new Map<string, number>()
      allConsidered.forEach((a: any) => {
        const sid = a.service_id
        const val = a.payment_amount || a.service?.price || 0
        revenueByService.set(sid, (revenueByService.get(sid) || 0) + val)
      })
      const ranking = Array.from(revenueByService.entries()).sort((a, b) => b[1] - a[1])
      const rankingPos = ranking.findIndex((r) => r[0] === id) + 1

      // Recompra e clientes
      const clients = new Map<string, Date[]>()
      allConsidered
        .filter((a: any) => a.service_id === id)
        .forEach((a: any) => {
          const arr = clients.get(a.client_id) || []
          arr.push(new Date(`${a.date}T${a.start_time}`))
          clients.set(a.client_id, arr)
        })
      const clientesUnicos = clients.size
      let returning = 0
      let intervals: number[] = []
      clients.forEach((dates) => {
        dates.sort((a, b) => a.getTime() - b.getTime())
        if (dates.length > 1) returning += 1
        for (let i = 1; i < dates.length; i++) {
          intervals.push(diffDays(dates[i], dates[i - 1]))
        }
      })
      const taxaRecompraPct = clientesUnicos > 0 ? Math.round((returning / clientesUnicos) * 100) : 0
      const intervaloMedioDias = intervals.length > 0 ? Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length) : 0

      // Evolução 12 meses
      const now = new Date()
      const evoData: Array<{ month: string; qtd: number; revenue: number; margemPct: number; avgPrice: number }> = []
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        const { data: monthAppts } = await supabase
          .from("appointments")
          .select("id,status,payment_status,payment_amount,service:services(price,commission_percentage)")
          .eq("service_id", id)
          .gte("date", monthStart.toISOString().slice(0, 10))
          .lte("date", monthEnd.toISOString().slice(0, 10))
        const received = (monthAppts || []).filter((a: any) => a.payment_status === "PAID")
        const consideredMonth = received.length > 0 ? received : (monthAppts || []).filter((a: any) => ["CONFIRMED", "COMPLETED"].includes(a.status))
        const qtd = consideredMonth.length
        const revenue = consideredMonth.reduce((sum: number, a: any) => sum + (a.payment_amount || a.service?.price || 0), 0)
        const margemMonth = consideredMonth.reduce((sum: number, a: any) => {
          const val = a.payment_amount || a.service?.price || 0
          const comissao = val * ((a.service?.commission_percentage || commissionPct) / 100)
          const custos = 0 // sem consumo mensal detalhado
          return sum + Math.max(0, val - comissao - custos)
        }, 0)
        const margemPct = revenue > 0 ? Math.round((margemMonth / revenue) * 100) : 0
        const avgPrice = qtd > 0 ? Math.round((revenue / qtd) * 100) / 100 : 0
        evoData.push({ month: monthDate.toLocaleDateString("pt-BR", { month: "short" }), qtd, revenue, margemPct, avgPrice })
      }

      // Custos e lucro (média do período atual)
      const custosProdutosTotal = (consumos || []).reduce((sum: number, c: any) => {
        const precoCusto = Array.isArray(c.produtos) ? (c.produtos[0]?.preco_custo || 0) : (c.produtos?.preco_custo || 0)
        return sum + (precoCusto || 0) * (c.quantidade || 0)
      }, 0)
      const comissaoTotal = considered.reduce((sum: number, a: any) => {
        const val = a.payment_amount || a.service?.price || 0
        return sum + val * (commissionPct / 100)
      }, 0)
      const custoTotal = custosProdutosTotal + comissaoTotal
      const lucro = Math.max(0, totalRevenue - custoTotal)
      setCustos({ produtos: custosProdutosTotal, comissao: comissaoTotal, custoTotal, lucro, preco: Number(svc.price || 0) })

      // Market comparison (categoria média)
      const { data: sameCat } = await supabase
        .from("services")
        .select("id,price,category")
        .eq("category", svc.category)
      const avgPrice = (sameCat || []).reduce((s: number, r: any) => s + Number(r.price || 0), 0) / Math.max(1, (sameCat || []).length)
      const pos = svc.price < avgPrice * 0.9 ? "competitivo" : svc.price <= avgPrice * 1.1 ? "na_média" : "acima"
      const suggestion = pos === "acima" ? "Considere ajuste para ficar próximo da média do mercado." : pos === "competitivo" ? "Há margem para pequeno aumento sem perder competitividade." : "Preço alinhado ao mercado."
      const margemSegurancaPct = Math.round(((Number(svc.price) - avgPrice) / Math.max(1, avgPrice)) * 100)
      setMarket({ avgPrice: Math.round(avgPrice * 100) / 100, pos, suggestion, margemSegurancaPct })

      // Atualizar cards
      setCards({
        totalRealizado: { qtd: totalRealizadoQtd, tendência: tendencia, comparacaoPct: varQtdPct },
        faturamento: { total: totalRevenue, sharePct, rankingPos, rankingTotal: ranking.length },
        margem: { pct: margemPct, lucroMedio: lucroMedio, classif },
        duracao: { mediaMin, padraoMin: Number(svc.duration || 0), faturamentoHora },
        recompra: { pctClientes: taxaRecompraPct, clientesUnicos, intervaloMedioDias },
      })
      setEvolucao(evoData)
      // Detect event markers (mudanças relevantes de preço médio)
      const markers: Array<{ month: string; label: string; color: string }> = []
      for (let i = 1; i < evoData.length; i++) {
        const prev = evoData[i - 1].avgPrice
        const curr = evoData[i].avgPrice
        if (prev > 0) {
          const changePct = Math.round(((curr - prev) / prev) * 100)
          if (Math.abs(changePct) >= 8) {
            markers.push({ month: evoData[i].month, label: `${changePct > 0 ? "+" : ""}${changePct}% ajuste de preço`, color: changePct > 0 ? "#7C3AED" : "#F59E0B" })
          }
        }
      }
      setEvents(markers)
    } catch (e: any) {
      toast({ title: "Erro ao carregar análise do serviço", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [id, periodo, supabase, toast])

  React.useEffect(() => {
    load()
  }, [load])

  // Export chart image
  const chartRef = React.useRef<HTMLDivElement | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const exportChart = async () => {
    try {
      const el = chartRef.current
      if (!el) return
      const canvas = await import("html2canvas").then((m) => m.default(el))
      const url = canvas.toDataURL("image/png")
      const a = document.createElement("a")
      a.href = url
      a.download = `analise-servico-${id}.png`
      a.click()
    } catch (e) {
      toast({ title: "Falha ao exportar imagem", description: String(e), variant: "destructive" })
    }
  }
  // Export PDF do relatório
  const exportPdf = async () => {
    try {
      const el = containerRef.current
      if (!el) return
      const html2canvas = (await import("html2canvas")).default
      const { jsPDF } = await import("jspdf")
      const canvas = await html2canvas(el, { scale: 2 })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({ unit: "pt", format: "a4" })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let position = 0
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight)
      } else {
        // multipáginas
        let heightLeft = imgHeight
        while (heightLeft > 0) {
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
          if (heightLeft > 0) {
            pdf.addPage()
            position = 0 - (imgHeight - heightLeft)
          }
        }
      }
      pdf.save(`relatorio-servico-${id}.pdf`)
    } catch (e) {
      toast({ title: "Falha ao exportar PDF", description: String(e), variant: "destructive" })
    }
  }
  return (
    <div ref={containerRef} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xl font-bold">{header?.name || "Serviço"}</div>
            <div className="text-sm text-muted-foreground">{header?.category || "Sem categoria"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-600">{formatCurrency(header?.price || 0)}</Badge>
          <Button variant="outline" asChild>
            <Link href={`/services/${id}/edit`}><Pencil className="h-4 w-4 mr-1" />Editar</Link>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Clock className="h-4 w-4 mr-1" />Histórico de Preços
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px]">
              <DialogHeader>
                <DialogTitle>Histórico de Preços (12 meses)</DialogTitle>
              </DialogHeader>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={evolucao}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avgPrice" stroke="#374151" name="Preço Médio" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Preço médio calculado por mês com base nos atendimentos do serviço.</div>
              <div className="mt-2 max-h-40 overflow-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Preço Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evolucao.map((m) => (
                      <TableRow key={m.month}>
                        <TableCell>{m.month}</TableCell>
                        <TableCell className="text-right">{formatCurrency(m.avgPrice || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => navigator.clipboard.writeText(window.location.href)}>
            <Share2 className="h-4 w-4 mr-1" />Compartilhar Relatório
          </Button>
        </div>
      </div>

      {/* Seção 1: Cards de Performance */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Realizado</CardTitle>
            {cards.totalRealizado.tendência === "up" ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : cards.totalRealizado.tendência === "down" ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cards.totalRealizado.qtd}</div>
            <div className="text-xs">{cards.totalRealizado.comparacaoPct >= 0 ? "+" : ""}{cards.totalRealizado.comparacaoPct}% vs período anterior</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(cards.faturamento.total)}</div>
            <div className="text-xs text-muted-foreground">{cards.faturamento.sharePct}% do faturamento total • Ranking #{cards.faturamento.rankingPos} de {cards.faturamento.rankingTotal}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem Líquida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold {cards.margem.pct > 0 ? 'text-green-600' : ''}">{cards.margem.pct}%</div>
            <div className="text-xs">Lucro médio por atendimento: {formatCurrency(cards.margem.lucroMedio)} • {cards.margem.classif}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cards.duracao.mediaMin} min</div>
            <div className="text-xs text-muted-foreground">Padrão: {cards.duracao.padraoMin} min • Faturamento/hora: {formatCurrency(cards.duracao.faturamentoHora)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Recompra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cards.recompra.pctClientes}%</div>
            <div className="text-xs text-muted-foreground">Clientes únicos: {cards.recompra.clientesUnicos} • Intervalo médio: {cards.recompra.intervaloMedioDias} dias</div>
          </CardContent>
        </Card>
      </div>

      {/* Seção 2: Gráfico de Evolução */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Últimos 12 Meses</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportChart}>Exportar Imagem</Button>
            <Button variant="outline" size="sm" onClick={exportPdf}><FileDown className="h-4 w-4 mr-1" />Exportar PDF</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={chartRef} className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evolucao}>
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar dataKey="qtd" fill="#2563EB" yAxisId="left" name="Atendimentos" />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" yAxisId="right" name="Faturamento" />
                <Line type="monotone" dataKey="margemPct" stroke="#F59E0B" yAxisId="left" name="Margem %" />
                <Brush dataKey="month" travellerWidth={8} />
                {events.map((ev) => (
                  <ReferenceLine key={ev.month+ev.label} x={ev.month} stroke={ev.color} label={ev.label} />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Insights: observe sazonalidade, relação entre quantidade e margem e impactos de mudanças.
          </div>
        </CardContent>
      </Card>

      {/* Seção 3: Composição de Custos */}
      <Card>
        <CardHeader>
          <CardTitle>Composição de Custos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {custos && (
            <div className="space-y-2">
              <div className="flex items-center justify-between"><span>Produtos</span><span>{formatCurrency(custos.produtos)} ({Math.round((custos.produtos / Math.max(1, custos.preco)) * 100)}%)</span></div>
              <Progress value={Math.min(100, Math.round((custos.produtos / Math.max(1, custos.preco)) * 100))} />
              <div className="flex items-center justify-between"><span>Comissão</span><span>{formatCurrency(custos.comissao)} ({Math.round((custos.comissao / Math.max(1, custos.preco)) * 100)}%)</span></div>
              <Progress value={Math.min(100, Math.round((custos.comissao / Math.max(1, custos.preco)) * 100))} />
              <div className="my-2 border-t" />
              <div className="flex items-center justify-between font-medium"><span>Custo Total</span><span>{formatCurrency(custos.custoTotal)} ({Math.round((custos.custoTotal / Math.max(1, custos.preco)) * 100)}%)</span></div>
              <div className="my-2 border-t" />
              <div className="flex items-center justify-between text-green-600 font-semibold"><span>Lucro Líquido</span><span>{formatCurrency(custos.lucro)} ({Math.round((custos.lucro / Math.max(1, custos.preco)) * 100)}%) ✓</span></div>
            </div>
          )}
          {market && (
            <div className="mt-4 p-3 rounded border">
              <div className="font-medium">Comparação com Mercado</div>
              <div className="text-sm">Preço médio de mercado: {formatCurrency(market.avgPrice)} • Sua posição: {market.pos.replace("_", " ")}</div>
              <div className="text-xs text-muted-foreground">{market.suggestion} • Margem vs média: {market.margemSegurancaPct}%</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}