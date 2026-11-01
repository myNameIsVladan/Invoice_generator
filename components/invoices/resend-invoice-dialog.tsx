"use client"

import { startTransition, useActionState, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  resendInvoiceAction,
  type InvoiceActionState,
} from "@/app/actions/invoices"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

const initialState: InvoiceActionState = {}

export function ResendInvoiceDialog({
  invoiceId,
  invoiceNumber,
  open,
  onOpenChange,
  alreadySent = true,
}: {
  invoiceId: number
  invoiceNumber: string
  open: boolean
  onOpenChange: (open: boolean) => void
  alreadySent?: boolean
}) {
  const [note, setNote] = useState("")
  const [state, action, pending] = useActionState(resendInvoiceAction, initialState)
  const wasPending = useRef(false)

  useEffect(() => {
    if (!wasPending.current || pending) {
      wasPending.current = pending
      return
    }
    if (state.success === "resent") {
      toast.success(
        alreadySent
          ? `Invoice ${invoiceNumber} was sent again.`
          : `Invoice ${invoiceNumber} was sent.`
      )
      onOpenChange(false)
    } else if (state.error) {
      toast.error(state.error)
    }
    wasPending.current = pending
  }, [alreadySent, invoiceNumber, onOpenChange, pending, state.error, state.success])

  function submit() {
    const data = new FormData()
    data.set("invoice_id", String(invoiceId))
    data.set("note", note)
    startTransition(() => {
      action(data)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setNote("")
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {alreadySent ? "Resend" : "Send"} {invoiceNumber}?
          </DialogTitle>
          <DialogDescription>
            {alreadySent
              ? "The client receives the current PDF and the current payment link."
              : "The client receives the PDF and a Stripe payment link. Stripe Connect opens first if it is not finished."}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor={`resend-note-${invoiceId}`}>
            Personal note
          </FieldLabel>
          <Textarea
            id={`resend-note-${invoiceId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            placeholder="Optional. This is included in the email only."
          />
        </Field>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Skip
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? "Sending…" : alreadySent ? "Resend" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
