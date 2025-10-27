"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2, Link as LinkIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface Professional {
  id: string
  user_id: string
  color: string
  specialties: string[]
  bio: string
  calendar_feed_token?: string
  user: {
    name: string
    email: string
    avatar?: string
  }
}

interface ProfessionalsListProps {
  professionals: Professional[]
}

export function ProfessionalsList({ professionals }: ProfessionalsListProps) {
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

  const buildWebcalLink = (professional: Professional) => {
    const origin = typeof window !== "undefined" ? window.location.origin.replace(/^https?:\/\//, "") : ""
    const token = professional.calendar_feed_token || ""
    return `webcal://${origin}/api/calendar/professionals/${professional.id}.ics?token=${token}`
  }

  const handleCopyCalendarLink = (professional: Professional) => {
    const link = buildWebcalLink(professional)
    navigator.clipboard.writeText(link)
      .then(() => {
        toast({
          title: "Link copiado",
          description: "Cole o link no Apple Calendar para assinar.",
        })
      })
      .catch(() => {
        toast({
          title: "Erro",
          description: "Não foi possível copiar o link",
          variant: "destructive",
        })
      })
  }

  const handleOpenCalendarLink = (professional: Professional) => {
    const link = buildWebcalLink(professional)
    window.location.href = link
  }

  if (professionals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Nenhum profissional cadastrado</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {professionals.map((professional) => (
        <Card key={professional.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={professional.user.avatar || "/placeholder.svg"} />
                  <AvatarFallback>{professional.user.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{professional.user.name}</h3>
                  <p className="text-sm text-muted-foreground">{professional.user.email}</p>
                </div>
              </div>
              <div className="h-4 w-4 rounded-full" style={{ backgroundColor: professional?.color || "#d97706" }} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {professional.bio && <p className="text-sm text-muted-foreground line-clamp-2">{professional.bio}</p>}
            {professional.specialties && professional.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {professional.specialties.map((specialty) => (
                  <Badge key={specialty} variant="secondary">
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
              <Button variant="outline" size="sm" onClick={() => handleDelete(professional.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyCalendarLink(professional)}
                disabled={!professional.calendar_feed_token}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Copiar link da agenda
              </Button>
              <Button
                size="sm"
                onClick={() => handleOpenCalendarLink(professional)}
                disabled={!professional.calendar_feed_token}
              >
                Assinar no Apple Calendar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
