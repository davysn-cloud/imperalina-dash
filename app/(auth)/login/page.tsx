"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import Image from "next/image"
import LoginLogo from "@/app/MARCA-D'AGUA-LOGO-PRETA.png"

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const navigatedRef = useRef(false)

  useEffect(() => {
    // 1) Checa se o servidor já enxerga sessão
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" })
        if (res.ok) {
          const j = await res.json()
          if (j?.user && !navigatedRef.current) {
            navigatedRef.current = true
            window.location.replace("/dashboard")
            return
          }
        }
      } catch {}
    })()

    // 2) Escuta apenas SIGNED_IN para evitar loops com TOKEN_REFRESHED
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && !navigatedRef.current) {
        try {
          await fetch("/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event, session }),
          })
        } catch {}

        setLoading(false)
        navigatedRef.current = true
        setTimeout(() => {
          window.location.replace("/dashboard")
        }, 50)
      }
    })

    return () => subscription?.subscription?.unsubscribe()
  }, [supabase])

  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setLoading(false), 15000);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // onAuthStateChange acima fará o push após refresh dos cookies
    } catch (e) {
      setError("Erro ao entrar. Verifique sua conexão.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <Image src={LoginLogo} alt="Imperalina" className="mx-auto h-16 w-auto object-contain" priority />
          <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Acesso somente para usuários cadastrados pelo administrador.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
