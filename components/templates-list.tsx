"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Copy, Palette } from "lucide-react"
import Link from "next/link"
import type { OrcamentoTemplate } from "@/lib/types"

interface TemplatesListProps {
  templates: OrcamentoTemplate[]
}

export function TemplatesList({ templates }: TemplatesListProps) {
  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Palette className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
          <p className="text-muted-foreground text-center mb-4">
            Comece criando seu primeiro template personalizado para orçamentos.
          </p>
          <Link href="/orcamentos/templates/novo">
            <Button>
              <Palette className="mr-2 h-4 w-4" />
              Criar Primeiro Template
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className="group hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{template.nome}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {template.descricao}
                </p>
              </div>
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
          </CardHeader>
          <CardContent>
            {/* Preview Miniatura */}
            <div className="relative mb-4 h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden">
              <div className="absolute inset-0 p-3">
                {/* Header simulado */}
                <div 
                  className="h-4 rounded mb-2"
                  style={{ backgroundColor: template.cor_primaria + "20" }}
                />
                
                {/* Conteúdo simulado */}
                <div className="space-y-1">
                  <div className="h-1 bg-gray-300 rounded w-3/4" />
                  <div className="h-1 bg-gray-300 rounded w-1/2" />
                </div>
                
                {/* Tabela simulada */}
                <div className="mt-2 space-y-0.5">
                  <div className="h-0.5 bg-gray-400 rounded" />
                  <div className="h-0.5 bg-gray-300 rounded" />
                  <div className="h-0.5 bg-gray-300 rounded" />
                </div>
                
                {/* Total simulado */}
                <div 
                  className="absolute bottom-2 right-2 w-8 h-3 rounded"
                  style={{ backgroundColor: template.cor_primaria }}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-4">
              <Badge variant="secondary" className="text-xs">
                {template.layout}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {template.fonte}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {template.espacamento}
              </Badge>
            </div>

            {/* Ações */}
            <div className="flex gap-2">
              <Link href={`/orcamentos/templates/${template.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </Link>
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}