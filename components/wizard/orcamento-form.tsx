"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, User, Calendar, FileText } from "lucide-react"
import { format, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Orcamento, OrcamentoItem } from "@/lib/types"

interface OrcamentoFormProps {
  clients: any[]
  services: any[]
  orcamentoData: Partial<Orcamento>
  onUpdateData: (data: Partial<Orcamento>) => void
}

export function OrcamentoForm({ clients, services, orcamentoData, onUpdateData }: OrcamentoFormProps) {
  const [itens, setItens] = useState<OrcamentoItem[]>(orcamentoData.itens || [])
  const [selectedClient, setSelectedClient] = useState(orcamentoData.cliente?.id || "")
  const [observacoes, setObservacoes] = useState("")
  const [formaPagamento, setFormaPagamento] = useState("")
  const [dataValidade, setDataValidade] = useState(
    format(addDays(new Date(), 30), "yyyy-MM-dd")
  )

  // Calcular totais
  const subtotal = itens.reduce((sum, item) => sum + item.subtotal, 0)
  const descontoTotal = itens.reduce((sum, item) => sum + (item.valor_unitario * item.quantidade * item.desconto / 100), 0)
  const valorTotal = subtotal - descontoTotal

  // Atualizar dados do orçamento quando houver mudanças
  useEffect(() => {
    const clienteSelecionado = clients.find(c => c.id === selectedClient)
    
    onUpdateData({
      ...orcamentoData,
      cliente: clienteSelecionado ? {
        id: clienteSelecionado.id,
        nome: clienteSelecionado.name,
        email: clienteSelecionado.email,
        telefone: clienteSelecionado.phone || "",
      } : undefined,
      itens,
      subtotal,
      desconto: descontoTotal,
      valor_total: valorTotal,
      data_emissao: new Date(),
      data_validade: new Date(dataValidade),
      observacoes,
      forma_pagamento: formaPagamento,
    })
  }, [selectedClient, itens, subtotal, descontoTotal, valorTotal, dataValidade, observacoes, formaPagamento])

  const adicionarItem = () => {
    const novoItem: OrcamentoItem = {
      id: (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
      servico_id: "",
      servico_nome: "",
      quantidade: 1,
      valor_unitario: 0,
      desconto: 0,
      subtotal: 0,
    }
    setItens([...itens, novoItem])
  }

  const removerItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index))
  }

  const atualizarItem = (index: number, campo: keyof OrcamentoItem, valor: any) => {
    const novosItens = [...itens]
    novosItens[index] = { ...novosItens[index], [campo]: valor }
    
    // Recalcular subtotal quando necessário
    if (campo === "quantidade" || campo === "valor_unitario" || campo === "desconto") {
      const item = novosItens[index]
      const subtotalSemDesconto = item.quantidade * item.valor_unitario
      const valorDesconto = subtotalSemDesconto * (item.desconto / 100)
      novosItens[index].subtotal = subtotalSemDesconto - valorDesconto
    }
    
    // Atualizar nome do serviço quando selecionado
    if (campo === "servico_id") {
      const servico = services.find(s => s.id === valor)
      if (servico) {
        novosItens[index].servico_nome = servico.name
        novosItens[index].valor_unitario = servico.price || 0
        // Recalcular subtotal
        const item = novosItens[index]
        const subtotalSemDesconto = item.quantidade * item.valor_unitario
        const valorDesconto = subtotalSemDesconto * (item.desconto / 100)
        novosItens[index].subtotal = subtotalSemDesconto - valorDesconto
      }
    }
    
    setItens(novosItens)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Dados do Orçamento</h2>
        <p className="text-muted-foreground">
          Preencha as informações do cliente e adicione os serviços
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seleção do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cliente">Selecionar Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} - {client.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Itens do Orçamento */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Serviços
                </CardTitle>
                <Button onClick={adicionarItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {itens.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum serviço adicionado</p>
                  <p className="text-sm">Clique em "Adicionar Item" para começar</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serviço</TableHead>
                        <TableHead className="w-20">Qtd</TableHead>
                        <TableHead className="w-32">Valor Unit.</TableHead>
                        <TableHead className="w-20">Desc. %</TableHead>
                        <TableHead className="w-32">Subtotal</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itens.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              value={item.servico_id}
                              onValueChange={(value) => atualizarItem(index, "servico_id", value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecionar serviço" />
                              </SelectTrigger>
                              <SelectContent>
                                {services.map((service) => (
                                  <SelectItem key={service.id} value={service.id}>
                                    {service.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantidade}
                              onChange={(e) => atualizarItem(index, "quantidade", parseInt(e.target.value) || 1)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.valor_unitario}
                              onChange={(e) => atualizarItem(index, "valor_unitario", parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.desconto}
                              onChange={(e) => atualizarItem(index, "desconto", parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.subtotal.toLocaleString('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            })}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removerItem(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                </CardContent>
              </Card>

              {/* Informações Adicionais */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Informações Adicionais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="validade">Data de Validade</Label>
                      <Input
                        id="validade"
                        type="date"
                        value={dataValidade}
                        onChange={(e) => setDataValidade(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pagamento">Forma de Pagamento</Label>
                      <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar forma de pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="cartao">Cartão</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                          <SelectItem value="parcelado">Parcelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      placeholder="Observações adicionais sobre o orçamento..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumo dos Totais */}
            <div className="space-y-6">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Resumo do Orçamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>
                        {subtotal.toLocaleString('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        })}
                      </span>
                    </div>
                    {descontoTotal > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Desconto:</span>
                        <span>
                          -{descontoTotal.toLocaleString('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          })}
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total:</span>
                        <span className="text-primary">
                          {valorTotal.toLocaleString('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
                    <div>
                      <strong>Itens:</strong> {itens.length}
                    </div>
                    <div>
                      <strong>Cliente:</strong> {
                        clients.find(c => c.id === selectedClient)?.name || "Não selecionado"
                      }
                    </div>
                    <div>
                      <strong>Validade:</strong> {
                        format(new Date(dataValidade), "dd/MM/yyyy", { locale: ptBR })
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

        {/* Resumo dos Totais */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Resumo do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>
                    {subtotal.toLocaleString('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    })}
                  </span>
                </div>
                {descontoTotal > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Desconto:</span>
                    <span>
                      -{descontoTotal.toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      })}
                    </span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span className="text-primary">
                      {valorTotal.toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
                <div>
                  <strong>Itens:</strong> {itens.length}
                </div>
                <div>
                  <strong>Cliente:</strong> {
                    clients.find(c => c.id === selectedClient)?.name || "Não selecionado"
                  }
                </div>
                <div>
                  <strong>Validade:</strong> {
                    format(new Date(dataValidade), "dd/MM/yyyy", { locale: ptBR })
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}