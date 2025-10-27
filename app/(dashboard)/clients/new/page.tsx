import { ClientForm } from "@/components/client-form"

export default function NewClientPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Novo Cliente</h1>
        <p className="text-muted-foreground">Cadastre um novo cliente no sistema</p>
      </div>

      <ClientForm />
    </div>
  )
}
