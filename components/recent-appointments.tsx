"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Appointment {
  id: string
  date: string
  start_time: string
  status: string
  client: {
    name: string
  }
  professional: {
    color: string
    user: {
      name: string
    }
  }
  service: {
    name: string
    duration: number
  }
}

interface RecentAppointmentsProps {
  appointments: Appointment[]
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  completed: "Concluído",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  cancelled: "destructive",
  completed: "outline",
}

export function RecentAppointments({ appointments }: RecentAppointmentsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Próximos Agendamentos</CardTitle>
        <Link href="/appointments">
          <Button variant="ghost" size="sm">
            Ver todos
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum agendamento próximo</p>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const appointmentDate = new Date(appointment.date + "T00:00:00")

              return (
                <div
                  key={appointment.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="h-10 w-1 rounded-full"
                    style={{ backgroundColor: appointment.professional?.color || "#d97706" }}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{appointment.service.name}</p>
                        <p className="text-xs text-muted-foreground">{appointment.client.name}</p>
                      </div>
                      <Badge variant={STATUS_VARIANTS[appointment.status]} className="text-xs">
                        {STATUS_LABELS[appointment.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(appointmentDate, "dd/MM", { locale: ptBR })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{appointment.start_time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
