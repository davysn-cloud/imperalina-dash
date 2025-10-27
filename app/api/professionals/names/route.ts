import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceClient } from "@/lib/supabase/service"

// Retorna pares { id, name } de profissionais usando Service Role (ignora RLS)
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient()

    const { data, error } = await supabase
      .from("professionals")
      .select(`
        id,
        user:users(name)
      `)

    if (error) throw error

    const result = (data || []).map((prof: any) => ({
      id: prof.id,
      name: Array.isArray(prof.user) ? prof.user[0]?.name || "" : prof.user?.name || "",
    }))

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[v0] Error fetching professional names (service role):", err)
    return NextResponse.json({ error: "Failed to fetch professional names" }, { status: 500 })
  }
}