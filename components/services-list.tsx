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

    const { error } = await supabase.from("services").delete().eq("id", id)

    if (error) {
      toast.error("Erro ao excluir serviço")
      return
    }

    toast.success("Serviço excluído com sucesso")
    router.refresh()
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
