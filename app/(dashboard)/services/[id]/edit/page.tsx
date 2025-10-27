import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ServiceForm } from "@/components/service-form"
import { notFound } from "next/navigation"

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await getSupabaseServerClient()
  const { id } = await params

  const [{ data: service }, { data: professionals }] = await Promise.all([
    supabase.from("services").select("*").eq("id", id).single(),
    supabase.from("professionals").select(`
      id,
      user:users(name)
    `),
  ])

  // Transformar profissionais para o formato esperado pelo componente
  const transformedProfessionals = professionals?.map((prof: any) => ({
    id: prof.id,
    user: {
      name: Array.isArray(prof.user) ? prof.user[0]?.name || "" : prof.user?.name || ""
    }
  })) || []

  if (!service) {
    notFound()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Serviço</h1>
        <p className="text-muted-foreground">Atualize as informações do serviço</p>
      </div>

      <ServiceForm professionals={transformedProfessionals} service={service} />
    </div>
  )
}
