import Link from "next/link"
import { SearchIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { invoicesListHref } from "@/lib/invoice/list-url"
import type { InvoiceListFilter } from "@/lib/invoice/schema"
import { cn } from "cn"

const filters: Array<{ label: string; value: InvoiceListFilter }> = [
  { label: "All", value: "all" },
  { label: "Not paid", value: "not_paid" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
]

export function InvoicesToolbar({
  query,
  filter,
}: {
  query: string
  filter: InvoiceListFilter
}) {
  return (
    <div className="space-y-3">
      <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {filter !== "all" ? <input type="hidden" name="status" value={filter} /> : null}
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-muted/40 px-3 ring-1 ring-foreground/10 focus-within:ring-ring/50">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search invoice number or client"
              aria-label="Search invoices"
              className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="h-11 shrink-0 rounded-lg border-transparent bg-transparent px-6 shadow-none hover:bg-muted/50 sm:min-w-24"
          >
            Search
          </Button>
        </div>
      </form>
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Link
            key={item.value}
            href={invoicesListHref(item.value, query)}
            className={cn(
              buttonVariants({
                variant: filter === item.value ? "default" : "outline",
                size: "sm",
              })
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

export function InvoicePagination({
  page,
  pageCount,
  query,
  filter,
}: {
  page: number
  pageCount: number
  query: string
  filter: InvoiceListFilter
}) {
  if (pageCount <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        Page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={invoicesListHref(filter, query, page - 1)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Previous
          </Link>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        {page < pageCount ? (
          <Link
            href={invoicesListHref(filter, query, page + 1)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Next
          </Link>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  )
}
