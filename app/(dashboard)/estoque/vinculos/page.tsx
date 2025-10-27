import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link2 } from "lucide-react"

export default function VinculosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vínculos Serviço × Produto</h1>
        <p className="text-muted-foreground">Configuração de uso de produtos por serviço.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Comportamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc ml-6 text-sm text-muted-foreground space-y-1">
            <li>Serviço, produto, quantidade por atendimento</li>
            <li>Obrigatório ou opcional; baixa automática no uso</li>
            <li>Verificação de estoque suficiente e alertas</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}