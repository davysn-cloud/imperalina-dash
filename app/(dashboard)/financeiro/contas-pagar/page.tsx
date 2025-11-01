"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CalendarDays, CreditCard, DollarSign, FilePlus2, RefreshCw, TrendingDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

type Status = "PENDENTE" | "PAGO" | "ATRASADO" | "CANCELADO"
type Categoria = "ALUGUEL" | "ENERGIA" | "AGUA" | "INTERNET" | "MARKETING" | "COMISSAO" | "OUTROS"

interface ContaPagar {
  id: string
  descricao: string
  categoria: Categoria
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  status: Status
  metodo_pagamento: string | null
  observacoes: string | null
  fornecedor?: { id: string; nome_fantasia: string } | null
  pedido_compra?: { id: string; produto_id: string; quantidade: number; status: string } | null
  comissao_id?: string | null
}

export default function ContasPagarPage() {
  const { toast } = useToast()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [itens, setItens] = useState<ContaPagar[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFiltro, setStatusFiltro] = useState<Status | "ALL">("ALL")
  const [catFiltro, setCatFiltro] = useState<Categoria | "ALL">("ALL")
  const [mesFiltro, setMesFiltro] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  })
  const [sortBy, setSortBy] = useState<"data_vencimento" | "valor">("data_vencimento")
  const [sortAsc, setSortAsc] = useState<boolean>(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ContaPagar | null>(null)
  const searchParams = useSearchParams()
const [highlightId, setHighlightId] = useState<string | null>(null)
  const highlightedItem = useMemo(() => itens.find(i => i.id === highlightId) || null, [highlightId, itens])

  const [form, setForm] = useState({
    descricao: "",
    categoria: "OUTROS" as Categoria,
    valor: "",
    data_vencimento: "",
    fornecedor_id: "",
    metodo_pagamento: "",
    observacoes: "",
    pedido_compra_id: "",
    comissao_id: "",
    recorrente: false,
    inicio_recorrencia: "",
    parcelas: "",
    dia_vencimento: "",
    periodicidade: "MENSAL" as "MENSAL" | "SEMANAL" | "QUINZENAL",
  })

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

  const resumo = useMemo(() => {
    const pendente = itens.filter(i => i.status === "PENDENTE").reduce((s, i) => s + (i.valor || 0), 0)
    const pago = itens.filter(i => i.status === "PAGO").reduce((s, i) => s + (i.valor || 0), 0)
    const atrasado = itens.filter(i => i.status !== "PAGO" && new Date(i.data_vencimento) < new Date()).reduce((s, i) => s + (i.valor || 0), 0)
    return { pendente, pago, atrasado }
  }, [itens])

  const carregar = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from("contas_pagar")
        .select(`
          id,
          descricao,
          categoria,
          valor,
          data_vencimento,
          data_pagamento,
          status,
          metodo_pagamento,
          observacoes,
          fornecedor:fornecedores(id, nome_fantasia),
          pedido_compra:pedidos_compra(id, produto_id, quantidade, status)
        `)
        .order(sortBy, { ascending: sortAsc })

      if (statusFiltro !== "ALL") query = query.eq("status", statusFiltro)
      if (catFiltro !== "ALL") query = query.eq("categoria", catFiltro)
      if (mesFiltro) {
        try {
          const [y, m] = mesFiltro.split("-")
          const start = new Date(Number(y), Number(m) - 1, 1)
          const end = new Date(Number(y), Number(m), 0)
          const startIso = start.toISOString().slice(0, 10)
          const endIso = end.toISOString().slice(0, 10)
          query = query.gte("data_vencimento", startIso).lte("data_vencimento", endIso)
        } catch {}
      }

      const { data, error } = await query
      if (error) throw error
      setItens(data || [])
    } catch (e: any) {
      toast({ title: "Erro ao carregar", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [statusFiltro, catFiltro, mesFiltro, sortBy, sortAsc])

  useEffect(() => {
    // Realtime updates: contas_pagar
    const channel = supabase
      .channel("contas_pagar_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "contas_pagar" }, () => carregar())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  useEffect(() => {
    // Ler parâmetros da URL: id para destacar e categoria para pré-filtrar
    const id = searchParams.get("id")
    const categoria = searchParams.get("categoria") as Categoria | null
if (id) setHighlightId(id)
    if (categoria && ["ALUGUEL","ENERGIA","AGUA","INTERNET","MARKETING","COMISSAO","OUTROS"].includes(categoria)) {
      setCatFiltro(categoria)
    }
  }, [searchParams])

  useEffect(() => {
    // Após carregar itens, se houver highlightId, rolar até a linha
if (highlightId && itens.length > 0) {
  const el = document.getElementById(`row-${highlightId}`)
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" })
  }
}
}, [highlightId, itens])

 // Tornar destaque temporário: limpar após alguns segundos e remover param da URL
 useEffect(() => {
   if (!highlightId) return
   const timer = setTimeout(() => {
     setHighlightId(null)
     try {
       const url = new URL(window.location.href)
       url.searchParams.delete('id')
       window.history.replaceState(null, '', url.toString())
     } catch {}
   }, 6000)
   return () => clearTimeout(timer)
  }, [highlightId])

  const limparDestaque = () => {
    setHighlightId(null)
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('id')
      window.history.replaceState(null, '', url.toString())
    } catch {}
  }

  const abrirNovo = () => {
    setEditing(null)
    setForm({ descricao: "", categoria: "OUTROS", valor: "", data_vencimento: "", fornecedor_id: "", metodo_pagamento: "", observacoes: "", pedido_compra_id: "", comissao_id: "", recorrente: false, inicio_recorrencia: "", parcelas: "", dia_vencimento: "", periodicidade: "MENSAL" })
    setModalOpen(true)
  }

  const [recResumoOpen, setRecResumoOpen] = useState(false)
  const [recResumo, setRecResumo] = useState<Array<{ id: string; descricao: string; data_vencimento: string }>>([])

  const salvar = async () => {
    try {
      const payload: any = {
        descricao: form.descricao,
        categoria: form.categoria,
        valor: Number(form.valor) || undefined,
        data_vencimento: form.data_vencimento,
        fornecedor_id: form.fornecedor_id || undefined,
        metodo_pagamento: form.metodo_pagamento || undefined,
        observacoes: form.observacoes || undefined,
        pedido_compra_id: form.pedido_compra_id || undefined,
        comissao_id: form.comissao_id || undefined,
      }
      if (editing) {
        const { error } = await supabase
          .from("contas_pagar")
          .update({
            descricao: payload.descricao,
            categoria: payload.categoria,
            valor: payload.valor,
            data_vencimento: payload.data_vencimento,
            fornecedor_id: payload.fornecedor_id || null,
            metodo_pagamento: payload.metodo_pagamento || null,
            observacoes: payload.observacoes || null,
            pedido_compra_id: payload.pedido_compra_id || null,
          })
          .eq("id", editing.id)
        if (error) throw error
        toast({ title: "Conta atualizada" })
      } else {
        // Se marcada como recorrente, usar endpoint específico
        if (form.recorrente) {
          if (!form.inicio_recorrencia || !form.parcelas) {
            throw new Error("Para recorrência, informe Início e Parcelas")
          }
          const baseDate = new Date(form.inicio_recorrencia)
          if (isNaN(baseDate.getTime())) throw new Error("Data de início inválida")
          const parcelas = Number(form.parcelas)
          const rows: any[] = []
          for (let i = 0; i < parcelas; i++) {
            const d = new Date(baseDate)
            if (form.periodicidade === "SEMANAL") {
              d.setDate(d.getDate() + i * 7)
            } else if (form.periodicidade === "QUINZENAL") {
              d.setDate(d.getDate() + i * 14)
            } else {
              d.setMonth(d.getMonth() + i)
              const dia = Number(form.dia_vencimento)
              if (dia && Number.isInteger(dia) && dia >= 1 && dia <= 31) {
                d.setDate(dia)
              }
            }
            const yyyyMmDd = d.toISOString().slice(0, 10)
            rows.push({
              descricao: `${form.descricao} (${i + 1}/${parcelas})`,
              categoria: form.categoria,
              valor: Number(form.valor),
              data_vencimento: yyyyMmDd,
              fornecedor_id: form.fornecedor_id || null,
              observacoes: form.observacoes || null,
              status: "PENDENTE",
            })
          }
          const { data, error } = await supabase
            .from("contas_pagar")
            .insert(rows)
            .select("id, descricao, data_vencimento")
          if (error) throw error
          // Vincular comissão à primeira parcela, se solicitado
          if (form.comissao_id && Array.isArray(data) && data.length > 0) {
            const firstId = (data as any)[0]?.id
            if (firstId) {
              await supabase.from("comissoes").update({ conta_pagar_id: firstId }).eq("id", form.comissao_id)
            }
          }
          toast({ title: "Recorrência criada", description: `${data?.length || 0} lançamentos gerados (${form.periodicidade})` })
          setRecResumo(Array.isArray(data) ? data as any : [])
          setRecResumoOpen(true)
        } else {
          // Calcular valor a partir de pedido_compra se não informado
          let valorFinal = Number(form.valor)
          if (!valorFinal && form.pedido_compra_id) {
            const { data: pc, error: errPc } = await supabase
              .from("pedidos_compra")
              .select("id, quantidade, produto:produtos(id, preco_custo)")
              .eq("id", form.pedido_compra_id)
              .single()
            if (!errPc && pc) {
              const preco = Array.isArray((pc as any).produto) ? (pc as any).produto?.[0]?.preco_custo : (pc as any).produto?.preco_custo
              const qtd = (pc as any).quantidade
              valorFinal = preco && qtd ? Number(preco) * Number(qtd) : valorFinal
            }
          }

          const insertPayload: any = {
            descricao: form.descricao,
            categoria: form.categoria,
            valor: valorFinal,
            data_vencimento: form.data_vencimento,
            fornecedor_id: form.fornecedor_id || null,
            metodo_pagamento: form.metodo_pagamento || null,
            observacoes: form.observacoes || null,
            pedido_compra_id: form.pedido_compra_id || null,
            status: 'PENDENTE',
          }
          const { data: created, error } = await supabase
            .from("contas_pagar")
            .insert(insertPayload)
            .select("*")
            .single()
          if (error) throw error
          if (form.comissao_id) {
            await supabase.from("comissoes").update({ conta_pagar_id: (created as any).id }).eq("id", form.comissao_id)
          }
          toast({ title: "Conta criada" })
        }
      }
      setModalOpen(false)
      carregar()
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" })
    }
  }

  const marcarPago = async (row: ContaPagar) => {
    try {
      const nowIso = new Date().toISOString()
      const { error } = await supabase
        .from("contas_pagar")
        .update({ status: "PAGO", data_pagamento: nowIso })
        .eq("id", row.id)
      if (error) throw error
      // refletir na comissão vinculada
      await supabase.from("comissoes").update({ status: "PAGO" }).eq("conta_pagar_id", row.id)
      toast({ title: "Pagamento registrado" })
      carregar()
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" })
    }
  }

  const excluir = async (row: ContaPagar) => {
    try {
      const { error } = await supabase.from("contas_pagar").delete().eq("id", row.id)
      if (error) throw error
      toast({ title: "Conta excluída" })
      carregar()
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" })
    }
  }

  const editar = (row: ContaPagar) => {
    setEditing(row)
    setForm({
      descricao: row.descricao,
      categoria: row.categoria,
      valor: String(row.valor || ""),
      data_vencimento: row.data_vencimento?.substring(0, 10) || "",
      fornecedor_id: row.fornecedor?.id || "",
      metodo_pagamento: row.metodo_pagamento || "",
      observacoes: row.observacoes || "",
      pedido_compra_id: row.pedido_compra?.id || "",
      comissao_id: "",
    })
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-muted-foreground">Registre, acompanhe e gerencie as saídas financeiras</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={abrirNovo}><FilePlus2 className="h-4 w-4 mr-2" />Nova Conta</Button>
          <Button variant="outline" onClick={carregar} disabled={loading}><RefreshCw className="h-4 w-4 mr-2" />Atualizar</Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(resumo.pendente)}</div>
            <p className="text-xs text-muted-foreground">{itens.filter(i => i.status === "PENDENTE").length} contas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pago</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(resumo.pago)}</div>
            <p className="text-xs text-muted-foreground">{itens.filter(i => i.status === "PAGO").length} contas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasado</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(resumo.atrasado)}</div>
            <p className="text-xs text-muted-foreground">{itens.filter(i => i.status !== "PAGO" && new Date(i.data_vencimento) < new Date()).length} contas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 items-end">
        <div className="w-48">
          <Label>Status</Label>
          <Select value={statusFiltro} onValueChange={(v: any) => setStatusFiltro(v)}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="PENDENTE">Pendente</SelectItem>
              <SelectItem value="PAGO">Pago</SelectItem>
              <SelectItem value="ATRASADO">Atrasado</SelectItem>
              <SelectItem value="CANCELADO">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Label>Categoria</Label>
          <Select value={catFiltro} onValueChange={(v: any) => setCatFiltro(v)}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              <SelectItem value="COMISSAO">Comissão</SelectItem>
              <SelectItem value="ALUGUEL">Aluguel</SelectItem>
              <SelectItem value="ENERGIA">Energia</SelectItem>
              <SelectItem value="AGUA">Água</SelectItem>
              <SelectItem value="INTERNET">Internet</SelectItem>
              <SelectItem value="MARKETING">Marketing</SelectItem>
              <SelectItem value="OUTROS">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Label>Mês</Label>
          <Input type="month" value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} />
        </div>
        <div className="w-56">
          <Label>Ordenar por</Label>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="data_vencimento">Vencimento</SelectItem>
                <SelectItem value="valor">Valor</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setSortAsc((p) => !p)}>{sortAsc ? "Asc" : "Desc"}</Button>
          </div>
        </div>
      </div>

      {highlightId && (
        <Alert className="border-blue-200">
          <AlertTitle>Destaque de conta ativo</AlertTitle>
          <AlertDescription>
            A conta "{highlightedItem?.descricao || highlightId}" está destacada na lista.
            <div className="mt-2 flex gap-2">
              {/* Link para Comissões removido */}
              <Button variant="secondary" onClick={limparDestaque}>Limpar destaque</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((row) => (
                <TableRow key={row.id} id={`row-${row.id}`} className={row.id === highlightId ? "bg-blue-50 ring-2 ring-blue-300" : ""}>
                  <TableCell className="font-medium">{row.descricao}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{row.categoria}</span>
                      {row.comissao_id && (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200">
                          Vinculada
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{row.fornecedor?.nome_fantasia || "-"}</TableCell>
                  <TableCell>{new Date(row.data_vencimento).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{row.data_pagamento ? new Date(row.data_pagamento).toLocaleDateString("pt-BR") : "-"}</TableCell>
                  <TableCell>{formatCurrency(row.valor || 0)}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {row.status !== "PAGO" && (
                        <Button size="sm" onClick={() => marcarPago(row)}>Marcar Pago</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => editar(row)}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={() => excluir(row)}>Excluir</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {itens.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhuma conta encontrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Cadastro/Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Conta" : "Nova Conta a Pagar"}</DialogTitle>
            <DialogDescription>Preencha os dados da obrigação a registrar</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
            </div>
            {!editing && (
              <div className="col-span-2 flex items-center justify-between py-2 border rounded-md px-3">
                <div>
                  <Label>Conta recorrente</Label>
                  <p className="text-xs text-muted-foreground">Gera múltiplos lançamentos mensais</p>
                </div>
                <Switch checked={form.recorrente} onCheckedChange={(v) => setForm({ ...form, recorrente: v })} />
              </div>
            )}
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v: any) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMISSAO">Comissão</SelectItem>
                  <SelectItem value="ALUGUEL">Aluguel</SelectItem>
                  <SelectItem value="ENERGIA">Energia</SelectItem>
                  <SelectItem value="AGUA">Água</SelectItem>
                  <SelectItem value="INTERNET">Internet</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="OUTROS">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor</Label>
              <Input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="Ex: 199.90" />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" value={form.data_vencimento} onChange={e => setForm({ ...form, data_vencimento: e.target.value })} />
            </div>
            {!editing && form.recorrente && (
              <>
                <div>
                  <Label>Início da recorrência</Label>
                  <Input type="date" value={form.inicio_recorrencia} onChange={e => setForm({ ...form, inicio_recorrencia: e.target.value })} />
                </div>
                <div>
                  <Label>Parcelas (meses)</Label>
                  <Input type="number" min={1} value={form.parcelas} onChange={e => setForm({ ...form, parcelas: e.target.value })} placeholder="Ex: 12" />
                </div>
                <div>
                  <Label>Periodicidade</Label>
                  <Select value={form.periodicidade} onValueChange={(v: any) => setForm({ ...form, periodicidade: v })}>
                    <SelectTrigger><SelectValue placeholder="Periodicidade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MENSAL">Mensal</SelectItem>
                      <SelectItem value="SEMANAL">Semanal</SelectItem>
                      <SelectItem value="QUINZENAL">Quinzenal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dia de vencimento (opcional)</Label>
                  <Input type="number" min={1} max={31} value={form.dia_vencimento} onChange={e => setForm({ ...form, dia_vencimento: e.target.value })} placeholder="1 a 31" disabled={form.periodicidade !== "MENSAL"} />
                </div>
              </>
            )}
            <div>
              <Label>Fornecedor (opcional)</Label>
              <Input value={form.fornecedor_id} onChange={e => setForm({ ...form, fornecedor_id: e.target.value })} placeholder="fornecedor_id" />
            </div>
            <div>
              <Label>Pedido de Compra (opcional)</Label>
              <Input value={form.pedido_compra_id} onChange={e => setForm({ ...form, pedido_compra_id: e.target.value })} placeholder="pedido_compra_id" />
            </div>
            <div>
              <Label>Vincular Comissão (opcional)</Label>
              <Input value={form.comissao_id} onChange={e => setForm({ ...form, comissao_id: e.target.value })} placeholder="comissao_id" />
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Input value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={salvar}>{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Resumo Recorrência */}
      <Dialog open={recResumoOpen} onOpenChange={setRecResumoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recorrência criada</DialogTitle>
            <DialogDescription>Resumo dos lançamentos gerados</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-auto">
            {recResumo.length === 0 && (
              <div className="text-muted-foreground text-sm">Nenhum lançamento retornado</div>
            )}
            {recResumo.map((l) => (
              <div key={l.id} className="flex items-center justify-between border rounded-md p-2">
                <div>
                  <div className="font-medium">{l.descricao}</div>
                  <div className="text-xs text-muted-foreground">Vencimento: {new Date(l.data_vencimento).toLocaleDateString("pt-BR")}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setHighlightId(l.id)}>Destacar</Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setRecResumoOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}