import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { ProfessionalsList } from "@/components/professionals-list"

export default async function ProfessionalsPage() {
  const supabase = await getSupabaseServerClient()

  const { data: professionals } = await supabase
    .from("professionals")
    .select(`
      *,
      user:users(*)
    `)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profissionais</h1>
          <p className="text-muted-foreground">Gerencie os profissionais do salão</p>
        </div>
        <Link href="/professionals/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Profissional
          </Button>
        </Link>
      </div>

      <ProfessionalsList professionals={professionals || []} />
    </div>
  )
}
