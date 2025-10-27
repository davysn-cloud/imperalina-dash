import { getGenerativeModel } from "./gemini-client"
import { buildBriefingPrompt, extractSummary, extractTopics, extractSuggestedTopics, extractAlerts } from "./prompts"

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

interface BriefingData {
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

interface GeneratedBriefing {
  content: string
  summary: string
  keyTopics: string[]
  suggestedTopics: string[]
  preferences: Record<string, any>
  lastVisitSummary: string | null
  alerts: string[]
  reminders: string[]
  tokensUsed: number
  generationTime: number
}

export async function generateAIBriefing(data: BriefingData): Promise<GeneratedBriefing> {
  const startTime = Date.now()

  const prompt = buildBriefingPrompt(data)

  try {
    const model = getGenerativeModel()
    const result = await model.generateContent(prompt)
    const response = result.response
    const content = response.text()

    const generationTime = Date.now() - startTime

    const estimatedTokens = Math.ceil((prompt.length + content.length) / 4)

    return {
      content,
      summary: extractSummary(content),
      keyTopics: extractTopics(content),
      suggestedTopics: extractSuggestedTopics(content),
      preferences: compilePreferences(data.clientProfile),
      lastVisitSummary: getLastVisitSummary(data.previousVisits[0]),
      alerts: extractAlerts(content),
      reminders: extractReminders(data.previousVisits),
      tokensUsed: estimatedTokens,
      generationTime,
    }
  } catch (error) {
    console.error("[v0] Error generating AI briefing:", error)
    throw new Error("Failed to generate AI briefing")
  }
}

function compilePreferences(profile: ClientProfile | null): Record<string, any> {
  if (!profile) return {}

  return {
    coffee: profile.likes_coffee
      ? {
          likes: true,
          strength: profile.coffee_strength,
        }
      : { likes: false },
    tea: profile.likes_tea
      ? {
          likes: true,
          type: profile.tea_type,
        }
      : { likes: false },
    water: {
      likes: profile.likes_water,
      temperature: profile.water_temp,
    },
    music: {
      genres: profile.music_genres || [],
      volume: profile.music_volume,
      favoriteSongs: profile.favorite_songs || [],
    },
    environment: {
      temperature: profile.temperature_preference,
      lighting: profile.lighting_preference,
      conversation: profile.conversation_style,
    },
    health: {
      allergies: profile.allergies || [],
      skinSensitivity: profile.skin_sensitivity,
      specialNeeds: profile.special_needs,
    },
    vip: profile.vip_client || false,
  }
}

function getLastVisitSummary(lastVisit: PreviousVisit | undefined): string | null {
  if (!lastVisit) return null

  let summary = `Último atendimento: ${lastVisit.service_name}`

  if (lastVisit.follow_up?.service_reason) {
    summary += ` (${lastVisit.follow_up.service_reason})`
  }

  return summary
}

function extractReminders(visits: PreviousVisit[]): string[] {
  const reminders: string[] = []

  for (const visit of visits) {
    if (visit.follow_up?.reminders) {
      reminders.push(...visit.follow_up.reminders)
    }
    if (visit.follow_up?.follow_up_topics) {
      reminders.push(...visit.follow_up.follow_up_topics)
    }
  }

  return [...new Set(reminders)].slice(0, 5)
}
