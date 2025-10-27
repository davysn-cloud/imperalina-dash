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
  { name: "Fluxo de Caixa", href: "/financeiro/fluxo-caixa", icon: TrendingUp, adminOnly: true, isSubItem: true },
  { name: "Comissões", href: "/financeiro/comissoes", icon: DollarSign, adminOnly: true, isSubItem: true },
  { name: "Estoque", href: "/estoque", icon: Package, adminOnly: true },
  { name: "Produtos", href: "/estoque/produtos", icon: Package, adminOnly: true, isSubItem: true },
  { name: "Categorias", href: "/estoque/categorias", icon: Layers, adminOnly: true, isSubItem: true },
  { name: "Fornecedores", href: "/estoque/fornecedores", icon: Building2, adminOnly: true, isSubItem: true },
  { name: "Movimentações", href: "/estoque/movimentacoes", icon: ArrowLeftRight, adminOnly: true, isSubItem: true },
  { name: "Vínculos Serviço × Produto", href: "/estoque/vinculos", icon: Link2, adminOnly: true, isSubItem: true },
  { name: "Profissionais", href: "/professionals", icon: Users, adminOnly: true },
  { name: "Serviços", href: "/services", icon: Briefcase },
  { name: "Horários", href: "/schedules", icon: Clock },
  { name: "Clientes", href: "/clients", icon: UserCircle, adminOnly: true },
  { name: "Painel Admin", href: "/admin", icon: Shield, adminOnly: true },
]

export function DashboardTopbar({ user }: TopbarProps) {
  const [open, setOpen] = React.useState(false)
  const supabase = getSupabaseBrowserClient()
  const [permissions, setPermissions] = React.useState<Record<string, boolean> | null>(null)
  const { toast } = useToast()

  const [avatarOpen, setAvatarOpen] = React.useState(false)
  const [avatarUrl, setAvatarUrl] = React.useState<string>(user?.avatar || "/placeholder.svg")
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const headerRef = React.useRef<HTMLDivElement>(null)
  const [hideAvatar, setHideAvatar] = React.useState(false)

  React.useEffect(() => {
    const loadPermissions = async () => {
      if (!user?.id) return
      const { data, error } = await supabase
        .from("professionals")
        .select("permissions, user_id")
        .eq("user_id", user.id)
        .maybeSingle()
      if (error) {
        console.error("[Topbar] erro ao carregar permissões:", error)
        return
      }
      setPermissions((data as any)?.permissions || null)
    }
    loadPermissions()
  }, [user?.id])

  const routeToKey = (href: string): string | null => {
    const map: Record<string, string> = {
      "/dashboard": "dashboard",
      "/relatorios": "relatorios",
      "/relatorios/clientes": "relatorios_clientes",
      "/appointments": "appointments",
      "/orcamentos": "orcamentos",
      "/financeiro": "financeiro",
      "/financeiro/contas-receber": "financeiro_contas_receber",
      "/financeiro/contas-pagar": "financeiro_contas_pagar",
      "/financeiro/fluxo-caixa": "financeiro_fluxo_caixa",
      "/financeiro/comissoes": "financeiro_comissoes",
      "/estoque": "estoque",
      "/estoque/produtos": "estoque_produtos",
      "/estoque/categorias": "estoque_categorias",
      "/estoque/fornecedores": "estoque_fornecedores",
      "/estoque/movimentacoes": "estoque_movimentacoes",
      "/estoque/vinculos": "estoque_vinculos",
      "/professionals": "professionals",
      "/services": "services",
      "/schedules": "schedules",
      "/clients": "clients",
      "/admin": "admin",
    }
    return map[href] || null
  }

  const filteredNavigation = navigation.filter((item) => {
    if (user?.role === "ADMIN") return true
    if (item.adminOnly) return false
    const key = routeToKey(item.href)
    if (!key) return true
    if (!permissions) return true
    return !!permissions[key]
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