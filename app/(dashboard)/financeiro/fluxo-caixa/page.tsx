"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Download, Calendar, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import { FluxoCaixa } from "@/lib/types"

type PeriodoTipo = "diario" | "semanal" | "mensal" | "anual"

// Mock data - será substituído por dados reais da API
const mockFluxoCaixa: FluxoCaixa[] = [
  {
    id: "1",
    data: new Date("2025-01-15"),
    tipo: "entrada",
    categoria: "Serviços",
    descricao: "Corte + Barba - Maria Silva",
    valor: 450.00,
    created_at: "2025-01-15T00:00:00Z",
    updated_at: "2025-01-15T00:00:00Z"
  },
  {
    id: "2",
    data: new Date("2025-01-15"),
    tipo: "saida",
    categoria: "Comissão",
    descricao: "Comissão João - Janeiro",
    valor: 180.00,
    created_at: "2025-01-15T00:00:00Z",
    updated_at: "2025-01-15T00:00:00Z"
  },
  {
    id: "3",
    data: new Date("2025-01-14"),
    tipo: "entrada",
    categoria: "Serviços",
    descricao: "Manicure - Ana Costa",
    valor: 320.00,
    created_at: "2025-01-14T00:00:00Z",
    updated_at: "2025-01-14T00:00:00Z"
  },
  {
    id: "4",
    data: new Date("2025-01-14"),
    tipo: "saida",
    categoria: "Aluguel",
    descricao: "Aluguel do salão - Janeiro",
    valor: 2500.00,
    created_at: "2025-01-14T00:00:00Z",
    updated_at: "2025-01-14T00:00:00Z"
  },
  {
    id: "5",
    data: new Date("2025-01-13"),
    tipo: "entrada",
    categoria: "Produtos",
    descricao: "Venda de produtos",
    valor: 150.00,
    created_at: "2025-01-13T00:00:00Z",
    updated_at: "2025-01-13T00:00:00Z"
  }
]

const mockGraficoData = [
  { data: "13/01", entradas: 150, saidas: 0, saldo: 150 },
  { data: "14/01", entradas: 320, saidas: 2500, saldo: -2030 },
  { data: "15/01", entradas: 450, saidas: 180, saldo: -1760 },
  { data: "16/01", entradas: 280, saidas: 0, saldo: -1480 },
  { data: "17/01", entradas: 380, saidas: 200, saldo: -1300 },
  { data: "18/01", entradas: 520, saidas: 150, saldo: -930 },
  { data: "19/01", entradas: 420, saidas: 100, saldo: -610 }
]

export default function FluxoCaixaPage() {
  const [periodo, setPeriodo] = useState<PeriodoTipo>("diario")
  const [fluxo, setFluxo] = useState<FluxoCaixa[]>(mockFluxoCaixa)
  const [graficoData, setGraficoData] = useState(mockGraficoData)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
  }

  const calcularResumo = () => {
    const entradas = fluxo.filter(f => f.tipo === "entrada").reduce((acc, f) => acc + f.valor, 0)
    const saidas = fluxo.filter(f => f.tipo === "saida").reduce((acc, f) => acc + f.valor, 0)
    const saldo = entradas - saidas
    const variacao = saldo > 0 ? ((saldo / entradas) * 100) : 0

    return { entradas, saidas, saldo, variacao }
  }

  const resumo = calcularResumo()

  const handleExportarExcel = () => {
    // Implementar exportação para Excel
    console.log("Exportando para Excel...")
  }

  const handleExportarPDF = () => {
    // Implementar exportação para PDF
    console.log("Exportando para PDF...")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fluxo de Caixa</h1>
          <p className="text-muted-foreground">
            Acompanhe as entradas e saídas do seu negócio
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={(value) => setPeriodo(value as PeriodoTipo)}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diario">Diário</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entradas</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(resumo.entradas)}
            </div>
            <p className="text-xs text-muted-foreground">
              {fluxo.filter(f => f.tipo === "entrada").length} movimentações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Saídas</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(resumo.saidas)}
            </div>
            <p className="text-xs text-muted-foreground">
              {fluxo.filter(f => f.tipo === "saida").length} movimentações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${resumo.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(resumo.saldo)}
            </div>
            <p className="text-xs text-muted-foreground">
              Resultado do período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${resumo.variacao >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {resumo.variacao.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Em relação ao período anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Fluxo de Caixa */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Fluxo de Caixa</CardTitle>
          <CardDescription>
            Entradas, saídas e saldo acumulado no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={graficoData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="entradas" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="Entradas"
              />
              <Line 
                type="monotone" 
                dataKey="saidas" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Saídas"
              />
              <Line 
                type="monotone" 
                dataKey="saldo" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Saldo Acumulado"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Extrato Detalhado */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Extrato Detalhado</CardTitle>
              <CardDescription>
                Todas as movimentações do período
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportarExcel}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" onClick={handleExportarPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Entrada</TableHead>
                <TableHead className="text-right">Saída</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fluxo
                .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                .map((movimento, index) => {
                  // Calcular saldo acumulado
                  const movimentosAnteriores = fluxo
                    .filter(f => new Date(f.data) <= new Date(movimento.data))
                    .reduce((acc, f) => acc + (f.tipo === "entrada" ? f.valor : -f.valor), 0)
                  
                  return (
                    <TableRow key={movimento.id}>
                      <TableCell>{formatDate(movimento.data)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={movimento.tipo === "entrada" ? "default" : "destructive"}
                          className="capitalize"
                        >
                          {movimento.tipo === "entrada" ? (
                            <ArrowUpCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDownCircle className="h-3 w-3 mr-1" />
                          )}
                          {movimento.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>{movimento.categoria}</TableCell>
                      <TableCell>{movimento.descricao}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {movimento.tipo === "entrada" ? formatCurrency(movimento.valor) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {movimento.tipo === "saida" ? formatCurrency(movimento.valor) : "-"}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${movimentosAnteriores >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(movimentosAnteriores)}
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}