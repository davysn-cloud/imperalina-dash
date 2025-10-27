"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, UserPlus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Professional } from "@/lib/types"

interface AdminProfessionalsManagerProps {
  professionals: (Professional & { user: any })[]
}

export function AdminProfessionalsManager({ professionals }: AdminProfessionalsManagerProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este profissional?")) return

    const { error } = await supabase.from("professionals").delete().eq("id", id)

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir profissional",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Sucesso",
      description: "Profissional excluído com sucesso",
    })
    router.refresh()
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("professionals").update({ is_active: !currentStatus }).eq("id", id)

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Sucesso",
      description: `Profissional ${!currentStatus ? "ativado" : "desativado"} com sucesso`,
    })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Gerenciar Profissionais</h2>
          <p className="text-sm text-muted-foreground">Adicione, edite ou remova profissionais</p>
        </div>
        <Link href="/professionals/new">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Adicionar Profissional
          </Button>
        </Link>
      </div>

      {professionals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Nenhum profissional cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {professionals.map((professional) => (
            <Card key={professional.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={professional.user?.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{professional.user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{professional.user?.name}</h3>
                      <p className="text-sm text-muted-foreground">{professional.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: professional?.color || "#d97706" }}
                    />
                    <Badge variant={professional.is_active ? "default" : "secondary"}>
                      {professional.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {professional.bio && <p className="text-sm text-muted-foreground line-clamp-2">{professional.bio}</p>}
                {professional.specialties && professional.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {professional.specialties.map((specialty) => (
                      <Badge key={specialty} variant="outline">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Link href={`/professionals/${professional.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(professional.id, professional.is_active)}
                  >
                    {professional.is_active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(professional.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
