"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { startTransition, useActionState, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import {
  deleteInvoiceAction,
  markInvoicePaidAction,
  markInvoiceUnpaidAction,
  type InvoiceActionState,
} from "@/app/actions/invoices"
import { ResendInvoiceDialog } from "@/components/invoices/resend-invoice-dialog"
import { FormAlert } from "@/components/auth/form-alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "cn"
import {
  CircleCheckIcon,
  DownloadIcon,
  ExternalLinkIcon,
  MailIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

const initialState: InvoiceActionState = {}

export function InvoiceDetailActions({
  invoiceId,
  invoiceNumber,
  status,
  paidVia,
  overdue,
  paymentUrl,
  sendStatus,
  sendError,
  openResend,
  justSent,
  stripeNotice,
}: {
  invoiceId: number
  invoiceNumber: string
  status: "not_paid" | "paid"
  paidVia: "stripe" | "manual" | null
  overdue: boolean
  paymentUrl: string | null
  sendStatus: "sent" | "failed" | null
  sendError: string | null
  openResend: boolean
  justSent: boolean
  stripeNotice?: string | null
}) {
  const router = useRouter()
  const [resendOpen, setResendOpen] = useState(openResend)
  const [paidOpen, setPaidOpen] = useState(false)
  const [unpaidOpen, setUnpaidOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [paidState, paidAction, paidPending] = useActionState(markInvoicePaidAction, initialState)
  const [unpaidState, unpaidAction, unpaidPending] = useActionState(
    markInvoiceUnpaidAction,
    initialState
  )
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteInvoiceAction,
    initialState
  )
  const paidWasPending = useRef(false)
  const unpaidWasPending = useRef(false)
  const deleteWasPending = useRef(false)
  const canChange = status === "not_paid"
  const alreadySent = sendStatus === "sent" || sendStatus === "failed"

  useEffect(() => {
    if (openResend) {
      router.replace(`/invoices/${invoiceId}`, { scroll: false })
    }
  }, [invoiceId, openResend, router])

  useEffect(() => {
    if (paidWasPending.current && !paidPending) {
      if (paidState.success === "paid") {
        toast.success("Invoice marked paid.")
        router.refresh()
      } else if (paidState.error) {
        toast.error(paidState.error)
      }
    }
    paidWasPending.current = paidPending
  }, [paidPending, paidState.error, paidState.success, router])

  useEffect(() => {
    if (unpaidWasPending.current && !unpaidPending) {
      if (unpaidState.success === "unpaid") {
        toast.success("Invoice set back to unpaid. A new payment link is ready.")
        router.refresh()
      } else if (unpaidState.error) {
        toast.error(unpaidState.error)
      }
    }
    unpaidWasPending.current = unpaidPending
  }, [router, unpaidPending, unpaidState.error, unpaidState.success])

  useEffect(() => {
    if (deleteWasPending.current && !deletePending && deleteState.error) {
      toast.error(deleteState.error)
    }
    deleteWasPending.current = deletePending
  }, [deletePending, deleteState.error])

  function submit(action: (data: FormData) => void) {
    setPaidOpen(false)
    setUnpaidOpen(false)
    setDeleteOpen(false)
    const data = new FormData()
    data.set("invoice_id", String(invoiceId))
    startTransition(() => {
      action(data)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {status === "paid" ? (
          <Badge variant="secondary" className="h-auto px-3 py-1.5 text-sm">
            Paid
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="h-auto border-amber-300/80 bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-50"
          >
            Not paid
          </Badge>
        )}
        {overdue ? <Badge variant="destructive">Overdue</Badge> : null}
        {paidVia === "stripe" ? <Badge variant="secondary">Paid through Stripe</Badge> : null}
        {paidVia === "manual" ? <Badge variant="secondary">Marked paid</Badge> : null}
        {sendStatus === "failed" ? <Badge variant="destructive">Send failed</Badge> : null}
        {sendStatus === "sent" ? <Badge variant="outline">Sent</Badge> : null}
      </div>

      {stripeNotice ? (
        <FormAlert variant="destructive" title="Stripe is not ready">
          {stripeNotice}
        </FormAlert>
      ) : null}
      {justSent ? (
        <FormAlert title="Invoice sent">The client has the PDF and payment link.</FormAlert>
      ) : null}
      {sendStatus === "failed" && sendError ? (
        <FormAlert variant="destructive" title="Send failed">
          {sendError} You can retry from here.
        </FormAlert>
      ) : null}

      {paymentUrl && status === "not_paid" ? (
        <p className="text-sm">
          Payment link:{" "}
          <a
            href={paymentUrl}
            className="inline-flex items-start gap-1.5 break-all underline underline-offset-3"
          >
            <ExternalLinkIcon className="mt-0.5 size-4 shrink-0" />
            {paymentUrl}
          </a>
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canChange ? (
          <Link
            href={`/invoices/${invoiceId}/edit`}
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <PencilIcon className="size-4" />
            Edit
          </Link>
        ) : null}
        {canChange ? (
          <Button type="button" variant="outline" className="gap-2" onClick={() => setDeleteOpen(true)}>
            <Trash2Icon className="size-4" />
            Delete
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => setResendOpen(true)}
        >
          <MailIcon className="size-4" />
          {alreadySent ? "Resend to client" : "Send to client"}
        </Button>
        <a
          href={`/invoices/${invoiceId}/pdf`}
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <DownloadIcon className="size-4" />
          Download PDF
        </a>
        {canChange ? (
          <Button type="button" className="gap-2" onClick={() => setPaidOpen(true)}>
            <CircleCheckIcon className="size-4" />
            Mark paid
          </Button>
        ) : null}
        {paidVia === "manual" ? (
          <Button type="button" variant="outline" onClick={() => setUnpaidOpen(true)}>
            Set back to unpaid
          </Button>
        ) : null}
      </div>

      <ResendInvoiceDialog
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        open={resendOpen}
        onOpenChange={setResendOpen}
        alreadySent={alreadySent}
      />

      <AlertDialog open={paidOpen} onOpenChange={setPaidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark {invoiceNumber} paid?</AlertDialogTitle>
            <AlertDialogDescription>
              The payment link stops working. You can set this invoice back to unpaid later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={paidPending} onClick={() => submit(paidAction)}>
              {paidPending ? "Saving…" : "Mark paid"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unpaidOpen} onOpenChange={setUnpaidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set {invoiceNumber} back to unpaid?</AlertDialogTitle>
            <AlertDialogDescription>
              A new payment link is created. The client is not emailed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={unpaidPending} onClick={() => submit(unpaidAction)}>
              {unpaidPending ? "Saving…" : "Set unpaid"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {invoiceNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              The payment link stops working and the invoice is removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending}
              onClick={() => submit(deleteAction)}
            >
              {deletePending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
