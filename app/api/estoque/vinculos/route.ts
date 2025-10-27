import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase
      .from("servico_produto_vinculos")
      .select("id, service_id, produto_id, quantidade, obrigatorio, baixa_automatica, observacoes, created_at, updated_at")
      .order("created_at", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await req.json()

    const service_id: string = String(body?.service_id || "").trim()
    const produto_id: string = String(body?.produto_id || "").trim()
    const quantidadeNum = Number(body?.quantidade)
    const quantidade: number = Number.isFinite(quantidadeNum) && quantidadeNum > 0 ? quantidadeNum : 1
    const obrigatorio: boolean = Boolean(body?.obrigatorio)
    const baixa_automatica: boolean = Boolean(body?.baixa_automatica)
    const observacoes: string | null = body?.observacoes ? String(body.observacoes).trim() : null

    if (!service_id || !produto_id) {
      return NextResponse.json({ error: "service_id e produto_id são obrigatórios" }, { status: 400 })
    }

    const payload: any = {
      id: crypto.randomUUID(),
      service_id,
      produto_id,
      quantidade,
      obrigatorio,
      baixa_automatica,
    }
    if (observacoes) payload.observacoes = observacoes

    const { error: insertErr } = await supabase
      .from("servico_produto_vinculos")
      .insert(payload, { returning: "minimal" })
    if (insertErr) {
      const msg = insertErr.message || "Erro ao inserir vínculo"
      // Unique constraint violation
      if (/unique/i.test(msg)) {
        return NextResponse.json({ error: "Vínculo já existe para este serviço e produto" }, { status: 409 })
      }
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    return NextResponse.json({ id: payload.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await req.json()

    const id: string = String(body?.id || "").trim()
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 })

    const patch: any = {}
    if (body?.service_id) patch.service_id = String(body.service_id)
    if (body?.produto_id) patch.produto_id = String(body.produto_id)
    if (body?.observacoes !== undefined) patch.observacoes = body.observacoes ? String(body.observacoes) : null
    if (body?.quantidade !== undefined) {
      const qn = Number(body.quantidade)
      patch.quantidade = Number.isFinite(qn) && qn > 0 ? qn : 1
    }
    if (body?.obrigatorio !== undefined) patch.obrigatorio = Boolean(body.obrigatorio)
    if (body?.baixa_automatica !== undefined) patch.baixa_automatica = Boolean(body.baixa_automatica)

    const { error: updErr } = await supabase
      .from("servico_produto_vinculos")
      .update(patch, { returning: "minimal" })
      .eq("id", id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { searchParams } = new URL(req.url)
    const id = String(searchParams.get("id") || "").trim()
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 })

    const { error: delErr } = await supabase
      .from("servico_produto_vinculos")
      .delete({ returning: "minimal" })
      .eq("id", id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}