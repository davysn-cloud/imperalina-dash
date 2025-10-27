import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Missing Supabase environment variables in middleware")
    return NextResponse.next()
  }

  // Sempre crie a resposta primeiro e use set/remove nela (padrão oficial Supabase)
  const response = NextResponse.next()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value
      },
      set(name, value, options) {
        response.cookies.set(name, value, options)
      },
      remove(name, options) {
        response.cookies.set(name, "", { ...options, maxAge: 0 })
      },
    },
  })

  // Força refresh se necessário e obtém o usuário atual
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (request.nextUrl.pathname === "/setup") {
    return response
  }

  // Block public registration: always redirect /register to /login
  if (request.nextUrl.pathname === "/register") {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Protected routes
  const protectedPaths = [
    "/dashboard",
    "/appointments",
    "/professionals",
    "/services",
    "/schedules",
    "/clients",
    "/admin",
  ]
  const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if already logged in and trying to access auth pages
  if ((request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register") && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return response
}
