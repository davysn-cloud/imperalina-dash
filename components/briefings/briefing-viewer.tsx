"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Coffee, Music, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BriefingViewerProps {
  briefing: {
    id: string
    briefing_content: string
    briefing_summary: string
    key_topics: string[]
    alerts: string[]
    suggested_topics: string[]
    preferences: any
    was_helpful?: boolean
    professional_feedback?: string
  }
}

export function BriefingViewer({ briefing }: BriefingViewerProps) {
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleFeedback = async (helpful: boolean) => {
    setIsSubmitting(true)

    try {
      await fetch(`/api/briefings/${briefing.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wasHelpful: helpful,
          professionalFeedback: feedback,
        }),
      })

      toast({
        title: "Obrigado pelo feedback!",
        description: "Isso nos ajuda a melhorar os dossiês.",
      })

      setShowFeedback(false)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o feedback.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Critical Alerts */}
      {briefing.alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertCircle className="w-5 h-5" />
              Alertas Importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {briefing.alerts.map((alert, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400">⚠️</span>
                  <span className="text-sm text-red-900 dark:text-red-200">{alert}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Quick Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Executivo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{briefing.briefing_summary}</p>
        </CardContent>
      </Card>

      {/* Preferences */}
      {briefing.preferences && Object.keys(briefing.preferences).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="w-5 h-5" />
              Preferências do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {briefing.preferences.coffee?.likes && (
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-amber-600" />
                  <span>Café {briefing.preferences.coffee.strength || "normal"}</span>
                </div>
              )}
              {briefing.preferences.music?.genres?.length > 0 && (
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-purple-600" />
                  <span>{briefing.preferences.music.genres.join(", ")}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Content */}
      <Card>
        <CardHeader>
          <CardTitle>Dossiê Completo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{briefing.briefing_content}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Key Topics */}
      {briefing.key_topics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Tópicos para Conversar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {briefing.key_topics.map((topic, i) => (
                <Badge key={i} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback */}
      {!briefing.was_helpful && !showFeedback && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">Este dossiê foi útil para você?</p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFeedback(true)
                    handleFeedback(true)
                  }}
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Sim, ajudou!
                </Button>
                <Button variant="outline" onClick={() => setShowFeedback(true)}>
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Não muito
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showFeedback && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="O que podemos melhorar nos dossiês?"
              rows={3}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowFeedback(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={() => handleFeedback(false)} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "Enviando..." : "Enviar Feedback"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
