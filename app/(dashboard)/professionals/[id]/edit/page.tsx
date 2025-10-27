import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ProfessionalForm } from "@/components/professional-form"
import { notFound } from "next/navigation"

export default async function EditProfessionalPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await getSupabaseServerClient()

  const { data: professional } = await supabase
    .from("professionals")
    .select(`
      *,
      user:users(*)
    `)
    .eq("id", params.id)
    .single()

  if (!professional) {
    notFound()
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Profissional</h1>
        <p className="text-muted-foreground">Atualize as informações do profissional</p>
      </div>

      <ProfessionalForm professional={professional} />
    </div>
  )
}
