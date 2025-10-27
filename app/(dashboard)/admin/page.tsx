import { getSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminProfessionalsManager } from "@/components/admin-professionals-manager"
import { AdminSchedulesManager } from "@/components/admin-schedules-manager"
import { AdminPermissionsManager } from "@/components/admin-permissions-manager"
import { AdminSettings } from "@/components/admin-settings"

export default async function AdminPage() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle()

  if (userData?.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Fetch all professionals with their user data
  const { data: professionals } = await supabase
    .from("professionals")
    .select(`
      *,
      user:users(*)
    `)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
        <p className="text-muted-foreground">Gerencie profissionais, horários e permissões</p>
      </div>

      <Tabs defaultValue="professionals" className="space-y-6">
        <TabsList>
          <TabsTrigger value="professionals">Profissionais</TabsTrigger>
          <TabsTrigger value="schedules">Horários</TabsTrigger>
          <TabsTrigger value="permissions">Permissões</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="professionals" className="space-y-4">
          <AdminProfessionalsManager professionals={professionals || []} />
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <AdminSchedulesManager professionals={professionals || []} />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <AdminPermissionsManager professionals={professionals || []} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
