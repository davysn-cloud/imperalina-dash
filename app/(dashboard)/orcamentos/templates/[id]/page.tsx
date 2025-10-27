import { getSupabaseServerClient } from "@/lib/supabase/server"
import { TemplateEditor } from "@/components/template-editor"
import { notFound } from "next/navigation"

export default async function EditTemplatePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await getSupabaseServerClient()

  // TODO: Implementar busca do template quando a tabela existir
  const template = null

  if (params.id !== "novo" && !template) {
    notFound()
  }

  return (
    <div className="h-[calc(100vh-4rem)] space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {params.id === "novo" ? "Novo Template" : "Editar Template"}
        </h1>
        <p className="text-muted-foreground">
          {params.id === "novo" 
            ? "Crie um novo template para seus orçamentos" 
            : "Edite o template de orçamento"}
        </p>
      </div>

      <TemplateEditor template={template} />
    </div>
  )
}