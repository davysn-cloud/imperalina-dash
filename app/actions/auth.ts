"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

async function getSupabaseAdminClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Ignore errors in Server Components
        }
      },
    },
  })
}

export async function registerUser(data: {
  email: string
  password: string
  name: string
  phone?: string
}) {
  try {
    const supabase = await getSupabaseAdminClient()

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: data.name,
      },
    })

    if (authError) {
      return { error: authError.message }
    }

    if (!authData.user) {
      return { error: "Erro ao criar usuário" }
    }

    // Create user profile
    const { error: profileError } = await supabase.from("users").insert({
      id: authData.user.id,
      email: data.email,
      name: data.name,
      phone: data.phone || null,
      role: "CLIENT",
    })

    if (profileError) {
      return { error: "Erro ao criar perfil: " + profileError.message }
    }

    return { success: true, userId: authData.user.id }
  } catch (error) {
    return { error: "Erro inesperado ao criar conta" }
  }
}
