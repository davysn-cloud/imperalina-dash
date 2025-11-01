"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, User, Briefcase, Edit, Trash2, Check, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { UserRole } from "@/lib/types"
import { FollowInModal } from "@/components/appointments/follow-in-modal"
import { FollowUpModal } from "@/components/appointments/follow-up-modal"
import React, { useEffect, useState } from "react"

interface Appointment {
  id: string
  date: string
  start_time: string
  end_time: string
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
  notes?: string
  client: {
    name: string
    email: string
    phone?: string
  }
  professional: {
    id: string
    color: string
    user: {
      name: string
    }
  }
  service: {
    name: string
    duration: number
    price: number
  }
}

interface AppointmentsListProps {
  appointments: Appointment[]
  userRole: UserRole
  statusFilter?: "PENDING" | "CONFIRMED" | "COMPLETED"
  onChangeFilter?: (value: "PENDING" | "CONFIRMED" | "COMPLETED") => void
}

const STATUS_LABELS = {
  PENDING: "Não confirmado",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  CANCELLED: "destructive",
  COMPLETED: "outline",
}

export function AppointmentsList({ appointments, userRole, statusFilter, onChangeFilter }: AppointmentsListProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [hasFollowInMap, setHasFollowInMap] = useState<Record<string, boolean>>({})
  const [followInOpenId, setFollowInOpenId] = useState<string | null>(null)
  const [followUpOpenId, setFollowUpOpenId] = useState<string | null>(null)

  // Fetch current user id
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [supabase])

  // Load Follow-In existence per appointment
  useEffect(() => {
    const fetchFollowIns = async () => {
      const entries = await Promise.all(
        appointments.map(async (a) => {
          const res = await fetch(`/api/appointments/${a.id}/follow-in`)
          if (!res.ok) return [a.id, false] as const
          const json = await res.json()
          return [a.id, Boolean(json)] as const
        }),
      )
      setHasFollowInMap(Object.fromEntries(entries))
    }
    fetchFollowIns()
  }, [appointments])

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id)

    if (error) {
      toast.error("Erro ao atualizar status")
      return
    }

    toast.success("Status atualizado com sucesso")
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) return

    const { error } = await supabase.from("appointments").delete().eq("id", id)

    if (error) {
      toast.error("Erro ao excluir agendamento")
      return
    }

    toast.success("Agendamento excluído com sucesso")
    router.refresh()
  }

  const list = statusFilter ? appointments.filter((a) => a.status === statusFilter) : appointments

  if (list.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {list.map((appointment) => {
        const appointmentDate = new Date(appointment.date + "T00:00:00")

        return (
          <Card key={appointment.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: appointment.professional?.color || "#d97706" }}
                    />
                    <h3 className="font-semibold">{appointment.service.name}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{format(appointmentDate, "dd 'de' MMMM", { locale: ptBR })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {appointment.start_time} - {appointment.end_time}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANTS[appointment.status]}>{STATUS_LABELS[appointment.status]}</Badge>
                  {appointment.status !== "COMPLETED" &&
                    appointment.status !== "CANCELLED" &&
                    hasFollowInMap[appointment.id] === false && (
                      <Badge variant="secondary">Não Briefado</Badge>
                    )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {userRole === "CLIENT"
                      ? `Profissional: ${appointment.professional.user.name}`
                      : `Cliente: ${appointment.client.name}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {appointment.service.duration} min - R$ {appointment.service.price.toFixed(2)}
                  </span>
                </div>
              </div>

              {appointment.notes && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">{appointment.notes}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {userRole !== "CLIENT" && appointment.status === "PENDING" && (
                  <>
                    <Button size="sm" variant="default" onClick={() => updateStatus(appointment.id, "CONFIRMED")}>
                      <Check className="mr-2 h-4 w-4" />
                      Confirmar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(appointment.id, "CANCELLED")}>
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </>
                )}
                {userRole !== "CLIENT" && appointment.status === "CONFIRMED" && (
                  <Button size="sm" variant="default" onClick={() => setFollowUpOpenId(appointment.id)} disabled={!currentUserId}>
                    <Check className="mr-2 h-4 w-4" />
                    Concluir
                  </Button>
                )}
                {userRole !== "CLIENT" &&
                  appointment.status !== "CANCELLED" &&
                  appointment.status !== "COMPLETED" &&
                  hasFollowInMap[appointment.id] === false && (
                    <Button size="sm" variant="outline" onClick={() => setFollowInOpenId(appointment.id)} disabled={!currentUserId}>
                      Briefing
                    </Button>
                  )}
                <Link href={`/appointments/${appointment.id}/edit`}>
                  <Button size="sm" variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => handleDelete(appointment.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Modals */}
              <FollowInModal
                open={followInOpenId === appointment.id}
                onOpenChange={(open) => setFollowInOpenId(open ? appointment.id : null)}
                appointmentId={appointment.id}
                clientName={appointment.client.name}
                currentUserId={currentUserId || ""}
                onSuccess={() => {
                  setHasFollowInMap((prev) => ({ ...prev, [appointment.id]: true }))
                  router.refresh()
                }}
              />

              <FollowUpModal
                open={followUpOpenId === appointment.id}
                onOpenChange={(open) => setFollowUpOpenId(open ? appointment.id : null)}
                appointmentId={appointment.id}
                clientName={appointment.client.name}
                currentUserId={currentUserId || ""}
                onSuccess={() => {
                  toast.success("Atendimento concluído com sucesso")
                  // Alterna para a aba de Concluídos para que o usuário veja o status atualizado
                  onChangeFilter?.("COMPLETED")
                  router.refresh()
                }}
              />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
