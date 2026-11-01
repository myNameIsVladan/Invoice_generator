import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { cookies } from "next/headers"
import { connection } from "next/server"
import { notFound } from "next/navigation"

import { InvoiceDetailActions } from "@/components/invoices/invoice-detail-actions"
import { InvoicePreview } from "@/components/invoices/invoice-preview"
import { buttonVariants } from "@/components/ui/button"
import {
  loadActiveLink,
  loadInvoice,
  loadLines,
  previewFromInvoice,
} from "@/lib/invoice/data"
import { utcToday } from "@/lib/invoice/format"
import { cn } from "cn"
import { createClient } from "@/utils/supabase/server"

export const instant = false

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    resend?: string | string[]
    sent?: string | string[]
    send?: string | string[]
    stripe?: string | string[]
    message?: string | string[]
  }>
}

function parseId(raw: string) {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    return null
  }
  return id
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function InvoiceDetailPage({ params, searchParams }: PageProps) {
  await connection()
  const { id: idParam } = await params
  const query = await searchParams
  const invoiceId = parseId(idParam)
  if (invoiceId == null) {
    notFound()
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const invoice = await loadInvoice(supabase, invoiceId)
  if (!invoice) {
    notFound()
  }

  const [lines, link] = await Promise.all([
    loadLines(supabase, invoice.id),
    loadActiveLink(supabase, invoice.id),
  ])
  const today = utcToday()

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{invoice.invoice_number}</h1>
          <p className="text-sm text-muted-foreground">
            Preview, download, or send the PDF and payment link.
          </p>
        </div>
        <Link
          href="/invoices"
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <ArrowLeftIcon className="size-4" />
          All invoices
        </Link>
      </div>

      <InvoiceDetailActions
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        status={invoice.status}
        paidVia={invoice.paid_via}
        overdue={invoice.status === "not_paid" && invoice.due_date < today}
        paymentUrl={link?.url ?? null}
        sendStatus={
          first(query.send) === "failed" ? "failed" : invoice.send_status
        }
        sendError={invoice.send_error}
        openResend={first(query.resend) === "1" || first(query.send) === "1"}
        justSent={first(query.sent) === "1"}
        stripeNotice={
          first(query.stripe) === "incomplete"
            ? "Stripe Connect is not finished, so the invoice was not emailed."
            : first(query.stripe) === "error"
              ? first(query.message) ?? "Stripe could not finish connecting."
              : null
        }
      />

      <InvoicePreview model={previewFromInvoice(invoice, lines)} />
    </div>
  )
}
