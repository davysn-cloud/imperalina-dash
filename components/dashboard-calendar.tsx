"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { format, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Appointment {
  id: string
  date: string
  start_time: string
  professional: {
    color: string
  }[]
}

export function DashboardCalendar() {
  const supabase = getSupabaseBrowserClient()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [appointmentDates, setAppointmentDates] = useState<Date[]>([])

  useEffect(() => {
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    const { data } = await supabase
      .from("appointments")
      .select(`
        id,
        date,
        start_time,
        professional:professionals(color)
      `)
      .in("status", ["CONFIRMED", "PENDING"])
      .order("date", { ascending: true })

    if (data) {
      setAppointments(data)
      const dates = data.map((apt) => new Date(apt.date + "T00:00:00"))
      setAppointmentDates(dates)
    }
  }

  const selectedDayAppointments = appointments.filter((apt) =>
    selectedDate ? isSameDay(new Date(apt.date + "T00:00:00"), selectedDate) : false,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendário</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
          modifiers={{
            hasAppointment: appointmentDates,
          }}
          modifiersStyles={{
            hasAppointment: {
              fontWeight: "bold",
              textDecoration: "underline",
            },
          }}
        />

        {selectedDate && (
          <div className="space-y-2">
            <h3 className="font-semibold">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</h3>
            {selectedDayAppointments.length > 0 ? (
              <div className="space-y-2">
                {selectedDayAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-center gap-2 p-2 border rounded-md">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: apt.professional?.[0]?.color || "#d97706" }}
                    />
                    <span className="text-sm">{apt.start_time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum agendamento nesta data</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
