import ReportsDashboard from "@/components/reports-dashboard"

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios e Insights</h1>
        <p className="text-muted-foreground">Visão estratégica do negócio com análises avançadas</p>
      </div>
      <ReportsDashboard />
    </div>
  )
}