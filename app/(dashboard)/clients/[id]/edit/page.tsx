import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ClientForm } from "@/components/client-form"
import { notFound } from "next/navigation"

export default async function EditClientPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await getSupabaseServerClient()

  const { data: client } = await supabase.from("users").select("*").eq("id", params.id).eq("role", "CLIENT").single()

  if (!client) {
    notFound()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Cliente</h1>
        <p className="text-muted-foreground">Atualize as informações do cliente</p>
      </div>

      <ClientForm client={client} />
    </div>
  )
}
