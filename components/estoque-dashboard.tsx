"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, CalendarDays, ShoppingCart, TrendingUp, TrendingDown, AlertCircle, ArrowDownCircle, ArrowUpCircle, Award } from "lucide-react"
import { CardDescription } from "@/components/ui/card"
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, Tooltip, Legend } from "recharts"
import { Progress } from "@/components/ui/progress"
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import * as React from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Produto, MovimentacaoEstoque } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

// Dados serão carregados do Supabase (produtos/movimentações)
// (mocks removidos; dados serão buscados dentro do componente)

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

// Ruptura/vencidos serão calculados dentro do componente com dados reais

export default function EstoqueDashboard() {
  const { toast } = useToast()
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), [])

  type ProdutoItem = { id: string; nome: string; quantidade: number; minimo: number; precoCusto: number; precoVenda: number; validadeDias: number }
  const [produtos, setProdutos] = React.useState<ProdutoItem[]>([])
  const [comprasPendentes, setComprasPendentes] = React.useState<number>(0)
  const [totalComprasPendentes, setTotalComprasPendentes] = React.useState<number>(0)
  const [movs30, setMovs30] = React.useState<MovimentacaoEstoque[]>([])
  const [ultimasMovs, setUltimasMovs] = React.useState<MovimentacaoEstoque[]>([])
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isAdjusting, setIsAdjusting] = React.useState(false)
  const [isDiscarding, setIsDiscarding] = React.useState(false)
  const [esgotandoIds, setEsgotandoIds] = React.useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmAction, setConfirmAction] = React.useState<null | 'adjust' | 'discard'>(null)
  const [showSelectedList, setShowSelectedList] = React.useState(false)
  const [categoriasCount, setCategoriasCount] = React.useState<number>(0)
  const [fornecedoresCount, setFornecedoresCount] = React.useState<number>(0)
  const [pedidosPendentes, setPedidosPendentes] = React.useState<any[]>([])
  const [recebendo, setRecebendo] = React.useState<string | null>(null)

  const daysUntil = (v?: string | null) => (v ? Math.ceil((new Date(v).getTime() - Date.now()) / 86400000) : 9999)

  React.useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("produtos")
          .select("id,nome,quantidade_atual,quantidade_minima,preco_custo,preco_venda,validade")
        if (error) throw error
        const mapped: ProdutoItem[] = (data || []).map((r: any) => ({
          id: r.id,
          nome: r.nome,
          quantidade: r.quantidade_atual ?? 0,
          minimo: r.quantidade_minima ?? 0,
          precoCusto: r.preco_custo ?? 0,
          precoVenda: r.preco_venda ?? 0,
          validadeDias: daysUntil(r.validade ?? null),
        }))
        setProdutos(mapped)

        // Movimentações reais (30 dias e últimas 10)
        const start30 = new Date()
        start30.setDate(start30.getDate() - 29)
        const { data: movs, error: errM } = await supabase
          .from("movimentacoes_estoque")
          .select("id,produto_id,tipo,quantidade,origem,data_hora,validade")
          .gte("data_hora", start30.toISOString())
          .order("data_hora", { ascending: true })
        if (errM) throw errM
        setMovs30((movs || []) as any)

        const { data: recentMovs, error: errR } = await supabase
          .from("movimentacoes_estoque")
          .select("id,produto_id,tipo,quantidade,origem,data_hora,validade")
          .order("data_hora", { ascending: false })
          .limit(10)
        if (errR) throw errR
        setUltimasMovs((recentMovs || []) as any)

        // Compras pendentes reais
        const { data: pendentes, error: errP } = await supabase
          .from("pedidos_compra")
          .select("id, produto_id, quantidade, status, produto:produtos(nome)")
          .eq("status", "pendente")
        if (errP) throw errP
        setComprasPendentes((pendentes || []).length)
        setPedidosPendentes(pendentes || [])
        const priceMap = new Map((data || []).map((r: any) => [r.id, r.preco_custo ?? 0]))
        const totalPendentesCalc = (pendentes || []).reduce((sum: number, it: any) => sum + ((priceMap.get(it.produto_id) || 0) * (it.quantidade || 0)), 0)
        setTotalComprasPendentes(totalPendentesCalc)

        const { count: catCount, error: catErr } = await supabase
          .from("categorias")
          .select("*", { count: "exact", head: true })
        if (catErr) throw catErr
        setCategoriasCount(catCount || 0)

        const { count: fornCount, error: fornErr } = await supabase
          .from("fornecedores")
          .select("*", { count: "exact", head: true })
        if (fornErr) throw fornErr
        setFornecedoresCount(fornCount || 0)
      } catch (e: any) {
        toast({ title: "Erro ao carregar estoque", description: e.message, variant: "destructive" })
      }
    }
    load()
  }, [supabase, toast])

  const totalValor = produtos.reduce((sum, p) => sum + p.quantidade * p.precoCusto, 0)
  const itensDistintos = produtos.length

  // Variação mock até integrar movimentações
  const variacaoMensal = 12.5

  const abaixoDoMinimo = produtos.filter((p) => p.quantidade < p.minimo).length

  const vencendo7 = produtos.filter((p) => p.validadeDias > 0 && p.validadeDias <= 7).length
  const vencendo15 = produtos.filter((p) => p.validadeDias > 7 && p.validadeDias <= 15).length
  const vencendo30 = produtos.filter((p) => p.validadeDias > 15 && p.validadeDias <= 30).length

  const rupturaTotal = produtos.filter((p) => p.quantidade === 0)
  const vencidos = produtos.filter((p) => p.validadeDias < 0)

  const custoMedioPonderado = (() => {
    const num = produtos.reduce((s, p) => s + p.precoCusto * p.quantidade, 0)
    const den = produtos.reduce((s, p) => s + p.quantidade, 0)
    return den > 0 ? num / den : 0
  })()
  const margemMediaPct = (() => {
    let num = 0
    let den = 0
    for (const p of produtos) {
      if (p.precoVenda && p.precoVenda > 0) {
        const margem = (p.precoVenda - p.precoCusto) / p.precoVenda
        num += margem * (p.quantidade || 0)
        den += p.quantidade || 0
      }
    }
    return den > 0 ? (num / den) * 100 : 0
  })()
  const bands = [
    { key: "ate7", label: "Até 7 dias", count: produtos.filter((p) => p.validadeDias > 0 && p.validadeDias <= 7).length },
    { key: "8a15", label: "8–15 dias", count: produtos.filter((p) => p.validadeDias > 7 && p.validadeDias <= 15).length },
    { key: "16a30", label: "16–30 dias", count: produtos.filter((p) => p.validadeDias > 15 && p.validadeDias <= 30).length },
    { key: "31a60", label: "31–60 dias", count: produtos.filter((p) => p.validadeDias > 30 && p.validadeDias <= 60).length },
  ]
  const [selectedBands, setSelectedBands] = React.useState<string[]>([])
  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>([])

  const bandProductIds = React.useCallback((key: string) => {
    switch (key) {
      case "ate7":
        return produtos.filter((p) => p.validadeDias > 0 && p.validadeDias <= 7).map((p) => p.id)
      case "8a15":
        return produtos.filter((p) => p.validadeDias > 7 && p.validadeDias <= 15).map((p) => p.id)
      case "16a30":
        return produtos.filter((p) => p.validadeDias > 15 && p.validadeDias <= 30).map((p) => p.id)
      case "31a60":
        return produtos.filter((p) => p.validadeDias > 30 && p.validadeDias <= 60).map((p) => p.id)
      default:
        return []
    }
  }, [produtos])

  const toggleBand = (key: string, checked: boolean) => {
    setSelectedBands((prev) => (checked ? Array.from(new Set([...prev, key])) : prev.filter((k) => k !== key)))
    const ids = bandProductIds(key)
    setSelectedProductIds((prev) => (checked ? Array.from(new Set([...prev, ...ids])) : prev.filter((id) => !ids.includes(id))))
  }

  // Ações em massa
  const getProduto = React.useCallback((id: string) => produtos.find((p) => p.id === id), [produtos])

  const handleGeneratePurchaseOrders = async () => {
    try {
      setIsGenerating(true)
      const toOrder = selectedProductIds
        .map((id) => getProduto(id))
        .filter((p): p is ProdutoItem => !!p && p.quantidade < p.minimo)
        .map((p) => ({ produto_id: p.id, quantidade: p.minimo - p.quantidade, status: "pendente", created_at: new Date().toISOString() }))
      if (toOrder.length === 0) {
        toast({ title: "Nenhum item precisa de pedido", description: "Todos com estoque ≥ mínimo." })
        return
      }
      const { error } = await supabase.from("pedidos_compra").insert(toOrder)
      if (error) throw error
      toast({ title: "Pedido gerado", description: `${toOrder.length} itens adicionados como pendentes.` })
    } catch (e: any) {
      toast({ title: "Erro ao gerar pedido", description: e.message || String(e), variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAdjustStockToMinimo = async () => {
    try {
      const updates: { id: string; novo: number; delta: number; tipo: "entrada" | "saida" }[] = []
      for (const id of selectedProductIds) {
        const p = getProduto(id)
        if (!p || p.quantidade === p.minimo) continue
        const delta = p.minimo - p.quantidade
        updates.push({ id: p.id, novo: p.minimo, delta: Math.abs(delta), tipo: delta > 0 ? "entrada" : "saida" })
      }
      if (updates.length === 0) {
        toast({ title: "Nenhum ajuste necessário", description: "Todos já estão no mínimo." })
        return
      }
      const movimentos = updates.map((u) => ({ produto_id: u.id, tipo: u.tipo, quantidade: u.delta, origem: "Ajuste", data_hora: new Date().toISOString() }))
      const { error: errMov } = await supabase.from("movimentacoes_estoque").insert(movimentos)
      if (errMov) throw errMov
      for (const u of updates) {
        const { error: errUp } = await supabase.from("produtos").update({ quantidade_atual: u.novo }).eq("id", u.id)
        if (errUp) throw errUp
      }
      setProdutos((prev) => prev.map((p) => {
        const u = updates.find((x) => x.id === p.id)
        return u ? { ...p, quantidade: u.novo } : p
      }))
      toast({ title: "Estoque ajustado", description: `${updates.length} itens ajustados ao mínimo.` })
    } catch (e: any) {
      toast({ title: "Erro ao ajustar estoque", description: e.message || String(e), variant: "destructive" })
    }
  }

  const handleDiscardExpired = async () => {
    try {
      const expired = selectedProductIds
        .map((id) => getProduto(id))
        .filter((p): p is ProdutoItem => !!p && p.validadeDias <= 0 && p.quantidade > 0)
      if (expired.length === 0) {
        toast({ title: "Nenhum vencido para descarte", description: "Selecione faixas com itens vencidos." })
        return
      }
      const movimentos = expired.map((p) => ({ produto_id: p.id, tipo: "saida", quantidade: p.quantidade, origem: "Descarte", data_hora: new Date().toISOString() }))
      const { error: errMov } = await supabase.from("movimentacoes_estoque").insert(movimentos)
      if (errMov) throw errMov
      for (const p of expired) {
        const { error: errUp } = await supabase.from("produtos").update({ quantidade_atual: 0 }).eq("id", p.id)
        if (errUp) throw errUp
      }
      setProdutos((prev) => prev.map((p) => (expired.find((e) => e.id === p.id) ? { ...p, quantidade: 0 } : p)))
      toast({ title: "Descartes registrados", description: `${expired.length} itens zerados e movimentação salva.` })
    } catch (e: any) {
      toast({ title: "Erro ao descartar vencidos", description: e.message || String(e), variant: "destructive" })
    }
  }

  // Movimentações reais (30 dias)
  const movData = React.useMemo(() => {
    const map = new Map<string, { entradas: number; saidas: number }>()
    for (const m of movs30) {
      const day = new Date(m.data_hora).toISOString().slice(0, 10)
      const row = map.get(day) || { entradas: 0, saidas: 0 }
      if (m.tipo === "entrada") row.entradas += m.quantidade || 0
      if (m.tipo === "saida") row.saidas += m.quantidade || 0
      map.set(day, row)
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, v]) => ({ date, entradas: v.entradas, saidas: v.saidas, saldo: v.entradas - v.saidas }))
  }, [movs30])

  // Ranking Top 5 mais usados (reais)
  const refreshProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from("produtos")
        .select("id,nome,quantidade_atual,quantidade_minima,preco_custo,preco_venda,validade")
      if (error) throw error
      const mapped: ProdutoItem[] = (data || []).map((r: any) => ({
        id: r.id,
        nome: r.nome,
        quantidade: r.quantidade_atual ?? 0,
        minimo: r.quantidade_minima ?? 0,
        precoCusto: r.preco_custo ?? 0,
        precoVenda: r.preco_venda ?? 0,
        validadeDias: daysUntil(r.validade ?? null),
      }))
      setProdutos(mapped)
      const { data: recentMovs, error: errR } = await supabase
        .from("movimentacoes_estoque")
        .select("id,produto_id,tipo,quantidade,origem,data_hora,validade")
        .order("data_hora", { ascending: false })
        .limit(10)
      if (errR) throw errR
      setUltimasMovs((recentMovs || []) as any)
    } catch (_) {
      // ignore refresh errors for now
    }
  }

  const esgotarProduto = async (produtoId: string) => {
    setEsgotandoIds(prev => {
      const next = new Set(prev)
      next.add(produtoId)
      return next
    })
    try {
      const resp = await fetch("/api/estoque/produtos/esgotar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoId }),
      })
      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        throw new Error((json as any)?.error || "Falha ao esgotar produto")
      }
      await refreshProdutos()
      toast({ title: "Produto esgotado", description: (json as any)?.message || "Quantidade atual definida como 0." })
    } catch (e: any) {
      toast({ title: "Erro ao esgotar produto", description: e.message || String(e), variant: "destructive" })
    } finally {
      setEsgotandoIds(prev => {
        const next = new Set(prev)
        next.delete(produtoId)
        return next
      })
    }
  }

  const doAdjust = async () => {
    if (selectedProductIds.length === 0) {
      setConfirmOpen(false)
      return
    }
    setIsAdjusting(true)
    try {
      const { data, error } = await supabase.rpc("adjust_stock_to_minimo", { product_ids: selectedProductIds })
      if (error) throw error
      await refreshProdutos()
      toast({ title: "Estoque ajustado", description: `${data || 0} itens ajustados ao mínimo.` })
    } catch (e: any) {
      toast({ title: "Erro ao ajustar estoque", description: e.message || String(e), variant: "destructive" })
    } finally {
      setIsAdjusting(false)
      setConfirmOpen(false)
    }
  }

  const doDiscard = async () => {
    if (selectedProductIds.length === 0) {
      setConfirmOpen(false)
      return
    }
    setIsDiscarding(true)
    try {
      const { data, error } = await supabase.rpc("discard_expired", { product_ids: selectedProductIds })
      if (error) throw error
      await refreshProdutos()
      toast({ title: "Descartes registrados", description: `${data || 0} itens zerados por vencimento.` })
    } catch (e: any) {
      toast({ title: "Erro ao descartar vencidos", description: e.message || String(e), variant: "destructive" })
    } finally {
      setIsDiscarding(false)
      setConfirmOpen(false)
    }
  }

  const topUsados = React.useMemo(() => {
    const count = new Map<string, number>()
    for (const m of movs30) {
      if (m.tipo === "saida") {
        const id = String(m.produto_id)
        count.set(id, (count.get(id) || 0) + (m.quantidade || 0))
      }
    }
    const items = Array.from(count.entries())
      .map(([id, usoMes]) => {
        const prod = produtos.find((p) => String(p.id) === id)
        const status = prod ? (prod.quantidade === 0 ? "ruptura" : prod.quantidade < prod.minimo ? "baixo" : "ok") : "ok"
        return { id, nome: prod?.nome || id, usoMes, status }
      })
      .sort((a, b) => b.usoMes - a.usoMes)
      .slice(0, 5)
    return items
  }, [movs30, produtos])

  // Feed de últimas movimentações (reais)
  const ultimasMovimentacoes = React.useMemo(() => {
    return ultimasMovs.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      produto: produtos.find((p) => p.id === m.produto_id)?.nome || m.produto_id,
      quantidade: m.quantidade || 0,
      usuario: "",
      origem: m.origem,
      data: new Date(m.data_hora),
    }))
  }, [ultimasMovs, produtos])

  // Estoque Baixo (Top 10)
  const lowStockTop10 = produtos
    .filter((p) => p.quantidade < p.minimo)
    .map((p) => ({ ...p, falta: Math.max(p.minimo - p.quantidade, 0) }))
    .sort((a, b) => b.falta - a.falta)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Visão Geral com Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total em Estoque</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValor)}</div>
            <p className="text-xs text-muted-foreground">{itensDistintos} itens diferentes</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              {variacaoMensal >= 0 ? (
                <span className="flex items-center text-green-600"><TrendingUp className="h-3 w-3 mr-1" /> {variacaoMensal.toFixed(1)}% vs mês anterior</span>
              ) : (
                <span className="flex items-center text-red-600"><TrendingDown className="h-3 w-3 mr-1" /> {variacaoMensal.toFixed(1)}% vs mês anterior</span>
              )}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Custo médio ponderado: {formatCurrency(custoMedioPonderado)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Margem média (ponderada): {margemMediaPct.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <Badge variant="destructive" className="animate-pulse">Crítico</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{abaixoDoMinimo}</div>
            <p className="text-xs text-muted-foreground">Produtos abaixo do mínimo</p>
            <div className="mt-3 flex gap-2">
              <Link href="/estoque/produtos"><Button size="sm" variant="outline">Ver lista</Button></Link>
              <Link href="/estoque/movimentacoes"><Button size="sm">Gerar Pedido de Compra</Button></Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produtos Vencendo</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Em 7 dias: <span className="font-medium">{vencendo7}</span></div>
            <div className="text-sm text-muted-foreground">Em 15 dias: <span className="font-medium">{vencendo15}</span></div>
            <div className="text-sm text-muted-foreground">Em 30 dias: <span className="font-medium">{vencendo30}</span></div>
            <div className="mt-3">
              <Link href="/estoque/movimentacoes"><Button size="sm" variant="outline">Relatório de Validade</Button></Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Compras Pendentes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comprasPendentes}</div>
            <p className="text-xs text-muted-foreground">Aguardando entrega / Em trânsito</p>
            <p className="text-xs text-muted-foreground">Total pendente: <span className="font-medium">{formatCurrency(totalComprasPendentes)}</span></p>
          </CardContent>
        </Card>
      </div>
      {/* Pedidos pendentes com ação de recebimento */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Pedidos de Compra Pendentes</h2>
        {pedidosPendentes.length === 0 ? (
          <p className="text-muted-foreground">Nenhum pedido pendente.</p>
        ) : (
          <div className="grid gap-3">
            {pedidosPendentes.map((p) => {
              const produtoNome = Array.isArray(p.produto) ? p.produto[0]?.nome : p.produto?.nome
              return (
                <div key={p.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <div className="font-medium">{produtoNome || "Produto"}</div>
                    <div className="text-sm text-muted-foreground">Qtd: {p.quantidade}</div>
                  </div>
                  <Button
                    size="sm"
                    disabled={recebendo === p.id}
                    onClick={async () => {
                      try {
                        setRecebendo(p.id)
                        const resp = await fetch("/api/estoque/pedidos/receber", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ pedido_compra_id: p.id }),
                        })
                        if (!resp.ok) throw new Error("Falha ao receber pedido")
                        toast({ title: "Pedido recebido", description: `Estoque atualizado para ${produtoNome}` })
                        // Atualizar UI
                        // Recarregar dados principais
                        const load = async () => {
                          try {
                            const { data, error } = await supabase
                              .from("produtos")
                              .select("id,nome,quantidade_atual,quantidade_minima,preco_custo,preco_venda,validade")
                            if (!error) {
                              const mapped: any[] = (data || []).map((r: any) => ({
                                id: r.id,
                                nome: r.nome,
                                quantidade: r.quantidade_atual ?? 0,
                                minimo: r.quantidade_minima ?? 0,
                                precoCusto: r.preco_custo ?? 0,
                                precoVenda: r.preco_venda ?? 0,
                                validadeDias: (r.validade ? Math.ceil((new Date(r.validade).getTime() - Date.now()) / 86400000) : 9999),
                              }))
                              setProdutos(mapped)
                            }
                            const { data: pendentes } = await supabase
                              .from("pedidos_compra")
                              .select("id, produto_id, quantidade, status, produto:produtos(nome)")
                              .eq("status", "pendente")
                            setComprasPendentes((pendentes || []).length)
                            setPedidosPendentes(pendentes || [])
                          } catch (_) {
                            // ignore
                          }
                        }
                        await load()
                      } catch (e: any) {
                        toast({ title: "Erro ao receber pedido", description: e.message, variant: "destructive" })
                      } finally {
                        setRecebendo(null)
                      }
                    }}
                  >
                    {recebendo === p.id ? "Recebendo..." : "Receber"}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {/* Alertas Críticos */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas Críticos</CardTitle>
          <CardDescription>Ações necessárias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600" /> Ruptura Total
              </div>
              {rupturaTotal.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum produto zerado</p>
              ) : (
                <ul className="text-sm space-y-2">
                  {rupturaTotal.map((p) => (
                    <li key={p.id} className="flex items-center justify-between">
                      <span>{p.nome}</span>
                      <Link href={`/estoque/movimentacoes`}>
                        <Button size="sm">Comprar Agora</Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="h-4 w-4 text-yellow-600" /> Validade Vencida
              </div>
              {vencidos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum produto vencido</p>
              ) : (
                <ul className="text-sm space-y-2">
                  {vencidos.map((p) => (
                    <li key={p.id} className="flex items-center justify-between">
                      <span>{p.nome}</span>
                      <Badge variant="outline" className="border-red-500 text-red-600">
                        Remover/Descartar
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lotes a vencer por faixa */}
      <Card>
        <CardHeader>
          <CardTitle>Lotes a vencer por faixa</CardTitle>
          <CardDescription>Selecione faixas para ações em massa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {bands.map((b) => (
              <div key={b.key} className="flex items-center justify-between rounded border p-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedBands.includes(b.key)}
                    onCheckedChange={(c) => toggleBand(b.key, Boolean(c))}
                    aria-label={`Selecionar faixa ${b.label}`}
                  />
                  <span className="text-sm">{b.label}</span>
                </div>
                <Badge variant={b.count > 0 ? "secondary" : "outline"}>{b.count}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              setSelectedBands(bands.map((b) => b.key))
              const allIds = bands.flatMap((b) => bandProductIds(b.key))
              setSelectedProductIds(Array.from(new Set(allIds)))
            }}>Selecionar todos</Button>
            <Button size="sm" variant="outline" onClick={() => {
              const ids = produtos.filter((p) => p.quantidade < p.minimo).map((p) => p.id)
              setSelectedProductIds(Array.from(new Set([...
                selectedProductIds,
                ...ids
              ])))
            }}>Selecionar abaixo do mínimo</Button>
            <Button size="sm" onClick={handleGeneratePurchaseOrders} disabled={selectedProductIds.length === 0 || isGenerating}>{isGenerating ? 'Processando…' : 'Gerar pedido de compra'}</Button>
            <Button size="sm" variant="outline" onClick={() => { setConfirmAction('adjust'); setConfirmOpen(true) }} disabled={selectedProductIds.length === 0 || isAdjusting}>{isAdjusting ? 'Processando…' : 'Ajustar estoque'}</Button>
            <Button size="sm" variant="outline" onClick={() => { setConfirmAction('discard'); setConfirmOpen(true) }} disabled={selectedProductIds.length === 0 || isDiscarding}>{isDiscarding ? 'Processando…' : 'Descartar vencidos'}</Button>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Selecionados: <span className="font-medium">{selectedProductIds.length}</span>
            <Button variant="ghost" size="sm" className="ml-2" onClick={() => setShowSelectedList((v) => !v)}>
              {showSelectedList ? 'Ocultar selecionados' : 'Ver selecionados'}
            </Button>
          </div>
          {showSelectedList && (
            <ul className="mt-2 text-sm space-y-1">
              {produtos.filter((p) => selectedProductIds.includes(p.id)).map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>{p.nome}</span>
                  <Badge variant={p.quantidade < p.minimo ? 'destructive' : 'outline'}>
                    {p.quantidade}/{p.minimo}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Movimentações (30 dias) */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentações de Estoque (30 dias)</CardTitle>
          <CardDescription>Entradas, saídas e saldo diário</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-auto h-[250px] w-full">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={movData}>
                <defs>
                  <linearGradient id="fillEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })
                  }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  }}
                />
                <Area dataKey="entradas" name="Entradas" type="natural" fill="url(#fillEntradas)" stroke="#16a34a" />
                <Area dataKey="saidas" name="Saídas" type="natural" fill="url(#fillSaidas)" stroke="#dc2626" />
                <Area dataKey="saldo" name="Saldo" type="natural" fill="url(#fillSaldo)" stroke="#2563eb" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Ranking e Feed */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Top 5 Mais Usados</CardTitle>
            </div>
            <CardDescription>Produtos com maior uso no mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {topUsados.map((u) => (
                <li key={u.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{u.nome}</span>
                    <Badge variant={u.status === "baixo" ? "destructive" : u.status === "ruptura" ? "outline" : "secondary"}>
                      {u.status === "baixo" ? "Baixo" : u.status === "ruptura" ? "Ruptura" : "OK"}
                    </Badge>
                  </div>
                  <Progress value={Math.min(u.usoMes, 100)} />
                  <p className="text-xs text-muted-foreground">{u.usoMes} usos no mês</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas Movimentações</CardTitle>
            <CardDescription>Entradas e saídas recentes</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {ultimasMovimentacoes.map((m) => (
                <li key={m.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {m.tipo === "entrada" ? (
                      <ArrowDownCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowUpCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>{m.produto}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {m.tipo === "entrada" ? "+" : "-"}
                    {m.quantidade} • {m.usuario} • {m.origem}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Estoque Baixo (Top 10) */}
      <Card>
        <CardHeader>
          <CardTitle>Estoque Baixo (Top 10)</CardTitle>
          <CardDescription>Itens com maior necessidade de reposição</CardDescription>
        </CardHeader>
        <CardContent>
          {lowStockTop10.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item abaixo do mínimo</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Mín</TableHead>
                    <TableHead className="text-right">Falta</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockTop10.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell className="text-right">{p.quantidade}</TableCell>
                      <TableCell className="text-right">{p.minimo}</TableCell>
                      <TableCell className="text-right text-red-600">{p.falta}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => esgotarProduto(p.id)} disabled={esgotandoIds.has(p.id)}>Esgotar</Button>
                          <Link href={`/estoque/movimentacoes`}>
                            <Button size="sm">Comprar</Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Atalhos Rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Atalhos Rápidos</CardTitle>
          <CardDescription>Ações frequentes de estoque</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href="/estoque/movimentacoes"><Button>Nova Compra</Button></Link>
            <Link href="/estoque/movimentacoes"><Button variant="outline">Registrar Saída</Button></Link>
            <Link href="/estoque/produtos"><Button variant="outline">Cadastrar Produto</Button></Link>
            <Link href="/estoque/movimentacoes"><Button variant="secondary">Relatórios</Button></Link>
          </div>
        </CardContent>
      </Card>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAction === 'adjust' ? 'Confirmar ajuste ao mínimo' : 'Confirmar descarte de vencidos'}</DialogTitle>
            <DialogDescription>
              {confirmAction === 'adjust' ? 'Os itens selecionados terão estoque ajustado ao mínimo.' : 'Os itens vencidos selecionados serão zerados no estoque.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={confirmAction === 'adjust' ? doAdjust : doDiscard} disabled={confirmAction === 'adjust' ? isAdjusting : isDiscarding}>
              {confirmAction === 'adjust' ? (isAdjusting ? 'Processando…' : 'Confirmar ajuste') : (isDiscarding ? 'Processando…' : 'Confirmar descarte')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}