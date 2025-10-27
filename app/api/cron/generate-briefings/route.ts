import { type NextRequest, NextResponse } from "next/server"
import { processUpcomingAppointments, retryFailedBriefings } from "@/lib/cron/briefing-scheduler"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // 1 minute (max for Hobby plan)

export async function GET(request: NextRequest) {
  // Security: Check authorization header
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error("[v0] CRON_SECRET not configured")
    return NextResponse.json({ error: "Cron job not configured" }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error("[v0] Unauthorized cron job attempt")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("[v0] Starting briefing generation cron job...")

    // Process new appointments
    const result = await processUpcomingAppointments()

    // Retry failed briefings
    await retryFailedBriefings()

    console.log("[v0] Cron job completed successfully")

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error("[v0] Cron job error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
