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
  const [
    { count: appointmentsCount },
    { count: professionalsCount },
    { count: servicesCount },
    { count: monthAppointmentsCount },
  ] = await Promise.all([
    supabase.from("appointments").select("*", { count: "exact", head: true }),
    supabase.from("professionals").select("*", { count: "exact", head: true }),
    supabase.from("services").select("*", { count: "exact", head: true }),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("date", format(monthStart, "yyyy-MM-dd"))
      .lte("date", format(monthEnd, "yyyy-MM-dd")),
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

  // Compute new vs returning clients for current month
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
      title: "Agendamentos Totais",
      value: appointmentsCount || 0,
      icon: Calendar,
      description: "Total de agendamentos",
    },
    {
      title: "Agendamentos do Mês",
      value: monthAppointmentsCount || 0,
      icon: TrendingUp,
      description: "Neste mês",
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

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCalendar />
        <RecentAppointments appointments={recentAppointments || []} />
      </div>
    </div>
  )
}
