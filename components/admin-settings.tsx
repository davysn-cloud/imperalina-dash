"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getAppSettingInt, setAppSettingInt } from "@/lib/settings"

export function AdminSettings() {
  const { toast } = useToast()
  const [maxCap, setMaxCap] = React.useState<number | "">("")
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      const v = await getAppSettingInt("max_capacity")
      if (!mounted) return
      setMaxCap(typeof v === "number" ? v : 100)
    })()
    return () => { mounted = false }
  }, [])

  const handleSave = async () => {
    if (maxCap === "" || Number.isNaN(Number(maxCap)) || Number(maxCap) <= 0) {
      toast({ title: "Valor inválido", description: "Informe um número inteiro positivo.", variant: "destructive" })
      return
    }
    try {
      setLoading(true)
      await setAppSettingInt("max_capacity", Number(maxCap))
      toast({ title: "Configuração salva", description: "Capacidade máxima atualizada com sucesso." })
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message || "Tente novamente.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do Sistema</CardTitle>
        <CardDescription>Defina parâmetros globais usados em Relatórios e Insights.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 max-w-sm">
          <Label htmlFor="max-cap">Capacidade Máxima (relatórios)</Label>
          <Input
            id="max-cap"
            type="number"
            min={1}
            value={maxCap}
            onChange={(e) => setMaxCap(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Ex.: 300"
          />
          <p className="text-sm text-muted-foreground">
            Usado para taxa de ocupação: concluídos / capacidade máxima.
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Salvando..." : "Salvar alterações"}
        </Button>
      </CardContent>
    </Card>
  )
}