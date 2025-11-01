"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Users, Briefcase, Clock, LayoutDashboard, LogOut, UserCircle, Shield, FileText, DollarSign, CreditCard, TrendingUp, Package, Layers, Building2, ArrowLeftRight, Link2, ChevronLeft, ChevronRight, Receipt } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { UserRole } from "@/lib/types"
import Image from "next/image"
import SidebarLogo from "@/app/MARCA-D'AGUA-LOGO-2.png"

interface SidebarProps {
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
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [collapsed, setCollapsed] = React.useState(false)
  const [allowedTabs, setAllowedTabs] = React.useState<string[] | null>(null)
  React.useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("sidebar_collapsed") : null
      const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false
      setCollapsed(saved === "true" || isMobile)
    } catch {}
  }, [])

  // Carrega allowed_tabs do profissional logado (se não for ADMIN)
  React.useEffect(() => {
    const loadAllowed = async () => {
      if (!user || user.role === "ADMIN") {
        setAllowedTabs([])
        return
      }
      const { data, error } = await supabase
        .from("professionals")
        .select("allowed_tabs")
        .eq("user_id", user.id)
        .single()
      if (error) {
        // falha silenciosa: mantém lista vazia => usa fallback por adminOnly
        setAllowedTabs([])
        return
      }
      const tabs = (data?.allowed_tabs as string[] | null) || []
      setAllowedTabs(tabs)
    }
    loadAllowed()
  }, [user?.id, user?.role])
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c
      try { localStorage.setItem("sidebar_collapsed", String(next)) } catch {}
      return next
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Permissões finas foram removidas do JSON; simplificamos a visibilidade:
  // - Admin vê tudo
  // - Não-admin vê itens não marcados como adminOnly

  // Se ADMIN, vê tudo. Caso contrário, filtra por adminOnly e allowed_tabs (quando disponível)
  const filteredNavigation = navigation.filter((item) => {
    if (user?.role === "ADMIN") return true
    const passesAdminOnly = !item.adminOnly
    if (!passesAdminOnly) return false
    // Se allowedTabs ainda não carregado, mantém apenas não-admin
    if (!allowedTabs || allowedTabs.length === 0) return true
    // Item é permitido se a rota estiver na lista
    return allowedTabs.includes(item.href)
  })

  return (
    <div className={cn("flex flex-col h-screen overflow-y-auto border-r bg-card transition-all duration-200 flex-shrink-0", collapsed ? "w-16" : "w-64") }>
      <div className="flex h-16 items-center border-b px-3">
        {!collapsed && (
          <div className="relative h-40 w-160 max-w-[9rem] overflow-hidden shrink-0">
            <Image src={SidebarLogo} alt="Imperalina" fill sizes="160px" className={cn("object-contain")} />
          </div>
        )}
        <Button variant="ghost" size="icon" className="ml-auto" onClick={toggleCollapsed} aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}>
          {collapsed ? <ChevronRight size={20} className="size-5" /> : <ChevronLeft size={20} className="size-5" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {filteredNavigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== "/financeiro" && pathname.startsWith(item.href))
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full", 
                  collapsed ? "justify-center gap-0 px-2" : "justify-start gap-3 px-3",
                  isActive && "bg-secondary",
                  item.isSubItem && !collapsed && "ml-4 text-sm"
                )}
              >
                <span className="size-5 min-w-5 min-h-5 shrink-0 grid place-items-center">
                  <Icon size={20} className="size-5 shrink-0" />
                </span>
                {!collapsed && item.name}
              </Button>
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 mb-3">
          <Avatar>
            <AvatarImage src={user?.avatar || "/placeholder.svg"} />
            <AvatarFallback>{user?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <Button variant="outline" className={cn("w-full bg-transparent", collapsed ? "justify-center" : "justify-start gap-3")} onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          {!collapsed && "Sair"}
        </Button>
      </div>
    </div>
  )
}
