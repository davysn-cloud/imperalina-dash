import { getSupabaseServerClient } from "@/lib/supabase/server"
import { AppointmentForm } from "@/components/appointment-form"

export default async function NewAppointmentPage() {
  const supabase = await getSupabaseServerClient()

  const [{ data: professionals }, { data: services }, { data: clients }] = await Promise.all([
    supabase.from("professionals").select(`
      id,
      color,
      user:users(name)
    `),
    supabase.from("services").select("*").eq("is_active", true),
    supabase.from("users").select("id, name, email").eq("role", "CLIENT"),
  ])

  // Transformar profissionais para o formato esperado pelo componente
  const transformedProfessionals = professionals?.map((prof: any) => ({
    id: prof.id,
    color: prof.color,
    user: {
      name: Array.isArray(prof.user) ? prof.user[0]?.name || "" : prof.user?.name || ""
    }
  })) || []

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Novo Agendamento</h1>
        <p className="text-muted-foreground">Crie um novo agendamento no sistema</p>
      </div>

      <AppointmentForm professionals={transformedProfessionals} services={services || []} clients={clients || []} />
    </div>
  )
}
