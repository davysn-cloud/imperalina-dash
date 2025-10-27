"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Settings, Eye, Check, DollarSign, Users, Calendar, TrendingUp } from "lucide-react"
import { ComissaoConfig, Comissao, ComissaoStatus, ComissaoTipo } from "@/lib/types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

// Tipos para dados da API
interface ComissaoAPI {
  id: string
  profissional_id: string
  profissional_nome: string
  total_vendas: number
  total_comissao: number
  bonificacoes: number
  valor_final: number
  status: ComissaoStatus
  atendimentos: Array<{
    id: string
    data: string
    cliente_nome: string
    servico_nome: string
    valor_servico: number
    percentual_comissao: number
    valor_comissao: number
    data_pagamento: string
  }>
}

interface ProfissionalAPI {
  id: string
  user: { name: string }
  services?: Array<{
    id: string
    name: string
    commission_percentage: number
  }>
}

// Funções para buscar dados da API
async function fetchComissoes(mes: string = ''): Promise<ComissaoAPI[]> {
  const params = new URLSearchParams()
  if (mes) params.append('mes', mes)
  
  const response = await fetch(`/api/financeiro/comissoes?${params}`)
  if (!response.ok) {
    throw new Error('Erro ao buscar comissões')
  }
  return response.json()
}

async function fetchProfissionais(): Promise<ProfissionalAPI[]> {
  const response = await fetch('/api/financeiro/comissoes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'get_professionals' })
  })
  
  if (!response.ok) {
    throw new Error('Erro ao buscar profissionais')
  }
  return response.json()
}

async function updateCommissionPercentage(serviceId: string, percentage: number): Promise<void> {
  const response = await fetch('/api/financeiro/comissoes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      action: 'update_commission',
      service_id: serviceId,
      commission_percentage: percentage
    })
  })
  
  if (!response.ok) {
    throw new Error('Erro ao atualizar comissão')
  }
}

// Mock data - será substituído por dados reais da API
const mockProfissionais = [
  {
    id: "1",
    nome: "Ana Silva",
    email: "ana@salon.com",
    config: {
      tipo: "percentual" as ComissaoTipo,
      percentual_base: 40,
      valor_fixo: 0,
      meta_minima: 3000,
      bonus_percentual: 10,
      dia_pagamento: 5,
      ativo: true
    }
  },
  {
    id: "2", 
    nome: "Carlos Santos",
    email: "carlos@salon.com",
    config: {
      tipo: "hibrido" as ComissaoTipo,
      percentual_base: 30,
      valor_fixo: 1500,
      meta_minima: 4000,
      bonus_percentual: 15,
      dia_pagamento: 10,
      ativo: true
    }
  },
  {
    id: "3",
    nome: "Maria Oliveira", 
    email: "maria@salon.com",
    config: {
      tipo: "fixo" as ComissaoTipo,
      percentual_base: 0,
      valor_fixo: 2500,
      meta_minima: 0,
      bonus_percentual: 0,
      dia_pagamento: 15,
      ativo: false
    }
  }
]

const mockComissoes: ComissaoAPI[] = [
  {
    id: "1",
    profissional_id: "1",
    profissional_nome: "Ana Silva",
    total_vendas: 470,
    total_comissao: 188,
    bonificacoes: 0,
    valor_final: 188,
    status: "calculado" as ComissaoStatus,
    atendimentos: [
      { id: "a1", data: "2025-01-15", cliente_nome: "Cliente A", servico_nome: "Corte", valor_servico: 150, percentual_comissao: 40, valor_comissao: 60, data_pagamento: "2025-01-15" },
      { id: "a2", data: "2025-01-20", cliente_nome: "Cliente B", servico_nome: "Coloração", valor_servico: 200, percentual_comissao: 40, valor_comissao: 80, data_pagamento: "2025-01-20" },
      { id: "a3", data: "2025-01-25", cliente_nome: "Cliente C", servico_nome: "Hidratação", valor_servico: 120, percentual_comissao: 40, valor_comissao: 48, data_pagamento: "2025-01-25" }
    ]
  },
  {
    id: "2",
    profissional_id: "2", 
    profissional_nome: "Carlos Santos",
    total_vendas: 550,
    total_comissao: 165,
    bonificacoes: 0,
    valor_final: 165,
    status: "aprovado" as ComissaoStatus,
    atendimentos: [
      { id: "b1", data: "2025-01-10", cliente_nome: "Cliente D", servico_nome: "Manicure", valor_servico: 300, percentual_comissao: 30, valor_comissao: 90, data_pagamento: "2025-01-10" },
      { id: "b2", data: "2025-01-18", cliente_nome: "Cliente E", servico_nome: "Pedicure", valor_servico: 250, percentual_comissao: 30, valor_comissao: 75, data_pagamento: "2025-01-18" }
    ]
  }
]

