"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Categoria {
  id: string;
  nome: string;
  cor?: string | null;
  icone?: string | null;
  descricao?: string | null;
  parent_id?: string | null;
}

export default function CategoriasPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("");
  const [icone, setIcone] = useState("");
  const [descricao, setDescricao] = useState("");
  const [parentId, setParentId] = useState<string | undefined>(undefined);

  // Edição de categoria
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCor, setEditCor] = useState("");
  const [editIcone, setEditIcone] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editParentId, setEditParentId] = useState<string | undefined>(undefined);

  function openEditCategoria(c: Categoria) {
    setEditId(c.id);
    setEditNome(c.nome || "");
    setEditCor(c.cor || "");
    setEditIcone(c.icone || "");
    setEditDescricao(c.descricao || "");
    setEditParentId(c.parent_id || undefined);
    setEditOpen(true);
  }

  async function updateCategoria() {
    if (!editId) return;
    if (!editNome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    const payload = {
      nome: editNome.trim(),
      cor: editCor?.trim() || null,
      icone: editIcone?.trim() || null,
      descricao: editDescricao?.trim() || null,
      parent_id: editParentId || null,
    };
    const { error } = await supabase.from("categorias").update(payload).eq("id", editId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Categoria atualizada");
    setEditOpen(false);
    setEditId(null);
    await loadCategorias();
  }

  async function loadCategorias() {
    setLoading(true);
    const { data, error } = await supabase.from("categorias").select("*").order("nome", { ascending: true });
    if (error) {
      toast.error(error.message);
    } else {
      setCategorias(data as Categoria[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCategorias();
  }, []);

  async function createCategoria() {
    if (!nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    const payload = {
      nome: nome.trim(),
      cor: cor?.trim() || null,
      icone: icone?.trim() || null,
      descricao: descricao?.trim() || null,
      parent_id: parentId || null,
    };
    const { error } = await supabase.from("categorias").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Categoria criada");
    setOpen(false);
    setNome("");
    setCor("");
    setIcone("");
    setDescricao("");
    setParentId(undefined);
    await loadCategorias();
  }

  async function deleteCategoria(id: string) {
    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Categoria removida");
      await loadCategorias();
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categorias</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Nova categoria</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Categoria</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Higiene" />
              </div>
              <div>
                <Label>Cor (hex)</Label>
                <Input value={cor} onChange={(e) => setCor(e.target.value)} placeholder="#4f46e5" />
              </div>
              <div>
                <Label>Ícone</Label>
                <Input value={icone} onChange={(e) => setIcone(e.target.value)} placeholder="tag" />
              </div>
              <div>
                <Label>Categoria pai</Label>
                <Select value={parentId ?? "none"} onValueChange={(v) => setParentId(v === "none" ? undefined : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Notas sobre a categoria" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={createCategoria}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialogo de edição */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Categoria</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} placeholder="Higiene" />
              </div>
              <div>
                <Label>Cor (hex)</Label>
                <Input value={editCor} onChange={(e) => setEditCor(e.target.value)} placeholder="#4f46e5" />
              </div>
              <div>
                <Label>Ícone</Label>
                <Input value={editIcone} onChange={(e) => setEditIcone(e.target.value)} placeholder="tag" />
              </div>
              <div>
                <Label>Categoria pai</Label>
                <Select value={editParentId ?? "none"} onValueChange={(v) => setEditParentId(v === "none" ? undefined : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <Input value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} placeholder="Notas sobre a categoria" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={updateCategoria}>Salvar alterações</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Nome</th>
              <th className="text-left p-2">Cor</th>
              <th className="text-left p-2">Ícone</th>
              <th className="text-left p-2">Pai</th>
              <th className="text-left p-2 w-20">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={5}>Carregando...</td></tr>
            ) : categorias.length === 0 ? (
              <tr><td className="p-3" colSpan={5}>Nenhuma categoria cadastrada</td></tr>
            ) : (
              categorias.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-2">{c.nome}</td>
                  <td className="p-2">{c.cor || "-"}</td>
                  <td className="p-2">{c.icone || "-"}</td>
                  <td className="p-2">{categorias.find((x) => x.id === c.parent_id)?.nome || "-"}</td>
                  <td className="p-2 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditCategoria(c)}>Editar</Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteCategoria(c.id)}>Excluir</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}