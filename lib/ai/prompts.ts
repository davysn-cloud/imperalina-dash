import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface ClientProfile {
  likes_coffee?: boolean
  coffee_strength?: string
  likes_tea?: boolean
  tea_type?: string
  likes_water?: boolean
  water_temp?: string
  music_genres?: string[]
  favorite_songs?: string[]
  music_volume?: string
  temperature_preference?: string
  lighting_preference?: string
  conversation_style?: string
  allergies?: string[]
  skin_sensitivity?: string
  special_needs?: string
  general_notes?: string
  vip_client?: boolean
}

interface PreviousVisit {
  date: string
  service_name: string
  follow_up?: {
    service_reason?: string
    conversation_topics?: string[]
    follow_up_topics?: string[]
    reminders?: string[]
    technical_notes?: string
  }
}

interface BriefingPromptData {
  client: {
    name: string
    email: string
    phone: string | null
  }
  clientProfile: ClientProfile | null
  previousVisits: PreviousVisit[]
  upcomingService: {
    name: string
    duration: number
    price: number
  }
  professional: {
    name: string
  }
}

function getCoffeeStrengthLabel(strength?: string): string {
  const labels: Record<string, string> = {
    WEAK: "Fraco",
    MEDIUM: "Médio",
    STRONG: "Forte",
    VERY_STRONG: "Muito forte/expresso",
  }
  return strength ? labels[strength] || strength : "Não especificado"
}

function getWaterTempLabel(temp?: string): string {
  const labels: Record<string, string> = {
    COLD: "Gelada",
    ROOM_TEMP: "Temperatura ambiente",
    WARM: "Morna",
  }
  return temp ? labels[temp] || temp : "Não especificado"
}

function getMusicVolumeLabel(volume?: string): string {
  const labels: Record<string, string> = {
    OFF: "Prefere silêncio",
    LOW: "Baixo",
    MEDIUM: "Médio",
    HIGH: "Alto",
  }
  return volume ? labels[volume] || volume : "Não especificado"
}

function getTemperatureLabel(temp?: string): string {
  const labels: Record<string, string> = {
    PREFERS_WARM: "Prefere ambiente mais quente",
    PREFERS_COOL: "Prefere ambiente mais fresco",
    NO_PREFERENCE: "Sem preferência",
  }
  return temp ? labels[temp] || temp : "Não especificado"
}

function getLightingLabel(lighting?: string): string {
  const labels: Record<string, string> = {
    BRIGHT: "Luz forte",
    SOFT: "Luz suave",
    DIM: "Penumbra",
    NO_PREFERENCE: "Sem preferência",
  }
  return lighting ? labels[lighting] || lighting : "Não especificado"
}

function getConversationStyleLabel(style?: string): string {
  const labels: Record<string, string> = {
    VERY_TALKATIVE: "Muito conversador",
    TALKATIVE: "Gosta de conversar",
    NEUTRAL: "Depende do dia",
    QUIET: "Prefere silêncio",
    VERY_QUIET: "Prefere muito silêncio",
  }
  return style ? labels[style] || style : "Não especificado"
}

function getSkinSensitivityLabel(sensitivity?: string): string {
  const labels: Record<string, string> = {
    NONE: "Sem sensibilidade",
    MILD: "Leve",
    MODERATE: "Moderada",
    HIGH: "Alta",
    VERY_HIGH: "Muito alta",
  }
  return sensitivity ? labels[sensitivity] || sensitivity : "Não especificado"
}

function formatVisitHistory(visits: PreviousVisit[]): string {
  if (visits.length === 0) {
    return "**Primeira visita do cliente!** Não há histórico anterior."
  }

  return visits
    .map((visit, index) => {
      const visitDate = format(new Date(visit.date), "d 'de' MMMM 'de' yyyy", {
        locale: ptBR,
      })

      let visitInfo = `## Visita ${visits.length - index} - ${visitDate}\n**Serviço:** ${visit.service_name}\n`

      if (visit.follow_up) {
        const fu = visit.follow_up

        if (fu.service_reason) {
          visitInfo += `**Motivo:** ${fu.service_reason}\n`
        }

        if (fu.conversation_topics && fu.conversation_topics.length > 0) {
          visitInfo += `**Assuntos conversados:** ${fu.conversation_topics.join(", ")}\n`
        }

        if (fu.follow_up_topics && fu.follow_up_topics.length > 0) {
          visitInfo += `**Tópicos para retomar:** ${fu.follow_up_topics.join(", ")}\n`
        }

        if (fu.reminders && fu.reminders.length > 0) {
          visitInfo += `**Lembretes:** ${fu.reminders.join(", ")}\n`
        }

        if (fu.technical_notes) {
          visitInfo += `**Observações técnicas:** ${fu.technical_notes}\n`
        }
      }

      return visitInfo
    })
    .join("\n---\n\n")
}

