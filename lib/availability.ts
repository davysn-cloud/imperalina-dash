import { getSupabaseServerClient } from "@/lib/supabase/server"

export interface TimeSlot {
  time: string
  available: boolean
}

export interface AvailabilityParams {
  professionalId: string
  serviceId: string
  date: string // YYYY-MM-DD format
}

export async function getAvailableSlots(params: AvailabilityParams): Promise<TimeSlot[]> {
  const supabase = await getSupabaseServerClient()
  const { professionalId, serviceId, date } = params

  // Get service duration
  const { data: service } = await supabase.from("services").select("duration").eq("id", serviceId).single()

  if (!service) return []

  const serviceDuration = service.duration

  // Get day of week (0 = Sunday, 6 = Saturday)
  const dateObj = new Date(date + "T00:00:00")
  const dayOfWeek = dateObj.getDay()

  // Get professional's schedule for this day
  const { data: schedules } = await supabase
    .from("schedules")
    .select("*")
    .eq("professional_id", professionalId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)

  if (!schedules || schedules.length === 0) return []

  // Get existing appointments for this professional on this date
  const { data: appointments } = await supabase
    .from("appointments")
    .select("start_time, end_time")
    .eq("professional_id", professionalId)
    .eq("date", date)
    .in("status", ["CONFIRMED", "PENDING"])

  const bookedSlots = appointments || []

  // Generate all possible time slots
  const allSlots: TimeSlot[] = []

  for (const schedule of schedules) {
    const slots = generateTimeSlots(schedule.start_time, schedule.end_time, serviceDuration, bookedSlots)
    allSlots.push(...slots)
  }

  // Sort by time and remove duplicates
  const uniqueSlots = Array.from(new Map(allSlots.map((slot) => [slot.time, slot])).values()).sort((a, b) =>
    a.time.localeCompare(b.time),
  )

  return uniqueSlots
}

function generateTimeSlots(
  startTime: string,
  endTime: string,
  serviceDuration: number,
  bookedSlots: Array<{ start_time: string; end_time: string }>,
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const [startHour, startMinute] = startTime.split(":").map(Number)
  const [endHour, endMinute] = endTime.split(":").map(Number)

  let currentMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute

  while (currentMinutes + serviceDuration <= endMinutes) {
    const slotTime = minutesToTime(currentMinutes)
    const slotEndTime = minutesToTime(currentMinutes + serviceDuration)

    // Check if this slot conflicts with any booked appointments
    const isAvailable = !bookedSlots.some((booked) => {
      return timesOverlap(slotTime, slotEndTime, booked.start_time, booked.end_time)
    })

    slots.push({
      time: slotTime,
      available: isAvailable,
    })

    // Move to next slot (15-minute intervals)
    currentMinutes += 15
  }

  return slots
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

function timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2
}
