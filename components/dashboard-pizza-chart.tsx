"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Label } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface DashboardPizzaChartProps {
  newCount: number
  returningCount: number
}

export function DashboardPizzaChart({ newCount, returningCount }: DashboardPizzaChartProps) {
  const total = React.useMemo(() => (newCount || 0) + (returningCount || 0), [newCount, returningCount])

  const data = React.useMemo(
    () => [
      { name: "Novos", value: newCount },
      { name: "Recorrentes", value: returningCount },
    ],
    [newCount, returningCount],
  )

  const COLORS = ["#3B82F6", "#10B981"] // azul, verde

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Clientes deste mês</CardTitle>
        <CardDescription>Novos vs recorrentes</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <div className="mx-auto w-full max-w-[480px]">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Tooltip formatter={(value: number, name) => [value, name]} />
              <Legend verticalAlign="bottom" height={24} />
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} strokeWidth={5}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                            {total.toLocaleString()}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground">
                            Clientes
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {total > 0 ? "Atividade saudável" : "Sem atividade"} <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">Distribuição de clientes no mês</div>
      </CardFooter>
    </Card>
  )
}
