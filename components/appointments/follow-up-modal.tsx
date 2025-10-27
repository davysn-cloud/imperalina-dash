"use client"

import { useState } from "react"
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, MessageSquare, Star, Package, Plus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const followUpSchema = z.object({
  serviceReason: z.string().optional(),
  eventDate: z.string().optional(),
  eventImportance: z.string().optional(),
  conversationTopics: z.array(z.string()).default([]),
  personalMilestones: z.array(z.string()).optional(),
  followUpTopics: z.array(z.string()).default([]),
  reminders: z.array(z.string()).default([]),
  clientSatisfaction: z.number().min(1).max(5).optional(),
  serviceQuality: z.string().optional(),
  clientFeedback: z.string().optional(),
  productsUsed: z.array(z.string()).default([]),
  productsRecommended: z.array(z.string()).optional(),
  technicalNotes: z.string().optional(),
  nextServiceSuggestion: z.string().optional(),
})

type FollowUpFormInput = z.input<typeof followUpSchema>
type FollowUpFormOutput = z.output<typeof followUpSchema>

interface FollowUpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointmentId: string
  clientName: string
  currentUserId: string
  onSuccess?: () => void
}

export function FollowUpModal({
  open,
  onOpenChange,
  appointmentId,
  clientName,
  currentUserId,
  onSuccess,
}: FollowUpModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [satisfaction, setSatisfaction] = useState(0)
  const { toast } = useToast()

  // ... existing code ...
  const { register, handleSubmit, control, setValue } = useForm<FollowUpFormInput>({
     resolver: zodResolver(followUpSchema),
     defaultValues: {
       conversationTopics: [],
       followUpTopics: [],
       reminders: [],
       productsUsed: [],
     },
   })

  const {
    fields: topicsFields,
    append: appendTopic,
    remove: removeTopic,
  } = useFieldArray({
    control,
    name: "conversationTopics",
  } as any)

  const {
    fields: followUpFields,
    append: appendFollowUp,
    remove: removeFollowUp,
  } = useFieldArray({
    control,
    name: "followUpTopics",
  } as any)

  const {
    fields: reminderFields,
    append: appendReminder,
    remove: removeReminder,
  } = useFieldArray({
    control,
    name: "reminders",
  } as any)

  const {
    fields: productsFields,
    append: appendProduct,
    remove: removeProduct,
  } = useFieldArray({
    control,
    name: "productsUsed",
  } as any)

  const onSubmit: SubmitHandler<FollowUpFormOutput> = async (data) => {
    setIsSubmitting(true)

    try {
      // Filter out empty strings from arrays
      const cleanedData = {
        ...data,
        conversationTopics: data.conversationTopics?.filter((t) => t.trim()) || [],
        followUpTopics: data.followUpTopics?.filter((t) => t.trim()) || [],
        reminders: data.reminders?.filter((t) => t.trim()) || [],
        productsUsed: data.productsUsed?.filter((t) => t.trim()) || [],
        clientSatisfaction: satisfaction || undefined,
      }

      const response = await fetch(`/api/appointments/${appointmentId}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cleanedData,
          completedBy: currentUserId,
        }),
      })

      if (!response.ok) throw new Error("Failed to save Follow Up")

      toast({
        title: "Atendimento finalizado!",
        description: "O Follow Up foi registrado com sucesso.",
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Error saving follow-up:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar o Follow Up. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Follow Up - Finalizar Atendimento</DialogTitle>
          <DialogDescription>Registre informações importantes sobre o atendimento de {clientName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => onSubmit(d as FollowUpFormOutput))} className="space-y-6 mt-4">
          {/* Service Context */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Contexto do serviço
            </h3>

            <div>
              <Label>Para que foi o serviço?</Label>
              <Input {...register("serviceReason")} placeholder="Ex: Casamento, formatura, entrevista, rotina..." />
              <p className="text-sm text-muted-foreground mt-1">
                Isso ajuda a entender o contexto e importância para o cliente
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data do evento (se aplicável)</Label>
                <Input type="date" {...register("eventDate")} />
              </div>

              <div>
                <Label>Importância do evento</Label>
                <Select onValueChange={(value) => setValue("eventImportance", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROUTINE">Rotina</SelectItem>
                    <SelectItem value="IMPORTANT">Importante</SelectItem>
                    <SelectItem value="VERY_IMPORTANT">Muito importante</SelectItem>
                    <SelectItem value="CRITICAL">Crítico (casamento, etc)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Conversation Topics */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Assuntos que chamaram atenção
            </h3>

            <div className="space-y-2">
              {topicsFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    {...register(`conversationTopics.${index}` as const)}
                    placeholder="Ex: Viagem para Paris, novo emprego, filho nasceu..."
                  />
                  {topicsFields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTopic(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendTopic("")}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar assunto
              </Button>
            </div>
          </div>

          {/* Follow-up Topics */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold">Tópicos para retomar na próxima visita</h3>

            <div className="space-y-2">
              {followUpFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    {...register(`followUpTopics.${index}` as const)}
                    placeholder="Ex: Perguntar como foi a viagem, como foi o casamento..."
                  />
                  {followUpFields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFollowUp(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendFollowUp("")}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar tópico
              </Button>
            </div>
          </div>

          {/* Reminders */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold">Lembretes importantes</h3>

            <div className="space-y-2">
              {reminderFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    {...register(`reminders.${index}` as const)}
                    placeholder="Ex: Lembrar de parabenizar pelo aniversário em março..."
                  />
                  {reminderFields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeReminder(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendReminder("")}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar lembrete
              </Button>
            </div>
          </div>

          {/* Satisfaction */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Star className="w-4 h-4" />
              Avaliação do atendimento
            </h3>

            <div>
              <Label>Satisfação do cliente (1-5)</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Button
                    key={rating}
                    type="button"
                    variant={satisfaction === rating ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSatisfaction(rating)}
                  >
                    {rating}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label>Qualidade do serviço</Label>
              <Select onValueChange={(value) => setValue("serviceQuality", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POOR">Ruim</SelectItem>
                  <SelectItem value="FAIR">Regular</SelectItem>
                  <SelectItem value="GOOD">Bom</SelectItem>
                  <SelectItem value="VERY_GOOD">Muito bom</SelectItem>
                  <SelectItem value="EXCELLENT">Excelente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Feedback do cliente</Label>
              <Textarea
                {...register("clientFeedback")}
                placeholder="O que o cliente disse sobre o atendimento?"
                rows={2}
              />
            </div>
          </div>

          {/* Products */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produtos
            </h3>

            <div>
              <Label>Produtos utilizados</Label>
              <div className="space-y-2">
                {productsFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <Input {...register(`productsUsed.${index}` as const)} placeholder="Nome do produto..." />
                    {productsFields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeProduct(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendProduct("")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar produto
                </Button>
              </div>
            </div>
          </div>

          {/* Technical Notes */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold">Observações técnicas</h3>

            <div>
              <Label>Notas técnicas</Label>
              <Textarea
                {...register("technicalNotes")}
                placeholder="Ex: Cabelo muito ressecado, aplicar hidratação profunda..."
                rows={3}
              />
            </div>

            <div>
              <Label>Sugestão para próximo serviço</Label>
              <Input {...register("nextServiceSuggestion")} placeholder="Ex: Retornar em 30 dias para retoque" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Finalizando..." : "Finalizar Atendimento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
