import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function parseIntSafe(value: any): number | null {
  const n = Number(value);
  if (Number.isFinite(n)) return n;
  return null;
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await req.json();

    const { produto_id, tipo, quantidade, origem } = body || {};

    if (!produto_id) {
      return NextResponse.json({ error: "produto_id é obrigatório" }, { status: 400 });
    }
    if (!["entrada", "saida"].includes(tipo)) {
      return NextResponse.json({ error: "tipo deve ser 'entrada' ou 'saida'" }, { status: 400 });
    }
    const qtd = parseIntSafe(quantidade);
    if (!qtd || qtd <= 0) {
      return NextResponse.json({ error: "quantidade inválida" }, { status: 400 });
    }

    // Obter produto atual para ajustar quantidade
    const { data: produto, error: prodErr } = await supabase
      .from("produtos")
      .select("id, quantidade_atual")
      .eq("id", produto_id)
      .maybeSingle();

    if (prodErr) {
      return NextResponse.json({ error: prodErr.message }, { status: 400 });
    }
    if (!produto) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    const delta = tipo === "entrada" ? qtd : -qtd;
    const novaQuantidade = (produto.quantidade_atual ?? 0) + delta;
    if (novaQuantidade < 0) {
      return NextResponse.json({ error: "Operação resulta em estoque negativo" }, { status: 400 });
    }

    const movimentoId = crypto.randomUUID();

    // Inserir movimentação
    const { error: movErr } = await supabase.from("movimentacoes_estoque").insert({
      id: movimentoId,
      produto_id,
      tipo,
      quantidade: qtd,
      origem: origem ?? null,
    });
    if (movErr) {
      return NextResponse.json({ error: movErr.message }, { status: 400 });
    }

    // Atualizar quantidade do produto
    const { error: updErr } = await supabase
      .from("produtos")
      .update({ quantidade_atual: novaQuantidade })
      .eq("id", produto_id);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    return NextResponse.json({ id: movimentoId, quantidade_atual: novaQuantidade }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erro desconhecido" }, { status: 500 });
  }
}