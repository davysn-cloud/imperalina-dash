"use client"

import * as React from "react"
import type { UserRole } from "@/lib/types"
import { AgendamentoMenuBar } from "@/components/agendamento-menu-bar"
import { AppointmentsList } from "@/components/appointments-list"

type StatusFilter = "COMPLETED" | "CONFIRMED" | "PENDING"

interface Appointment {
  id: string
  date: string
  start_time: string
  end_time: string
  status: StatusFilter | "CANCELLED"
  notes?: string
  client: { name: string; email: string; phone?: string }
  professional: { id: string; color: string; user: { name: string } }
  service: { name: string; duration: number; price: number }
}

interface AppointmentsFilterSectionProps {
  appointments: Appointment[]
  userRole: UserRole
}

export function AppointmentsFilterSection({ appointments, userRole }: AppointmentsFilterSectionProps) {
  const [filter, setFilter] = React.useState<StatusFilter>("CONFIRMED")

  return (
    <div className="space-y-4">
      <AgendamentoMenuBar value={filter} onValueChange={setFilter} />
      <AppointmentsList appointments={appointments} userRole={userRole} statusFilter={filter} />
    </div>
  )
}