"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, CreditCard, Receipt, FileText } from "lucide-react"
import Link from "next/link"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

type FluxoPonto = { mes: string; entradas: number; saidas: number; saldo: number }

type DashboardResumo = {
  receita_mes: number
  variacao_receita: number
  contas_pendentes: number
  contas_atrasadas: number
  comissoes_mes: number
  total_atendimentos: number
  a_pagar_mes: number
  pagar_atrasadas_mes: number
  saidas_pagas_mes: number
  saldo_mes: number
}

type DashboardResponse = {
  resumo: DashboardResumo
  fluxo_caixa: FluxoPonto[]
  alertas: { id: string; tipo: string; titulo: string; descricao: string; valor: number; data: string; profissional?: string }[]
}

export default function FinanceiroDashboard() {
  const supabase = getSupabaseBrowserClient()
  const [resumo, setResumo] = useState<DashboardResumo | null>(null)
  const [grafico, setGrafico] = useState<FluxoPonto[]>([])
  const [alertasVencidas, setAlertasVencidas] = useState<{ id: string; cliente: string; valor: number; dias?: number }[]>([])
  const [alertasHoje, setAlertasHoje] = useState<{ id: string; cliente: string; valor: number }[]>([])
  const [alertasProximas, setAlertasProximas] = useState<{ id: string; cliente: string; valor: number; dias: number }[]>([])
  const [loading, setLoading] = useState(true)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const carregarDashboard = async () => {
    const res = await fetch("/api/financeiro/dashboard")
    if (!res.ok) throw new Error("Falha ao carregar dashboard financeiro")
    const data: DashboardResponse = await res.json()
    setResumo(data.resumo)
    setGrafico(data.fluxo_caixa)

    // Mapear alertas vencidas (provenientes dos atendimentos em atraso)
    const vencidas = (data.alertas || []).map(a => ({ id: a.id, cliente: a.descricao, valor: a.valor }))
    setAlertasVencidas(vencidas)
  }

  // Carregar pendências de contas a receber para preencher "Hoje" e "Próximas"
  const carregarReceberPendentes = async () => {
    const res = await fetch("/api/financeiro/contas-receber?status=PENDING")
    if (!res.ok) return // Silencioso; dashboard ainda carrega parcialmente
    const items = await res.json()
    const hoje = new Date()
    const isToday = (d: string) => new Date(d).toDateString() === hoje.toDateString()
    const diffDays = (d: string) => Math.ceil((new Date(d).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

    const hojeArr: { id: string; cliente: string; valor: number }[] = []
    const proximasArr: { id: string; cliente: string; valor: number; dias: number }[] = []
    items.forEach((c: any) => {
      const cliente = c.cliente_nome || c.client?.name || "Cliente"
      const valor = Number(c.valor_original || c.valor || 0)
      if (isToday(c.data_vencimento)) {
        hojeArr.push({ id: c.id, cliente, valor })
      } else {
        const dias = diffDays(c.data_vencimento)
        if (dias > 0 && dias <= 7) proximasArr.push({ id: c.id, cliente, valor, dias })
      }
    })
    setAlertasHoje(hojeArr)
    setAlertasProximas(proximasArr)
  }

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        setLoading(true)
        await carregarDashboard()
        await carregarReceberPendentes()
      } finally {
        if (mounted) setLoading(false)
      }
    }
    run()

    // Assinaturas Realtime – alterações relevantes disparam recarga
    const channel = supabase.channel("financeiro_dashboard")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "appointments" }, () => run())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "appointments" }, () => run())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contas_pagar" }, () => run())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "contas_pagar" }, () => run())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "contas_receber" }, () => run())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "contas_receber" }, () => run())
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Financeiro</h1>
          <p className="text-muted-foreground">
            Visão geral das finanças do salão
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/financeiro/contas-receber">
              <CreditCard className="h-4 w-4 mr-2" />
              Registrar Recebimento
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/financeiro/contas-pagar">
              <Receipt className="h-4 w-4 mr-2" />
              Contas a Pagar
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/financeiro/dre">
              <FileText className="h-4 w-4 mr-2" />
              Ver DRE
            </Link>
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(resumo?.saldo_mes || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {resumo ? `${(resumo.variacao_receita).toFixed(1)}% vs mês anterior` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(resumo?.contas_pendentes || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {(alertasHoje.length + alertasProximas.length)} contas pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(resumo?.a_pagar_mes || 0)}
            </div>
            <p className="text-xs text-muted-foreground">No mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency((resumo?.contas_atrasadas || 0) + (resumo?.pagar_atrasadas_mes || 0))}
            </div>
            <p className="text-xs text-muted-foreground">{alertasVencidas.length} contas em atraso</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Fluxo de Caixa */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa - Últimos 6 Meses</CardTitle>
          <CardDescription>
            Evolução das entradas, saídas e saldo acumulado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={grafico}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Mês: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="entradas" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="Entradas"
              />
              <Line 
                type="monotone" 
                dataKey="saidas" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Saídas"
              />
              <Line 
                type="monotone" 
                dataKey="saldo" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Saldo Acumulado"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Seção de Alertas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              Contas Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertasVencidas.map((conta) => (
              <div key={conta.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                <div>
                  <p className="font-medium text-sm">{conta.cliente}</p>
                </div>
                <Badge variant="destructive">{formatCurrency(conta.valor)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              Vencem Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertasHoje.map((conta) => (
              <div key={conta.id} className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                <div>
                  <p className="font-medium text-sm">{conta.cliente}</p>
                  <p className="text-xs text-muted-foreground">Vence hoje</p>
                </div>
                <Badge variant="secondary">{formatCurrency(conta.valor)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Próximas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertasProximas.map((conta) => (
              <div key={conta.id} className="flex justify-between items-center p-2 bg-green-50 rounded">
                <div>
                  <p className="font-medium text-sm">{conta.cliente}</p>
                  <p className="text-xs text-muted-foreground">Em {conta.dias} dias</p>
                </div>
                <Badge variant="outline">{formatCurrency(conta.valor)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}