import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// GET /api/financeiro/contas-pagar?status=PENDENTE|PAGO|ATRASADO|CANCELADO|ALL&categoria=...&from=yyyy-MM-dd&to=yyyy-MM-dd
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const categoria = searchParams.get("categoria")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

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
      .order("data_vencimento", { ascending: false })

    if (status && status !== "ALL") query = query.eq("status", status)
    if (categoria && categoria !== "ALL") query = query.eq("categoria", categoria)
    if (from) query = query.gte("data_vencimento", from)
    if (to) query = query.lte("data_vencimento", to)

    const { data, error } = await query
    if (error) {
      console.error("Erro ao buscar contas a pagar:", error)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Erro na API contas a pagar (GET):", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// POST /api/financeiro/contas-pagar
// body: { descricao, categoria, valor, data_vencimento, fornecedor_id?, metodo_pagamento?, observacoes?, pedido_compra_id?, comissao_id? }
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()
    let { descricao, categoria, valor, data_vencimento, fornecedor_id, metodo_pagamento, observacoes, pedido_compra_id, comissao_id } = body

    // Se vier pedido_compra_id e valor não informado, calcular pelo custo*quantidade
    if (!valor && pedido_compra_id) {
      const { data: pc, error: errPc } = await supabase
        .from("pedidos_compra")
        .select("id, quantidade, produto:produtos(id, preco_custo)")
        .eq("id", pedido_compra_id)
        .single()
      if (errPc) {
        console.warn("Não foi possível calcular valor pelo pedido_compra:", errPc)
      } else {
        const preco = Array.isArray(pc?.produto) ? pc?.produto?.[0]?.preco_custo : (pc as any)?.produto?.preco_custo
        valor = (pc as any)?.quantidade && preco ? Number(preco) * Number((pc as any)?.quantidade) : valor
      }
    }

    const insertPayload: any = {
      descricao,
      categoria,
      valor,
      data_vencimento,
      fornecedor_id: fornecedor_id || null,
      metodo_pagamento: metodo_pagamento || null,
      observacoes: observacoes || null,
      pedido_compra_id: pedido_compra_id || null,
      status: 'PENDENTE',
    }

    const { data: created, error } = await supabase.from("contas_pagar").insert(insertPayload).select("*").single()
    if (error) {
      console.error("Erro ao criar conta a pagar:", error)
      return NextResponse.json({ error: "Erro ao criar conta a pagar" }, { status: 500 })
    }

    // Se vinculada a comissao, atualizar comissoes.conta_pagar_id
    if (comissao_id) {
      const { error: errCom } = await supabase
        .from("comissoes")
        .update({ conta_pagar_id: created.id })
        .eq("id", comissao_id)
      if (errCom) console.warn("Falha ao vincular comissão à conta a pagar:", errCom)
    }

    return NextResponse.json(created)
  } catch (error) {
    console.error("Erro na API contas a pagar (POST):", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// PUT /api/financeiro/contas-pagar
// body: { id, descricao?, categoria?, valor?, data_vencimento?, data_pagamento?, status?, metodo_pagamento?, observacoes?, fornecedor_id? }
export async function PUT(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()
    const { id, ...rest } = body

    if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })

    // Ajustes de coerência: se status for PAGO e data_pagamento ausente, definir hoje
    if (rest.status === 'PAGO' && !rest.data_pagamento) {
      rest.data_pagamento = new Date().toISOString()
    }

    const { error } = await supabase.from("contas_pagar").update(rest).eq("id", id)
    if (error) {
      console.error("Erro ao atualizar conta a pagar:", error)
      return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro na API contas a pagar (PUT):", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// DELETE /api/financeiro/contas-pagar?id=...
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })

    const { error } = await supabase.from("contas_pagar").delete().eq("id", id)
    if (error) {
      console.error("Erro ao excluir conta a pagar:", error)
      return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro na API contas a pagar (DELETE):", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}