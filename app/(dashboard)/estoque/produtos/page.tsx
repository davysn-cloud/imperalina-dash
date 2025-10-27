"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"

export default function ProdutosPage() {
  const { toast } = useToast()
  const supabase = React.useMemo(() => getSupabaseBrowserClient(), [])

  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const [nome, setNome] = React.useState("")
  const [categoria, setCategoria] = React.useState("")
  const [quantidadeMinima, setQuantidadeMinima] = React.useState<number>(1)
  const [quantidadeAtual, setQuantidadeAtual] = React.useState<number>(0)
  const [precoCusto, setPrecoCusto] = React.useState<number>(0)
  const [precoVenda, setPrecoVenda] = React.useState<number>(0)
  const [validade, setValidade] = React.useState<string>("")

  // Lista de fornecedores e fornecedor principal
  const [fornecedores, setFornecedores] = React.useState<any[]>([])
  const [fornecedorPrincipalId, setFornecedorPrincipalId] = React.useState<string>("none")

  // Lista de produtos na página (para refletir imediatamente novas criações)
  const [produtos, setProdutos] = React.useState<any[]>([])
  const [loadingList, setLoadingList] = React.useState<boolean>(true)

  const categoriasPadrao = [
    "Higiene",
    "Beleza",
    "Limpeza",
    "Acessórios",
    "Descartáveis",
    "Outros",
  ]

  const loadProdutos = React.useCallback(async () => {
    setLoadingList(true)
    try {
      const { data, error } = await supabase
        .from("produtos")
        .select("id,nome,categoria,quantidade_atual,quantidade_minima,preco_custo,preco_venda,validade")
        .order("updated_at", { ascending: false })
      if (error) throw error
      setProdutos(data || [])
    } catch (e) {
      // opcionalmente mostrar toast, mas evitar ruído
    } finally {
      setLoadingList(false)
    }
  }, [supabase])

  const loadFornecedores = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id,nome_fantasia")
        .order("nome_fantasia", { ascending: true })
      if (error) throw error
      setFornecedores(data || [])
    } catch (e) {
      // silenciar erros por enquanto
    }
  }, [supabase])

  React.useEffect(() => {
    loadProdutos()
    loadFornecedores()
  }, [loadProdutos, loadFornecedores])

  const resetForm = () => {
    setNome("")
    setCategoria("")
    setQuantidadeMinima(1)
    setQuantidadeAtual(0)
    setPrecoCusto(0)
    setPrecoVenda(0)
    setValidade("")
    setFornecedorPrincipalId("none")
  }

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe o nome do produto.", variant: "destructive" })
      return
    }
    if (precoVenda < precoCusto) {
      toast({ title: "Preço de venda menor que o custo", description: "Ajuste os preços para evitar margem negativa.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        nome: nome.trim(),
        quantidade_minima: Number.isFinite(quantidadeMinima) ? quantidadeMinima : 0,
        quantidade_atual: Number.isFinite(quantidadeAtual) ? quantidadeAtual : 0,
        preco_custo: Number.isFinite(precoCusto) ? precoCusto : 0,
        preco_venda: Number.isFinite(precoVenda) ? precoVenda : 0,
      }
      if (categoria.trim()) payload.categoria = categoria.trim()
      if (validade) payload.validade = validade
      if (fornecedorPrincipalId && fornecedorPrincipalId !== "none") {
        payload.fornecedor_principal_id = fornecedorPrincipalId
      }

      const res = await fetch("/api/estoque/produtos/novo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Falha ao criar produto")

      // Atualização otimista
      setProdutos((prev) => [
        {
          id: json.id,
          nome: payload.nome,
          categoria: payload.categoria || null,
          quantidade_atual: payload.quantidade_atual,
          quantidade_minima: payload.quantidade_minima,
          preco_custo: payload.preco_custo,
          preco_venda: payload.preco_venda,
          validade: payload.validade || null,
        },
        ...prev,
      ])

      toast({ title: "Produto criado", description: `"${payload.nome}" adicionado com sucesso.` })
      setOpen(false)
      resetForm()
      await loadProdutos()
    } catch (e: any) {
      toast({ title: "Erro ao criar produto", description: e.message || String(e), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">Estrutura básica conforme controle de estoque.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Novo Produto</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Conceitos e estrutura de dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1">
            <li>Identificação: ID, SKU/código de barras, nome, descrição, categoria, foto</li>
            <li>Classificação: Tipo (revenda, uso interno, ambos) e unidade de medida</li>
            <li>Controle de Estoque: quantidade atual, mínima, máxima, localização</li>
            <li>Valores: preço de custo, preço de venda, margem de lucro</li>
            <li>Fornecedor: principal e múltiplos fornecedores</li>
            <li>Rastreabilidade: lote, fabricação, validade, flags de controle</li>
            <li>Metadados: status, criação, atualização, observações</li>
          </ul>
        </CardContent>
      </Card>

      {/* Lista simples de produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : produtos.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum produto cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-2 pr-4">Nome</th>
                    <th className="py-2 pr-4">Categoria</th>
                    <th className="py-2 pr-4">Qtd Atual</th>
                    <th className="py-2 pr-4">Qtd Mínima</th>
                    <th className="py-2 pr-4">Validade</th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="py-2 pr-4">{p.nome}</td>
                      <td className="py-2 pr-4">{p.categoria || "—"}</td>
                      <td className="py-2 pr-4">{p.quantidade_atual ?? 0}</td>
                      <td className="py-2 pr-4">{p.quantidade_minima ?? 0}</td>
                      <td className="py-2 pr-4">{p.validade || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Produto</DialogTitle>
            <DialogDescription>Preencha os dados básicos do produto.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Shampoo" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v)}>
                <SelectTrigger id="categoria" className="w-full">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasPadrao.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="fornecedor">Fornecedor principal</Label>
              <Select value={fornecedorPrincipalId} onValueChange={(v) => setFornecedorPrincipalId(v)}>
                <SelectTrigger id="fornecedor" className="w-full">
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome_fantasia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="qmin">Qtd. mínima</Label>
              <Input id="qmin" type="number" min={0} value={quantidadeMinima} onChange={(e) => setQuantidadeMinima(parseInt(e.target.value || "0", 10))} />
            </div>
            <div>
              <Label htmlFor="qatual">Qtd. atual</Label>
              <Input id="qatual" type="number" min={0} value={quantidadeAtual} onChange={(e) => setQuantidadeAtual(parseInt(e.target.value || "0", 10))} />
            </div>
            <div>
              <Label htmlFor="pcusto">Preço custo (R$)</Label>
              <Input id="pcusto" type="number" step="0.01" min={0} value={precoCusto} onChange={(e) => setPrecoCusto(parseFloat(e.target.value || "0"))} />
            </div>
            <div>
              <Label htmlFor="pvenda">Preço venda (R$)</Label>
              <Input id="pvenda" type="number" step="0.01" min={0} value={precoVenda} onChange={(e) => setPrecoVenda(parseFloat(e.target.value || "0"))} />
            </div>
            <div>
              <Label htmlFor="validade">Validade</Label>
              <Input id="validade" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}