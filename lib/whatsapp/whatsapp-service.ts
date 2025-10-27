/**
 * WhatsApp Integration Service
 * Uses Twilio for WhatsApp messaging
 */

interface WhatsAppMessage {
  to: string // Phone number in format +5521999999999
  message: string
  mediaUrl?: string
}

interface WhatsAppResponse {
  success: boolean
  messageId?: string
  status?: string
  error?: string
}

/**
 * Send WhatsApp message via Twilio
 */
export async function sendWhatsAppMessage(params: WhatsAppMessage): Promise<WhatsAppResponse> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER

    if (!accountSid || !authToken || !whatsappNumber) {
      throw new Error("Twilio credentials not configured")
    }

    console.log(`[v0] Sending WhatsApp via Twilio to ${params.to}`)

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: `whatsapp:${whatsappNumber}`,
        To: `whatsapp:${params.to}`,
        Body: params.message,
        ...(params.mediaUrl && { MediaUrl: params.mediaUrl }),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || "Failed to send message")
    }

    return {
      success: true,
      messageId: data.sid,
      status: data.status,
    }
  } catch (error: any) {
    console.error("[v0] Twilio error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Check message delivery status
 */
export async function checkMessageStatus(messageId: string): Promise<string> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      return "unknown"
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${messageId}.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
      },
    )

    const data = await response.json()
    return data.status || "unknown"
  } catch (error) {
    console.error("[v0] Error checking message status:", error)
    return "unknown"
  }
}
