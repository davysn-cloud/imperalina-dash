"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { registerProfessional } from "@/app/actions/auth"
import { ensureBucket } from "@/app/actions/storage"
import { createProfessionalProfile } from "@/app/actions/professionals"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ProfessionalFormProps {
  professional?: {
    id: string
    user_id: string
    color: string
    specialties: string[]
    bio: string
    is_active?: boolean
    can_manage_schedule?: boolean
    can_view_all_appointments?: boolean
    allowed_tabs?: string[]
    user: {
      name: string
      email: string
      avatar?: string
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

const PERMISSIONS_META: Array<{ key: "is_active" | "can_manage_schedule" | "can_view_all_appointments"; label: string }> = [
  { key: "is_active", label: "Profissional Ativo" },
  { key: "can_manage_schedule", label: "Gerenciar Próprios Horários" },
  { key: "can_view_all_appointments", label: "Ver Todos os Agendamentos" },
]

// Abas disponíveis para seleção (mantém alinhado com Sidebar/Topbar)
const TABS_CHOICES: Array<{ value: string; label: string }> = [
  { value: "/dashboard", label: "Dashboard" },
  { value: "/relatorios", label: "Relatórios" },
  { value: "/relatorios/clientes", label: "Relatórios > Análise de Clientes" },
  { value: "/appointments", label: "Agenda" },
  { value: "/orcamentos", label: "Orçamentos" },
  { value: "/financeiro", label: "Financeiro" },
  { value: "/financeiro/contas-receber", label: "Financeiro > Contas a Receber" },
  { value: "/financeiro/contas-pagar", label: "Financeiro > Contas a Pagar" },
  { value: "/financeiro/comissoes", label: "Financeiro > Comissões" },
  { value: "/estoque", label: "Estoque" },
  { value: "/estoque/produtos", label: "Estoque > Produtos" },
  { value: "/estoque/categorias", label: "Estoque > Categorias" },
  { value: "/estoque/fornecedores", label: "Estoque > Fornecedores" },
  { value: "/estoque/movimentacoes", label: "Estoque > Movimentações" },
  { value: "/professionals", label: "Profissionais" },
  { value: "/services", label: "Serviços" },
  { value: "/schedules", label: "Horários" },
  { value: "/clients", label: "Clientes" },
  { value: "/admin", label: "Painel Admin" },
]

export function ProfessionalForm({ professional }: ProfessionalFormProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const [services, setServices] = useState<Service[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>(professional?.specialties || [])

  const [schedules, setSchedules] = useState<Schedule[]>([])

  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    is_active: professional?.is_active ?? true,
    can_manage_schedule: professional?.can_manage_schedule ?? true,
    can_view_all_appointments: professional?.can_view_all_appointments ?? false,
  })

  const [formData, setFormData] = useState({
    name: professional?.user.name || "",
    email: professional?.user.email || "",
    password: "",
    color: professional?.color || "#f59e0b",
    bio: professional?.bio || "",
  })

  const [avatarUrl, setAvatarUrl] = useState<string>(professional?.user.avatar || "/placeholder.svg")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [allowedTabs, setAllowedTabs] = useState<string[]>(
    Array.isArray(professional?.allowed_tabs) && (professional!.allowed_tabs as string[]).length > 0
      ? ((professional!.allowed_tabs as string[]) || [])
      : ["/dashboard", "/appointments", "/services", "/schedules"]
  )

  const onSelectAvatar: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] || null
    if (!f) return
    setAvatarFile(f)
    const reader = new FileReader()
    reader.onload = () => setAvatarUrl(String(reader.result))
    reader.readAsDataURL(f)
  }

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
        // Optional: upload avatar if selected
        let newAvatarUrl: string | undefined
        if (avatarFile) {
          const path = `${professional.user_id}.jpg`
          const { error: uploadErr } = await supabase.storage
            .from("avatars")
            .upload(path, avatarFile, { contentType: avatarFile.type || "image/jpeg", upsert: true })
          if (uploadErr) throw uploadErr
          const { data: pub } = await supabase.storage.from("avatars").getPublicUrl(path)
          newAvatarUrl = pub?.publicUrl || undefined
        }

        const { error: userError } = await supabase
          .from("users")
          .update({
            name: formData.name,
            email: formData.email,
            ...(newAvatarUrl ? { avatar: newAvatarUrl } : {}),
          })
          .eq("id", professional.user_id)
        if (userError) {
          console.error("[v0] users.update error:", JSON.stringify(userError))
          throw userError
        }

        const { error: professionalError } = await supabase
          .from("professionals")
          .update({
            color: formData.color,
            specialties: selectedServices,
            bio: formData.bio,
            is_active: !!permissions.is_active,
            can_manage_schedule: !!permissions.can_manage_schedule,
            can_view_all_appointments: !!permissions.can_view_all_appointments,
            allowed_tabs: allowedTabs,
          })
          .eq("id", professional.id)
        if (professionalError) {
          console.error("[v0] professionals.update error:", JSON.stringify(professionalError))
          throw professionalError
        }

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
          if (scheduleError) {
            console.error("[v0] schedules.insert error:", JSON.stringify(scheduleError))
            throw scheduleError
          }
        }

        toast({
          title: "Sucesso",
          description: "Profissional atualizado com sucesso",
        })
      } else {
        // Create new user via server action (service role)
        const reg = await registerProfessional({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        })
        if ((reg as any)?.error) throw new Error((reg as any).error)
        const newUserId = (reg as any)?.userId as string
        if (!newUserId) throw new Error("Falha ao obter ID do usuário recém-criado")

        // Optional: upload avatar if selected
        if (avatarFile) {
          const ensured = await ensureBucket("avatars")
          if ((ensured as any)?.error) throw new Error((ensured as any).error)
          const path = `${newUserId}.jpg`
          const { error: uploadErr } = await supabase.storage
            .from("avatars")
            .upload(path, avatarFile, { contentType: avatarFile.type || "image/jpeg", upsert: true })
          if (uploadErr) throw uploadErr
          const { data: pub } = await supabase.storage.from("avatars").getPublicUrl(path)
          const publicUrl = pub?.publicUrl || ""
          if (publicUrl) {
            setAvatarUrl(publicUrl)
          }
        }

        const avatarPublicUrl = avatarUrl && avatarUrl !== "/placeholder.svg" ? avatarUrl : undefined
        const res = await createProfessionalProfile({
          userId: newUserId,
          color: formData.color,
          specialties: selectedServices,
          bio: formData.bio,
          is_active: !!permissions.is_active,
          can_manage_schedule: !!permissions.can_manage_schedule,
          can_view_all_appointments: !!permissions.can_view_all_appointments,
          allowed_tabs: allowedTabs,
          schedules: schedules,
          avatarPublicUrl,
        })
        if ((res as any)?.error) {
          throw new Error((res as any).error)
        }

        toast({
          title: "Sucesso",
          description: "Profissional criado com sucesso",
        })
      }

      router.push("/professionals")
      router.refresh()
    } catch (error: any) {
      const message = error?.message || (typeof error === "object" ? JSON.stringify(error) : String(error))
      console.error("[v0] Error saving professional:", message)
      toast({
        title: "Erro",
        description: message || "Erro ao salvar profissional",
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
          <div className="space-y-2">
            <Label>Foto de Perfil</Label>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>{formData.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <Input type="file" accept="image/*" onChange={onSelectAvatar} />
            </div>
          </div>
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
              <Label htmlFor="password">Senha (opcional)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Deixe vazio para enviar convite por email"
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
          <CardTitle>Acesso às Abas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Selecione quais abas este profissional pode acessar.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {TABS_CHOICES.map((t) => (
              <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  id={`tab-${t.value}`}
                  checked={allowedTabs.includes(t.value)}
                  onCheckedChange={(checked) => {
                    setAllowedTabs((prev) =>
                      checked ? Array.from(new Set([...prev, t.value])) : prev.filter((v) => v !== t.value),
                    )
                  }}
                />
                <span className="text-sm">{t.label}</span>
              </label>
            ))}
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
