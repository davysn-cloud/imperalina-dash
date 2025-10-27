"use client"

import * as React from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type StatusFilter = "COMPLETED" | "CONFIRMED" | "PENDING"

interface AgendamentoMenuBarProps {
  value: StatusFilter
  onValueChange: (value: StatusFilter) => void
}

export function AgendamentoMenuBar({ value, onValueChange }: AgendamentoMenuBarProps) {
  return (
    <div className="border rounded-lg bg-card">
      <Tabs value={value} onValueChange={(v) => onValueChange(v as StatusFilter)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="COMPLETED">Concluídos</TabsTrigger>
          <TabsTrigger value="CONFIRMED">Confirmados</TabsTrigger>
          <TabsTrigger value="PENDING">Não confirmados</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}
