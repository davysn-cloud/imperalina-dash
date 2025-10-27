import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

function normalizeDate(input: string | null): string | null {
  if (!input) return null
  // Accept ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  // Accept MM/DD/YYYY and convert
  const m = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[1]}-${m[2]}`
  return null
}

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await req.json()

    const nome: string = (body?.nome || "").trim()
    const categoria: string | null = body?.categoria ? String(body.categoria).trim() : null
    const quantidade_minima: number = Number.isFinite(body?.quantidade_minima) ? Number(body.quantidade_minima) : 0
    const quantidade_atual: number = Number.isFinite(body?.quantidade_atual) ? Number(body.quantidade_atual) : 0
    const preco_custo: number = Number.isFinite(body?.preco_custo) ? Number(body.preco_custo) : 0
    const preco_venda: number = Number.isFinite(body?.preco_venda) ? Number(body.preco_venda) : 0
    const validadeRaw: string | null = body?.validade ? String(body.validade) : null
    const validade = normalizeDate(validadeRaw)
    const fornecedor_principal_id: string | null = body?.fornecedor_principal_id ? String(body.fornecedor_principal_id) : null

    if (!nome) {
      return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 })
    }
    if (preco_venda < preco_custo) {
      return NextResponse.json({ error: "Preço de venda menor que o custo" }, { status: 400 })
    }

    const newId = crypto.randomUUID()
    const payload: any = {
      id: newId,
      nome,
      quantidade_minima,
      quantidade_atual,
      preco_custo,
      preco_venda,
    }
    if (categoria) payload.categoria = categoria
    if (validade) payload.validade = validade
    if (fornecedor_principal_id) payload.fornecedor_principal_id = fornecedor_principal_id

    const { error: insertErr } = await supabase
      .from("produtos")
      .insert(payload, { returning: "minimal" })
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 })
    }

    if (quantidade_atual > 0) {
      const { error: movErr } = await supabase.from("movimentacoes_estoque").insert({
        produto_id: newId,
        tipo: "entrada",
        quantidade: quantidade_atual,
        origem: "Cadastro",
        data_hora: new Date().toISOString(),
        validade: validade || null,
      }, { returning: "minimal" })
      if (movErr) {
        return NextResponse.json({ error: movErr.message }, { status: 400 })
      }

      if (validade) {
        const { error: loteErr } = await supabase.from("lotes_produto").insert({
          produto_id: newId,
          lote: `L${Date.now()}`,
          validade,
          quantidade: quantidade_atual,
        }, { returning: "minimal" })
        if (loteErr) {
          return NextResponse.json({ error: loteErr.message }, { status: 400 })
        }
      }
    }

    return NextResponse.json({ id: newId, nome })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}