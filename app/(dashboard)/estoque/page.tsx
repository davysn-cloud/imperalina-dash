import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, Layers, Building2, ArrowLeftRight, Link2 } from "lucide-react"
import EstoqueDashboard from "@/components/estoque-dashboard"

export default function EstoqueHomePage() {
  const sections = [
    { title: "Produtos", href: "/estoque/produtos", icon: Package, description: "Cadastro e controle de itens com estoque, preços e rastreabilidade." },
    { title: "Categorias", href: "/estoque/categorias", icon: Layers, description: "Estrutura hierárquica de categorias com cor, ícone e descrição." },
    { title: "Fornecedores", href: "/estoque/fornecedores", icon: Building2, description: "Cadastro de fornecedores e dados comerciais para compras." },
    { title: "Movimentações", href: "/estoque/movimentacoes", icon: ArrowLeftRight, description: "Entradas, saídas, ajustes e transferências com rastreabilidade." },
    { title: "Vínculos Serviço × Produto", href: "/estoque/vinculos", icon: Link2, description: "Configuração de produtos usados por serviços e baixa automática." },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
        <p className="text-muted-foreground">Dashboard com visão geral e ações rápidas.</p>
      </div>
      <EstoqueDashboard />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((sec) => {
          const Icon = sec.icon
          return (
            <Card key={sec.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {sec.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">{sec.description}</p>
                <Link href={sec.href}>
                  <Button size="sm">Abrir</Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}