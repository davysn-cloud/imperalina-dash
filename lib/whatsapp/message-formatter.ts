import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface BriefingMessageData {
  briefingContent: string
  client: {
    name: string
  }
  appointment: {
    date: string
    start_time: string
    service: {
      name: string
      duration: number
    }
  }
  professional: {
    name: string
  }
  keyTopics: string[]
  alerts: string[]
}

export function formatBriefingMessage(data: BriefingMessageData): string {
  const { briefingContent, client, appointment, professional, keyTopics, alerts } = data

  const dateFormatted = format(new Date(appointment.date), "EEEE, d 'de' MMMM", { locale: ptBR })

  return `
🔔 *ATENDIMENTO EM 30 MINUTOS*

━━━━━━━━━━━━━━━━━━━━━━

👤 *Cliente:* ${client.name}
💇 *Serviço:* ${appointment.service.name}
📅 *Data:* ${dateFormatted}
⏰ *Horário:* ${appointment.start_time}
⏱️ *Duração:* ${appointment.service.duration} min

━━━━━━━━━━━━━━━━━━━━━━
${
  alerts.length > 0
    ? `
⚠️ *ALERTAS IMPORTANTES*
${alerts.map((alert) => `• ${alert}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━

`
    : ""
}
${briefingContent}

━━━━━━━━━━━━━━━━━━━━━━

📌 *Tópicos-chave:*
${keyTopics.map((topic) => `• ${topic}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━

_Dossiê gerado automaticamente pelo Imperalina_
_Atendimento Inteligente com IA_

✨ Boa sorte, ${professional.name}!
`.trim()
}

export function formatFollowUpReminder(data: { client: string; appointmentId: string }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://imperalina.vercel.app"

  return `
⏰ *LEMBRETE*

Não esqueça de preencher o *Follow Up* do atendimento de *${data.client}*!

Acesse: ${appUrl}/appointments/${data.appointmentId}

Isso ajudará no próximo atendimento! 🎯
`.trim()
}
