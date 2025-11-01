import { GoogleGenerativeAI } from "@google/generative-ai"

// Do not throw at import time to avoid Next build failures.
// Defer validation until the model is actually requested.
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY

export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null
export const AI_AVAILABLE = !!apiKey

export const AI_MODEL = "gemini-1.5-pro"

export function getGenerativeModel() {
  if (!genAI) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY environment variable is required")
  }
  return genAI.getGenerativeModel({
    model: AI_MODEL,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  })
}
