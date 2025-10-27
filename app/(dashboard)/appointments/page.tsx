import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
// import { AppointmentsList } from "@/components/appointments-list"
import { AppointmentsFilterSection } from "@/components/appointments/appointments-filter-section"

export default async function AppointmentsPage() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle()

  // Get appointments based on role
  let appointmentsQuery = supabase
    .from("appointments")
    .select(`
      *,
      client:users!appointments_client_id_fkey(name, email, phone),
      professional:professionals(
        id,
        color,
        user:users(name)
      ),
      service:services(name, duration, price)
    `)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })

  if (userData?.role === "PROFESSIONAL") {
    // Get professional's appointments
    const { data: professional } = await supabase
      .from("professionals")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (professional) {
      appointmentsQuery = appointmentsQuery.eq("professional_id", professional.id)
    }
  } else if (userData?.role === "CLIENT") {
    // Get client's appointments
    appointmentsQuery = appointmentsQuery.eq("client_id", user.id)
  }

  const { data: appointments } = await appointmentsQuery

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>
          <p className="text-muted-foreground">Gerencie seus agendamentos</p>
        </div>
        <Link href="/appointments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </Link>
      </div>

      <AppointmentsFilterSection appointments={appointments || []} userRole={userData?.role || "CLIENT"} />
    </div>
  )
}
