import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ ok: true, user: null })
    }

    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}