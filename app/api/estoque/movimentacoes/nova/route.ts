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

    const {
      produto_id,
      tipo,
      quantidade,
      origem,
      // Campos opcionais para integração financeira
      valor_unitario,
      fornecedor_id,
      pedido_compra_id,
      data_vencimento,
    } = body || {};

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

    // Obter produto atual para ajustar quantidade e dados auxiliares
    const { data: produto, error: prodErr } = await supabase
      .from("produtos")
      .select("id, nome, quantidade_atual, preco_custo")
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

    // Integração: se for entrada de compra, criar contas a pagar
    const isCompra = typeof origem === "string" && origem.toLowerCase() === "compra";
    if (tipo === "entrada" && isCompra) {
      try {
        // Calcular valor total da obrigação
        let valorTotal: number | null = null;
        const unit = parseIntSafe(valor_unitario);
        if (unit && unit > 0) {
          valorTotal = unit * qtd;
        } else if (pedido_compra_id) {
          // Tentar calcular via pedido de compra
          const { data: pc, error: errPc } = await supabase
            .from("pedidos_compra")
            .select("id, quantidade, produto:produtos(id, preco_custo)")
            .eq("id", pedido_compra_id)
            .single();
          if (!errPc && pc) {
            const preco = Array.isArray((pc as any)?.produto) ? (pc as any)?.produto?.[0]?.preco_custo : (pc as any)?.produto?.preco_custo;
            const quantPc = (pc as any)?.quantidade;
            if (preco && quantPc) {
              valorTotal = Number(preco) * Number(quantPc);
            }
          }
        } else if (produto?.preco_custo) {
          valorTotal = Number(produto.preco_custo) * qtd;
        }

        // Data de vencimento: usar fornecida ou D+30
        const dueDate = data_vencimento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        // Fornecedor: usar fornecido (não há coluna fornecedor no produto por padrão)
        const fornecedor = fornecedor_id || null;

        // Montar descrição amigável
        const descricao = `Compra de ${produto?.nome || "produto"} (mov ${movimentoId.slice(0, 8)})`;

        const insertPayload: any = {
          descricao,
          categoria: "OUTROS",
          valor: valorTotal ?? 0,
          data_vencimento: dueDate,
          fornecedor_id: fornecedor,
          pedido_compra_id: pedido_compra_id || null,
          status: "PENDENTE",
        };

        const { error: cpErr } = await supabase.from("contas_pagar").insert(insertPayload);
        if (cpErr) {
          // Não falhar a movimentação por erro financeiro; apenas registrar
          console.warn("Falha ao criar conta a pagar a partir da entrada de compra:", cpErr);
        }

        // Atualizar status do pedido de compra, se houver
        if (pedido_compra_id) {
          const { error: updPcErr } = await supabase
            .from("pedidos_compra")
            .update({ status: "recebido" })
            .eq("id", pedido_compra_id);
          if (updPcErr) {
            console.warn("Falha ao atualizar status do pedido de compra:", updPcErr);
          }
        }
      } catch (finErr) {
        console.warn("Erro na integração financeira da movimentação:", finErr);
      }
    }

    return NextResponse.json({ id: movimentoId, quantidade_atual: novaQuantidade }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erro desconhecido" }, { status: 500 });
  }
}