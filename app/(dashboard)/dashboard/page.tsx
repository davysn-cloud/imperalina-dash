import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, Briefcase, TrendingUp } from "lucide-react"
import { DashboardCalendar } from "@/components/dashboard-calendar"
import { RecentAppointments } from "@/components/recent-appointments"
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns"
import { DashboardAreaChart, type DashboardChartPoint } from "@/components/dashboard-area-chart"
import { DashboardPizzaChart } from "@/components/dashboard-pizza-chart"

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()

  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  // Get statistics
  // Contagens principais
  const [
    { count: totalSchedulesCount },
    { count: professionalsCount },
    { count: servicesCount },
    { data: activeSchedulesThisMonth },
  ] = await Promise.all([
    // Agendamentos totais devem enxergar schedules (apenas ativos)
    supabase.from("schedules").select("*", { count: "exact", head: true }).eq("is_active", true),
    // Contar apenas profissionais ativos
    supabase.from("professionals").select("*", { count: "exact", head: true }).eq("is_active", true),
    // Contar apenas serviços ativos (disponíveis)
    supabase.from("services").select("*", { count: "exact", head: true }).eq("is_active", true),
    // Para o mês: precisamos dos schedules ativos para computar ocorrências no mês por dia da semana
    supabase
      .from("schedules")
      .select("day_of_week")
      .eq("is_active", true),
  ])

  // Build monthly chart data (last 12 months)
  const rangeStart = startOfMonth(subMonths(today, 11))
  const rangeEnd = endOfMonth(today)

  const [{ data: clientsCreated }, { data: apptsForRevenue }] = await Promise.all([
    supabase
      .from("users")
      .select("created_at")
      .eq("role", "CLIENT")
      .gte("created_at", format(rangeStart, "yyyy-MM-dd"))
      .lte("created_at", format(rangeEnd, "yyyy-MM-dd")),
    supabase
      .from("appointments")
      .select(`
        date, status,
        service:services!appointments_service_id_fkey(price)
      `)
      .in("status", ["CONFIRMED", "COMPLETED"]) // consider confirmed/completed as faturamento
      .gte("date", format(rangeStart, "yyyy-MM-dd"))
      .lte("date", format(rangeEnd, "yyyy-MM-dd")),
  ])

  const months: { key: string; date: string }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = startOfMonth(subMonths(today, i))
    const key = format(d, "yyyy-MM")
    months.push({ key, date: format(d, "yyyy-MM-01") })
  }

  const clientsByMonth: Record<string, number> = {}
  const revenueByMonth: Record<string, number> = {}
  for (const m of months) {
    clientsByMonth[m.key] = 0
    revenueByMonth[m.key] = 0
  }

  for (const c of clientsCreated || []) {
    const created = new Date(c.created_at as any)
    const key = format(created, "yyyy-MM")
    if (key in clientsByMonth) {
      clientsByMonth[key] += 1
    }
  }

  for (const a of apptsForRevenue || []) {
    const key = format(new Date(a.date as any), "yyyy-MM")
    const priceStr = (a as any).service?.price
    const price = typeof priceStr === "string" ? parseFloat(priceStr) : (priceStr ?? 0)
    if (key in revenueByMonth) {
      revenueByMonth[key] += price || 0
    }
  }

  const chartData: DashboardChartPoint[] = months.map((m) => ({
    date: m.date,
    clients: clientsByMonth[m.key] || 0,
    revenue: revenueByMonth[m.key] || 0,
  }))

  // Compute new vs returning clients para o mês atual (mantendo fonte de appointments para este gráfico)
  const { data: apptsThisMonth } = await supabase
    .from("appointments")
    .select("client_id, date")
    .gte("date", format(monthStart, "yyyy-MM-dd"))
    .lte("date", format(monthEnd, "yyyy-MM-dd"))

  const clientsThisMonthSet = new Set((apptsThisMonth || []).map((a: any) => a.client_id))
  let returningCount = 0
  let newCount = 0
  if (clientsThisMonthSet.size > 0) {
    const clientIds = Array.from(clientsThisMonthSet)
    const { data: prevAppts } = await supabase
      .from("appointments")
      .select("client_id")
      .lt("date", format(monthStart, "yyyy-MM-dd"))
      .in("client_id", clientIds)
    const prevSet = new Set((prevAppts || []).map((a: any) => a.client_id))
    returningCount = prevSet.size
    newCount = clientsThisMonthSet.size - returningCount
  }

  // Calcular "Agendamentos do Mês" com base nos schedules ativos
  const countOccurrencesOfDowInMonth = (dow: number) => {
    let count = 0
    const d = new Date(monthStart)
    while (d <= monthEnd) {
      if (d.getDay() === dow) count++
      d.setDate(d.getDate() + 1)
    }
    return count
  }

  const monthAppointmentsCount = (activeSchedulesThisMonth || [])
    .map((s: any) => s.day_of_week as number)
    .reduce((sum: number, dow: number) => sum + countOccurrencesOfDowInMonth(dow), 0)

  // Get recent appointments
  const { data: recentAppointments } = await supabase
    .from("appointments")
    .select(`
      *,
      client:users!appointments_client_id_fkey(name, email),
      professional:professionals(
        color,
        user:users(name)
      ),
      service:services(name, duration)
    `)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(5)

  const stats = [
    {
      title: "Horários ativos (mês)",
      value: totalSchedulesCount || 0,
      icon: Calendar,
      description: "Horários ativos neste mês",
    },
    {
      title: "Horários neste mês",
      value: monthAppointmentsCount || 0,
      icon: TrendingUp,
      description: "Ocorrências no calendário",
    },
    {
      title: "Profissionais",
      value: professionalsCount || 0,
      icon: Users,
      description: "Profissionais ativos",
    },
    {
      title: "Serviços",
      value: servicesCount || 0,
      icon: Briefcase,
      description: "Serviços disponíveis",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema de agendamentos</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <DashboardPizzaChart newCount={newCount} returningCount={returningCount} />

      <DashboardAreaChart data={chartData} />

      {/* Calendário e próximos agendamentos foram movidos para a página de Agendamentos */}
    </div>
  )
}
