"use client"

import { useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ensureBucket } from "@/app/actions/storage"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"

export function ProfileSettings() {
  const supabase = getSupabaseBrowserClient()
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = () => setAvatarPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSaveAvatar = async () => {
    if (!avatarFile) {
      toast.error("Selecione uma imagem")
      return
    }
    setIsLoading(true)
    try {
      const { data: userRes } = await supabase.auth.getUser()
      const userId = userRes.user?.id
      if (!userId) throw new Error("Usuário não autenticado")

      const ensured = await ensureBucket("avatars")
      if ((ensured as any)?.error) throw new Error((ensured as any).error)

      const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg"
      const filePath = `users/${userId}-${Date.now()}.${ext}`
      const { data: upData, error: upErr } = await supabase.storage.from("avatars").upload(filePath, avatarFile, {
        cacheControl: "3600",
        upsert: true,
      })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(upData.path)
      const avatarUrl = pub.publicUrl
      const { error: updErr } = await supabase.from("users").update({ avatar: avatarUrl }).eq("id", userId)
      if (updErr) throw updErr
      toast.success("Avatar atualizado com sucesso")
    } catch (err: any) {
      console.error("Erro ao atualizar avatar:", err)
      toast.error("Erro ao atualizar avatar")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!password || password.length < 6) {
      toast.error("Senha deve ter ao menos 6 caracteres")
      return
    }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success("Senha atualizada com sucesso")
      setPassword("")
    } catch (err: any) {
      console.error("Erro ao atualizar senha:", err)
      toast.error("Erro ao atualizar senha")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Atualizar Avatar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarPreview || undefined} alt="Avatar" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Label htmlFor="avatar">Foto de Perfil</Label>
              <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} />
            </div>
          </div>
          <Button onClick={handleSaveAvatar} disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar Avatar"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="password">Nova Senha</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo de 6 caracteres"
          />
          <Button onClick={handleChangePassword} disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar Senha"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}