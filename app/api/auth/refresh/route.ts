import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { event?: string; session?: any }
    const { event, session } = body || {}

    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // ignore
          }
        },
      },
    })

    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      if (session) {
        await supabase.auth.setSession(session)
      }
    } else if (event === "SIGNED_OUT") {
      await supabase.auth.signOut()
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}