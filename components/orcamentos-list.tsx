"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, User, FileText, Edit, Trash2, Eye, Send } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Orcamento } from "@/lib/types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface OrcamentosListProps {
  orcamentos: Orcamento[]
}

const statusColors = {
  PENDENTE: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APROVADO: "bg-green-100 text-green-800 border-green-200",
  REJEITADO: "bg-red-100 text-red-800 border-red-200",
  EXPIRADO: "bg-gray-100 text-gray-800 border-gray-200",
}

const statusLabels = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
  EXPIRADO: "Expirado",
}

export function OrcamentosList({ orcamentos }: OrcamentosListProps) {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Tem certeza que deseja excluir este orçamento?")
    if (!confirmed) return

    const { error } = await supabase.from("orcamentos").delete().eq("id", id)
    if (error) {
      const msg = error.message || "Erro ao excluir orçamento"
      // Mensagem mais clara para RLS/perm.: apenas criador ou admin podem excluir
      if (/permission|rls|denied/i.test(msg)) {
        toast.error("Você não tem permissão para excluir este orçamento")
      } else {
        toast.error("Erro ao excluir orçamento")
      }
      return
    }
    toast.success("Orçamento excluído com sucesso")
    router.refresh()
  }
  if (orcamentos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum orçamento encontrado</h3>
          <p className="text-muted-foreground text-center mb-4">
            Comece criando seu primeiro orçamento para seus clientes.
          </p>
          <Link href="/orcamentos/novo">
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Criar Primeiro Orçamento
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {orcamentos.map((orcamento) => (
        <Card key={orcamento.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{orcamento.numero}</h3>
                  <Badge className={statusColors[orcamento.status]}>
                    {statusLabels[orcamento.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{orcamento.cliente.nome}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Válido até {format(new Date(orcamento.data_validade), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {orcamento.valor_total.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {orcamento.itens.length} {orcamento.itens.length === 1 ? 'item' : 'itens'}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <Send className="mr-2 h-4 w-4" />
                Enviar
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(orcamento.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}