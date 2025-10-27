"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { TemplateSelector } from "@/components/wizard/template-selector"
import { OrcamentoForm } from "@/components/wizard/orcamento-form"
import { OrcamentoPreview } from "@/components/wizard/orcamento-preview"
import type { Orcamento, OrcamentoTemplate } from "@/lib/types"

interface OrcamentoWizardProps {
  clients: any[]
  services: any[]
  templates: OrcamentoTemplate[]
}

const steps = [
  { id: 1, title: "Selecionar Template", description: "Escolha o design do seu orçamento" },
  { id: 2, title: "Dados do Orçamento", description: "Preencha as informações do cliente e serviços" },
  { id: 3, title: "Visualizar e Finalizar", description: "Revise e salve seu orçamento" },
]

export function OrcamentoWizard({ clients, services, templates }: OrcamentoWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState<OrcamentoTemplate | null>(null)
  const [orcamentoData, setOrcamentoData] = useState<Partial<Orcamento>>({})

  const progress = (currentStep / steps.length) * 100

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedTemplate !== null
      case 2:
        return orcamentoData.cliente && orcamentoData.itens && orcamentoData.itens.length > 0
      case 3:
        return true
      default:
        return false
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-xl">
                Passo {currentStep} de {steps.length}: {steps[currentStep - 1].title}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {steps[currentStep - 1].description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-2">
                Progresso: {Math.round(progress)}%
              </div>
              <Progress value={progress} className="w-32" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step Content */}
      <div className="min-h-[600px]">
        {currentStep === 1 && (
          <TemplateSelector
            templates={templates}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
          />
        )}

        {currentStep === 2 && (
          <OrcamentoForm
            clients={clients}
            services={services}
            orcamentoData={orcamentoData}
            onUpdateData={setOrcamentoData}
          />
        )}

        {currentStep === 3 && selectedTemplate && (
          <OrcamentoPreview
            orcamento={orcamentoData as Orcamento}
            template={selectedTemplate}
          />
        )}
      </div>

      {/* Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>

            <div className="flex items-center space-x-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`w-3 h-3 rounded-full ${
                    step.id === currentStep
                      ? "bg-primary"
                      : step.id < currentStep
                      ? "bg-primary/60"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {currentStep < steps.length ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Próximo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <div className="space-x-2">
                <Button variant="outline">
                  Salvar Rascunho
                </Button>
                <Button>
                  Salvar e Enviar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}