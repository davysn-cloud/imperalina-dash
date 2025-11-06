"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Menu, LayoutDashboard, TrendingUp, Users, Calendar, FileText, DollarSign, CreditCard, Package, Layers, Building2, ArrowLeftRight, Link2, Briefcase, Clock, UserCircle, Shield, Receipt } from "lucide-react"
import type { UserRole } from "@/lib/types"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import Image from "next/image"
import MobileLogo from "@/app/MARCA-D'AGUA-LOGO-2.png"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ensureBucket } from "@/app/actions/storage"

interface TopbarProps {
  user: {
    id: string
    name: string
    email: string
    role: UserRole
    avatar?: string
  } | null
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Relatórios", href: "/relatorios", icon: TrendingUp },
  { name: "Análise de Clientes", href: "/relatorios/clientes", icon: Users, isSubItem: true },
  { name: "Agenda", href: "/appointments", icon: Calendar },
  { name: "Orçamentos", href: "/orcamentos", icon: FileText },
  { name: "Financeiro", href: "/financeiro", icon: DollarSign, adminOnly: true },
  { name: "Contas a Receber", href: "/financeiro/contas-receber", icon: CreditCard, adminOnly: true, isSubItem: true },
  { name: "Contas a Pagar", href: "/financeiro/contas-pagar", icon: Receipt, adminOnly: true, isSubItem: true },
  // Comissões removido
  { name: "Estoque", href: "/estoque", icon: Package, adminOnly: true },
  { name: "Produtos", href: "/estoque/produtos", icon: Package, adminOnly: true, isSubItem: true },
  { name: "Categorias", href: "/estoque/categorias", icon: Layers, adminOnly: true, isSubItem: true },
  { name: "Fornecedores", href: "/estoque/fornecedores", icon: Building2, adminOnly: true, isSubItem: true },
  { name: "Movimentações", href: "/estoque/movimentacoes", icon: ArrowLeftRight, adminOnly: true, isSubItem: true },
  { name: "Profissionais", href: "/professionals", icon: Users, adminOnly: true },
  { name: "Serviços", href: "/services", icon: Briefcase },
  { name: "Horários", href: "/schedules", icon: Clock },
  { name: "Clientes", href: "/clients", icon: UserCircle, adminOnly: true },
  { name: "Painel Admin", href: "/admin", icon: Shield, adminOnly: true },
  { name: "Configurações de Perfil", href: "/settings/profile", icon: UserCircle },
]

export function DashboardTopbar({ user }: TopbarProps) {
  const [open, setOpen] = React.useState(false)
  const supabase = getSupabaseBrowserClient()
  // Removido uso de JSON de permissões; simplificamos a navegação
  const { toast } = useToast()

  const [avatarOpen, setAvatarOpen] = React.useState(false)
  const [avatarUrl, setAvatarUrl] = React.useState<string>(user?.avatar || "/placeholder.svg")
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const headerRef = React.useRef<HTMLDivElement>(null)
  const [hideAvatar, setHideAvatar] = React.useState(false)

  // Nenhuma busca adicional de permissões necessárias aqui

  // Removido mapeamento de chaves de permissão

  const [allowedTabs, setAllowedTabs] = React.useState<string[] | null>(null)

  React.useEffect(() => {
    const loadAllowed = async () => {
      if (!user || user.role === "ADMIN") {
        setAllowedTabs([])
        return
      }
      const { data } = await supabase
        .from("professionals")
        .select("allowed_tabs")
        .eq("user_id", user.id)
        .single()
      setAllowedTabs(((data?.allowed_tabs as string[]) || []))
    }
    loadAllowed()
  }, [user?.id, user?.role])

  const filteredNavigation = navigation.filter((item) => {
    if (user?.role === "ADMIN") return true
    const explicitlyAllowed = Array.isArray(allowedTabs) && allowedTabs.includes(item.href)
    if (item.href === "/admin") return false
    if (item.adminOnly) return explicitlyAllowed
    if (!allowedTabs || allowedTabs.length === 0) return true
    return explicitlyAllowed
  })

  const onSelectAvatar: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0] || null
    if (!f) return
    setAvatarFile(f)
    const reader = new FileReader()
    reader.onload = () => setAvatarUrl(String(reader.result))
    reader.readAsDataURL(f)
  }

  const saveAvatar = async () => {
    if (!user?.id || !avatarFile) return
    try {
      setUploading(true)
      // Garante que o bucket existe antes de enviar
      const ensured = await ensureBucket("avatars")
      if ((ensured as any)?.error) throw new Error((ensured as any).error)
      const path = `${user.id}.jpg`
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { contentType: avatarFile.type || "image/jpeg", upsert: true })
      if (uploadErr) throw uploadErr
      const { data: pub } = await supabase.storage.from("avatars").getPublicUrl(path)
      const publicUrl = pub?.publicUrl || ""
      if (!publicUrl) throw new Error("Falha ao obter URL público")
      const { error: updateErr } = await supabase.from("users").update({ avatar: publicUrl }).eq("id", user.id)
      if (updateErr) throw updateErr
      setAvatarUrl(publicUrl)
      toast({ title: "Foto atualizada", description: "Sua foto de perfil foi atualizada." })
      setAvatarOpen(false)
    } catch (e: any) {
      console.error("[Topbar] erro ao salvar avatar:", e)
      toast({ title: "Erro ao salvar foto", description: e.message || String(e), variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  React.useEffect(() => {
    const el = headerRef.current
    if (!el) return

    const checkOverflow = () => {
      const overflow = el.scrollWidth > el.clientWidth
      setHideAvatar(overflow)
    }

    checkOverflow()
    const ro = new ResizeObserver(checkOverflow)
    ro.observe(el)
    window.addEventListener("resize", checkOverflow)

    return () => {
      ro.disconnect()
      window.removeEventListener("resize", checkOverflow)
    }
  }, [])

  return (
    <div className="md:hidden sticky top-0 z-40 bg-background border-b">
      <div className="flex h-12 items-center px-3 gap-3" ref={headerRef}>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          {!hideAvatar && (
            <Avatar className="h-7 w-7 cursor-pointer" onClick={() => setAvatarOpen(true)}>
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>{user?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
          )}
          <div className="h-8 sm:h-9 md:h-10 overflow-hidden flex-shrink-0">
            <Image src={MobileLogo} alt="Imperalina" className="h-full w-auto object-contain" />
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn("left-0 top-0 h-screen w-64 translate-x-0 translate-y-0 rounded-none p-3 border-r")}> 
          <DialogHeader>
            <DialogTitle>Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.name} href={item.href} onClick={() => setOpen(false)}>
                  <Button variant="ghost" className={cn("w-full justify-start gap-3", item.isSubItem && "ml-4 text-sm") }>
                    <Icon className={cn("h-5 w-5", item.isSubItem && "h-4 w-4")} />
                    {item.name}
                  </Button>
                </Link>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foto de perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>{user?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div className="text-sm text-muted-foreground">Selecione uma imagem para atualizar sua foto.</div>
            </div>
            <Input type="file" accept="image/*" onChange={onSelectAvatar} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAvatarOpen(false)}>Cancelar</Button>
              <Button onClick={saveAvatar} disabled={uploading || !avatarFile}>{uploading ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}