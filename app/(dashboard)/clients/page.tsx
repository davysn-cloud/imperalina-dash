import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { ClientsList } from "@/components/clients-list"

export default async function ClientsPage() {
  const supabase = await getSupabaseServerClient()

  const { data: clients } = await supabase
    .from("users")
    .select("*")
    .eq("role", "CLIENT")
    .order("created_at", { ascending: false })

  // Get appointment counts for each client
  const clientsWithStats = await Promise.all(
    (clients || []).map(async (client) => {
      const { count } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)

      return {
        ...client,
        appointmentCount: count || 0,
      }
    }),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gerencie os clientes do salão</p>
        </div>
        <Link href="/clients/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </Link>
      </div>

      <ClientsList clients={clientsWithStats} />
    </div>
  )
}
