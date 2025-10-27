import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { OrcamentosList } from "@/components/orcamentos-list"

export default async function OrcamentosPage() {
  const supabase = await getSupabaseServerClient()

  // TODO: Implementar busca de orçamentos quando a tabela existir
  const orcamentos: any[] = []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">Gerencie seus orçamentos e propostas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/orcamentos/templates">
            <Button variant="outline">
              Templates
            </Button>
          </Link>
          <Link href="/orcamentos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Orçamento
            </Button>
          </Link>
        </div>
      </div>

      <OrcamentosList orcamentos={orcamentos} />
    </div>
  )
}