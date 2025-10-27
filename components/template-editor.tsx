"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
// Remover Separator que não existe no projeto
// import { Separator } from "@/components/ui/separator"
import { Save, FileDown, Palette } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { MinimalistaTemplate } from "@/components/templates/minimalista-template"
import type { OrcamentoTemplate, Orcamento } from "@/lib/types"

interface TemplateEditorProps {
  template: OrcamentoTemplate | null
}

// Dados mock para preview
const mockOrcamento: Orcamento = {
  id: "mock-1",
  numero: "ORC-2025-001",
  template_id: "minimalista",
  cliente: {
    id: "client-1",
    nome: "Maria Silva",
    email: "maria@email.com",
    telefone: "(11) 99999-9999",
  },
  itens: [
    {
      id: "item-1",
      servico_id: "service-1",
      servico_nome: "Limpeza de Pele Profunda",
      quantidade: 1,
      valor_unitario: 150.0,
      desconto: 0,
      subtotal: 150.0,
    },
    {
      id: "item-2",
      servico_id: "service-2",
      servico_nome: "Hidratação Facial",
      quantidade: 1,
      valor_unitario: 120.0,
      desconto: 10,
      subtotal: 108.0,
    },
  ],
  data_emissao: new Date(),
  data_validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  subtotal: 270.0,
  desconto: 12.0,
  valor_total: 258.0,
  status: "PENDENTE",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export function TemplateEditor({ template }: TemplateEditorProps) {
  const [formData, setFormData] = useState<Partial<OrcamentoTemplate>>({
    nome: template?.nome || "",
    descricao: template?.descricao || "",
    cor_primaria: template?.cor_primaria || "#000000",
    cor_secundaria: template?.cor_secundaria || "#666666",
    layout: template?.layout || "MINIMALISTA",
    fonte: template?.fonte || "SANS_SERIF",
    espacamento: template?.espacamento || "NORMAL",
    exibir_logo: template?.exibir_logo ?? true,
    dados_empresa: template?.dados_empresa || "",
    conteudo_padrao: template?.conteudo_padrao || "",
  })

  const [showColorPicker, setShowColorPicker] = useState<"primary" | "secondary" | null>(null)

  const handleSave = () => {
    // TODO: Implementar salvamento do template
    console.log("Salvando template...", formData)
  }

  const handleExportPDF = () => {
    // TODO: Implementar exportação de PDF de teste
    console.log("Exportando PDF de teste...")
  }

  const updateField = (field: keyof OrcamentoTemplate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="flex h-full gap-6">
      {/* Painel Esquerdo - Configurações */}
      <div className="w-96 flex-shrink-0 space-y-6 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Configurações do Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome do Template</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => updateField("nome", e.target.value)}
                  placeholder="Ex: Moderno, Minimalista..."
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => updateField("descricao", e.target.value)}
                  placeholder="Descreva o estilo do template..."
                />
              </div>
            </div>

            <div className="border-t my-4" />

            {/* Cores */}
            <div className="space-y-4">
              <h4 className="font-medium">Cores</h4>
              
              <div>
                <Label>Cor Primária</Label>
                <div className="flex gap-2 mt-1">
                  <div
                    className="w-10 h-10 rounded border cursor-pointer"
                    style={{ backgroundColor: formData.cor_primaria }}
                    onClick={() => setShowColorPicker(showColorPicker === "primary" ? null : "primary")}
                  />
                  <Input
                    value={formData.cor_primaria}
                    onChange={(e) => updateField("cor_primaria", e.target.value)}
                    className="flex-1"
                  />
                </div>
                {showColorPicker === "primary" && (
                  <div className="mt-2">
                    <HexColorPicker
                      color={formData.cor_primaria}
                      onChange={(color) => updateField("cor_primaria", color)}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label>Cor Secundária</Label>
                <div className="flex gap-2 mt-1">
                  <div
                    className="w-10 h-10 rounded border cursor-pointer"
                    style={{ backgroundColor: formData.cor_secundaria }}
                    onClick={() => setShowColorPicker(showColorPicker === "secondary" ? null : "secondary")}
                  />
                  <Input
                    value={formData.cor_secundaria}
                    onChange={(e) => updateField("cor_secundaria", e.target.value)}
                    className="flex-1"
                  />
                </div>
                {showColorPicker === "secondary" && (
                  <div className="mt-2">
                    <HexColorPicker
                      color={formData.cor_secundaria}
                      onChange={(color) => updateField("cor_secundaria", color)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t my-4" />

            {/* Layout e Tipografia */}
            <div className="space-y-4">
              <h4 className="font-medium">Layout e Tipografia</h4>
              
              <div>
                <Label>Layout</Label>
                <Select value={formData.layout} onValueChange={(value) => updateField("layout", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIMPLES">Simples</SelectItem>
                    <SelectItem value="MODERNO">Moderno</SelectItem>
                    <SelectItem value="CORPORATIVO">Corporativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fonte</Label>
                <Select value={formData.fonte} onValueChange={(value) => updateField("fonte", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SANS_SERIF">Sans Serif</SelectItem>
                    <SelectItem value="SERIF">Serif</SelectItem>
                    <SelectItem value="MONOSPACE">Monospace</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Espaçamento</Label>
                <Select value={formData.espacamento} onValueChange={(value) => updateField("espacamento", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPACTO">Compacto</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="AMPLO">Amplo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t my-4" />

            {/* Opções */}
            <div className="space-y-4">
              <h4 className="font-medium">Opções</h4>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exibir_logo"
                  checked={formData.exibir_logo}
                  onCheckedChange={(checked) => updateField("exibir_logo", checked)}
                />
                <Label htmlFor="exibir_logo">Exibir logo da empresa</Label>
              </div>
            </div>

            <div className="border-t my-4" />

            {/* Conteúdo */}
            <div className="space-y-4">
              <h4 className="font-medium">Conteúdo</h4>
              
              <div>
                <Label htmlFor="dados_empresa">Dados da Empresa</Label>
                <Textarea
                  id="dados_empresa"
                  value={formData.dados_empresa}
                  onChange={(e) => updateField("dados_empresa", e.target.value)}
                  placeholder="Nome da empresa, endereço, telefone..."
                />
              </div>

              <div>
                <Label htmlFor="conteudo_padrao">Conteúdo Padrão</Label>
                <Textarea
                  id="conteudo_padrao"
                  value={formData.conteudo_padrao}
                  onChange={(e) => updateField("conteudo_padrao", e.target.value)}
                  placeholder="Texto padrão para rodapé, observações..."
                />
              </div>
            </div>

            <div className="border-t my-4" />

            {/* Ações */}
            <div className="space-y-2">
              <Button onClick={handleSave} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Salvar Template
              </Button>
              <Button variant="outline" onClick={handleExportPDF} className="w-full">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar PDF Teste
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Painel Direito - Preview */}
      <div className="flex-1 overflow-hidden">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Preview ao Vivo</CardTitle>
          </CardHeader>
          <CardContent className="h-full overflow-auto">
            <div className="border rounded-lg overflow-hidden bg-white">
              <div className="transform scale-50 origin-top-left w-[200%]">
                <MinimalistaTemplate 
                  orcamento={mockOrcamento} 
                  template={formData as OrcamentoTemplate}
                  preview={true}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
// Remover divider solto inserido por engano