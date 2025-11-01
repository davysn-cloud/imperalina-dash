import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key-for-build')

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, simulating email send')
      console.log('Email would be sent:', {
        to: options.to,
        subject: options.subject,
        html: options.html.substring(0, 200) + '...',
        text: options.text
      })
      return { success: true, messageId: 'simulated-' + Date.now() }
    }

    const { data, error } = await resend.emails.send({
      from: options.from || 'Imperalina Estética <noreply@imperalina.com>',
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (error: any) {
    console.error('Error sending email:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export function generateOrcamentoHTML(orcamento: any): string {
  const validadeData = new Date(orcamento.data_validade)
  const validadeTxt = `${validadeData.getDate().toString().padStart(2,'0')}/${(validadeData.getMonth()+1).toString().padStart(2,'0')}/${validadeData.getFullYear()}`

  const itensHtml = orcamento.orcamento_itens?.map((item: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.descricao || ''}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantidade || 0}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
        ${(item.valor_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
        ${(item.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </td>
    </tr>
  `).join('') || ''

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
        .company-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .quote-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .quote-info div { flex: 1; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f8f9fa; padding: 12px 8px; text-align: left; border-bottom: 2px solid #dee2e6; }
        .totals { text-align: right; margin-top: 20px; }
        .total-line { margin: 5px 0; }
        .total-final { font-size: 1.2em; font-weight: bold; color: #28a745; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 0.9em; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Orçamento ${orcamento.numero_orcamento}</h1>
        </div>

        <div class="company-info">
          <h3>Dados da Empresa</h3>
          <p>${(orcamento.dados_empresa || 'Imperalina Estética').split('\n').join('<br>')}</p>
        </div>

        <div class="quote-info">
          <div>
            <h3>Cliente</h3>
            <p><strong>${orcamento.client_name}</strong></p>
            ${orcamento.client_email ? `<p>Email: ${orcamento.client_email}</p>` : ''}
            ${orcamento.client_phone ? `<p>Telefone: ${orcamento.client_phone}</p>` : ''}
            ${orcamento.client_address ? `<p>Endereço: ${orcamento.client_address}</p>` : ''}
          </div>
          <div>
            <h3>Informações do Orçamento</h3>
            <p><strong>Número:</strong> ${orcamento.numero_orcamento}</p>
            <p><strong>Data:</strong> ${new Date(orcamento.created_at).toLocaleDateString('pt-BR')}</p>
            <p><strong>Validade:</strong> ${validadeTxt}</p>
            <p><strong>Status:</strong> ${orcamento.status}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th style="text-align: center;">Qtd</th>
              <th style="text-align: right;">Valor Unit.</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itensHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-line">
            <strong>Subtotal: ${(orcamento.subtotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
          </div>
          ${(orcamento.desconto || 0) > 0 ? `
            <div class="total-line" style="color: #dc3545;">
              Desconto: -${(orcamento.desconto || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          ` : ''}
          <div class="total-line total-final">
            Total: ${(orcamento.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
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
          <p>Este orçamento é válido até ${validadeTxt}.</p>
          <p>Obrigado pela preferência!</p>
        </div>
      </div>
    </body>
    </html>
  `
}