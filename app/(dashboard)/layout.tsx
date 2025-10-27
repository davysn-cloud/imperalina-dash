import type React from "react"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { DashboardTopbar } from "@/components/dashboard-topbar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  let { data: userData } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle()

  if (!userData && user.email) {
    const { data: userByEmail } = await supabase.from("users").select("*").eq("email", user.email).maybeSingle()

    if (userByEmail) {
      const { data: updatedUser } = await supabase
        .from("users")
        .update({ id: user.id })
        .eq("email", user.email)
        .select()
        .single()

      userData = updatedUser
    }
  }

  if (!userData) {
    const { data: newUser } = await supabase
      .from("users")
      .insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
        role: "CLIENT",
      })
      .select()
      .single()

    userData = newUser
  }

  return (
    <div className="h-screen overflow-hidden">
      <div className="md:flex h-screen">
        <div className="hidden md:block h-screen overflow-y-auto">
          <Sidebar user={userData} />
        </div>
        <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden bg-background">
          <DashboardTopbar user={userData} />
          <div className="mx-auto w-full max-w-full px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
