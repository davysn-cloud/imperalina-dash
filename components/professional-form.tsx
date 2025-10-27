"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface ProfessionalFormProps {
  professional?: {
    id: string
    user_id: string
    color: string
    specialties: string[]
    bio: string
    permissions?: Record<string, boolean>
    user: {
      name: string
      email: string
    }
  }
}

interface Service {
  id: string
  name: string
  description: string
}

interface Schedule {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
]

const PERMISSIONS_META: Array<{ key: string; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "relatorios", label: "Relatórios" },
  { key: "relatorios_clientes", label: "Relatórios • Clientes" },
  { key: "appointments", label: "Agenda" },
  { key: "orcamentos", label: "Orçamentos" },
  { key: "financeiro", label: "Financeiro" },
  { key: "financeiro_contas_receber", label: "Financeiro • Contas a Receber" },
  { key: "financeiro_fluxo_caixa", label: "Financeiro • Fluxo de Caixa" },
  { key: "financeiro_comissoes", label: "Financeiro • Comissões" },
  { key: "estoque", label: "Estoque" },
  { key: "estoque_produtos", label: "Estoque • Produtos" },
  { key: "estoque_categorias", label: "Estoque • Categorias" },
  { key: "estoque_fornecedores", label: "Estoque • Fornecedores" },
  { key: "estoque_movimentacoes", label: "Estoque • Movimentações" },
  { key: "estoque_vinculos", label: "Estoque • Vínculos Serviço × Produto" },
  { key: "professionals", label: "Profissionais" },
  { key: "services", label: "Serviços" },
  { key: "schedules", label: "Horários" },
  { key: "clients", label: "Clientes" },
  { key: "admin", label: "Painel Admin" },
]

const DEFAULT_PERMISSIONS: Record<string, boolean> = {
  dashboard: true,
  relatorios: true,
  relatorios_clientes: true,
  appointments: true,
  orcamentos: true,
  financeiro: false,
  financeiro_contas_receber: false,
  financeiro_contas_pagar: false,
  financeiro_fluxo_caixa: false,
  financeiro_comissoes: false,
  estoque: false,
  estoque_produtos: false,
  estoque_categorias: false,
  estoque_fornecedores: false,
  estoque_movimentacoes: false,
  estoque_vinculos: false,
  professionals: false,
  services: true,
  schedules: true,
  clients: false,
  admin: false,
}

