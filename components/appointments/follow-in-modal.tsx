"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Coffee, Music, Thermometer, Clock, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const followInSchema = z.object({
  clientMood: z.string().optional(),
  arrivedOnTime: z.boolean().optional(),
  arrivalNotes: z.string().optional(),
  coffeeToday: z.boolean().optional(),
  coffeeStrengthToday: z.string().optional(),
  musicToday: z.string().optional(),
  temperatureToday: z.string().optional(),
  specialRequests: z.string().optional(),
  timeConstraints: z.string().optional(),
  professionalNotes: z.string().optional(),
})

type FollowInFormData = z.infer<typeof followInSchema>

interface FollowInModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointmentId: string
  clientName: string
  currentUserId: string
  onSuccess?: () => void
}

export function FollowInModal({
  open,
  onOpenChange,
  appointmentId,
  clientName,
  currentUserId,
  onSuccess,
}: FollowInModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FollowInFormData>({
    resolver: zodResolver(followInSchema),
    defaultValues: {
      arrivedOnTime: true,
      coffeeToday: false,
    },
  })

  const coffeeToday = watch("coffeeToday")

  const onSubmit = async (data: FollowInFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/follow-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          completedBy: currentUserId,
        }),
      })

      if (!response.ok) throw new Error("Failed to save Follow In")

      toast({
        title: "Follow In salvo!",
        description: "As informações foram registradas com sucesso.",
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Error saving follow-in:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar o Follow In. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Follow In - {clientName}</DialogTitle>
          <DialogDescription>Preencha as informações sobre o cliente antes de iniciar o atendimento</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* Client State */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Como o cliente está hoje?
            </h3>

            <div>
              <Label>Humor/Estado</Label>
              <Select onValueChange={(value) => setValue("clientMood", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VERY_HAPPY">Muito animado/feliz</SelectItem>
                  <SelectItem value="HAPPY">Animado</SelectItem>
                  <SelectItem value="NEUTRAL">Neutro/normal</SelectItem>
                  <SelectItem value="TIRED">Cansado</SelectItem>
                  <SelectItem value="STRESSED">Estressado</SelectItem>
                  <SelectItem value="UPSET">Chateado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="arrivedOnTime"
                checked={watch("arrivedOnTime")}
                onCheckedChange={(checked) => setValue("arrivedOnTime", checked as boolean)}
              />
              <Label htmlFor="arrivedOnTime">Chegou no horário</Label>
            </div>

            <div>
              <Label>Observações sobre a chegada</Label>
              <Textarea
                {...register("arrivalNotes")}
                placeholder="Ex: Chegou atrasado devido ao trânsito, estava animado..."
                rows={2}
              />
            </div>
          </div>

          {/* Today's Preferences */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Coffee className="w-4 h-4" />
              Preferências de hoje
            </h3>

            <div className="flex items-center gap-2">
              <Checkbox
                id="coffeeToday"
                checked={coffeeToday}
                onCheckedChange={(checked) => setValue("coffeeToday", checked as boolean)}
              />
              <Label htmlFor="coffeeToday">Quer café hoje?</Label>
            </div>

            {coffeeToday && (
              <div>
                <Label>Força do café</Label>
                <Select onValueChange={(value) => setValue("coffeeStrengthToday", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEAK">Fraco</SelectItem>
                    <SelectItem value="MEDIUM">Médio</SelectItem>
                    <SelectItem value="STRONG">Forte</SelectItem>
                    <SelectItem value="VERY_STRONG">Muito forte/expresso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="flex items-center gap-2">
                <Music className="w-4 h-4" />
                Música de hoje
              </Label>
              <Input {...register("musicToday")} placeholder="Ex: MPB, Sertanejo, Silêncio..." />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                Temperatura
              </Label>
              <Input {...register("temperatureToday")} placeholder="Ex: Mais quente, mais frio, normal..." />
            </div>
          </div>

          {/* Special Requests */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Solicitações especiais
            </h3>

            <div>
              <Label>Pedidos especiais</Label>
              <Textarea
                {...register("specialRequests")}
                placeholder="Ex: Quer terminar rápido, tem compromisso..."
                rows={2}
              />
            </div>

            <div>
              <Label>Restrições de tempo</Label>
              <Input {...register("timeConstraints")} placeholder="Ex: Precisa sair às 15h" />
            </div>
          </div>

          {/* Professional Notes */}
          <div className="space-y-3 border-t pt-4">
            <div>
              <Label>Observações do profissional</Label>
              <Textarea
                {...register("professionalNotes")}
                placeholder="Anotações livres sobre o cliente hoje..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Salvando..." : "Salvar Follow In"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
