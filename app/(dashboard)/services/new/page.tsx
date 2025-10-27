import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ServiceForm } from "@/components/service-form"

export default async function NewServicePage() {
  const supabase = await getSupabaseServerClient()

  const { data: professionals } = await supabase
    .from("professionals")
    .select(`
      id,
      user:users(name)
    `)
    .order("created_at", { ascending: false })

  // Transformar profissionais para o formato esperado pelo componente
  const transformedProfessionals = professionals?.map((prof: any) => ({
    id: prof.id,
    user: {
      name: Array.isArray(prof.user) ? prof.user[0]?.name || "" : prof.user?.name || ""
    }
  })) || []

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Novo Serviço</h1>
        <p className="text-muted-foreground">Cadastre um novo serviço no sistema</p>
      </div>

      <ServiceForm professionals={transformedProfessionals} />
    </div>
  )
}
