"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { FileText, Download, TrendingUp, TrendingDown } from "lucide-react"
import { DRE, DREItem } from "@/lib/types"

// Mock data - será substituído por dados reais da API
const mockDRE: DRE = {
  periodo: {
    inicio: new Date("2025-01-01"),
    fim: new Date("2025-01-31")
  },
  receita_bruta: 25000.00,
  deducoes: 1250.00,
  receita_liquida: 23750.00,
  custos_servicos: 8500.00,
  lucro_bruto: 15250.00,
  margem_bruta: 64.2,
  despesas_operacionais: 6200.00,
  resultado_final: 9050.00,
  margem_liquida: 38.1,
  detalhes: {
    receitas: [
      { categoria: "Cortes", valor: 12000.00, percentual: 48.0 },
      { categoria: "Coloração", valor: 8000.00, percentual: 32.0 },
      { categoria: "Tratamentos", valor: 3500.00, percentual: 14.0 },
      { categoria: "Produtos", valor: 1500.00, percentual: 6.0 }
    ],
    custos: [
      { categoria: "Comissões", valor: 6000.00, percentual: 70.6 },
      { categoria: "Produtos", valor: 2500.00, percentual: 29.4 }
    ],
    despesas: [
      { categoria: "Aluguel", valor: 2500.00, percentual: 40.3 },
      { categoria: "Energia", valor: 800.00, percentual: 12.9 },
      { categoria: "Água", valor: 300.00, percentual: 4.8 },
      { categoria: "Internet", valor: 150.00, percentual: 2.4 },
      { categoria: "Marketing", valor: 1200.00, percentual: 19.4 },
      { categoria: "Outros", valor: 1250.00, percentual: 20.2 }
    ]
  }
}

const mockComparativo = [
  { mes: "Ago", receita: 20000, custos: 7000, resultado: 6500 },
  { mes: "Set", receita: 22000, custos: 7500, resultado: 7200 },
  { mes: "Out", receita: 21500, custos: 8000, resultado: 6800 },
  { mes: "Nov", receita: 24000, custos: 8200, resultado: 8100 },
  { mes: "Dez", receita: 26000, custos: 8800, resultado: 8900 },
  { mes: "Jan", receita: 25000, custos: 8500, resultado: 9050 }
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function DREPage() {
  const [mesAno, setMesAno] = useState("2025-01")
  const [dre, setDre] = useState<DRE>(mockDRE)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentual = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const handleExportarPDF = () => {
    // Implementar exportação para PDF
    console.log("Exportando DRE para PDF...")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DRE - Demonstrativo de Resultado</h1>
          <p className="text-muted-foreground">
            Análise detalhada da performance financeira do período
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={mesAno} onValueChange={setMesAno}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-12">Dezembro 2024</SelectItem>
              <SelectItem value="2025-01">Janeiro 2025</SelectItem>
              <SelectItem value="2025-02">Fevereiro 2025</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportarPDF}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* DRE Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Demonstrativo de Resultado - Janeiro 2025
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-semibold">RECEITA BRUTA</span>
                  <span className="font-bold text-lg">{formatCurrency(dre.receita_bruta)}</span>
                </div>
                
                <div className="flex justify-between items-center py-1 pl-4">
                  <span className="text-red-600">(-) Descontos</span>
                  <span className="text-red-600">{formatCurrency(dre.deducoes)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-t bg-blue-50">
                  <span className="font-semibold">= RECEITA LÍQUIDA</span>
                  <span className="font-bold text-lg text-blue-600">{formatCurrency(dre.receita_liquida)}</span>
                </div>
                
                <div className="flex justify-between items-center py-1 pl-4">
                  <span className="text-red-600">(-) Custos dos Serviços</span>
                  <span className="text-red-600">{formatCurrency(dre.custos_servicos)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-t bg-green-50">
                  <span className="font-semibold">= LUCRO BRUTO</span>
                  <div className="text-right">
                    <div className="font-bold text-lg text-green-600">{formatCurrency(dre.lucro_bruto)}</div>
                    <div className="text-sm text-green-600">Margem: {formatPercentual(dre.margem_bruta)}</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center py-1 pl-4">
                  <span className="text-red-600">(-) Despesas Operacionais</span>
                  <span className="text-red-600">{formatCurrency(dre.despesas_operacionais)}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-t bg-gray-100">
                  <span className="font-bold text-lg">= RESULTADO FINAL</span>
                  <div className="text-right">
                    <div className="font-bold text-xl text-green-600">{formatCurrency(dre.resultado_final)}</div>
                    <div className="text-sm text-green-600">Margem: {formatPercentual(dre.margem_liquida)}</div>
                  </div>
                </div>
              </div>

              {/* Indicadores */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Indicadores Principais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Margem Bruta:</span>
                      <span className="font-bold text-green-600">{formatPercentual(dre.margem_bruta)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Margem Líquida:</span>
                      <span className="font-bold text-blue-600">{formatPercentual(dre.margem_liquida)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Custos/Receita:</span>
                      <span className="font-bold">{formatPercentual((dre.custos_servicos / dre.receita_liquida) * 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Despesas/Receita:</span>
                      <span className="font-bold">{formatPercentual((dre.despesas_operacionais / dre.receita_liquida) * 100)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>vs Mês Anterior:</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-bold text-green-600">+8.2%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>vs Mesmo Período Ano Anterior:</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-bold text-green-600">+15.4%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de Pizza - Custos por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Custos por Categoria</CardTitle>
            <CardDescription>Distribuição dos custos operacionais</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dre.detalhes.despesas}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ categoria, percentual }) => `${categoria}: ${percentual}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="valor"
                >
                  {dre.detalhes.despesas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Evolução 6 Meses */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução - Últimos 6 Meses</CardTitle>
            <CardDescription>Receita, custos e resultado mensal</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockComparativo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="receita" fill="#22c55e" name="Receita" />
                <Bar dataKey="custos" fill="#ef4444" name="Custos" />
                <Bar dataKey="resultado" fill="#3b82f6" name="Resultado" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Comparativa */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo Mensal</CardTitle>
          <CardDescription>Evolução dos principais indicadores</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Receita Bruta</TableHead>
                <TableHead className="text-right">Custos</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
                <TableHead className="text-right">Margem %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockComparativo.map((item) => (
                <TableRow key={item.mes}>
                  <TableCell className="font-medium">{item.mes}/25</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.receita)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatCurrency(item.custos)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatCurrency(6200)}</TableCell>
                  <TableCell className="text-right font-bold text-green-600">{formatCurrency(item.resultado)}</TableCell>
                  <TableCell className="text-right font-bold">{formatPercentual((item.resultado / item.receita) * 100)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}