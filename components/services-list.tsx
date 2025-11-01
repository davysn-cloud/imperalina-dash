"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Clock, DollarSign } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Service {
  id: string
  name: string
  description: string
  duration: number
  price: number
  is_active: boolean
  professional_id: string
  professional: {
    user: {
      name: string
    }
  }
}

interface ServicesListProps {
  services: Service[]
}

export function ServicesList({ services }: ServicesListProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este serviço?")) return
    try {
      // Checa vínculos que impedem exclusão: agendamentos e itens de orçamento
      const [{ count: apptCount, error: apptErr }, { count: itemCount, error: itemErr }] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("service_id", id),
        supabase.from("orcamento_itens").select("id", { count: "exact", head: true }).eq("service_id", id),
      ])

      if (apptErr || itemErr) {
        // Se não conseguimos contar (possível RLS), seguimos para tentar excluir
        console.warn("Falha ao contar vínculos de serviço:", apptErr || itemErr)
      } else {
        const hasLinks = (apptCount || 0) > 0 || (itemCount || 0) > 0
        if (hasLinks) {
          toast.error(
            "Este serviço possui vínculos (agendamentos ou itens de orçamento) e não pode ser excluído. Desative-o para ocultar.",
          )
          return
        }
      }

      // Tenta excluir
      const { error } = await supabase.from("services").delete().eq("id", id)
      if (error) {
        const msgLower = (error.message || "").toLowerCase()
        if (error.code === "23503" || msgLower.includes("foreign key") || msgLower.includes("violates")) {
          toast.error(
            "Este serviço está relacionado a outros registros e não pode ser excluído. Desative-o para não ser mais utilizado.",
          )
          return
        }
        if (msgLower.includes("policy") || msgLower.includes("rls") || msgLower.includes("permission")) {
          toast.error("Você não tem permissão para excluir serviços. Peça a um administrador.")
          return
        }
        toast.error("Erro ao excluir serviço")
        return
      }

      toast.success("Serviço excluído com sucesso")
      router.refresh()
    } catch (err: any) {
      console.error("Erro ao excluir serviço:", err)
      toast.error("Erro ao excluir serviço")
    }
  }

  const handleToggleActive = async (id: string, nextActive: boolean) => {
    const actionLabel = nextActive ? "reativar" : "desativar"
    if (!confirm(`Tem certeza que deseja ${actionLabel} este serviço?`)) return
    try {
      const { error } = await supabase.from("services").update({ is_active: nextActive }).eq("id", id)
      if (error) {
        const msgLower = (error.message || "").toLowerCase()
        if (msgLower.includes("policy") || msgLower.includes("rls") || msgLower.includes("permission")) {
          toast.error("Você não tem permissão para alterar este serviço.")
          return
        }
        toast.error("Erro ao atualizar serviço")
        return
      }
      toast.success(nextActive ? "Serviço reativado" : "Serviço desativado")
      router.refresh()
    } catch (err: any) {
      console.error("Erro ao atualizar serviço:", err)
      toast.error("Erro ao atualizar serviço")
    }
  }

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Nenhum serviço cadastrado</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <Card key={service.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">{service.name}</CardTitle>
              <Badge variant={service.is_active ? "default" : "secondary"}>
                {service.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {service.description && <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>}

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{service.duration} min</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>R$ {service.price.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">Profissional: {service.professional.user.name}</p>

            <div className="flex gap-2">
              <Link href={`/services/${service.id}/edit`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleActive(service.id, !service.is_active)}
                className="bg-transparent"
              >
                {service.is_active ? "Desativar" : "Reativar"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(service.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