export function buildBriefingPrompt(data: BriefingPromptData): string {
  const { client, clientProfile, previousVisits, upcomingService, professional } = data

  return `
Você é um assistente especializado em criar dossiês personalizados para profissionais de beleza e estética. Seu objetivo é ajudar o profissional a oferecer um atendimento excepcional e memorável.

# INFORMAÇÕES DO CLIENTE

**Nome:** ${client.name}
**Telefone:** ${client.phone || "Não informado"}

${
  clientProfile
    ? `
## Perfil de Preferências

### Bebidas
${clientProfile.likes_coffee ? `- Gosta de café: **${getCoffeeStrengthLabel(clientProfile.coffee_strength)}**` : "- Não gosta de café"}
${clientProfile.likes_tea ? `- Gosta de chá: **${clientProfile.tea_type}**` : ""}
${clientProfile.likes_water ? `- Água: **${getWaterTempLabel(clientProfile.water_temp)}**` : ""}

### Música
${clientProfile.music_genres && clientProfile.music_genres.length > 0 ? `- Estilos favoritos: **${clientProfile.music_genres.join(", ")}**` : "- Sem preferência musical registrada"}
${clientProfile.favorite_songs && clientProfile.favorite_songs.length > 0 ? `- Músicas mencionadas: ${clientProfile.favorite_songs.join(", ")}` : ""}
- Volume: **${getMusicVolumeLabel(clientProfile.music_volume)}**

### Ambiente
- Temperatura: **${getTemperatureLabel(clientProfile.temperature_preference)}**
- Iluminação: **${getLightingLabel(clientProfile.lighting_preference)}**
- Estilo de conversa: **${getConversationStyleLabel(clientProfile.conversation_style)}**

### Cuidados Especiais
${clientProfile.allergies && clientProfile.allergies.length > 0 ? `- ALERTA: Alergias: **${clientProfile.allergies.join(", ")}**` : "- Sem alergias conhecidas"}
${clientProfile.skin_sensitivity ? `- Sensibilidade da pele: **${getSkinSensitivityLabel(clientProfile.skin_sensitivity)}**` : ""}
${clientProfile.special_needs ? `- Necessidades especiais: ${clientProfile.special_needs}` : ""}
${clientProfile.vip_client ? `- **CLIENTE VIP**` : ""}

${clientProfile.general_notes ? `### Observações Gerais\n${clientProfile.general_notes}\n` : ""}
`
    : "**Perfil ainda não preenchido.** Este é um novo cliente ou o perfil não foi completado."
}

# HISTÓRICO DE ATENDIMENTOS

${formatVisitHistory(previousVisits)}

# PRÓXIMO ATENDIMENTO

**Serviço:** ${upcomingService.name}
**Duração:** ${upcomingService.duration} minutos
**Profissional:** ${professional.name}

---

# SUA TAREFA

Crie um dossiê objetivo, prático e personalizado para o profissional **${professional.name}** usar nos próximos minutos antes de atender **${client.name}**.

## Estrutura do Dossiê:

### 1. RESUMO EXECUTIVO (2-3 linhas)
- Contexto geral do cliente
- Nível de relacionamento
- Ponto de atenção principal

### 2. PREPARAÇÃO DO AMBIENTE
- Como preparar o espaço (café, música, temperatura, luz)
- O que ter à mão
- O que evitar

### 3. TÓPICOS PARA RETOMAR
- Assuntos da última visita que merecem follow-up
- Perguntas naturais para fazer
- Eventos/situações para perguntar como foram

### 4. ALERTAS E LEMBRETES
- Informações críticas (alergias, sensibilidades)
- Produtos/técnicas a evitar
- Oportunidades de venda ou agendamento

### 5. DICAS DE CONEXÃO
- Como criar rapport com este cliente específico
- Estilo de comunicação ideal
- Tópicos de interesse

**IMPORTANTE:**
- Seja conciso e direto
- Use linguagem natural e amigável
- Foque no que é acionável
- Destaque alertas críticos
- Sugira perguntas específicas para fazer
`.trim()
}

export function extractSummary(content: string): string {
  const lines = content.split("\n")
  const summaryStart = lines.findIndex((line) => line.includes("RESUMO EXECUTIVO"))

  if (summaryStart === -1) return content.substring(0, 200)

  const summaryLines = []
  for (let i = summaryStart + 1; i < lines.length && summaryLines.length < 5; i++) {
    const line = lines[i].trim()
    if (line && !line.startsWith("#")) {
      summaryLines.push(line)
    }
    if (line.startsWith("###") && summaryLines.length > 0) break
  }

  return summaryLines.join(" ").substring(0, 300)
}

export function extractTopics(content: string): string[] {
  const topics: string[] = []
  const lines = content.split("\n")

  for (const line of lines) {
    if (line.includes("Tópicos") || line.includes("Assuntos") || line.includes("Conversa")) {
      const match = line.match(/[:-]\s*(.+)/)
      if (match) {
        topics.push(match[1].trim())
      }
    }
  }

  return topics.slice(0, 5)
}

export function extractSuggestedTopics(content: string): string[] {
  const topics: string[] = []
  const lines = content.split("\n")
  let inTopicsSection = false

  for (const line of lines) {
    if (line.includes("TÓPICOS PARA RETOMAR") || line.includes("DICAS DE CONEXÃO")) {
      inTopicsSection = true
      continue
    }

    if (inTopicsSection && line.startsWith("###")) {
      inTopicsSection = false
    }

    if (inTopicsSection && line.trim().startsWith("-")) {
      const topic = line.replace(/^-\s*/, "").trim()
      if (topic) topics.push(topic)
    }
  }

  return topics.slice(0, 5)
}

export function extractAlerts(content: string): string[] {
  const alerts: string[] = []
  const lines = content.split("\n")

  for (const line of lines) {
    if (
      line.toLowerCase().includes("alerta") ||
      line.toLowerCase().includes("alergia") ||
      line.toLowerCase().includes("evitar") ||
      line.toLowerCase().includes("atenção")
    ) {
      const cleaned = line.replace(/^[-*]\s*/, "").trim()
      if (cleaned) alerts.push(cleaned)
    }
  }

  return alerts.slice(0, 5)
}
