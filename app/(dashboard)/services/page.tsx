import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { ServicesList } from "@/components/services-list"

export default async function ServicesPage() {
  const supabase = await getSupabaseServerClient()

  const { data: services } = await supabase
    .from("services")
    .select(`
      *,
      professional:professionals(
        id,
        user:users(name)
      )
    `)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Serviços</h1>
          <p className="text-muted-foreground">Gerencie os serviços oferecidos</p>
        </div>
        <Link href="/services/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Serviço
          </Button>
        </Link>
      </div>

      <ServicesList services={services || []} />
    </div>
  )
}
