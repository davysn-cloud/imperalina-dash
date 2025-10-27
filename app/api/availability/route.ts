import { type NextRequest, NextResponse } from "next/server"
import { getAvailableSlots } from "@/lib/availability"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const professionalId = searchParams.get("professionalId")
  const serviceId = searchParams.get("serviceId")
  const date = searchParams.get("date")

  if (!professionalId || !serviceId || !date) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    const slots = await getAvailableSlots({
      professionalId,
      serviceId,
      date,
    })

    return NextResponse.json({ slots })
  } catch (error) {
    console.error("[v0] Error getting available slots:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
