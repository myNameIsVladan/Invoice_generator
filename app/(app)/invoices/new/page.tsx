import { cookies } from "next/headers"
import { connection } from "next/server"

import { FormAlert } from "@/components/auth/form-alert"
import {
  InvoiceForm,
  type InvoiceClientChoice,
} from "@/components/invoices/invoice-form"
import { loadProfile, partyFromProfile, senderIsReady } from "@/lib/invoice/data"
import { addIsoDays, utcToday } from "@/lib/invoice/format"
import { emptyInvoiceLine, type InvoiceFormValues } from "@/lib/invoice/schema"
import { createClient } from "@/utils/supabase/server"

export const instant = false

type PageProps = {
  searchParams: Promise<{
    onboarding?: string | string[]
    error?: string | string[]
  }>
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function NewInvoicePage({ searchParams }: PageProps) {
  await connection()
  const params = await searchParams
  const onboarding = first(params.onboarding)
  const error = first(params.error)

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const profile = user ? await loadProfile(supabase, user.id) : null
  const today = utcToday()
  let defaultValues: InvoiceFormValues = {
    client_id: "",
    invoice_date: today,
    due_date: addIsoDays(today, 14),
    currency: "EUR",
    comments: "",
    note: "",
    lines: [emptyInvoiceLine()],
  }

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, full_name, company_name, email, address, vat_id")
    .is("archived_at", null)
    .not("email", "is", null)
    .order("company_name", { ascending: true })

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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create invoice</h1>
        <p className="text-sm text-muted-foreground">
          Saving stores the invoice and PDF. Send it from the invoice page.
        </p>
      </div>
      {onboarding === "incomplete" ? (
        <FormAlert title="Stripe onboarding is not finished">
          Nothing was sent, and no invoice number was used. Submit again when you are ready.
        </FormAlert>
      ) : null}
      {error ? (
        <FormAlert variant="destructive" title="Could not create the invoice">
          {error}
        </FormAlert>
      ) : null}
      <InvoiceForm
        mode="create"
        sender={
          profile
            ? partyFromProfile(profile)
            : {
                fullName: null,
                companyName: null,
                email: null,
                address: null,
                vatId: null,
                website: null,
              }
        }
        clients={clients}
        defaultValues={defaultValues}
        canCreate={senderIsReady(profile)}
      />
    </div>
  )
}