export function ProfessionalForm({ professional }: ProfessionalFormProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const [services, setServices] = useState<Service[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>(professional?.specialties || [])

  const [schedules, setSchedules] = useState<Schedule[]>([])

  const [permissions, setPermissions] = useState<Record<string, boolean>>(
    professional?.permissions || DEFAULT_PERMISSIONS,
  )

  const [formData, setFormData] = useState({
    name: professional?.user.name || "",
    email: professional?.user.email || "",
    password: "",
    color: professional?.color || "#f59e0b",
    bio: professional?.bio || "",
  })

  useEffect(() => {
    loadServices()
    if (professional?.id) {
      loadSchedules()
    }
  }, [professional?.id])

  const loadServices = async () => {
    const { data, error } = await supabase
      .from("services")
      .select("id, name, description")
      .eq("is_active", true)
      .order("name")

    if (error) {
      console.error("[v0] Error loading services:", error)
      return
    }

    setServices(data || [])
  }

  const loadSchedules = async () => {
    if (!professional?.id) return

    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("professional_id", professional.id)
      .order("day_of_week")
      .order("start_time")

    if (error) {
      console.error("[v0] Error loading schedules:", error)
      return
    }

    setSchedules(data || [])
  }

  const toggleService = (serviceName: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceName) ? prev.filter((s) => s !== serviceName) : [...prev, serviceName],
    )
  }

  const addSchedule = (dayOfWeek: number) => {
    setSchedules([
      ...schedules,
      {
        day_of_week: dayOfWeek,
        start_time: "09:00",
        end_time: "18:00",
        is_active: true,
      },
    ])
  }

  const updateSchedule = (index: number, updates: Partial<Schedule>) => {
    setSchedules(schedules.map((s, i) => (i === index ? { ...s, ...updates } : s)))
  }

  const deleteSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (professional) {
        // Update existing professional
        const { error: userError } = await supabase
          .from("users")
          .update({
            name: formData.name,
            email: formData.email,
          })
          .eq("id", professional.user_id)

        if (userError) throw userError

        const { error: professionalError } = await supabase
          .from("professionals")
          .update({
            color: formData.color,
            specialties: selectedServices,
            bio: formData.bio,
            permissions,
          })
          .eq("id", professional.id)

        if (professionalError) throw professionalError

        // Delete existing schedules
        await supabase.from("schedules").delete().eq("professional_id", professional.id)

        // Insert new schedules
        if (schedules.length > 0) {
          const schedulesToInsert = schedules.map((s) => ({
            professional_id: professional.id,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            is_active: s.is_active,
          }))

          const { error: scheduleError } = await supabase.from("schedules").insert(schedulesToInsert)

          if (scheduleError) throw scheduleError
        }

        toast({
          title: "Sucesso",
          description: "Profissional atualizado com sucesso",
        })
      } else {
        // Create new user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
            },
          },
        })

        if (authError) throw authError
        if (!authData.user) throw new Error("Erro ao criar usuário")

        // Create user record
        const { error: userError } = await supabase.from("users").insert({
          id: authData.user.id,
          name: formData.name,
          email: formData.email,
          role: "PROFESSIONAL",
        })

        if (userError) throw userError

        const { data: professionalData, error: professionalError } = await supabase
          .from("professionals")
          .insert({
            user_id: authData.user.id,
            color: formData.color,
            specialties: selectedServices,
            bio: formData.bio,
            permissions,
          })
          .select()
          .single()

        if (professionalError) throw professionalError

        if (schedules.length > 0) {
          const schedulesToInsert = schedules.map((s) => ({
            professional_id: professionalData.id,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            is_active: s.is_active,
          }))

          const { error: scheduleError } = await supabase.from("schedules").insert(schedulesToInsert)

          if (scheduleError) throw scheduleError
        }

        toast({
          title: "Sucesso",
          description: "Profissional criado com sucesso",
        })
      }

      router.push("/professionals")
      router.refresh()
    } catch (error) {
      console.error("[v0] Error saving professional:", error)
      toast({
        title: "Erro",
        description: "Erro ao salvar profissional",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações do Profissional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={!!professional}
              />
            </div>
          </div>

          {!professional && (
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="color">Cor de Identificação</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#f59e0b"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Especialidades (Serviços)</Label>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum serviço cadastrado. Adicione serviços na página de Serviços primeiro.
              </p>
            ) : (
              <div className="space-y-2 border rounded-lg p-4">
                {services.map((service) => (
                  <div key={service.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={service.id}
                      checked={selectedServices.includes(service.name)}
                      onCheckedChange={() => toggleService(service.name)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={service.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {service.name}
                      </label>
                      {service.description && <p className="text-sm text-muted-foreground">{service.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biografia</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              placeholder="Conte um pouco sobre o profissional..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissões de Acesso</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {PERMISSIONS_META.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between border rounded-md p-3">
              <Label className="text-sm" htmlFor={`perm-${key}`}>{label}</Label>
              <Switch
                id={`perm-${key}`}
                checked={!!permissions[key]}
                onCheckedChange={(checked) => setPermissions((prev) => ({ ...prev, [key]: !!checked }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horários Disponíveis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const daySchedules = schedules.filter((s) => s.day_of_week === day.value)

            return (
              <div key={day.value} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">{day.label}</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => addSchedule(day.value)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Horário
                  </Button>
                </div>

                {daySchedules.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-4">Nenhum horário configurado</p>
                ) : (
                  <div className="space-y-2 pl-4">
                    {daySchedules.map((schedule, index) => {
                      const globalIndex = schedules.indexOf(schedule)
                      return (
                        <div key={globalIndex} className="flex items-center gap-4 p-3 border rounded-lg">
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Início</Label>
                              <Input
                                type="time"
                                value={schedule.start_time}
                                onChange={(e) => updateSchedule(globalIndex, { start_time: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Fim</Label>
                              <Input
                                type="time"
                                value={schedule.end_time}
                                onChange={(e) => updateSchedule(globalIndex, { end_time: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={schedule.is_active}
                                onCheckedChange={(checked) => updateSchedule(globalIndex, { is_active: checked })}
                              />
                              <Label className="text-xs">Ativo</Label>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => deleteSchedule(globalIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/professionals")}> 
          Cancelar
        </Button>
      </div>
    </form>
  )
}