export default function ComissoesPage() {
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [comissoes, setComissoes] = useState<ComissaoAPI[]>([])
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false)
  const [selectedProfissional, setSelectedProfissional] = useState<any>(null)
  const [selectedComissao, setSelectedComissao] = useState<ComissaoAPI | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const getStatusBadge = (status: ComissaoStatus) => {
    const variants = {
      calculado: "secondary",
      aprovado: "default", 
      pago: "default"
    } as const

    const colors = {
      calculado: "bg-yellow-100 text-yellow-800",
      aprovado: "bg-blue-100 text-blue-800",
      pago: "bg-green-100 text-green-800"
    }

    return (
      <Badge className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getTipoLabel = (tipo: ComissaoTipo) => {
    const labels = {
      percentual: "Percentual",
      fixo: "Fixo",
      hibrido: "Híbrido"
    }
    return labels[tipo]
  }

  const handleSalvarConfig = async () => {
    if (!selectedProfissional) return
    
    try {
      // Implementar salvamento da configuração
      console.log("Salvando configuração...", selectedProfissional)
      // Aqui você pode implementar a lógica para salvar as configurações
      setConfigModalOpen(false)
    } catch (error) {
      console.error("Erro ao salvar configuração:", error)
      setError("Erro ao salvar configuração")
    }
  }

  const handleAprovarComissao = async (comissaoId: string) => {
    try {
      // Implementar aprovação de comissão
      console.log("Aprovando comissão:", comissaoId)
      // Aqui você pode implementar a lógica para aprovar comissões
    } catch (error) {
      console.error("Erro ao aprovar comissão:", error)
      setError("Erro ao aprovar comissão")
    }
  }

  const handleGerarPagamento = async (comissaoId: string) => {
    try {
      // Implementar geração de conta a pagar
      console.log("Gerando pagamento para comissão:", comissaoId)
      // Aqui você pode implementar a lógica para gerar pagamentos
    } catch (error) {
      console.error("Erro ao gerar pagamento:", error)
      setError("Erro ao gerar pagamento")
    }
  }

  const getProfissionalNome = (id: string) => {
    return profissionais.find(p => p.id === id)?.nome || "Profissional não encontrado"
  }

  // Carregar dados da API
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const supabase = getSupabaseBrowserClient()

        // Buscar profissionais
        const { data: professionalsData, error: professionalsError } = await supabase
          .from("professionals")
          .select(`
            id,
            user:users(name)
          `)

        if (professionalsError) throw professionalsError

        const profissionaisFormatados = (professionalsData || []).map((prof: any) => ({
          id: prof.id,
          nome: Array.isArray(prof.user) ? prof.user[0]?.name || "" : prof.user?.name || "",
          email: "",
          config: {
            tipo: "percentual" as ComissaoTipo,
            percentual_base: 0,
            valor_fixo: 0,
            meta_minima: 0,
            bonus_percentual: 0,
            dia_pagamento: 5,
            ativo: true,
          },
        }))

        // Buscar agendamentos do mês atual com serviço e profissional
        const hoje = new Date()
        const year = hoje.getFullYear()
        const month = hoje.getMonth() + 1 // 1-12
        const pad = (n: number) => n.toString().padStart(2, "0")
        const periodStart = `${year}-${pad(month)}-01`
        const nextMonthDate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1) // início do próximo mês
        const nextYear = nextMonthDate.getFullYear()
        const nextMonth = nextMonthDate.getMonth() + 1
        const periodEndExclusive = `${nextYear}-${pad(nextMonth)}-01`

        const { data: appointments, error: appointmentsError } = await supabase
          .from("appointments")
          .select(`
            id,
            date,
            payment_amount,
            payment_status,
            professional:professionals(
              id,
              user:users(name)
            ),
            service:services(
              id,
              name,
              price,
              commission_percentage
            ),
            client:users!appointments_client_id_fkey(
              name
            )
          `)
          .eq("status", "COMPLETED")
          .eq("payment_status", "PAID")
          .gte("date", periodStart)
          .lt("date", periodEndExclusive)

        if (appointmentsError) throw appointmentsError

        // Helpers para lidar com relações possivelmente em array
        const getRelName = (rel: any) => (Array.isArray(rel) ? rel[0]?.name || "" : rel?.name || "")
        const getRelUserName = (rel: any) => {
          const user = Array.isArray(rel?.user) ? rel.user[0] : rel?.user
          return user?.name || ""
        }
        const getRelPrice = (rel: any) => (Array.isArray(rel) ? rel[0]?.price || 0 : rel?.price || 0)
        const getRelCommission = (rel: any) =>
          Array.isArray(rel) ? rel[0]?.commission_percentage || 0 : rel?.commission_percentage || 0

        // Calcular comissões por profissional
        const comissoesMap = new Map<string, ComissaoAPI>();

        (appointments || []).forEach((apt: any) => {
          const profRel = apt.professional
          const servRel = apt.service

          const profissionalId = Array.isArray(profRel) ? profRel[0]?.id : profRel?.id
          const profissionalNome = profRel ? getRelUserName(profRel) || "Profissional não encontrado" : "Profissional não encontrado"
          const servicoNome = servRel ? getRelName(servRel) || "Serviço não encontrado" : "Serviço não encontrado"
          const valorServico = apt.payment_amount || getRelPrice(servRel) || 0
          const percentualComissao = getRelCommission(servRel) || 0
          const valorComissao = (valorServico * percentualComissao) / 100

          if (!profissionalId) return

          if (!comissoesMap.has(profissionalId)) {
            comissoesMap.set(profissionalId, {
              id: profissionalId, // Usar o ID do profissional como ID da comissão
              profissional_id: profissionalId,
              profissional_nome: profissionalNome,
              total_vendas: 0,
              total_comissao: 0,
              bonificacoes: 0,
              valor_final: 0,
              status: "calculado" as ComissaoStatus,
              atendimentos: [],
            })
          }

          const p = comissoesMap.get(profissionalId)!
          p.total_vendas += valorServico
          p.total_comissao += valorComissao
          p.valor_final = p.total_comissao + p.bonificacoes
          p.atendimentos.push({
            id: apt.id,
            data: apt.date,
            cliente_nome: getRelName(apt.client) || "Cliente não encontrado",
            servico_nome: servicoNome,
            valor_servico: valorServico,
            percentual_comissao: percentualComissao,
            valor_comissao: valorComissao,
            data_pagamento: apt.payment_date || "",
          })
        })

        setProfissionais(profissionaisFormatados)
        setComissoes(Array.from(comissoesMap.values()))
      } catch (err) {
        console.error("Erro ao carregar dados:", err)
        setError("Erro ao carregar dados. Tente novamente.")
        // Fallback para dados mock em caso de erro
        setProfissionais(mockProfissionais)
        setComissoes(mockComissoes)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando comissões...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-destructive text-lg mb-2">❌</div>
          <p className="text-muted-foreground">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comissões</h1>
          <p className="text-muted-foreground">
            Configuração e gestão de comissões dos profissionais
          </p>
        </div>
      </div>

      <Tabs defaultValue="configuracao" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configuracao">Configuração</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões do Mês</TabsTrigger>
        </TabsList>

        {/* Aba Configuração */}
        <TabsContent value="configuracao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração de Comissões por Profissional
              </CardTitle>
              <CardDescription>
                Configure o tipo de comissão, percentuais e metas para cada profissional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Configuração</TableHead>
                    <TableHead>Meta Mínima</TableHead>
                    <TableHead>Dia Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profissionais.map((profissional) => (
                    <TableRow key={profissional.id}>
                      <TableCell className="font-medium">{profissional.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTipoLabel(profissional.config.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {profissional.config.tipo === "percentual" && (
                          <span>{profissional.config.percentual_base}%</span>
                        )}
                        {profissional.config.tipo === "fixo" && (
                          <span>{formatCurrency(profissional.config.valor_fixo)}</span>
                        )}
                        {profissional.config.tipo === "hibrido" && (
                          <span>{formatCurrency(profissional.config.valor_fixo)} + {profissional.config.percentual_base}%</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {profissional.config.meta_minima > 0 
                          ? formatCurrency(profissional.config.meta_minima)
                          : "-"
                        }
                      </TableCell>
                      <TableCell>Dia {profissional.config.dia_pagamento}</TableCell>
                      <TableCell>
                        <Badge variant={profissional.config.ativo ? "default" : "secondary"}>
                          {profissional.config.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedProfissional(profissional)
                            setConfigModalOpen(true)
                          }}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Configurar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Comissões do Mês */}
        <TabsContent value="comissoes" className="space-y-4">
          {/* Cards Resumo */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Profissionais</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profissionais.filter(p => p.config.ativo).length}</div>
                <p className="text-xs text-muted-foreground">
                  Ativos no período
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Atendimentos</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comissoes.reduce((acc, c) => acc + c.atendimentos.length, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Janeiro 2025
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    comissoes.reduce((acc, c) => 
                      acc + c.atendimentos.reduce((sum, a) => sum + a.valor_servico, 0), 0
                    )
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  +12% vs mês anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Comissões</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(comissoes.reduce((acc, c) => acc + c.valor_final, 0))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Incluindo bônus
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Comissões */}
          <Card>
            <CardHeader>
              <CardTitle>Comissões - Janeiro 2025</CardTitle>
              <CardDescription>
                Detalhamento das comissões calculadas para o período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead className="text-right">Atendimentos</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Comissão Base</TableHead>
                    <TableHead className="text-right">Bônus</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comissoes.map((comissao) => {
                    const faturamento = comissao.atendimentos.reduce((sum, a) => sum + a.valor_servico, 0)
                    return (
                      <TableRow key={comissao.id}>
                        <TableCell className="font-medium">
                          {getProfissionalNome(comissao.profissional_id)}
                        </TableCell>
                        <TableCell className="text-right">{comissao.atendimentos.length}</TableCell>
                        <TableCell className="text-right">{formatCurrency(faturamento)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(comissao.total_comissao)}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(comissao.bonificacoes)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(comissao.valor_final)}
                        </TableCell>
                        <TableCell>{getStatusBadge(comissao.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedComissao(comissao)
                                setDetalhesModalOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {comissao.status === "calculado" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAprovarComissao(comissao.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            {comissao.status === "aprovado" && (
                              <Button
                                size="sm"
                                onClick={() => handleGerarPagamento(comissao.id)}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Pagar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Configuração */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configurar Comissão</DialogTitle>
            <DialogDescription>
              Configure os parâmetros de comissão para {selectedProfissional?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tipo" className="text-right">Tipo</Label>
              <Select defaultValue={selectedProfissional?.config.tipo}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual</SelectItem>
                  <SelectItem value="fixo">Fixo</SelectItem>
                  <SelectItem value="hibrido">Híbrido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="percentual" className="text-right">Percentual (%)</Label>
              <Input
                id="percentual"
                type="number"
                defaultValue={selectedProfissional?.config.percentual_base}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fixo" className="text-right">Valor Fixo</Label>
              <Input
                id="fixo"
                type="number"
                defaultValue={selectedProfissional?.config.valor_fixo}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="meta" className="text-right">Meta Mínima</Label>
              <Input
                id="meta"
                type="number"
                defaultValue={selectedProfissional?.config.meta_minima}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bonus" className="text-right">Bônus (%)</Label>
              <Input
                id="bonus"
                type="number"
                defaultValue={selectedProfissional?.config.bonus_percentual}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dia" className="text-right">Dia Pagamento</Label>
              <Input
                id="dia"
                type="number"
                min="1"
                max="31"
                defaultValue={selectedProfissional?.config.dia_pagamento}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSalvarConfig}>Salvar Configuração</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
      <Dialog open={detalhesModalOpen} onOpenChange={setDetalhesModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Comissão</DialogTitle>
            <DialogDescription>
              {selectedComissao && getProfissionalNome(selectedComissao.profissional_id)} - Janeiro 2025
            </DialogDescription>
          </DialogHeader>
          {selectedComissao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Total de Atendimentos</Label>
                  <div className="text-2xl font-bold">{selectedComissao.atendimentos.length}</div>
                </div>
                <div>
                  <Label>Faturamento Total</Label>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      selectedComissao.atendimentos.reduce((sum, a) => sum + a.valor_servico, 0)
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Atendimentos Detalhados</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agendamento</TableHead>
                      <TableHead className="text-right">Valor Serviço</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedComissao.atendimentos.map((atendimento, index) => (
                      <TableRow key={index}>
                        <TableCell>#{atendimento.id}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(atendimento.valor_servico)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(atendimento.valor_comissao)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Comissão Base:</span>
                    <span className="font-bold">{formatCurrency(selectedComissao.total_comissao)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bonificações:</span>
                    <span className="font-bold text-green-600">{formatCurrency(selectedComissao.bonificacoes)}</span>
                  </div>
                  <div className="flex justify-between text-lg border-t pt-2">
                    <span className="font-bold">Total Final:</span>
                    <span className="font-bold">{formatCurrency(selectedComissao.valor_final)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}