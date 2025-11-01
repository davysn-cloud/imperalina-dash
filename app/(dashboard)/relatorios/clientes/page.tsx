"use client"
import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Sparkles, RotateCw, Users } from "lucide-react"
import { getGenerativeModel, AI_AVAILABLE } from "@/lib/ai/gemini-client"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts"

type Segment = "VIP" | "Regular" | "Ocasional" | "Inativo"

const COLORS: Record<Segment, string> = {
  VIP: "#7c3aed",
  Regular: "#2563eb",
  Ocasional: "#f59e0b",
  Inativo: "#ef4444",
}

export default function ClientesDashboardPage() {
  const { toast } = useToast()
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiInsights, setAiInsights] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [segments, setSegments] = React.useState<Array<{ segment: Segment; count: number }>>([])
  const [transitions, setTransitions] = React.useState<Record<Segment, Record<Segment, number>> | null>(null)
  const [selectedMonth, setSelectedMonth] = React.useState<string>(() => new Date().toISOString().slice(0, 7))
  const [segPreset, setSegPreset] = React.useState<"padrao" | "conservador" | "agressivo">("padrao")
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), [])

  const thresholds = React.useMemo(() => {
    if (segPreset === "conservador") {
      return { vipSpend: 400, vipFreq: 5, regularSpend: 150, regularFreq: 3, inativoDays: 90 }
    }
    if (segPreset === "agressivo") {
      return { vipSpend: 250, vipFreq: 3, regularSpend: 80, regularFreq: 2, inativoDays: 45 }
    }
    return { vipSpend: 300, vipFreq: 4, regularSpend: 100, regularFreq: 2, inativoDays: 60 }
  }, [segPreset])

  const classifyWith = (
    thr: { vipSpend: number; vipFreq: number; regularSpend: number; regularFreq: number; inativoDays: number },
    spendMonth: number,
    freqMonth: number,
    lastDate?: string
  ): Segment => {
    const today = new Date()
    if (lastDate) {
      const last = new Date(lastDate)
      const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays >= thr.inativoDays) return "Inativo"
    }
    if (spendMonth > thr.vipSpend || freqMonth > thr.vipFreq) return "VIP"
    if (spendMonth >= thr.regularSpend || freqMonth >= thr.regularFreq) return "Regular"
    return "Ocasional"
  }

  const handleGenerateAI = async () => {
    try {
      setAiLoading(true)
      const model = getGenerativeModel()
      const segSummary = segments.map((s) => `${s.segment}: ${s.count}`).join(", ")
      const result = await model.generateContent(
        `Você é um analista de CRM. Com base na distribuição atual (${segSummary}), gere 4 recomendações curtas e acionáveis para aumentar retenção e reduzir churn. Liste em bullet points.`
      )
      setAiInsights(result.response.text())
    } catch (e: any) {
      toast({ title: "IA indisponível", description: e.message || "Verifique a configuração da IA." })
    } finally {
      setAiLoading(false)
    }
  }

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      // Datas de intervalo: mês selecionado e mês anterior
      const startOfCurr = new Date(`${selectedMonth}-01T00:00:00`)
      const startOfPrev = new Date(startOfCurr)
      startOfPrev.setMonth(startOfPrev.getMonth() - 1)
      const startOfNext = new Date(startOfCurr)
      startOfNext.setMonth(startOfNext.getMonth() + 1)

      const isoPrevStart = startOfPrev.toISOString().slice(0, 10)
      const isoCurrStart = startOfCurr.toISOString().slice(0, 10)
      const isoNextStart = startOfNext.toISOString().slice(0, 10)

      // Carrega agendamentos do mês anterior
      const { data: prevData, error: prevErr } = await supabase
        .from("appointments")
        .select("id, client_id, date, payment_status, payment_amount, service:services(price)")
        .gte("date", isoPrevStart)
        .lt("date", isoCurrStart)
      if (prevErr) throw prevErr

      // Carrega agendamentos do mês atual
      const { data: currData, error: currErr } = await supabase
        .from("appointments")
        .select("id, client_id, date, payment_status, payment_amount, service:services(price)")
        .gte("date", isoCurrStart)
        .lt("date", isoNextStart)
      if (currErr) throw currErr

      const buildStats = (rows: any[]) => {
        const stats = new Map<string, { spendMonth: number; freqMonth: number; lastDate?: string }>()
        ;(rows || []).forEach((a: any) => {
          const id = a.client_id
          const paid = a.payment_status === "PAID" ? (a.payment_amount || a.service?.price || 0) : 0
          const date = a.date
          const s = stats.get(id) || { spendMonth: 0, freqMonth: 0, lastDate: undefined }
          s.spendMonth += paid
          s.freqMonth += 1
          s.lastDate = !s.lastDate || new Date(s.lastDate) < new Date(date) ? date : s.lastDate
          stats.set(id, s)
        })
        return stats
      }

      const prevStats = buildStats(prevData || [])
      const currStats = buildStats(currData || [])

      // Classificação por cliente
      const prevSeg = new Map<string, Segment>()
      prevStats.forEach((s, id) => prevSeg.set(id, classifyWith(thresholds, s.spendMonth, s.freqMonth, s.lastDate)))
      const currSeg = new Map<string, Segment>()
      currStats.forEach((s, id) => currSeg.set(id, classifyWith(thresholds, s.spendMonth, s.freqMonth, s.lastDate)))

      // Distribuição atual para cards/gráfico de pizza
      const counts: Record<Segment, number> = { VIP: 0, Regular: 0, Ocasional: 0, Inativo: 0 }
      Array.from(currSeg.values()).forEach((seg) => {
        counts[seg] += 1
      })
      setSegments([
        { segment: "VIP", count: counts.VIP },
        { segment: "Regular", count: counts.Regular },
        { segment: "Ocasional", count: counts.Ocasional },
        { segment: "Inativo", count: counts.Inativo },
      ])

      // Matriz de transições prev -> curr
      const segList: Segment[] = ["VIP", "Regular", "Ocasional", "Inativo"]
      const matrix: Record<Segment, Record<Segment, number>> = {
        VIP: { VIP: 0, Regular: 0, Ocasional: 0, Inativo: 0 },
        Regular: { VIP: 0, Regular: 0, Ocasional: 0, Inativo: 0 },
        Ocasional: { VIP: 0, Regular: 0, Ocasional: 0, Inativo: 0 },
        Inativo: { VIP: 0, Regular: 0, Ocasional: 0, Inativo: 0 },
      }
      const allClients = new Set<string>([...Array.from(prevSeg.keys()), ...Array.from(currSeg.keys())])
      allClients.forEach((id) => {
        const p = prevSeg.get(id) || "Inativo"
        const c = currSeg.get(id) || "Inativo"
        matrix[p][c] += 1
      })
      setTransitions(matrix)
    } catch (e: any) {
      toast({ title: "Erro ao carregar", description: e.message || String(e), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [supabase, toast, selectedMonth, thresholds])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const ranks: Record<Segment, number> = { Inativo: 0, Ocasional: 1, Regular: 2, VIP: 3 }
  const segList: Segment[] = ["VIP", "Regular", "Ocasional", "Inativo"]
  const flowTotal = React.useMemo(() => {
    if (!transitions) return 0
    return segList.reduce((acc, p) => acc + segList.reduce((acc2, c) => acc2 + (transitions[p]?.[c] ?? 0), 0), 0)
  }, [transitions])

  const upgradePct = React.useMemo(() => {
    if (!transitions || !flowTotal) return 0
    let count = 0
    segList.forEach((p) => segList.forEach((c) => { if (ranks[c] > ranks[p]) count += transitions![p][c] }))
    return Math.round((count / flowTotal) * 100)
  }, [transitions, flowTotal])

  const downgradePct = React.useMemo(() => {
    if (!transitions || !flowTotal) return 0
    let count = 0
    segList.forEach((p) => segList.forEach((c) => { if (ranks[c] < ranks[p]) count += transitions![p][c] }))
    return Math.round((count / flowTotal) * 100)
  }, [transitions, flowTotal])

  const churnPct = React.useMemo(() => {
    if (!transitions || !flowTotal) return 0
    let count = 0
    ;["VIP", "Regular", "Ocasional"].forEach((p) => { count += transitions![p as Segment]["Inativo"] })
    return Math.round((count / flowTotal) * 100)
  }, [transitions, flowTotal])

  const reactivationPct = React.useMemo(() => {
    if (!transitions || !flowTotal) return 0
    let count = 0
    ;["VIP", "Regular", "Ocasional"].forEach((c) => { count += transitions!["Inativo"][c as Segment] })
    return Math.round((count / flowTotal) * 100)
  }, [transitions, flowTotal])

  const flowChartData = React.useMemo(() => {
    return segList.map((p) => {
      const row: any = { prev: p }
      segList.forEach((c) => { row[c] = transitions?.[p]?.[c] ?? 0 })
      return row
    })
  }, [transitions])

  const totalClients = React.useMemo(() => segments.reduce((acc, s) => acc + s.count, 0), [segments])

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Análise de Clientes</h1>
          <Badge variant="outline">Insights de Comportamento</Badge>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-36 sm:w-40"
          />
          <Select value={segPreset} onValueChange={(v) => setSegPreset(v as any)}>
            <SelectTrigger className="w-40 sm:w-44">
              <SelectValue placeholder="Segmentação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conservador">Conservador</SelectItem>
              <SelectItem value="padrao">Padrão</SelectItem>
              <SelectItem value="agressivo">Agressivo</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RotateCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
          <Button
            size="sm"
            onClick={handleGenerateAI}
            disabled={aiLoading || !AI_AVAILABLE}
            title={!AI_AVAILABLE ? "Configure GOOGLE_GENERATIVE_AI_API_KEY para habilitar" : undefined}
          >
            <Sparkles className="h-4 w-4 mr-2" /> {aiLoading ? "Gerando..." : "Gerar insights IA"}
          </Button>
        </div>
      </div>
      {!AI_AVAILABLE && (
        <div className="text-xs text-muted-foreground">
          IA desabilitada: defina `GOOGLE_GENERATIVE_AI_API_KEY` no `.env.local` (dev) e nos Secrets em produção.
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        Critérios atuais: VIP se gasto mensal &gt; {thresholds.vipSpend} ou frequência &gt; {thresholds.vipFreq}/mês; Regular se gasto &ge; {thresholds.regularSpend} ou frequência &ge; {thresholds.regularFreq}/mês; Inativo se sem atividade há &ge; {thresholds.inativoDays} dias.
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Segmentação Automática</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={segments} dataKey="count" nameKey="segment" innerRadius={60} outerRadius={110} strokeWidth={5}>
                    {segments.map((s, idx) => (
                      <Cell key={idx} fill={COLORS[s.segment]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [`${value} clientes`, name]} />
                  <Legend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {segments.map((s) => (
                <div key={s.segment} className="rounded-md border p-3 text-sm flex items-center justify-between">
                  <span className="font-medium">{s.segment}</span>
                  <span className="font-semibold">{s.count}</span>
                </div>
              ))}
              {segments.length === 0 && (
                <div className="text-sm text-muted-foreground">Carregando dados do mês...</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimento Entre Segmentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border p-3 text-sm">
              <div className="text-muted-foreground">Upgrade</div>
              <div className="text-lg font-semibold">{upgradePct}%</div>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="text-muted-foreground">Downgrade</div>
              <div className="text-lg font-semibold">{downgradePct}%</div>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="text-muted-foreground">Churn</div>
              <div className="text-lg font-semibold">{churnPct}%</div>
            </div>
            <div className="rounded-md border p-3 text-sm">
              <div className="text-muted-foreground">Reativação</div>
              <div className="text-lg font-semibold">{reactivationPct}%</div>
            </div>
          </div>

          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowChartData}>
                <XAxis dataKey="prev" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="VIP" stackId="flow" fill={COLORS.VIP} />
                <Bar dataKey="Regular" stackId="flow" fill={COLORS.Regular} />
                <Bar dataKey="Ocasional" stackId="flow" fill={COLORS.Ocasional} />
                <Bar dataKey="Inativo" stackId="flow" fill={COLORS.Inativo} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 text-xs text-muted-foreground">Visualização de fluxo entre segmentos baseada em meses consecutivos. (Sankey opcional em iteração futura)</div>
        </CardContent>
      </Card>

      {aiInsights && (
        <Card>
          <CardHeader>
            <CardTitle>Recomendações da IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">{aiInsights}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}