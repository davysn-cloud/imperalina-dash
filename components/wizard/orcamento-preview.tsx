"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileDown, Send, Save, Mail } from "lucide-react"
import { MinimalistaTemplate } from "@/components/templates/minimalista-template"
import type { Orcamento, OrcamentoTemplate } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { useCallback, useState } from "react"

interface OrcamentoPreviewProps {
  orcamento: Orcamento
  template: OrcamentoTemplate
  onUpdateTemplate?: (updates: Partial<OrcamentoTemplate>) => void
}

export function OrcamentoPreview({ orcamento, template, onUpdateTemplate }: OrcamentoPreviewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [emailRecipient, setEmailRecipient] = useState(orcamento?.cliente?.email || "")
  const [savedOrcamentoId, setSavedOrcamentoId] = useState<string | null>(null)

  const handleSaveDraft = useCallback(async () => {
    if (isLoading) return

    const dadosEmpresa = (template.dados_empresa || "").trim()
    if (!dadosEmpresa) {
      toast({
        title: 'Dados da empresa obrigatórios',
        description: 'Preencha o campo "Dados da empresa" antes de salvar.',
        variant: 'destructive',
      })
      return
    }
    if (!orcamento.cliente?.email) {
      toast({
        title: 'Email do cliente ausente',
        description: 'Selecione um cliente com email válido.',
        variant: 'destructive',
      })
      return
    }
    if (!orcamento.itens || orcamento.itens.length < 1) {
      toast({
        title: 'Itens obrigatórios',
        description: 'Adicione pelo menos um item ao orçamento.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const orcamentoData = {
        client_id: orcamento.cliente.id || null,
        client_name: orcamento.cliente.nome,
        client_email: orcamento.cliente.email,
        client_phone: orcamento.cliente.telefone || null,
        client_address: orcamento.cliente.endereco || null,
        dados_empresa: dadosEmpresa,
        desconto: orcamento.desconto || 0,
        data_validade: orcamento.data_validade,
        observacoes: orcamento.observacoes || null,
        termos_condicoes: orcamento.termos_condicoes || null,
        itens: orcamento.itens.map((item, index) => ({
          service_id: item.servico_id || null,
          descricao: item.servico_nome,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.subtotal,
          ordem: index + 1,
        })),
      }

      const response = await fetch('/api/orcamentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orcamentoData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar orçamento')
      }

      const savedOrcamento = await response.json()
      setSavedOrcamentoId(savedOrcamento.id)

      toast({
        title: 'Rascunho salvo',
        description: `Orçamento ${savedOrcamento.numero_orcamento} salvo com sucesso!`,
      })
    } catch (error: any) {
      console.error('Erro ao salvar rascunho:', error)
      toast({
        title: 'Erro ao salvar rascunho',
        description: error.message || 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [orcamento, template, isLoading])

  const handleSaveAndSend = useCallback(async () => {
    if (isLoading || !emailRecipient.trim()) return

    const dadosEmpresa = (template.dados_empresa || "").trim()
    if (!dadosEmpresa) {
      toast({
        title: 'Dados da empresa obrigatórios',
        description: 'Preencha o campo "Dados da empresa" antes de enviar.',
        variant: 'destructive',
      })
      return
    }
    if (!orcamento.cliente?.email) {
      toast({
        title: 'Email do cliente ausente',
        description: 'Selecione um cliente com email válido.',
        variant: 'destructive',
      })
      return
    }
    if (!orcamento.itens || orcamento.itens.length < 1) {
      toast({
        title: 'Itens obrigatórios',
        description: 'Adicione pelo menos um item ao orçamento.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      // Primeiro salva o orçamento se ainda não foi salvo
      let orcamentoId = savedOrcamentoId
      
      if (!orcamentoId) {
        const orcamentoData = {
          client_id: orcamento.cliente.id || null,
          client_name: orcamento.cliente.nome,
          client_email: orcamento.cliente.email,
          client_phone: orcamento.cliente.telefone || null,
          client_address: orcamento.cliente.endereco || null,
          dados_empresa: dadosEmpresa,
          desconto: orcamento.desconto || 0,
          data_validade: orcamento.data_validade,
          observacoes: orcamento.observacoes || null,
          termos_condicoes: orcamento.termos_condicoes || null,
          itens: orcamento.itens.map((item, index) => ({
            service_id: item.servico_id || null,
            descricao: item.servico_nome,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_total: item.subtotal,
            ordem: index + 1,
          })),
        }

        const saveResponse = await fetch('/api/orcamentos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orcamentoData),
        })

        if (!saveResponse.ok) {
          const error = await saveResponse.json()
          throw new Error(error.error || 'Erro ao salvar orçamento')
        }

        const savedOrcamento = await saveResponse.json()
        orcamentoId = savedOrcamento.id
        setSavedOrcamentoId(orcamentoId)
      }

      // Agora envia por email
      const sendResponse = await fetch(`/api/orcamentos/${orcamentoId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailRecipient,
          subject: `Orçamento ${orcamento.numero} - Imperalina Estética`,
          message: `Olá ${orcamento.cliente.nome}!\n\nSegue em anexo seu orçamento solicitado.\n\nAtenciosamente,\nImperalina Estética`,
        }),
      })

      if (!sendResponse.ok) {
        const error = await sendResponse.json()
        throw new Error(error.error || 'Erro ao enviar email')
      }

      toast({
        title: 'Orçamento enviado',
        description: `Email enviado com sucesso para ${emailRecipient}!`,
      })
    } catch (error: any) {
      console.error('Erro ao salvar e enviar:', error)
      toast({
        title: 'Erro ao enviar orçamento',
        description: error.message || 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [orcamento, template, emailRecipient, savedOrcamentoId, isLoading])

  const handleExportPDF = useCallback(() => {
    // Usa a impressão do navegador, mostrando apenas a área do orçamento
    if (typeof window === 'undefined') return
    setTimeout(() => window.print(), 50)
    toast({ title: 'Preparando impressão/PDF', description: 'Ajustamos a tela para imprimir somente o orçamento.' })
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Visualizar Orçamento</h2>
        <p className="text-muted-foreground">
          Revise seu orçamento antes de salvar e enviar
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Preview do Template */}
        <div className="xl:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview do Orçamento</CardTitle>
                <Button variant="outline" onClick={handleExportPDF}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Regras de impressão para isolar e escalar o preview */}
              <style>{`
                @media print {
                  body * { visibility: hidden !important; }
                  #orcamento-print-area, #orcamento-print-area * { visibility: visible !important; }
                  #orcamento-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; margin: 0 !important; }
                  #orcamento-print-area .print-scale { transform: scale(1) !important; width: 100% !important; }
                }
              `}</style>
              <div id="orcamento-print-area" className="border rounded-lg overflow-hidden bg-white">
                <div className="transform scale-75 origin-top-left w-[133.33%] print-scale">
                  <MinimalistaTemplate 
                    orcamento={orcamento} 
                    template={template}
                    preview={true}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Painel de Ações */}
        <div className="space-y-6">
          {/* Remetente / Dados da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Remetente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="dados-empresa">Dados da empresa (DE)</Label>
              <Textarea
                id="dados-empresa"
                placeholder={"Ex.:\nMinha Empresa\ncontato@empresa.com\n(11) 99999-9999\nCidade/UF"}
                value={template.dados_empresa || ""}
                onChange={(e) => onUpdateTemplate?.({ dados_empresa: e.target.value })}
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground">
                Uma linha por informação. A primeira linha aparece em destaque.
              </p>
            </CardContent>
          </Card>

          {/* Resumo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Template:</span>
                  <span className="font-medium">{template.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{orcamento.cliente.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Itens:</span>
                  <span className="font-medium">{orcamento.itens.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>
                    {orcamento.subtotal.toLocaleString('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    })}
                  </span>
                </div>
                {orcamento.desconto > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Desconto:</span>
                    <span>
                      -{orcamento.desconto.toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">
                    {orcamento.valor_total.toLocaleString('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleSaveDraft}
                disabled={isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoading ? 'Salvando...' : 'Salvar Rascunho'}
              </Button>
              
              <div className="space-y-2">
                <Label htmlFor="email-recipient">Email do destinatário</Label>
                <Input
                  id="email-recipient"
                  type="email"
                  placeholder="cliente@email.com"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                />
              </div>
              
              <Button 
                className="w-full"
                onClick={handleSaveAndSend}
                disabled={isLoading || !emailRecipient.trim()}
              >
                <Mail className="mr-2 h-4 w-4" />
                {isLoading ? 'Enviando...' : 'Salvar e Enviar por Email'}
              </Button>

              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  O orçamento será salvo no sistema e enviado por email para o destinatário.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Detalhes dos Itens */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Itens do Orçamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orcamento.itens.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="font-medium text-sm mb-1">
                      {item.servico_nome}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Quantidade:</span>
                        <span>{item.quantidade}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Valor Unit.:</span>
                        <span>
                          {item.valor_unitario.toLocaleString('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          })}
                        </span>
                      </div>
                      {item.desconto > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Desconto:</span>
                          <span>{item.desconto}%</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Subtotal:</span>
                        <span>
                          {item.subtotal.toLocaleString('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}