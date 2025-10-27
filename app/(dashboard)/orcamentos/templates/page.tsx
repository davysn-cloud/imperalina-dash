import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { TemplatesList } from "@/components/templates-list"

export default async function TemplatesPage() {
  const supabase = await getSupabaseServerClient()

  // TODO: Implementar busca de templates
  const templates: any[] = []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates de Orçamento</h1>
          <p className="text-muted-foreground">Gerencie os templates para seus orçamentos</p>
        </div>
        <Link href="/orcamentos/templates/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Template
          </Button>
        </Link>
      </div>

      <TemplatesList templates={templates} />
    </div>
  )
}