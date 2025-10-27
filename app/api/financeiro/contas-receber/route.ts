import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// Helper functions para lidar com relacionamentos que podem vir como arrays do Supabase
function getName(relationship: any): string {
  if (Array.isArray(relationship)) {
    return relationship[0]?.name || ""
  }
  return relationship?.name || ""
}

function getEmail(relationship: any): string {
  if (Array.isArray(relationship)) {
    return relationship[0]?.email || ""
  }
  return relationship?.email || ""
}

function getPhone(relationship: any): string {
  if (Array.isArray(relationship)) {
    return relationship[0]?.phone || ""
  }
  return relationship?.phone || ""
}

function getPrice(relationship: any): number {
  if (Array.isArray(relationship)) {
    return relationship[0]?.price || 0
  }
  return relationship?.price || 0
}

function getProfessionalName(relationship: any): string {
  if (Array.isArray(relationship)) {
    const user = relationship[0]?.user
    if (Array.isArray(user)) {
      return user[0]?.name || ""
    }
    return user?.name || ""
  }
  return relationship?.user?.name || ""
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    // Buscar agendamentos com informações de pagamento
    let query = supabase
      .from("appointments")
      .select(`
        id,
        date,
        payment_status,
        payment_date,
        payment_amount,
        payment_method,
        payment_notes,
        client:users!appointments_client_id_fkey(
          id,
          name,
          email,
          phone
        ),
        professional:professionals(
          id,
          user:users(name)
        ),
        service:services(
          id,
          name,
          price
        )
      `)
      .not("payment_status", "is", null)
      .order("date", { ascending: false })

    // Filtrar por status se especificado
    if (status && status !== "ALL") {
      query = query.eq("payment_status", status)
    }

    const { data: appointments, error } = await query

    if (error) {
      console.error("Erro ao buscar contas a receber:", error)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    // Transformar dados para o formato esperado
    const contasReceber = appointments?.map((appointment: any) => ({
      id: appointment.id,
      cliente_nome: getName(appointment.client) || "Cliente não encontrado",
      cliente_email: getEmail(appointment.client) || "",
      cliente_telefone: getPhone(appointment.client) || "",
      servico_nome: getName(appointment.service) || "Serviço não encontrado",
      valor_original: getPrice(appointment.service) || 0,
      valor_pago: appointment.payment_amount || 0,
      data_vencimento: appointment.date,
      data_pagamento: appointment.payment_date,
      status: appointment.payment_status,
      metodo_pagamento: appointment.payment_method,
      observacoes: appointment.payment_notes,
      profissional_nome: getProfessionalName(appointment.professional) || "Profissional não encontrado",
    })) || []

    return NextResponse.json(contasReceber)
  } catch (error) {
    console.error("Erro na API de contas a receber:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()
    const { id, payment_status, payment_date, payment_amount, payment_method, payment_notes } = body

    const { error } = await supabase
      .from("appointments")
      .update({
        payment_status,
        payment_date,
        payment_amount,
        payment_method,
        payment_notes,
      })
      .eq("id", id)

    if (error) {
      console.error("Erro ao atualizar pagamento:", error)
      return NextResponse.json({ error: "Erro ao atualizar pagamento" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro na API de atualização de pagamento:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}