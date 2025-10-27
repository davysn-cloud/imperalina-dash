"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash2 } from "lucide-react"
import type { UserRole } from "@/lib/types"

interface Professional {
  id: string
  user: {
    name: string
  }
}

interface Schedule {
  id: string
  professional_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

interface ScheduleManagerProps {
  professionals: Professional[]
  userRole: UserRole
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
]

export function ScheduleManager({ professionals, userRole }: ScheduleManagerProps) {
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()
  const [selectedProfessional, setSelectedProfessional] = useState<string>(professionals[0]?.id || "")
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (selectedProfessional) {
      loadSchedules()
    }
  }, [selectedProfessional])

  const loadSchedules = async () => {
    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("professional_id", selectedProfessional)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true })

    if (error) {
      console.error("[v0] Error loading schedules:", error)
      return
    }

    setSchedules(data || [])
  }

  const addSchedule = async (dayOfWeek: number) => {
    const newSchedule = {
      professional_id: selectedProfessional,
      day_of_week: dayOfWeek,
      start_time: "09:00",
      end_time: "18:00",
      is_active: true,
    }

    const { data, error } = await supabase.from("schedules").insert(newSchedule).select().single()

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar horário",
        variant: "destructive",
      })
      return
    }

    setSchedules([...schedules, data])
    toast({
      title: "Sucesso",
      description: "Horário adicionado com sucesso",
    })
  }

  const updateSchedule = async (id: string, updates: Partial<Schedule>) => {
    const { error } = await supabase.from("schedules").update(updates).eq("id", id)

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar horário",
        variant: "destructive",
      })
      return
    }

    setSchedules(schedules.map((s) => (s.id === id ? { ...s, ...updates } : s)))
    toast({
      title: "Sucesso",
      description: "Horário atualizado com sucesso",
    })
  }

  const deleteSchedule = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este horário?")) return

    const { error } = await supabase.from("schedules").delete().eq("id", id)

    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir horário",
        variant: "destructive",
      })
      return
    }

    setSchedules(schedules.filter((s) => s.id !== id))
    toast({
      title: "Sucesso",
      description: "Horário excluído com sucesso",
    })
  }

  if (professionals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Nenhum profissional disponível</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {userRole === "ADMIN" && professionals.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Profissional</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {DAYS_OF_WEEK.map((day) => {
        const daySchedules = schedules.filter((s) => s.day_of_week === day.value)

        return (
          <Card key={day.value}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{day.label}</CardTitle>
                <Button size="sm" onClick={() => addSchedule(day.value)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Horário
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {daySchedules.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum horário configurado</p>
              ) : (
                <div className="space-y-4">
                  {daySchedules.map((schedule) => (
                    <div key={schedule.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Início</Label>
                          <Input
                            type="time"
                            value={schedule.start_time}
                            onChange={(e) => updateSchedule(schedule.id, { start_time: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fim</Label>
                          <Input
                            type="time"
                            value={schedule.end_time}
                            onChange={(e) => updateSchedule(schedule.id, { end_time: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={schedule.is_active}
                          onCheckedChange={(checked) => updateSchedule(schedule.id, { is_active: checked })}
                        />
                        <Button variant="outline" size="icon" onClick={() => deleteSchedule(schedule.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
