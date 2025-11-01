import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { z } from "zod"

const orcamentoItemSchema = z.object({
  service_id: z.string().uuid().optional(),
  descricao: z.string().min(1),
  quantidade: z.number().int().min(1),
  valor_unitario: z.number().min(0),
  valor_total: z.number().min(0),
  ordem: z.number().int().min(1).optional(),
})

const orcamentoSchema = z.object({
  client_id: z.string().uuid().optional(),
  client_name: z.string().min(1),
  client_email: z.string().email(),
  client_phone: z.string().nullable().optional().transform(val => val || undefined),
  client_address: z.string().nullable().optional().transform(val => val || undefined),
  dados_empresa: z.string().min(1),
  desconto: z.number().min(0).optional(),
  data_validade: z.string(), // ISO date string
  observacoes: z.string().nullable().optional().transform(val => val || undefined),
  termos_condicoes: z.string().nullable().optional().transform(val => val || undefined),
  itens: z.array(orcamentoItemSchema).min(1),
})

const orcamentoUpdateSchema = orcamentoSchema.extend({
  status: z.enum(['RASCUNHO', 'ENVIADO', 'APROVADO', 'REJEITADO', 'EXPIRADO']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('orcamentos')
      .select(`
        *,
        orcamento_itens (
          id,
          service_id,
          descricao,
          quantidade,
          valor_unitario,
          valor_total,
          ordem,
          services (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      data: data || [],
      count,
      limit,
      offset
    })
  } catch (error: any) {
    console.error("[API] Error fetching orcamentos:", error)
    return NextResponse.json({ error: "Failed to fetch orcamentos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const validatedData = orcamentoSchema.parse(body)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Calculate subtotal from items
    const subtotal = validatedData.itens.reduce((sum, item) => sum + item.valor_total, 0)
    const desconto = validatedData.desconto || 0
    const total = subtotal - desconto

    // Create orcamento
    const { data: orcamento, error: orcamentoError } = await supabase
      .from('orcamentos')
      .insert({
        client_id: validatedData.client_id,
        client_name: validatedData.client_name,
        client_email: validatedData.client_email,
        client_phone: validatedData.client_phone,
        client_address: validatedData.client_address,
        dados_empresa: validatedData.dados_empresa,
        subtotal,
        desconto,
        total,
        data_validade: validatedData.data_validade,
        observacoes: validatedData.observacoes,
        termos_condicoes: validatedData.termos_condicoes,
        created_by: user.id,
      })
      .select()
      .single()

    if (orcamentoError) {
      throw orcamentoError
    }

    // Create orcamento items
    const itemsToInsert = validatedData.itens.map((item, index) => ({
      orcamento_id: orcamento.id,
      service_id: item.service_id,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      valor_total: item.valor_total,
      ordem: item.ordem || index + 1,
    }))

    const { error: itemsError } = await supabase
      .from('orcamento_itens')
      .insert(itemsToInsert)

    if (itemsError) {
      // Rollback: delete the orcamento if items creation failed
      await supabase.from('orcamentos').delete().eq('id', orcamento.id)
      throw itemsError
    }

    // Fetch complete orcamento with items
    const { data: completeOrcamento, error: fetchError } = await supabase
      .from('orcamentos')
      .select(`
        *,
        orcamento_itens (
          id,
          service_id,
          descricao,
          quantidade,
          valor_unitario,
          valor_total,
          ordem,
          services (
            id,
            name
          )
        )
      `)
      .eq('id', orcamento.id)
      .single()

    if (fetchError) {
      throw fetchError
    }

    return NextResponse.json(completeOrcamento, { status: 201 })
  } catch (error: any) {
    console.error("[API] Error creating orcamento:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Validation error", 
        details: error.errors 
      }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to create orcamento" }, { status: 500 })
  }
}