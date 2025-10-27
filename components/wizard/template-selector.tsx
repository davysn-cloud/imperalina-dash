"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Palette } from "lucide-react"
import type { OrcamentoTemplate } from "@/lib/types"

const nowIso = new Date().toISOString()

interface TemplateSelectorProps {
  templates: OrcamentoTemplate[]
  selectedTemplate: OrcamentoTemplate | null
  onSelectTemplate: (template: OrcamentoTemplate) => void
}

// Templates padrão caso não existam no banco
const defaultTemplates: OrcamentoTemplate[] = [
  {
    id: "minimalista",
    nome: "Minimalista",
    descricao: "Design clean com borders finas e tipografia light",
    cor_primaria: "#000000",
    cor_secundaria: "#666666",
    layout: "MINIMALISTA",
    fonte: "SANS_SERIF",
    espacamento: "NORMAL",
    exibir_logo: true,
    dados_empresa: "",
    conteudo_padrao: "",
    secoes_ativas: {
      cabecalho: true,
      dados_cliente: true,
      itens: true,
      totais: true,
      observacoes: true,
      rodape: true,
    },
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "moderno",
    nome: "Moderno",
    descricao: "Header com gradiente e design contemporâneo",
    cor_primaria: "#3B82F6",
    cor_secundaria: "#1E40AF",
    layout: "MODERNO",
    fonte: "SANS_SERIF",
    espacamento: "AMPLO",
    exibir_logo: true,
    dados_empresa: "",
    conteudo_padrao: "",
    secoes_ativas: {
      cabecalho: true,
      dados_cliente: true,
      itens: true,
      totais: true,
      observacoes: true,
      rodape: true,
    },
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: "elegante",
    nome: "Elegante",
    descricao: "Estilo corporativo com serifas e sombras suaves",
    cor_primaria: "#1F2937",
    cor_secundaria: "#6B7280",
    layout: "ELEGANTE",
    fonte: "SERIF",
    espacamento: "NORMAL",
    exibir_logo: true,
    dados_empresa: "",
    conteudo_padrao: "",
    secoes_ativas: {
      cabecalho: true,
      dados_cliente: true,
      itens: true,
      totais: true,
      observacoes: true,
      rodape: true,
    },
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  },
]

export function TemplateSelector({ templates, selectedTemplate, onSelectTemplate }: TemplateSelectorProps) {
  const availableTemplates = templates.length > 0 ? templates : defaultTemplates

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Escolha um Template</h2>
        <p className="text-muted-foreground">
          Selecione o design que melhor representa sua marca
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableTemplates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedTemplate?.id === template.id
                ? "ring-2 ring-primary shadow-lg"
                : "hover:shadow-md"
            }`}
            onClick={() => onSelectTemplate(template)}
          >
            <CardContent className="p-6">
              {/* Preview Miniatura */}
              <div className="relative mb-4 h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden">
                <div className="absolute inset-0 p-4">
                  {/* Header simulado */}
                  <div 
                    className="h-8 rounded mb-3"
                    style={{ backgroundColor: template.cor_primaria + "20" }}
                  />
                  
                  {/* Conteúdo simulado */}
                  <div className="space-y-2">
                    <div className="h-2 bg-gray-300 rounded w-3/4" />
                    <div className="h-2 bg-gray-300 rounded w-1/2" />
                    <div className="h-2 bg-gray-300 rounded w-2/3" />
                  </div>
                  
                  {/* Tabela simulada */}
                  <div className="mt-4 space-y-1">
                    <div className="h-1 bg-gray-400 rounded" />
                    <div className="h-1 bg-gray-300 rounded" />
                    <div className="h-1 bg-gray-300 rounded" />
                  </div>
                  
                  {/* Total simulado */}
                  <div 
                    className="absolute bottom-4 right-4 w-16 h-6 rounded"
                    style={{ backgroundColor: template.cor_primaria }}
                  />
                </div>

                {/* Indicador de seleção */}
                {selectedTemplate?.id === template.id && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>

              {/* Informações do template */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{template.nome}</h3>
                  <p className="text-sm text-muted-foreground">{template.descricao}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <div className="flex gap-1">
                    <div
                      className="w-4 h-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: template.cor_primaria }}
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-gray-200"
                      style={{ backgroundColor: template.cor_secundaria }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {template.layout}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {template.fonte}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTemplate && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground rounded-full p-2">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-semibold">Template "{selectedTemplate.nome}" selecionado</h4>
                <p className="text-sm text-muted-foreground">
                  Você pode prosseguir para o próximo passo
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}