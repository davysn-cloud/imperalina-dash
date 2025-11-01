import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await req.json();

    const { pedido_compra_id, data_vencimento, valor_unitario, fornecedor_id } = body || {};
    if (!pedido_compra_id) {
      return NextResponse.json({ error: "pedido_compra_id é obrigatório" }, { status: 400 });
    }

    // Buscar pedido de compra com produto
    const { data: pedido, error: pedErr } = await supabase
      .from("pedidos_compra")
      .select("id, produto_id, quantidade, status, produto:produtos(id, nome, preco_custo, quantidade_atual)")
      .eq("id", pedido_compra_id)
      .single();
    if (pedErr) {
      return NextResponse.json({ error: pedErr.message }, { status: 400 });
    }
    if (!pedido) {
      return NextResponse.json({ error: "Pedido de compra não encontrado" }, { status: 404 });
    }

    // Se já recebido, evitar duplicidade
    if ((pedido as any).status === "recebido") {
      return NextResponse.json({ error: "Pedido já marcado como recebido" }, { status: 409 });
    }

    const produtoInfo = Array.isArray((pedido as any).produto) ? (pedido as any).produto[0] : (pedido as any).produto;
    const produtoId = (pedido as any).produto_id;
    const quantidade = Number((pedido as any).quantidade || 0);
    if (!produtoId || !quantidade || quantidade <= 0) {
      return NextResponse.json({ error: "Pedido inválido para recebimento" }, { status: 400 });
    }

    // Atualizar estoque
    const novaQuantidade = Number((produtoInfo?.quantidade_atual ?? 0)) + quantidade;
    const { error: updErr } = await supabase
      .from("produtos")
      .update({ quantidade_atual: novaQuantidade })
      .eq("id", produtoId);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    // Registrar movimentação de entrada
    const movimentoId = crypto.randomUUID();
    const { error: movErr } = await supabase.from("movimentacoes_estoque").insert({
      id: movimentoId,
      produto_id: produtoId,
      tipo: "entrada",
      quantidade,
      origem: "compra",
    });
    if (movErr) {
      return NextResponse.json({ error: movErr.message }, { status: 400 });
    }

    // Marcar pedido como recebido
    const { error: pedUpdErr } = await supabase
      .from("pedidos_compra")
      .update({ status: "recebido" })
      .eq("id", pedido_compra_id);
    if (pedUpdErr) {
      // Não falhar, apenas logar
      console.warn("Falha ao atualizar status do pedido de compra:", pedUpdErr);
    }

    // Criar conta a pagar vinculada
    try {
      const unit = Number(valor_unitario || produtoInfo?.preco_custo || 0);
      const total = unit * quantidade;
      const dueDate = data_vencimento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const descricao = `Recebimento pedido ${pedido_compra_id.slice(0, 8)} - ${produtoInfo?.nome ?? "produto"}`;

      const payload: any = {
        descricao,
        categoria: "OUTROS",
        valor: total,
        data_vencimento: dueDate,
        fornecedor_id: fornecedor_id || null,
        pedido_compra_id,
        status: "PENDENTE",
      };
      const { error: cpErr } = await supabase.from("contas_pagar").insert(payload);
      if (cpErr) {
        console.warn("Falha ao criar contas a pagar do recebimento:", cpErr);
      }
    } catch (finErr) {
      console.warn("Erro na integração financeira ao receber pedido:", finErr);
    }

    return NextResponse.json({ id: movimentoId, quantidade_atual: novaQuantidade }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erro desconhecido" }, { status: 500 });
  }
}