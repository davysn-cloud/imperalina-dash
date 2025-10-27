"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScheduleManager } from "@/components/schedule-manager"
import type { Professional } from "@/lib/types"

interface AdminSchedulesManagerProps {
  professionals: (Professional & { user: any })[]
}

export function AdminSchedulesManager({ professionals }: AdminSchedulesManagerProps) {
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("")

  const activeProfessionals = professionals.filter((p) => p.is_active)

  const selectedProfessionals = selectedProfessionalId
    ? activeProfessionals
        .filter((p) => p.id === selectedProfessionalId)
        .map((p) => ({
          id: p.id,
          user: {
            name: p.user?.name || "",
          },
        }))
    : []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Gerenciar Horários</h2>
        <p className="text-sm text-muted-foreground">Configure os horários de trabalho dos profissionais</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selecione um Profissional</CardTitle>
          <CardDescription>Escolha o profissional para gerenciar seus horários</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedProfessionalId} onValueChange={setSelectedProfessionalId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um profissional" />
            </SelectTrigger>
            <SelectContent>
              {activeProfessionals.map((professional) => (
                <SelectItem key={professional.id} value={professional.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: professional?.color || "#d97706" }}
                    />
                    {professional.user?.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProfessionalId && selectedProfessionals.length > 0 && (
        <ScheduleManager professionals={selectedProfessionals} userRole="ADMIN" />
      )}
    </div>
  )
}
