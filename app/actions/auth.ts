"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabaseServiceClient } from "@/lib/supabase/service"

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
  password?: string
  name: string
  phone?: string
}) {
  try {
    const supabase = await getSupabaseAdminClient()

    let userId: string | null = null
    if (data.password && data.password.length >= 6) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: data.name,
        },
      })

      if (authError) {
        const msg = authError.message || "Erro ao criar usuário"
        const isDuplicate = /already|registered|exists|duplicate/i.test(msg)
        return { error: isDuplicate ? "Email já está cadastrado" : msg, code: isDuplicate ? "EMAIL_DUPLICATE" : undefined }
      }
      if (!authData.user) {
        return { error: "Erro ao criar usuário" }
      }
      userId = authData.user.id
    } else {
      // Sem senha: envia convite por email para definir senha
      const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(data.email, {
        data: { name: data.name },
      })
      if (inviteErr) {
        const msg = inviteErr.message || "Erro ao convidar usuário"
        const isDuplicate = /already|registered|exists|duplicate/i.test(msg)
        return { error: isDuplicate ? "Email já está cadastrado" : msg, code: isDuplicate ? "EMAIL_DUPLICATE" : undefined }
      }
      if (!invited.user) {
        return { error: "Erro ao convidar usuário" }
      }
      userId = invited.user.id
    }
    if (!userId) {
      return { error: "Falha ao obter ID do usuário" }
    }

    // Create user profile
    const { error: profileError } = await supabase.from("users").insert({
      id: userId,
      email: data.email,
      name: data.name,
      phone: data.phone || null,
      role: "CLIENT",
    })

    if (profileError) {
      const msg = profileError.message || "Erro ao criar perfil"
      const isDuplicate = /duplicate|unique/i.test(msg) || (profileError as any)?.code === "23505"
      return { error: isDuplicate ? "Email já está cadastrado" : ("Erro ao criar perfil: " + msg), code: isDuplicate ? "EMAIL_DUPLICATE" : undefined }
    }

    return { success: true, userId }
  } catch (error) {
    return { error: "Erro inesperado ao criar conta" }
  }
}

export async function registerProfessional(data: {
  email: string
  password?: string
  name: string
}) {
  try {
    console.log("🔍 [DEBUG] Iniciando registerProfessional para:", data.email)
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log("❌ [DEBUG] Variáveis de ambiente ausentes")
      return { error: "Configuração do Supabase ausente: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY." }
    }
    
    console.log("✅ [DEBUG] Variáveis de ambiente OK")
    console.log("🔑 [DEBUG] Service Role Key (primeiros 20 chars):", process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20))
    
    const supabase = getSupabaseServiceClient()
    console.log("✅ [DEBUG] Service client criado")

    let userId: string | null = null
    if (data.password && data.password.length >= 6) {
      console.log("🔐 [DEBUG] Criando usuário com senha...")
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { name: data.name },
      })
      if (authError) {
        console.log("❌ [DEBUG] Erro ao criar usuário:", authError)
        return { error: authError.message }
      }
      if (!authData.user) {
        console.log("❌ [DEBUG] Usuário não retornado")
        return { error: "Erro ao criar usuário" }
      }
      userId = authData.user.id
      console.log("✅ [DEBUG] Usuário criado com ID:", userId)
    } else {
      console.log("📧 [DEBUG] Enviando convite por email...")
      const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(data.email, {
        data: { name: data.name },
      })
      if (inviteErr) {
        console.log("❌ [DEBUG] Erro ao convidar usuário:", inviteErr)
        return { error: inviteErr.message }
      }
      if (!invited.user) {
        console.log("❌ [DEBUG] Usuário convidado não retornado")
        return { error: "Erro ao convidar usuário" }
      }
      userId = invited.user.id
      console.log("✅ [DEBUG] Convite enviado, ID:", userId)
    }
    if (!userId) {
      console.log("❌ [DEBUG] userId é null")
      return { error: "Falha ao obter ID do usuário" }
    }

    console.log("👤 [DEBUG] Inserindo perfil na tabela users usando função que bypassa RLS...")
    console.log("📝 [DEBUG] Dados do perfil:", { id: userId, email: data.email, name: data.name, role: "PROFESSIONAL" })
    
    // Usar função SQL que bypassa RLS
    const { error: profileError } = await supabase.rpc('insert_user_bypass_rls', {
      p_id: userId,
      p_email: data.email,
      p_name: data.name,
      p_role: "PROFESSIONAL"
    })

    if (profileError) {
      console.log("❌ [DEBUG] Erro ao inserir perfil:", profileError)
      console.log("❌ [DEBUG] Código do erro:", profileError.code)
      console.log("❌ [DEBUG] Detalhes do erro:", profileError.details)
      console.log("❌ [DEBUG] Hint do erro:", profileError.hint)
      return { error: "Erro ao criar perfil: " + profileError.message }
    }

    console.log("✅ [DEBUG] Perfil criado com sucesso!")
    return { success: true, userId }
  } catch (error: any) {
    console.log("💥 [DEBUG] Erro inesperado:", error)
    return { error: error?.message || "Erro inesperado ao criar profissional" }
  }
}
