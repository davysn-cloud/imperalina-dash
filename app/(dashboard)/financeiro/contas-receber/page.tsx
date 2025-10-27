"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, Calendar, CalendarDays, User, CreditCard, AlertCircle, CheckCircle, Clock, Loader2, Search, Filter, MessageCircle } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

interface ContaReceber {
  id: string
  cliente_nome: string
  cliente_email: string
  cliente_telefone: string
  servico_nome: string
  valor_original: number
  valor_pago: number
  data_vencimento: string
  data_pagamento: string | null
  status: "PENDING" | "PAID" | "OVERDUE"
  metodo_pagamento: string | null
  observacoes: string | null
  profissional_nome: string
}

// Removido fallback de mocks – apenas dados reais da API serão usados

const statusConfig = {
  PENDING: { label: "Pendente", variant: "secondary" as const },
  PAID: { label: "Pago", variant: "default" as const },
  OVERDUE: { label: "Atrasado", variant: "destructive" as const },
}

export default function ContasReceberPage() {
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([])
  const [filtroStatus, setFiltroStatus] = useState<"PENDING" | "PAID" | "OVERDUE" | "ALL">("ALL")
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [contaSelecionada, setContaSelecionada] = useState<ContaReceber | null>(null)
  const [modalReceber, setModalReceber] = useState(false)
  const [modalPagamento, setModalPagamento] = useState<{ aberto: boolean; conta?: ContaReceber }>({ aberto: false })
  const [formPagamento, setFormPagamento] = useState({
    valor: "",
    data: "",
    metodo: "",
    observacoes: "",
  })

  // Carregar dados da API
  useEffect(() => {
    carregarContasReceber()
  }, [filtroStatus])

  const carregarContasReceber = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroStatus !== "ALL") {
        params.append("status", filtroStatus)
      }
      
      const response = await fetch(`/api/financeiro/contas-receber?${params}`)
      if (!response.ok) throw new Error("Erro ao carregar contas a receber")
      
      const data = await response.json()
      setContasReceber(data)
    } catch (error) {
      console.error("Erro ao carregar contas a receber:", error)
      toast.error("Erro ao carregar contas a receber")
      setContasReceber([])
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
  }

  const contasFiltradas = contasReceber.filter(conta => {
    const matchStatus = filtroStatus === "ALL" || conta.status === filtroStatus
    const matchBusca = conta.cliente_nome.toLowerCase().includes(busca.toLowerCase()) || 
                      conta.servico_nome.toLowerCase().includes(busca.toLowerCase())
    return matchStatus && matchBusca
  })

  const resumo = {
    pendente: contasReceber.filter(c => c.status === "PENDING").reduce((acc, c) => acc + c.valor_original, 0),
    pago: contasReceber.filter(c => c.status === "PAID").reduce((acc, c) => acc + c.valor_original, 0),
    atrasado: contasReceber.filter(c => c.status === "OVERDUE").reduce((acc, c) => acc + c.valor_original, 0)
  }

  const handleReceberPagamento = (conta: ContaReceber) => {
    setModalPagamento({ 
      aberto: true, 
      conta 
    })
    setFormPagamento({
      valor: conta.valor_original.toString(),
      data: new Date().toISOString().split('T')[0],
      metodo: "",
      observacoes: "",
    })
  }

  const processarRecebimento = async () => {
    if (!modalPagamento.conta) return

    try {
      const response = await fetch("/api/financeiro/contas-receber", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: modalPagamento.conta.id,
          payment_status: "PAID",
          payment_date: formPagamento.data,
          payment_amount: parseFloat(formPagamento.valor),
          payment_method: formPagamento.metodo,
          payment_notes: formPagamento.observacoes,
        }),
      })

      if (!response.ok) throw new Error("Erro ao processar pagamento")

      toast.success("Pagamento processado com sucesso!")
      setModalPagamento({ aberto: false })
      carregarContasReceber() // Recarregar dados
    } catch (error) {
      console.error("Erro ao processar pagamento:", error)
      toast.error("Erro ao processar pagamento")
    }
  }

  const handleEnviarCobranca = (conta: ContaReceber) => {
    const raw = conta.cliente_telefone || ""
    const digits = raw.replace(/\D/g, "")

    if (!digits) {
      toast.error("Cliente sem telefone cadastrado")
      return
    }

    const withCountry = digits.startsWith("55") ? digits : `55${digits}`
    const link = `https://wa.me/${withCountry}`

    window.open(link, "_blank")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas a Receber</h1>
          <p className="text-muted-foreground">
            Gerencie os recebimentos e cobranças do salão
          </p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(resumo.pendente)}
            </div>
            <p className="text-xs text-muted-foreground">
              {contasReceber.filter(c => c.status === "PENDING").length} contas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebido</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(resumo.pago)}
            </div>
            <p className="text-xs text-muted-foreground">
              {contasReceber.filter(c => c.status === "PAID").length} contas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasado</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(resumo.atrasado)}
            </div>
            <p className="text-xs text-muted-foreground">
              {contasReceber.filter(c => c.status === "OVERDUE").length} contas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Contas</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou número..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={filtroStatus} onValueChange={(value) => setFiltroStatus(value as "PENDING" | "PAID" | "OVERDUE" | "ALL")}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filtroStatus} onValueChange={(value) => setFiltroStatus(value as "PENDING" | "PAID" | "OVERDUE" | "ALL")}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="ALL">Todas</TabsTrigger>
              <TabsTrigger value="PENDING">Pendentes</TabsTrigger>
              <TabsTrigger value="PAID">Pagas</TabsTrigger>
              <TabsTrigger value="OVERDUE">Atrasadas</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center p-6 border rounded">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Carregando contas...</span>
                </div>
              ) : contasFiltradas.length === 0 ? (
                <div className="p-6 border rounded text-sm text-muted-foreground">Nenhuma conta encontrada</div>
              ) : (
                contasFiltradas.map((conta) => (
                  <Card key={conta.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{conta.cliente_nome}</p>
                          <p className="text-sm text-muted-foreground">{conta.servico_nome}</p>
                        </div>
                        <Badge variant={statusConfig[conta.status].variant}>
                          {statusConfig[conta.status].label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(conta.valor_original)}</p>
                          <p className="text-sm text-muted-foreground">
                            Venc: {format(new Date(conta.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          {conta.status !== "PAID" ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEnviarCobranca(conta)}
                              >
                                <MessageCircle className="h-4 w-4 mr-1" />
                                Cobrar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleReceberPagamento(conta)}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Receber
                              </Button>
                            </>
                          ) : (
                            <Badge variant="outline" className="text-green-600">
                              Pago em {conta.data_pagamento && format(new Date(conta.data_pagamento), "dd/MM/yyyy", { locale: ptBR })}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de Recebimento */}
      <Dialog open={modalReceber} onOpenChange={setModalReceber}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
            <DialogDescription>
              Confirme os dados do recebimento da conta {contaSelecionada?.id}
            </DialogDescription>
          </DialogHeader>
          
          {contaSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cliente</Label>
                  <Input value={contaSelecionada.cliente_nome} disabled />
                </div>
                <div>
                  <Label>Valor Original</Label>
                  <Input value={formatCurrency(contaSelecionada.valor_original)} disabled />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data do Pagamento</Label>
                  <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <Label>Forma de Pagamento</Label>
                  <Select defaultValue={contaSelecionada.metodo_pagamento || ""}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Pix">Pix</SelectItem>
                      <SelectItem value="Cartão">Cartão</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Desconto (R$)</Label>
                  <Input type="number" step="0.01" placeholder="0,00" />
                </div>
                <div>
                  <Label>Acréscimo (R$)</Label>
                  <Input type="number" step="0.01" placeholder="0,00" />
                </div>
              </div>
              
              <div>
                <Label>Observações</Label>
                <Textarea placeholder="Observações sobre o recebimento..." />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalReceber(false)}>
              Cancelar
            </Button>
            <Button onClick={processarRecebimento}>
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}