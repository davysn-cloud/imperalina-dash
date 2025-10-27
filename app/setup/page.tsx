import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, Database, AlertCircle, Sparkles } from "lucide-react"

export default function SetupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">Imperalina</CardTitle>
          </div>
          <CardDescription>Configuração Inicial do Banco de Dados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertTitle>Banco de Dados Não Configurado</AlertTitle>
            <AlertDescription>
              As tabelas do banco de dados ainda não foram criadas. Siga os passos abaixo para configurar o sistema.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Passos para Configuração
            </h3>

            <div className="space-y-4 pl-7">
              <div className="space-y-2">
                <h4 className="font-medium">1. Acesse o Supabase SQL Editor</h4>
                <p className="text-sm text-muted-foreground">Vá para o seu projeto Supabase → SQL Editor</p>
                <a
                  href="https://supabase.com/dashboard/project/_/sql"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-block"
                >
                  Abrir Supabase Dashboard →
                </a>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">2. Execute os Scripts SQL</h4>
                <p className="text-sm text-muted-foreground">
                  Execute os scripts na seguinte ordem (localizados na pasta{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">/scripts</code>):
                </p>
                <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1 ml-2">
                  <li>
                    <code className="bg-muted px-1 py-0.5 rounded">01-create-tables.sql</code> - Cria todas as tabelas
                  </li>
                  <li>
                    <code className="bg-muted px-1 py-0.5 rounded">02-seed-data.sql</code> - Adiciona dados de exemplo
                    (opcional)
                  </li>
                  <li>
                    <code className="bg-muted px-1 py-0.5 rounded">03-enable-rls.sql</code> - Configura segurança (Row
                    Level Security)
                  </li>
                </ol>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">3. Recarregue a Página</h4>
                <p className="text-sm text-muted-foreground">
                  Após executar os scripts, recarregue esta página para continuar.
                </p>
              </div>
            </div>
          </div>

          <Alert variant="default" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">Primeira Vez?</AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Após configurar o banco de dados, você precisará criar uma conta. O primeiro usuário registrado deve ter
              seu role alterado para "ADMIN" diretamente no Supabase para acessar todas as funcionalidades.
            </AlertDescription>
          </Alert>

          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Scripts Disponíveis:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <code className="bg-muted px-1 py-0.5 rounded">01-create-tables.sql</code>
                  <p className="text-muted-foreground mt-1">
                    Cria as tabelas: users, professionals, services, schedules, appointments
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <code className="bg-muted px-1 py-0.5 rounded">02-seed-data.sql</code>
                  <p className="text-muted-foreground mt-1">
                    Adiciona dados de exemplo: 3 profissionais, 12 serviços, horários e agendamentos
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <code className="bg-muted px-1 py-0.5 rounded">03-enable-rls.sql</code>
                  <p className="text-muted-foreground mt-1">
                    Configura políticas de segurança (RLS) para proteger os dados
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
