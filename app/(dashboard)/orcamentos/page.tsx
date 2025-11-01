import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { OrcamentosList } from "@/components/orcamentos-list"
import type { Orcamento } from "@/lib/types"

export default async function OrcamentosPage() {
  const supabase = await getSupabaseServerClient()

  // Buscar orçamentos com itens
  const { data, error } = await supabase
    .from('orcamentos')
    .select(`
      *,
      orcamento_itens (
        id,
        service_id,
        descricao,
        quantidade,
        valor_unitario,
        valor_total,
        ordem,
        services (
          id,
          name
        )
      )
    `)
    .order('data_orcamento', { ascending: false })

  if (error) {
    console.error('[OrcamentosPage] Erro ao buscar orçamentos:', error)
  }

  // Mapear dados do banco para o formato esperado pela lista
  const mapStatus = (s: string): 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'EXPIRADO' => {
    if (s === 'APROVADO' || s === 'REJEITADO' || s === 'EXPIRADO') return s as any
    // RASCUNHO ou ENVIADO tratados como pendentes para fins de listagem
    return 'PENDENTE'
  }

  const orcamentos: Pick<Orcamento, 'id' | 'numero' | 'cliente' | 'data_validade' | 'valor_total' | 'status' | 'itens'>[] =
    (data || []).map((o: any) => ({
      id: o.id,
      numero: o.numero_orcamento,
      cliente: {
        id: o.client_id,
        nome: o.client_name,
        email: o.client_email,
        telefone: o.client_phone || undefined,
      },
      data_validade: new Date(o.data_validade),
      valor_total: Number(o.total),
      status: mapStatus(o.status),
      itens: (o.orcamento_itens || []).sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)).map((it: any) => ({
        id: it.id,
        servico_id: it.service_id,
        servico_nome: it.services?.name || it.descricao,
        quantidade: Number(it.quantidade),
        valor_unitario: Number(it.valor_unitario),
        desconto: 0,
        subtotal: Number(it.valor_total),
      })),
    }))

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