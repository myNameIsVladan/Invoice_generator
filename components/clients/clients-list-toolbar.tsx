import Link from "next/link"
import { SearchIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { clientsListHref } from "@/lib/clients/list-url"
import type { ClientListStatus } from "@/lib/clients/schema"
import { cn } from "cn"

type ClientsListToolbarProps = {
  query: string
  status: ClientListStatus
}

const filters: Array<{ label: string; value: ClientListStatus }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
]

export function ClientsListToolbar({ query, status }: ClientsListToolbarProps) {
  return (
    <div className="space-y-3">
      <form
        method="get"
        className="flex flex-col gap-3 sm:flex-row sm:items-stretch"
      >
        <input type="hidden" name="status" value={status} />
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-muted/40 px-3 ring-1 ring-foreground/10 focus-within:ring-ring/50">
            <SearchIcon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search name or email"
              aria-label="Search clients"
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
        {filters.map((filter) => (
          <Link
            key={filter.value}
            href={clientsListHref(filter.value, query)}
            className={cn(
              buttonVariants({
                variant: status === filter.value ? "default" : "outline",
                size: "sm",
              }),
              "rounded-full"
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
