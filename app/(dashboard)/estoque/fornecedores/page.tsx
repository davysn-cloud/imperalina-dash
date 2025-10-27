"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Fornecedor {
  id: string;
  nome_fantasia: string;
  razao_social?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  responsavel?: string | null;
  endereco?: string | null;
  prazo_entrega?: string | null;
  pagamento_preferido?: string | null;
  observacoes?: string | null;
  ativo: boolean;
}

export default function FornecedoresPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [responsavel, setResponsavel] = useState("");

  // Edição de fornecedor
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNomeFantasia, setEditNomeFantasia] = useState("");
  const [editCnpj, setEditCnpj] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editResponsavel, setEditResponsavel] = useState("");

  function openEditFornecedor(f: Fornecedor) {
    setEditId(f.id);
    setEditNomeFantasia(f.nome_fantasia || "");
    setEditCnpj(f.cnpj || "");
    setEditWhatsapp(f.whatsapp || "");
    setEditEmail(f.email || "");
    setEditResponsavel(f.responsavel || "");
    setEditOpen(true);
  }

  async function updateFornecedor() {
    if (!editId) return;
    if (!editNomeFantasia.trim()) {
      toast.error("Nome fantasia é obrigatório");
      return;
    }
    const payload = {
      nome_fantasia: editNomeFantasia.trim(),
      cnpj: editCnpj?.trim() || null,
      whatsapp: editWhatsapp?.trim() || null,
      email: editEmail?.trim() || null,
      responsavel: editResponsavel?.trim() || null,
    };
    const { error } = await supabase.from("fornecedores").update(payload).eq("id", editId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Fornecedor atualizado");
    setEditOpen(false);
    setEditId(null);
    await loadFornecedores();
  }

  async function loadFornecedores() {
    setLoading(true);
    const { data, error } = await supabase
      .from("fornecedores")
      .select("*")
      .order("nome_fantasia", { ascending: true });
    if (error) {
      toast.error(error.message);
    } else {
      setFornecedores(data as Fornecedor[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadFornecedores();
  }, []);

  async function createFornecedor() {
    if (!nomeFantasia.trim()) {
      toast.error("Nome fantasia é obrigatório");
      return;
    }
    const payload = {
      nome_fantasia: nomeFantasia.trim(),
      cnpj: cnpj?.trim() || null,
      whatsapp: whatsapp?.trim() || null,
      email: email?.trim() || null,
      responsavel: responsavel?.trim() || null,
    };
    const { error } = await supabase.from("fornecedores").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Fornecedor criado");
    setOpen(false);
    setNomeFantasia("");
    setCnpj("");
    setWhatsapp("");
    setEmail("");
    setResponsavel("");
    await loadFornecedores();
  }

  async function deleteFornecedor(id: string) {
    const { error } = await supabase.from("fornecedores").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Fornecedor removido");
      await loadFornecedores();
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fornecedores</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Novo fornecedor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Fornecedor</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome fantasia</Label>
                <Input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} placeholder="Distribuidora XPTO" />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@fornecedor.com" />
              </div>
              <div className="md:col-span-2">
                <Label>Responsável</Label>
                <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Nome do contato" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={createFornecedor}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialogo de edição */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Fornecedor</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome fantasia</Label>
                <Input value={editNomeFantasia} onChange={(e) => setEditNomeFantasia(e.target.value)} placeholder="Distribuidora XPTO" />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input value={editCnpj} onChange={(e) => setEditCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="contato@fornecedor.com" />
              </div>
              <div className="md:col-span-2">
                <Label>Responsável</Label>
                <Input value={editResponsavel} onChange={(e) => setEditResponsavel(e.target.value)} placeholder="Nome do contato" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={updateFornecedor}>Salvar alterações</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Nome fantasia</th>
              <th className="text-left p-2">CNPJ</th>
              <th className="text-left p-2">WhatsApp</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2 w-20">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={5}>Carregando...</td></tr>
            ) : fornecedores.length === 0 ? (
              <tr><td className="p-3" colSpan={5}>Nenhum fornecedor cadastrado</td></tr>
            ) : (
              fornecedores.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="p-2">{f.nome_fantasia}</td>
                  <td className="p-2">{f.cnpj || "-"}</td>
                  <td className="p-2">{f.whatsapp || "-"}</td>
                  <td className="p-2">{f.email || "-"}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditFornecedor(f)}>Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteFornecedor(f.id)}>Excluir</Button>
                    </div>
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