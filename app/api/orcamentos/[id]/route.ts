import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { z } from "zod"

const orcamentoItemSchema = z.object({
  id: z.string().uuid().optional(),
  service_id: z.string().uuid().optional(),
  descricao: z.string().min(1),
  quantidade: z.number().int().min(1),
  valor_unitario: z.number().min(0),
  valor_total: z.number().min(0),
  ordem: z.number().int().min(1).optional(),
})

const orcamentoUpdateSchema = z.object({
  client_id: z.string().uuid().optional(),
  client_name: z.string().min(1).optional(),
  client_email: z.string().email().optional(),
  client_phone: z.string().nullable().optional().transform(val => val || undefined),
  client_address: z.string().nullable().optional().transform(val => val || undefined),
  dados_empresa: z.string().min(1).optional(),
  desconto: z.number().min(0).optional(),
  data_validade: z.string().optional(), // ISO date string
  observacoes: z.string().nullable().optional().transform(val => val || undefined),
  termos_condicoes: z.string().nullable().optional().transform(val => val || undefined),
  status: z.enum(['RASCUNHO', 'ENVIADO', 'APROVADO', 'REJEITADO', 'EXPIRADO']).optional(),
  itens: z.array(orcamentoItemSchema).optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
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
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Orcamento not found" }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[API] Error fetching orcamento:", error)
    return NextResponse.json({ error: "Failed to fetch orcamento" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const validatedData = orcamentoUpdateSchema.parse(body)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if orcamento exists and user has permission
    const { data: existingOrcamento, error: checkError } = await supabase
      .from('orcamentos')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: "Orcamento not found" }, { status: 404 })
      }
      throw checkError
    }

    // Check permission (owner or admin)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (existingOrcamento.created_by !== user.id && userData?.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {}
    
    if (validatedData.client_id !== undefined) updateData.client_id = validatedData.client_id
    if (validatedData.client_name !== undefined) updateData.client_name = validatedData.client_name
    if (validatedData.client_email !== undefined) updateData.client_email = validatedData.client_email
    if (validatedData.client_phone !== undefined) updateData.client_phone = validatedData.client_phone
    if (validatedData.client_address !== undefined) updateData.client_address = validatedData.client_address
    if (validatedData.dados_empresa !== undefined) updateData.dados_empresa = validatedData.dados_empresa
    if (validatedData.data_validade !== undefined) updateData.data_validade = validatedData.data_validade
    if (validatedData.observacoes !== undefined) updateData.observacoes = validatedData.observacoes
    if (validatedData.termos_condicoes !== undefined) updateData.termos_condicoes = validatedData.termos_condicoes
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.desconto !== undefined) updateData.desconto = validatedData.desconto

    // Handle items update if provided
    if (validatedData.itens) {
      // Delete existing items
      const { error: deleteError } = await supabase
        .from('orcamento_itens')
        .delete()
        .eq('orcamento_id', id)

      if (deleteError) {
        throw deleteError
      }

      // Insert new items
      const itemsToInsert = validatedData.itens.map((item, index) => ({
        orcamento_id: id,
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
        throw itemsError
      }

      // Calculate new totals
      const subtotal = validatedData.itens.reduce((sum, item) => sum + item.valor_total, 0)
      const desconto = validatedData.desconto || 0
      const total = subtotal - desconto

      updateData.subtotal = subtotal
      updateData.total = total
    }

    // Update orcamento
    const { data: updatedOrcamento, error: updateError } = await supabase
      .from('orcamentos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Fetch complete updated orcamento with items
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
      .eq('id', id)
      .single()

    if (fetchError) {
      throw fetchError
    }

    return NextResponse.json(completeOrcamento)
  } catch (error: any) {
    console.error("[API] Error updating orcamento:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Validation error", 
        details: error.errors 
      }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to update orcamento" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if orcamento exists and user has permission
    const { data: existingOrcamento, error: checkError } = await supabase
      .from('orcamentos')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: "Orcamento not found" }, { status: 404 })
      }
      throw checkError
    }

    // Check permission (owner or admin)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (existingOrcamento.created_by !== user.id && userData?.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete orcamento (items will be deleted by CASCADE)
    const { error: deleteError } = await supabase
      .from('orcamentos')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ message: "Orcamento deleted successfully" })
  } catch (error: any) {
    console.error("[API] Error deleting orcamento:", error)
    return NextResponse.json({ error: "Failed to delete orcamento" }, { status: 500 })
  }
}