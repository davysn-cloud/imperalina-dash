"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Produto { id: string; nome: string; quantidade_atual: number }
interface Movimento {
  id: string;
  produto_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  origem?: string | null;
  created_at?: string;
}

export default function MovimentacoesPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [movs, setMovs] = useState<Movimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoId, setProdutoId] = useState<string>("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [quantidade, setQuantidade] = useState("1");
  const [origem, setOrigem] = useState("");

  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroProduto, setFiltroProduto] = useState<string>("");

  async function loadProdutos() {
    const { data, error } = await supabase
      .from("produtos")
      .select("id, nome, quantidade_atual")
      .order("nome");
    if (error) toast.error(error.message);
    else setProdutos(data as Produto[]);
  }

  async function loadMovs() {
    setLoading(true);
    let query = supabase.from("movimentacoes_estoque").select("*").order("created_at", { ascending: false }).limit(50);
    if (filtroTipo && filtroTipo !== "ALL") query = query.eq("tipo", filtroTipo);
    if (filtroProduto && filtroProduto !== "ALL") query = query.eq("produto_id", filtroProduto);
    const { data, error } = await query;
    if (error) {
      toast.error(error.message);
    } else {
      setMovs(data as Movimento[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProdutos();
  }, []);

  useEffect(() => {
    loadMovs();
  }, [filtroTipo, filtroProduto]);

  async function createMov() {
    if (!produtoId) { toast.error("Selecione o produto"); return; }
    const qtd = Number(quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) { toast.error("Quantidade inválida"); return; }

    const resp = await fetch("/api/estoque/movimentacoes/nova", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produto_id: produtoId, tipo, quantidade: qtd, origem: origem || null }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      toast.error(json.error || "Erro ao registrar movimentação");
      return;
    }
    toast.success("Movimentação registrada");
    setOpen(false);
    setProdutoId("");
    setTipo("entrada");
    setQuantidade("1");
    setOrigem("");
    await Promise.all([loadMovs(), loadProdutos()]);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Movimentações</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Nova movimentação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Movimentação</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Produto</Label>
                <Select value={produtoId} onValueChange={setProdutoId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {produtos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome} (Atual: {p.quantidade_atual ?? 0})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input value={quantidade} onChange={(e) => setQuantidade(e.target.value)} type="number" min={1} />
              </div>
              <div className="md:col-span-2">
                <Label>Origem</Label>
                <Input value={origem} onChange={(e) => setOrigem(e.target.value)} placeholder="Compra, ajuste, perda..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={createMov}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="w-48">
          <Label>Filtrar por tipo</Label>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-72">
          <Label>Filtrar por produto</Label>
          <Select value={filtroProduto} onValueChange={setFiltroProduto}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {produtos.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Data</th>
              <th className="text-left p-2">Produto</th>
              <th className="text-left p-2">Tipo</th>
              <th className="text-left p-2">Qtd</th>
              <th className="text-left p-2">Origem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={5}>Carregando...</td></tr>
            ) : movs.length === 0 ? (
              <tr><td className="p-3" colSpan={5}>Nenhuma movimentação</td></tr>
            ) : (
              movs.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-2">{m.created_at ? new Date(m.created_at).toLocaleString() : "-"}</td>
                  <td className="p-2">{produtos.find(p => p.id === m.produto_id)?.nome || m.produto_id}</td>
                  <td className="p-2">{m.tipo}</td>
                  <td className="p-2">{m.quantidade}</td>
                  <td className="p-2">{m.origem || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}