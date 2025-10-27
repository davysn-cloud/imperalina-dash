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

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [collapsed, setCollapsed] = React.useState(false)
  React.useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("sidebar_collapsed") : null
      const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false
      setCollapsed(saved === "true" || isMobile)
    } catch {}
  }, [])
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

  const [permissions, setPermissions] = React.useState<Record<string, boolean> | null>(null)
  React.useEffect(() => {
    const loadPermissions = async () => {
      if (!user?.id) return
      const { data, error } = await supabase
        .from("professionals")
        .select("permissions, user_id")
        .eq("user_id", user.id)
        .maybeSingle()
      if (error) {
        console.error("[Sidebar] erro ao carregar permissões:", error)
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
    if (!permissions) return true // enquanto carrega, libera navegação
    return !!permissions[key]
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
