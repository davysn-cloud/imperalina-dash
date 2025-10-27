"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"
import { FollowUpModal } from "./follow-up-modal"

interface FollowUpButtonProps {
  appointmentId: string
  clientName: string
  currentUserId: string
  onSuccess?: () => void
}

export function FollowUpButton({ appointmentId, clientName, currentUserId, onSuccess }: FollowUpButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <CheckCircle className="w-4 h-4 mr-2" />
        Finalizar Atendimento
      </Button>

      <FollowUpModal
        open={open}
        onOpenChange={setOpen}
        appointmentId={appointmentId}
        clientName={clientName}
        currentUserId={currentUserId}
        onSuccess={onSuccess}
      />
    </>
  )
}
