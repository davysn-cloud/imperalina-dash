import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()
    const { id } = body || {}
    if (!id) {
      return NextResponse.json({ error: "Produto id é obrigatório" }, { status: 400 })
    }

    const { data: produto, error: prodErr } = await supabase
      .from("produtos")
      .select("id, quantidade_atual")
      .eq("id", id)
      .single()

    if (prodErr || !produto) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })
    }

    const atual = produto.quantidade_atual ?? 0
    if (atual <= 0) {
      return NextResponse.json({ ok: true, message: "Produto já está com estoque zerado" })
    }

    const { error: movErr } = await supabase
      .from("movimentacoes_estoque")
      .insert({
        produto_id: id,
        tipo: "saida",
        quantidade: atual,
        origem: "Esgotar",
        data_hora: new Date().toISOString(),
      })
    if (movErr) {
      return NextResponse.json({ error: "Falha ao registrar movimentação" }, { status: 500 })
    }

    const { error: updErr } = await supabase
      .from("produtos")
      .update({ quantidade_atual: 0 })
      .eq("id", id)

    if (updErr) {
      return NextResponse.json({ error: "Falha ao atualizar produto" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error("[estoque] erro ao esgotar produto:", e)
    return NextResponse.json({ error: "Falha ao esgotar produto" }, { status: 500 })
  }
}