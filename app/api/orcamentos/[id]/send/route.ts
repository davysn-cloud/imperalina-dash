import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { z } from "zod"
import { sendEmail, generateOrcamentoHTML } from "@/lib/email/resend-service"

const sendOrcamentoSchema = z.object({
  email: z.string().email(),
  subject: z.string().min(1).optional(),
  message: z.string().optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const validatedData = sendOrcamentoSchema.parse(body)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get orcamento with items
    const { data: orcamento, error: orcamentoError } = await supabase
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

    if (orcamentoError) {
      if (orcamentoError.code === 'PGRST116') {
        return NextResponse.json({ error: "Orcamento not found" }, { status: 404 })
      }
      throw orcamentoError
    }

    // Check permission (owner or admin)
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (orcamento.created_by !== user.id && userData?.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Generate HTML content for email
    const htmlContent = generateOrcamentoHTML(orcamento)

    // Send email using Resend
    const emailResult = await sendEmail({
      to: validatedData.email,
      subject: validatedData.subject || `Orçamento ${orcamento.numero_orcamento}`,
      html: htmlContent,
      text: validatedData.message || `Segue em anexo o orçamento ${orcamento.numero_orcamento}.`,
    })

    if (!emailResult.success) {
      return NextResponse.json({ 
        error: "Failed to send email", 
        details: emailResult.error 
      }, { status: 500 })
    }

    // Update orcamento status to ENVIADO
    const { error: updateError } = await supabase
      .from('orcamentos')
      .update({
        status: 'ENVIADO',
        enviado_em: new Date().toISOString(),
        enviado_para: validatedData.email,
      })
      .eq('id', id)

    if (updateError) {
      console.error("Error updating orcamento status:", updateError)
      // Don't fail the request if status update fails
    }

    return NextResponse.json({ 
      message: "Orcamento sent successfully",
      sent_to: validatedData.email,
      sent_at: new Date().toISOString(),
      message_id: emailResult.messageId
    })
  } catch (error: any) {
    console.error("[API] Error sending orcamento:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Validation error", 
        details: error.errors 
      }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to send orcamento" }, { status: 500 })
  }
}

/* Local generateOrcamentoHTML removido — usar util importado de lib/email/resend-service */
function generateOrcamentoHTML_REMOVED(orcamento: any): string {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const itensHTML = orcamento.orcamento_itens
    .sort((a: any, b: any) => a.ordem - b.ordem)
    .map((item: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.descricao}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantidade}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.valor_unitario)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.valor_total)}</td>
      </tr>
    `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Orçamento ${orcamento.numero_orcamento}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .client-info { margin-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th { background: #007bff; color: white; padding: 10px; text-align: left; }
        .table td { padding: 8px; border-bottom: 1px solid #eee; }
        .totals { text-align: right; margin-top: 20px; }
        .total-line { margin: 5px 0; }
        .final-total { font-weight: bold; font-size: 1.2em; color: #007bff; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ORÇAMENTO</h1>
          <h2>${orcamento.numero_orcamento}</h2>
        </div>

        <div class="company-info">
          <h3>Dados da Empresa</h3>
          <pre>${orcamento.dados_empresa}</pre>
        </div>

        <div class="client-info">
          <h3>Cliente</h3>
          <p><strong>Nome:</strong> ${orcamento.client_name}</p>
          <p><strong>Email:</strong> ${orcamento.client_email}</p>
          ${orcamento.client_phone ? `<p><strong>Telefone:</strong> ${orcamento.client_phone}</p>` : ''}
          ${orcamento.client_address ? `<p><strong>Endereço:</strong> ${orcamento.client_address}</p>` : ''}
        </div>

        <div>
          <p><strong>Data do Orçamento:</strong> ${formatDate(orcamento.data_orcamento)}</p>
          <p><strong>Válido até:</strong> ${formatDate(orcamento.data_validade)}</p>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th style="text-align: center;">Qtd</th>
              <th style="text-align: right;">Valor Unit.</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itensHTML}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-line">Subtotal: ${formatCurrency(orcamento.subtotal)}</div>
          ${orcamento.desconto > 0 ? `<div class="total-line">Desconto: ${formatCurrency(orcamento.desconto)}</div>` : ''}
          <div class="total-line final-total">Total: ${formatCurrency(orcamento.total)}</div>
        </div>

        ${orcamento.observacoes ? `
          <div style="margin-top: 20px;">
            <h3>Observações</h3>
            <p>${orcamento.observacoes}</p>
          </div>
        ` : ''}

        ${orcamento.termos_condicoes ? `
          <div style="margin-top: 20px;">
            <h3>Termos e Condições</h3>
            <p>${orcamento.termos_condicoes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Este orçamento é válido até ${formatDate(orcamento.data_validade)}.</p>
          <p>Para aceitar este orçamento ou esclarecer dúvidas, entre em contato conosco.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Placeholder for email sending function
// TODO: Implement with Resend or SMTP
/* Placeholder sendEmail removido — usar util importado de lib/email/resend-service */