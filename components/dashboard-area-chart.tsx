"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type DashboardChartPoint = {
  date: string // ISO date string, e.g. YYYY-MM-01
  clients: number
  revenue: number // numeric in local currency base unit
}

export function DashboardAreaChart({ data }: { data: DashboardChartPoint[] }) {
  const [timeRange, setTimeRange] = React.useState("12m")

  const filteredData = React.useMemo(() => {
    if (timeRange === "12m") return data
    const months = timeRange === "6m" ? 6 : timeRange === "3m" ? 3 : 12
    return data.slice(-months)
  }, [data, timeRange])

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Clientes e Faturamento</CardTitle>
          <CardDescription>Resumo mensal dos últimos {timeRange}</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex" aria-label="Selecione o período">
            <SelectValue placeholder="Últimos 12 meses" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="12m" className="rounded-lg">Últimos 12 meses</SelectItem>
            <SelectItem value="6m" className="rounded-lg">Últimos 6 meses</SelectItem>
            <SelectItem value="3m" className="rounded-lg">Últimos 3 meses</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="aspect-auto h-[250px] w-full">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillClients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("pt-BR", {
                    month: "short",
                    year: "2-digit",
                  })
                }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(value: any, name: string) => {
                  if (name === "Faturamento") {
                    const v = typeof value === "number" ? value : Number(value)
                    return [v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), name]
                  }
                  return [value, name]
                }}
                labelFormatter={(value) => {
                  return new Date(value).toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  })
                }}
              />
              <Area dataKey="clients" name="Clientes" type="natural" fill="url(#fillClients)" stroke="#3B82F6" stackId="a" />
              <Area dataKey="revenue" name="Faturamento" type="natural" fill="url(#fillRevenue)" stroke="#F59E0B" stackId="a" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
