import { cookies } from "next/headers"
import { connection } from "next/server"
import { notFound } from "next/navigation"

import {
  InvoiceForm,
  type InvoiceClientChoice,
} from "@/components/invoices/invoice-form"
import {
  loadInvoice,
  loadLines,
  loadProfile,
  partyFromProfile,
} from "@/lib/invoice/data"
import type { InvoiceFormValues } from "@/lib/invoice/schema"
import { createClient } from "@/utils/supabase/server"

export const instant = false

type PageProps = {
  params: Promise<{ id: string }>
}

function parseId(raw: string) {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    return null
  }
  return id
}

export default async function EditInvoicePage({ params }: PageProps) {
  await connection()
  const { id: idParam } = await params
  const invoiceId = parseId(idParam)
  if (invoiceId == null) {
    notFound()
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const invoice = await loadInvoice(supabase, invoiceId)
  if (!invoice || invoice.status !== "not_paid" || invoice.paid_via) {
    notFound()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const profile = user ? await loadProfile(supabase, user.id) : null
  const lines = await loadLines(supabase, invoice.id)

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, full_name, company_name, email, address, vat_id, archived_at")
    .is("archived_at", null)
    .not("email", "is", null)

  const clients: InvoiceClientChoice[] = (clientRows ?? [])
    .filter((client) => typeof client.email === "string" && client.email.trim() !== "")
    .map((client) => ({
      id: client.id,
      fullName: client.full_name,
      companyName: client.company_name,
      email: client.email as string,
      address: client.address,
      vatId: client.vat_id,
    }))

  if (!clients.some((client) => client.id === invoice.client_id)) {
    clients.unshift({
      id: invoice.client_id,
      fullName: invoice.to_full_name,
      companyName: invoice.to_company_name,
      email: invoice.to_email,
      address: invoice.to_address,
      vatId: invoice.to_vat_id,
    })
  }

  const defaultValues: InvoiceFormValues = {
    client_id: String(invoice.client_id),
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    currency: invoice.currency,
    comments: invoice.comments ?? "",
    note: "",
    lines: lines.map((line) => ({
      description: line.description,
      quantity: String(line.quantity),
      unit: line.unit,
      unit_price: String(line.unit_price),
      vat_rate: String(line.vat_rate),
    })),
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Edit {invoice.invoice_number}</h1>
        <p className="text-sm text-muted-foreground">
          Saving updates the PDF. You will be asked whether to send it.
        </p>
      </div>
      <InvoiceForm
        mode="edit"
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        sender={
          profile
            ? {
                fullName: invoice.from_full_name,
                companyName: invoice.from_company_name,
                email: invoice.from_email,
                address: invoice.from_address,
                vatId: invoice.from_vat_id,
                website: invoice.from_website,
              }
            : partyFromProfile({
                full_name: invoice.from_full_name,
                company_name: invoice.from_company_name,
                email: invoice.from_email,
                address: invoice.from_address,
                vat_id: invoice.from_vat_id,
                website: invoice.from_website,
                email_confirmed_at: null,
                stripe_account_id: null,
                stripe_charges_enabled: false,
              })
        }
        clients={clients}
        defaultValues={defaultValues}
        canCreate
      />
    </div>
  )
}
