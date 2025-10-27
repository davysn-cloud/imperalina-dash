import { getSupabaseServerClient } from "@/lib/supabase/server"
import { OrcamentoWizard } from "@/components/orcamento-wizard"

export default async function NovoOrcamentoPage() {
  const supabase = await getSupabaseServerClient()

  // Buscar dados necessários para o wizard
  const [{ data: clients }, { data: services }, { data: templates }] = await Promise.all([
    supabase.from("users").select("id, name, email, phone").eq("role", "CLIENT"),
    supabase.from("services").select("*").eq("is_active", true),
    // TODO: Implementar busca de templates quando a tabela existir
    Promise.resolve({ data: [] }),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Novo Orçamento</h1>
        <p className="text-muted-foreground">Crie um novo orçamento seguindo os passos do assistente</p>
      </div>

      <OrcamentoWizard 
        clients={clients || []} 
        services={services || []} 
        templates={templates || []} 
      />
    </div>
  )
}