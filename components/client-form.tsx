"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { registerUser } from "@/app/actions/auth"
import { ensureBucket } from "@/app/actions/storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"

interface ClientFormProps {
  client?: {
    id: string
    name: string
    email: string
    phone?: string
  }
}

export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: client?.name || "",
    email: client?.email || "",
    phone: client?.phone || "",
    password: "",
  })

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (client) {
        // Update existing client
        const { error } = await supabase
          .from("users")
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
          })
          .eq("id", client.id)

        if (error) throw error

        // Upload avatar se houver arquivo
        if (avatarFile) {
          const ensured = await ensureBucket("avatars")
          if ((ensured as any)?.error) throw new Error((ensured as any).error)
          const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg"
          const filePath = `users/${client.id}-${Date.now()}.${ext}`
          const { data: upData, error: upErr } = await supabase.storage.from("avatars").upload(filePath, avatarFile, {
            cacheControl: "3600",
            upsert: true,
          })
          if (upErr) throw upErr
          const { data: pub } = supabase.storage.from("avatars").getPublicUrl(upData.path)
          const avatarUrl = pub.publicUrl
          const { error: updErr } = await supabase.from("users").update({ avatar: avatarUrl }).eq("id", client.id)
          if (updErr) throw updErr
        }

        toast.success("Cliente atualizado com sucesso")
      } else {
        // Pré-checagem rápida: email já existe?
        const { data: existing, error: existErr } = await supabase
          .from("users")
          .select("id")
          .eq("email", formData.email)
          .maybeSingle()
        if (existErr) throw existErr
        if (existing?.id) {
          toast.error("Email já está cadastrado")
          return
        }

        // Create new client via server action (service role) com senha opcional
        const reg = await registerUser({
          email: formData.email,
          password: formData.password || undefined,
          name: formData.name,
          phone: formData.phone || undefined,
        })
        if ((reg as any)?.error) {
          const errMsg = (reg as any)?.error as string
          if ((reg as any)?.code === "EMAIL_DUPLICATE" || /duplicado|duplicate|exists/i.test(errMsg)) {
            toast.error("Email já está cadastrado")
            return
          }
          throw new Error(errMsg)
        }
        const newUserId = (reg as any)?.userId as string
        if (!newUserId) throw new Error("Falha ao obter ID do usuário recém-criado")

        // Upload avatar se houver arquivo
        if (avatarFile) {
          const ensured = await ensureBucket("avatars")
          if ((ensured as any)?.error) throw new Error((ensured as any).error)
          const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg"
          const filePath = `users/${newUserId}-${Date.now()}.${ext}`
          const { data: upData, error: upErr } = await supabase.storage.from("avatars").upload(filePath, avatarFile, {
            cacheControl: "3600",
            upsert: true,
          })
          if (upErr) throw upErr
          const { data: pub } = supabase.storage.from("avatars").getPublicUrl(upData.path)
          const avatarUrl = pub.publicUrl
          const { error: updErr } = await supabase.from("users").update({ avatar: avatarUrl }).eq("id", newUserId)
          if (updErr) throw updErr
        }

        toast.success("Cliente criado com sucesso")
      }

      router.push("/clients")
      router.refresh()
    } catch (error) {
      console.error("[v0] Error saving client:", error)
      const msg = (error as any)?.message || "Erro ao salvar cliente"
      if (/duplicado|duplicate|exists/i.test(msg)) {
        toast.error("Email já está cadastrado")
      } else {
        toast.error("Erro ao salvar cliente")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Informações do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarPreview || undefined} alt={formData.name || "Avatar"} />
              <AvatarFallback>{(formData.name || "C").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label htmlFor="avatar">Foto de Perfil</Label>
              <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
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
              disabled={!!client}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          {!client && (
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

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/clients")}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
