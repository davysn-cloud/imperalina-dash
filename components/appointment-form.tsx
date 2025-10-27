"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface AppointmentFormProps {
  professionals: Array<{
    id: string
    color: string
    user: {
      name: string
    }
  }>
  services: Array<{
    id: string
    name: string
    duration: number
    price: number
    professional_id: string
  }>
  clients: Array<{
    id: string
    name: string
    email: string
  }>
  appointment?: {
    id: string
    client_id: string
    professional_id: string
    service_id: string
    date: string
    start_time: string
    end_time: string
    notes?: string
    status: string
    payment_status?: string
    payment_date?: string
    payment_amount?: number
    payment_method?: string
    payment_notes?: string
  }
}

export function AppointmentForm({ professionals, services, clients, appointment }: AppointmentFormProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [isLoading, setIsLoading] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [formData, setFormData] = useState({
    client_id: appointment?.client_id || "",
    professional_id: appointment?.professional_id || "",
    service_id: appointment?.service_id || "",
    date: appointment?.date ? new Date(appointment.date + "T00:00:00") : undefined,
    start_time: appointment?.start_time || "",
    notes: appointment?.notes || "",
    status: appointment?.status || "PENDING",
    payment_status: appointment?.payment_status || "PENDING",
    payment_date: appointment?.payment_date || "",
    payment_amount: appointment?.payment_amount || 0,
    payment_method: appointment?.payment_method || "",
    payment_notes: appointment?.payment_notes || "",
  })

  const [filteredServices, setFilteredServices] = useState(services)

  useEffect(() => {
    if (formData.professional_id) {
      setFilteredServices(services.filter((s) => s.professional_id === formData.professional_id))
    } else {
      setFilteredServices(services)
    }
  }, [formData.professional_id, services])

  useEffect(() => {
    if (formData.professional_id && formData.service_id && formData.date) {
      loadAvailableSlots()
    }
  }, [formData.professional_id, formData.service_id, formData.date])

  const loadAvailableSlots = async () => {
    setLoadingSlots(true)
    try {
      const dateStr = format(formData.date!, "yyyy-MM-dd")
      const response = await fetch(
        `/api/availability?professionalId=${formData.professional_id}&serviceId=${formData.service_id}&date=${dateStr}`,
      )
      const data = await response.json()
      setAvailableSlots(
        data.slots.filter((slot: { available: boolean }) => slot.available).map((slot: { time: string }) => slot.time),
      )
    } catch (error) {
      console.error("[v0] Error loading slots:", error)
      toast.error("Erro ao carregar horários disponíveis")
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const service = services.find((s) => s.id === formData.service_id)
      if (!service) throw new Error("Serviço não encontrado")

      // Calculate end time
      const [hours, minutes] = formData.start_time.split(":").map(Number)
      const totalMinutes = hours * 60 + minutes + service.duration
      const endHours = Math.floor(totalMinutes / 60)
      const endMinutes = totalMinutes % 60
      const end_time = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`

      const appointmentData = {
        client_id: formData.client_id,
        professional_id: formData.professional_id,
        service_id: formData.service_id,
        date: format(formData.date!, "yyyy-MM-dd"),
        start_time: formData.start_time,
        end_time,
        notes: formData.notes,
        status: formData.status,
        payment_status: formData.payment_status,
        payment_date: formData.payment_date || null,
        payment_amount: formData.payment_amount || null,
        payment_method: formData.payment_method || null,
        payment_notes: formData.payment_notes || null,
      }

      if (appointment) {
        const { error } = await supabase.from("appointments").update(appointmentData).eq("id", appointment.id)

        if (error) throw error

        toast.success("Agendamento atualizado com sucesso")
      } else {
        const { error } = await supabase.from("appointments").insert(appointmentData)

        if (error) throw error

        toast.success("Agendamento criado com sucesso")
      }

      router.push("/appointments")
      router.refresh()
    } catch (error) {
      console.error("[v0] Error saving appointment:", error)
      toast.error("Erro ao salvar agendamento")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Informações do Agendamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Cliente</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="professional">Profissional</Label>
            <Select
              value={formData.professional_id}
              onValueChange={(value) =>
                setFormData({ ...formData, professional_id: value, service_id: "", start_time: "" })
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: professional?.color || "#d97706" }}
                      />
                      {professional.user.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service">Serviço</Label>
            <Select
              value={formData.service_id}
              onValueChange={(value) => setFormData({ ...formData, service_id: value, start_time: "" })}
              required
              disabled={!formData.professional_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {filteredServices.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} ({service.duration} min - R$ {service.price.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => setFormData({ ...formData, date, start_time: "" })}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Horário</Label>
            {loadingSlots ? (
              <div className="flex items-center justify-center p-4 border rounded-md">
                <Clock className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Carregando horários...</span>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot}
                    type="button"
                    variant={formData.start_time === slot ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, start_time: slot })}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            ) : formData.date && formData.service_id ? (
              <p className="text-sm text-muted-foreground p-4 border rounded-md">
                Nenhum horário disponível para esta data
              </p>
            ) : (
              <p className="text-sm text-muted-foreground p-4 border rounded-md">
                Selecione profissional, serviço e data para ver horários disponíveis
              </p>
            )}
          </div>

          {/* Seção de Pagamento */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-medium">Informações de Pagamento</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payment_status">Status do Pagamento</Label>
                <Select
                  value={formData.payment_status}
                  onValueChange={(value) => setFormData({ ...formData, payment_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="PAID">Pago</SelectItem>
                    <SelectItem value="OVERDUE">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de Pagamento</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                    <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                    <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="payment_amount">Valor Pago (R$)</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.payment_amount}
                  onChange={(e) => setFormData({ ...formData, payment_amount: Number.parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_date">Data do Pagamento</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_notes">Observações do Pagamento</Label>
              <Textarea
                id="payment_notes"
                value={formData.payment_notes}
                onChange={(e) => setFormData({ ...formData, payment_notes: e.target.value })}
                rows={2}
                placeholder="Observações sobre o pagamento..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Adicione observações sobre o agendamento..."
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading || !formData.start_time}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/appointments")}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
