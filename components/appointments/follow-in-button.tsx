"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ClipboardList } from "lucide-react"
import { FollowInModal } from "./follow-in-modal"

interface FollowInButtonProps {
  appointmentId: string
  clientName: string
  currentUserId: string
  onSuccess?: () => void
}

export function FollowInButton({ appointmentId, clientName, currentUserId, onSuccess }: FollowInButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm">
        <ClipboardList className="w-4 h-4 mr-2" />
        Iniciar Follow In
      </Button>

      <FollowInModal
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
