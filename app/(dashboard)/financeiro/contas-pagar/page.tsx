"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
}

export default function ContasPagarPage() {
  const { toast } = useToast()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [itens, setItens] = useState<ContaPagar[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFiltro, setStatusFiltro] = useState<Status | "ALL">("ALL")
  const [catFiltro, setCatFiltro] = useState<Categoria | "ALL">("ALL")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ContaPagar | null>(null)

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
      const params = new URLSearchParams()
      if (statusFiltro !== "ALL") params.append("status", statusFiltro)
      if (catFiltro !== "ALL") params.append("categoria", catFiltro)
      const res = await fetch(`/api/financeiro/contas-pagar?${params}`)
      if (!res.ok) throw new Error("Falha ao carregar contas a pagar")
      const data = await res.json()
      setItens(data)
    } catch (e: any) {
      toast({ title: "Erro ao carregar", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [statusFiltro, catFiltro])

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

  const abrirNovo = () => {
    setEditing(null)
    setForm({ descricao: "", categoria: "OUTROS", valor: "", data_vencimento: "", fornecedor_id: "", metodo_pagamento: "", observacoes: "", pedido_compra_id: "", comissao_id: "" })
    setModalOpen(true)
  }

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
        const res = await fetch("/api/financeiro/contas-pagar", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, ...payload }) })
        if (!res.ok) throw new Error("Falha ao atualizar")
        toast({ title: "Conta atualizada" })
      } else {
        const res = await fetch("/api/financeiro/contas-pagar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error("Falha ao criar")
        toast({ title: "Conta criada" })
      }
      setModalOpen(false)
      carregar()
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" })
    }
  }

  const marcarPago = async (row: ContaPagar) => {
    try {
      const res = await fetch("/api/financeiro/contas-pagar", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, status: "PAGO", data_pagamento: new Date().toISOString() }) })
      if (!res.ok) throw new Error("Falha ao marcar como pago")
      toast({ title: "Pagamento registrado" })
      carregar()
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" })
    }
  }

  const excluir = async (row: ContaPagar) => {
    try {
      const res = await fetch(`/api/financeiro/contas-pagar?id=${row.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir")
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
      </div>

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
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.descricao}</TableCell>
                  <TableCell>{row.categoria}</TableCell>
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
    </div>
  )
}