import { format, parse, addMinutes, isAfter, isBefore, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export function formatDate(date: Date | string, formatStr = "dd/MM/yyyy"): string {
  const dateObj = typeof date === "string" ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: ptBR })
}

export function formatTime(time: string): string {
  return time
}

export function parseTime(time: string): Date {
  return parse(time, "HH:mm", new Date())
}

export function addMinutesToTime(time: string, minutes: number): string {
  const date = parseTime(time)
  const newDate = addMinutes(date, minutes)
  return format(newDate, "HH:mm")
}

export function isTimeAfter(time1: string, time2: string): boolean {
  return isAfter(parseTime(time1), parseTime(time2))
}

export function isTimeBefore(time1: string, time2: string): boolean {
  return isBefore(parseTime(time1), parseTime(time2))
}

export function getDayOfWeek(date: Date | string): number {
  const dateObj = typeof date === "string" ? parseISO(date) : date
  return dateObj.getDay()
}

export function generateTimeSlots(startTime: string, endTime: string, intervalMinutes = 30): string[] {
  const slots: string[] = []
  let currentTime = startTime

  while (isTimeBefore(currentTime, endTime)) {
    slots.push(currentTime)
    currentTime = addMinutesToTime(currentTime, intervalMinutes)
  }

  return slots
}

export function hasTimeConflict(newStart: string, newEnd: string, existingStart: string, existingEnd: string): boolean {
  // Check if new appointment overlaps with existing
  return (
    ((isTimeAfter(newStart, existingStart) || newStart === existingStart) && isTimeBefore(newStart, existingEnd)) ||
    (isTimeAfter(newEnd, existingStart) && (isTimeBefore(newEnd, existingEnd) || newEnd === existingEnd)) ||
    (isTimeBefore(newStart, existingStart) && isTimeAfter(newEnd, existingEnd))
  )
}

export const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
]

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
}

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-green-100 text-green-800 border-green-200",
  COMPLETED: "bg-blue-100 text-blue-800 border-blue-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
}
