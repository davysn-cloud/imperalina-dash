"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Professional } from "@/lib/types"

interface AdminPermissionsManagerProps {
  professionals: (Professional & { user: any })[]
}

export function AdminPermissionsManager({ professionals }: AdminPermissionsManagerProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()

  const handlePermissionChange = async (
    professionalId: string,
    field: "can_manage_schedule" | "can_view_all_appointments",
    value: boolean,
  ) => {
    const { error } = await supabase
      .from("professionals")
      .update({ [field]: value })
      .eq("id", professionalId)

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar permissão",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Sucesso",
      description: "Permissão atualizada com sucesso",
    })
    router.refresh()
  }

  const activeProfessionals = professionals.filter((p) => p.is_active)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Gerenciar Permissões</h2>
        <p className="text-sm text-muted-foreground">Configure as permissões de cada profissional</p>
      </div>

      {activeProfessionals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Nenhum profissional ativo</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {activeProfessionals.map((professional) => (
            <Card key={professional.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={professional.user?.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{professional.user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{professional.user?.name}</CardTitle>
                      <CardDescription>{professional.user?.email}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: professional?.color || "#d97706" }}
                    />
                    <Badge>{professional.user?.role}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={`schedule-${professional.id}`}>Gerenciar Próprios Horários</Label>
                    <p className="text-sm text-muted-foreground">
                      Permite que o profissional configure seus próprios horários
                    </p>
                  </div>
                  <Switch
                    id={`schedule-${professional.id}`}
                    checked={professional.can_manage_schedule}
                    onCheckedChange={(checked) =>
                      handlePermissionChange(professional.id, "can_manage_schedule", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={`appointments-${professional.id}`}>Ver Todos os Agendamentos</Label>
                    <p className="text-sm text-muted-foreground">
                      Permite que o profissional visualize agendamentos de outros profissionais
                    </p>
                  </div>
                  <Switch
                    id={`appointments-${professional.id}`}
                    checked={professional.can_view_all_appointments}
                    onCheckedChange={(checked) =>
                      handlePermissionChange(professional.id, "can_view_all_appointments", checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
