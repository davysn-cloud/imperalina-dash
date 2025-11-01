import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// POST /api/financeiro/contas-pagar/recorrencia
// body: { descricao, categoria, valor, inicio: "yyyy-MM-dd", parcelas: number, dia_vencimento?: number, fornecedor_id?: string, observacoes?: string, periodicidade?: "MENSAL"|"SEMANAL"|"QUINZENAL", comissao_id?: string }
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()
    const { descricao, categoria, valor, inicio, parcelas, dia_vencimento, fornecedor_id, observacoes, periodicidade = "MENSAL", comissao_id } = body || {}

    if (!descricao || !categoria || !valor || !inicio || !parcelas) {
      return NextResponse.json({ error: "Campos obrigatórios: descricao, categoria, valor, inicio, parcelas" }, { status: 400 })
    }

    const baseDate = new Date(inicio)
    if (isNaN(baseDate.getTime())) {
      return NextResponse.json({ error: "Data de início inválida" }, { status: 400 })
    }

    const rows: any[] = []
    for (let i = 0; i < Number(parcelas); i++) {
      const d = new Date(baseDate)
      if (periodicidade === "SEMANAL") {
        d.setDate(d.getDate() + i * 7)
      } else if (periodicidade === "QUINZENAL") {
        d.setDate(d.getDate() + i * 14)
      } else {
        d.setMonth(d.getMonth() + i)
        if (dia_vencimento && Number.isInteger(dia_vencimento) && dia_vencimento >= 1 && dia_vencimento <= 31) {
          d.setDate(dia_vencimento)
        }
      }
      const yyyyMmDd = d.toISOString().slice(0, 10)
      rows.push({
        descricao: `${descricao} (${i + 1}/${parcelas})`,
        categoria,
        valor,
        data_vencimento: yyyyMmDd,
        fornecedor_id: fornecedor_id || null,
        observacoes: observacoes || null,
        status: "PENDENTE",
      })
    }

    const { data, error } = await supabase.from("contas_pagar").insert(rows).select("id, descricao, data_vencimento")
    if (error) {
      console.error("Erro ao criar recorrência de contas a pagar:", error)
      return NextResponse.json({ error: "Erro ao criar recorrência" }, { status: 500 })
    }
    // Vincular comissão à primeira parcela, se solicitado
    if (comissao_id && Array.isArray(data) && data.length > 0) {
      const firstId = (data as any)[0]?.id
      if (firstId) {
        const { error: errCom } = await supabase
          .from("comissoes")
          .update({ conta_pagar_id: firstId })
          .eq("id", comissao_id)
        if (errCom) console.warn("Falha ao vincular comissão à primeira parcela:", errCom)
      }
    }
    return NextResponse.json({ created: data?.length || 0, lancamentos: data, periodicidade })
  } catch (e) {
    console.error("Erro na API recorrência contas a pagar:", e)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}