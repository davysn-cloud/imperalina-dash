"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface ServiceFormProps {
  professionals: Array<{
    id: string
    user: {
      name: string
    }
  }>
  service?: {
    id: string
    name: string
    description: string
    duration: number
    price: number
    commission_percentage: number
    is_active: boolean
    professional_id: string
  }
}

export function ServiceForm({ professionals, service }: ServiceFormProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: service?.name || "",
    description: service?.description || "",
    duration: service?.duration || 60,
    price: service?.price || 0,
    commission_percentage: service?.commission_percentage || 0,
    is_active: service?.is_active ?? true,
    professional_id: service?.professional_id || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (service) {
        // Update existing service
        const { error } = await supabase.from("services").update(formData).eq("id", service.id)

        if (error) throw error

        toast.success("Serviço atualizado com sucesso")
      } else {
        // Create new service
        const { error } = await supabase.from("services").insert(formData)

        if (error) throw error

        toast.success("Serviço criado com sucesso")
      }

      router.push("/services")
      router.refresh()
    } catch (error) {
      console.error("[v0] Error saving service:", error)
      toast.error("Erro ao salvar serviço")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Informações do Serviço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Serviço</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Descreva o serviço..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="duration">Duração (minutos)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                step="15"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number.parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission_percentage">Porcentagem de Comissão (%)</Label>
            <Input
              id="commission_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.commission_percentage}
              onChange={(e) => setFormData({ ...formData, commission_percentage: Number.parseFloat(e.target.value) })}
              placeholder="Ex: 40.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="professional">Profissional</Label>
            <Select
              value={formData.professional_id}
              onValueChange={(value) => setFormData({ ...formData, professional_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Serviço Ativo</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/services")}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
