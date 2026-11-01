import type { InvoiceListFilter } from "@/lib/invoice/schema"

export function invoicesListHref(
  filter: InvoiceListFilter,
  query: string,
  page = 1
) {
  const params = new URLSearchParams()
  const trimmed = query.trim()
  if (trimmed !== "") {
    params.set("q", trimmed)
  }
  if (filter !== "all") {
    params.set("status", filter)
  }
  if (page > 1) {
    params.set("page", String(page))
  }
  const serialized = params.toString()
  return serialized === "" ? "/invoices" : `/invoices?${serialized}`
}
