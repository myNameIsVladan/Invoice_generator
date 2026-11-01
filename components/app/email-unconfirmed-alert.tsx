"use client"

import { MailIcon } from "lucide-react"
import { useActionState, useEffect } from "react"
import { toast } from "sonner"

import {
  resendConfirmationAction,
  type AuthActionState,
} from "@/app/actions/auth"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

const initialState: AuthActionState = {}

type EmailUnconfirmedAlertProps = {
  confirmation?: "sent" | "failed"
}

export function EmailUnconfirmedAlert({
  confirmation,
}: EmailUnconfirmedAlertProps) {
  const [state, formAction, pending] = useActionState(
    resendConfirmationAction,
    initialState
  )

  useEffect(() => {
    if (state.error) {
      toast.error(state.error)
    }
    if (state.success) {
      toast.success(state.success)
    }
  }, [state.error, state.success])

  const title =
    confirmation === "failed"
      ? "Confirmation email was not sent"
      : confirmation === "sent"
        ? "Check your email"
        : "Confirm your email"

  const description =
    confirmation === "failed"
      ? "We could not send the confirmation email. Send it again, then open the link to finish registration."
      : confirmation === "sent"
        ? "We sent a confirmation link to your inbox. Open it to finish registration. The link expires in 24 hours."
        : "Open the confirmation link to finish registration. You can send a new link if the first one expired."

  return (
    <Alert>
      <MailIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      <AlertAction>
        <form action={formAction}>
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {pending ? "Sending…" : "Resend"}
          </Button>
        </form>
      </AlertAction>
    </Alert>
  )
}
