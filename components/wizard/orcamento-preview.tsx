"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileDown, Send, Save } from "lucide-react"
import { MinimalistaTemplate } from "@/components/templates/minimalista-template"
import type { Orcamento, OrcamentoTemplate } from "@/lib/types"

interface OrcamentoPreviewProps {
  orcamento: Orcamento
  template: OrcamentoTemplate
}

export function OrcamentoPreview({ orcamento, template }: OrcamentoPreviewProps) {
  const handleSaveDraft = () => {
    // TODO: Implementar salvamento como rascunho
    console.log("Salvando rascunho...", orcamento)
  }

  const handleSaveAndSend = () => {
    // TODO: Implementar salvamento e envio
    console.log("Salvando e enviando...", orcamento)
  }

  const handleExportPDF = () => {
    // TODO: Implementar exportação para PDF
    console.log("Exportando PDF...", orcamento)
  }

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
              <div className="border rounded-lg overflow-hidden bg-white">
                <div className="transform scale-75 origin-top-left w-[133.33%]">
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
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar Rascunho
              </Button>
              
              <Button 
                className="w-full"
                onClick={handleSaveAndSend}
              >
                <Send className="mr-2 h-4 w-4" />
                Salvar e Enviar
              </Button>

              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  Ao salvar e enviar, o orçamento será enviado por email para o cliente
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