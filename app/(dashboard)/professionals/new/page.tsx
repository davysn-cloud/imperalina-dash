import { ProfessionalForm } from "@/components/professional-form"

export default function NewProfessionalPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Novo Profissional</h1>
        <p className="text-muted-foreground">Cadastre um novo profissional no sistema</p>
      </div>

      <ProfessionalForm />
    </div>
  )
}
