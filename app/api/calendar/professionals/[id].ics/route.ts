import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceClient } from "@/lib/supabase/service"

function toICSDateLocal(date: string, time: string) {
  // date: "YYYY-MM-DD", time: "HH:mm"
  const [year, month, day] = date.split("-")
  const [hour, minute] = time.split(":")
  return `${year}${month}${day}T${hour}${minute}00`
}

function escapeICS(text: string) {
  // Escape CR/LF into literal \n for ICS text fields
  return text.replace(/(\r\n|\r|\n)/g, "\\n")
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const url = new URL(request.url)
    const token = url.searchParams.get("token") || ""

    const supabase = getSupabaseServiceClient()

    // Validate token against professionals.calendar_feed_token
    const { data: prof, error: profErr } = await supabase
      .from("professionals")
      .select("id, calendar_feed_token")
      .eq("id", id)
      .single()

    if (profErr || !prof || !token || token !== prof.calendar_feed_token) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Fetch upcoming appointments for professional
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        id, date, start_time, end_time, status, notes,
        client:users!appointments_client_id_fkey(name),
        service:services!appointments_service_id_fkey(name)
      `)
      .eq("professional_id", id)
      .in("status", ["PENDING", "CONFIRMED"]) // exclude COMPLETED/CANCELLED
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })

    if (error) throw error

    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(
      now.getUTCHours()
    )}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`

    let ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Imperalina//Appointments//PT-BR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ].join("\r\n")

    for (const appt of appointments || []) {
      const dtstart = toICSDateLocal(appt.date as any, appt.start_time as any)
      const dtend = toICSDateLocal(appt.date as any, appt.end_time as any)
      const uid = `${appt.id}@imperalina`
      const clientName = (appt as any).client?.name || "Cliente"
      const serviceName = (appt as any).service?.name || "Serviço"
      const summary = escapeICS(`Atendimento - ${serviceName} para ${clientName}`)
      const description = escapeICS(
        [
          `Cliente: ${clientName}`,
          `Serviço: ${serviceName}`,
          appt.status ? `Status: ${appt.status}` : null,
          appt.notes ? `Notas: ${String(appt.notes)}` : null,
        ].filter(Boolean).join("\n")
      )

      ics +=
        "\r\n" +
        [
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTAMP:${dtstamp}`,
          `DTSTART:${dtstart}`,
          `DTEND:${dtend}`,
          `SUMMARY:${summary}`,
          description ? `DESCRIPTION:${description}` : "",
          appt.status ? `STATUS:${appt.status}` : "",
          "END:VEVENT",
        ]
          .filter(Boolean)
          .join("\r\n")
    }

    ics += "\r\nEND:VCALENDAR\r\n"

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="imperalina-${id}.ics"`,
        "Cache-Control": "no-cache",
      },
    })
  } catch (err) {
    console.error("[ICS] error:", err)
    return new NextResponse("Failed to build calendar", { status: 500 })
  }
}