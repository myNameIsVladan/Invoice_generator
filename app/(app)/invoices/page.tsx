import Link from "next/link"
import { cookies } from "next/headers"
import { connection } from "next/server"

import { FormAlert } from "@/components/auth/form-alert"
import { ClientsEmptyState } from "@/components/clients/clients-empty-state"
import { InvoiceTable, type InvoiceListItem } from "@/components/invoices/invoice-table"
import {
  InvoicePagination,
  InvoicesToolbar,
} from "@/components/invoices/invoices-toolbar"
import { buttonVariants } from "@/components/ui/button"
import { clientDisplayName } from "@/lib/clients/display-name"
import { loadProfile, senderIsReady } from "@/lib/invoice/data"
import { formatDecimal, formatIsoDate, utcToday } from "@/lib/invoice/format"
import { invoicesListHref } from "@/lib/invoice/list-url"
import {
  PAGE_SIZE,
  parseInvoiceListFilter,
  parseInvoicePage,
  parseInvoiceSearchQuery,
} from "@/lib/invoice/schema"
import { cn } from "cn"
import { createClient } from "@/utils/supabase/server"

export const instant = false

type PageProps = {
  searchParams: Promise<{
    q?: string | string[]
    status?: string | string[]
    page?: string | string[]
    deleted?: string | string[]
  }>
}

type InvoiceListRow = {
  id: number
  invoice_number: string
  to_full_name: string | null
  to_company_name: string | null
  invoice_date: string
  due_date: string
  total: string
  currency: string
  status: "not_paid" | "paid"
  send_status: "sent" | "failed" | null
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  await connection()
  const params = await searchParams
  const query = parseInvoiceSearchQuery(params.q)
  const filter = parseInvoiceListFilter(params.status)
  const page = parseInvoicePage(params.page)
  const deleted = Array.isArray(params.deleted) ? params.deleted[0] : params.deleted

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const profile = user ? await loadProfile(supabase, user.id) : null
  const ready = senderIsReady(profile)
  const today = utcToday()
  const needle = query.trim().replace(/[%_,.()]/g, "")

  let request = supabase
    .from("invoices")
    .select(
      "id, invoice_number, to_full_name, to_company_name, invoice_date, due_date, total, currency, status, send_status",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })

  if (filter === "paid" || filter === "not_paid") {
    request = request.eq("status", filter)
  }
  if (filter === "overdue") {
    request = request.eq("status", "not_paid").lt("due_date", today)
  }
  if (needle) {
    request = request.or(
      `invoice_number.ilike.%${needle}%,to_full_name.ilike.%${needle}%,to_company_name.ilike.%${needle}%`
    )
  }

  const from = (page - 1) * PAGE_SIZE
  const { data, error, count } = await request.range(from, from + PAGE_SIZE - 1)
  const rows = (data ?? []) as InvoiceListRow[]
  const total = count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const items: InvoiceListItem[] = rows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    clientName: clientDisplayName({
      full_name: row.to_full_name,
      company_name: row.to_company_name,
    }),
    invoiceDate: formatIsoDate(row.invoice_date),
    dueDate: formatIsoDate(row.due_date),
    totalLabel: formatDecimal(row.total, row.currency),
    status: row.status,
    overdue: row.status === "not_paid" && row.due_date < today,
    alreadySent: row.send_status === "sent" || row.send_status === "failed",
  }))

  const hasFilters = query.trim() !== "" || filter !== "all"

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-pretty text-muted-foreground">
            Newest invoices first. Overdue is an unpaid invoice whose due date has passed.
          </p>
        </div>
        {ready ? (
          <Link
            href="/invoices/new"
            className={cn(buttonVariants(), "h-auto min-h-9 rounded-full px-6 py-2.5 sm:shrink-0")}
          >
            Create invoice
          </Link>
        ) : (
          <Link
            href="/profile"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-auto min-h-9 rounded-full px-6 py-2.5 sm:shrink-0"
            )}
          >
            Complete profile
          </Link>
        )}
      </div>

      {deleted === "1" ? <FormAlert title="Invoice deleted">The payment link was deactivated.</FormAlert> : null}
      {!ready ? (
        <FormAlert title="Add a sender name">
          Create stays unavailable until your profile has a full name or a company name.
        </FormAlert>
      ) : null}
      {error ? (
        <FormAlert variant="destructive" title="Could not load invoices">
          {error.message}
        </FormAlert>
      ) : null}

      {!error && total === 0 && !hasFilters ? (
        <ClientsEmptyState
          title="No invoices yet"
          description="Create an invoice, preview it, and send the PDF with a payment link."
          actionHref={ready ? "/invoices/new" : "/profile"}
          actionLabel={ready ? "Create invoice" : "Complete profile"}
        />
      ) : null}

      {!error && (total > 0 || hasFilters) ? (
        <div className="space-y-6">
          <InvoicesToolbar query={query} filter={filter} />
          {items.length === 0 ? (
            <ClientsEmptyState
              title="No invoices match"
              description="Try a different search or switch the status filter."
              actionHref={invoicesListHref("all", "")}
              actionLabel="Clear filters"
            />
          ) : (
            <InvoiceTable rows={items} />
          )}
          <InvoicePagination
            page={Math.min(page, pageCount)}
            pageCount={pageCount}
            query={query}
            filter={filter}
          />
        </div>
      ) : null}
    </div>
  )
}
